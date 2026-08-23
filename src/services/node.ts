import { access, mkdir, stat, writeFile } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { dirname, extname, resolve } from "node:path";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { Readable } from "node:stream";
import {
  drizzle,
  type AsyncRemoteCallback,
  type SqliteRemoteDatabase,
} from "drizzle-orm/sqlite-proxy";
import * as schema from "../db/schema";
import { createBetterAuthService } from "../auth/server";
import { CatalogWriteRepository } from "../repositories/catalog-write";
import { AdminUsersRepository } from "../repositories/admin-users";
import { AdminModerationRepository } from "../repositories/admin-moderation";
import { AdminReportsRepository } from "../repositories/admin-reports";
import { AdminReviewsRepository } from "../repositories/admin-reviews";
import { AdminDiscussionsRepository } from "../repositories/admin-discussions";
import { AdminBlogRepository } from "../repositories/admin-blog";
import { AdminContentRepository } from "../repositories/admin-content";
import { MediaRepository } from "../repositories/media";
import { CommunityWriteRepository } from "../repositories/community-write";
import { ContactMessageRepository } from "../repositories/contact-message";
import { PublicReadRepository } from "../repositories/public-read";
import { UserProfileRepository } from "../repositories/user-profile";
import type {
  AppServices,
  AtomicCommand,
  AtomicResult,
  Database,
  ObjectStore,
  ObjectPutOptions,
  ObjectValue,
} from "./contracts";
import {
  HttpImageTransformer,
  HttpMailService,
  requireServiceConfig,
} from "./pending";

export class NodeSqliteDatabase implements Database {
  private readonly database: DatabaseSync;
  readonly instance: SqliteRemoteDatabase<typeof schema>;
  readonly publicReads: PublicReadRepository;
  readonly writes: CommunityWriteRepository;
  readonly catalog: CatalogWriteRepository;
  readonly profiles: UserProfileRepository;
  readonly contacts: ContactMessageRepository;
  readonly adminUsers: AdminUsersRepository;
  readonly adminModeration: AdminModerationRepository;
  readonly adminReports: AdminReportsRepository;
  readonly adminReviews: AdminReviewsRepository;
  readonly adminDiscussions: AdminDiscussionsRepository;
  readonly adminBlog: AdminBlogRepository;
  readonly adminContent: AdminContentRepository;
  readonly media: MediaRepository;

  constructor(
    database: DatabaseSync,
    instance: SqliteRemoteDatabase<typeof schema>,
  ) {
    this.database = database;
    this.instance = instance;
    this.publicReads = new PublicReadRepository(instance);
    this.writes = new CommunityWriteRepository(this);
    this.catalog = new CatalogWriteRepository(this);
    this.profiles = new UserProfileRepository(this);
    this.contacts = new ContactMessageRepository(instance);
    this.adminUsers = new AdminUsersRepository(instance);
    this.adminModeration = new AdminModerationRepository(instance);
    this.adminReports = new AdminReportsRepository(instance);
    this.adminReviews = new AdminReviewsRepository(instance);
    this.adminDiscussions = new AdminDiscussionsRepository(instance, this);
    this.adminBlog = new AdminBlogRepository(instance);
    this.adminContent = new AdminContentRepository(instance, this.catalog);
    this.media = new MediaRepository(instance);
  }

  async check() {
    this.database.prepare("SELECT 1 AS ok").get();
  }

  async atomic(commands: AtomicCommand[]): Promise<AtomicResult[]> {
    this.database.exec("BEGIN IMMEDIATE");
    try {
      const results = commands.map(({ sql, params = [] }) => {
        const result = this.database.prepare(sql).run(...params);
        return {
          changes: Number(result.changes),
          lastRowId: Number(result.lastInsertRowid),
        };
      });
      this.database.exec("COMMIT");
      return results;
    } catch (error) {
      if (this.database.isTransaction) {
        this.database.exec("ROLLBACK");
      }
      throw error;
    }
  }

  close() {
    this.database.close();
  }
}

export class FileSystemObjectStore implements ObjectStore {
  constructor(private readonly root: string) {}

  async check() {
    await access(this.root);
  }

  async exists(key: string) {
    try {
      return (await stat(this.pathFor(key))).isFile();
    } catch (error) {
      if (isMissingFile(error)) return false;
      throw error;
    }
  }

  async get(key: string): Promise<ObjectValue | null> {
    const path = this.pathFor(key);
    try {
      const details = await stat(path);
      if (!details.isFile()) return null;

      return {
        body: Readable.toWeb(createReadStream(path)) as ReadableStream<Uint8Array>,
        contentType: contentTypeFor(path),
        contentLength: details.size,
        etag: null,
      };
    } catch (error) {
      if (isMissingFile(error)) return null;
      throw error;
    }
  }

  async put(
    key: string,
    value: string | Blob | ArrayBuffer | Uint8Array | ReadableStream<Uint8Array> | null,
    options: ObjectPutOptions = {},
  ) {
    const path = this.pathFor(key);
    await mkdir(dirname(path), { recursive: true });
    const bytes = new Uint8Array(
      await new Response(value as BodyInit).arrayBuffer(),
    );
    await writeFile(path, bytes);
    void options;
  }

  private pathFor(key: string) {
    if (
      !key ||
      key.startsWith("/") ||
      key.includes("\\") ||
      key.split("/").includes("..")
    ) {
      throw new Error("Invalid object key");
    }
    return resolve(this.root, key);
  }
}

function isMissingFile(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

function contentTypeFor(path: string): string | null {
  return (
    {
      ".avif": "image/avif",
      ".gif": "image/gif",
      ".jpeg": "image/jpeg",
      ".jpg": "image/jpeg",
      ".png": "image/png",
      ".svg": "image/svg+xml",
      ".webp": "image/webp",
    } as Record<string, string>
  )[extname(path).toLowerCase()] ?? null;
}

export function createNodeSqliteDatabase(
  databasePath: string,
  options: { readOnly?: boolean } = {},
): NodeSqliteDatabase {
  const sqlite = new DatabaseSync(databasePath, options);
  return new NodeSqliteDatabase(
    sqlite,
    drizzle(buildRemoteCallback(sqlite), { schema }),
  );
}

function buildRemoteCallback(sqlite: DatabaseSync): AsyncRemoteCallback {
  return async (query, params, method) => {
    const statement = sqlite.prepare(query);
    const values = params as SQLInputValue[];
    statement.setReturnArrays(true);

    if (method === "run") {
      // The Better Auth Drizzle adapter reads affected-row counts from the
      // result (e.g. `changes`), so surface them instead of the raw row.
      const result = statement.run(...values);
      return { rows: [], changes: Number(result.changes) };
    }

    if (method === "get") {
      const row = statement.get(...values);
      return { rows: row ? Object.values(row) : [] };
    }

    return {
      rows: statement.all(...values).map((row) => Object.values(row)),
    };
  };
}

let servicesPromise: Promise<AppServices> | undefined;

export function getNodeServices() {
  servicesPromise ??= createNodeServices();
  return servicesPromise;
}

async function createNodeServices(): Promise<AppServices> {
  const sqlitePath = resolve(
    process.env.SQLITE_PATH ?? "./data/nollywood-film-club.sqlite",
  );
  const objectRoot = resolve(process.env.OBJECT_STORE_PATH ?? "./data/objects");

  await Promise.all([
    mkdir(dirname(sqlitePath), { recursive: true }),
    mkdir(objectRoot, { recursive: true }),
  ]);

  const sqlite = createNodeSqliteDatabase(sqlitePath);

  const mail = new HttpMailService(
    requireServiceConfig("MAIL_API_URL", process.env.MAIL_API_URL),
    requireServiceConfig("MAIL_API_KEY", process.env.MAIL_API_KEY),
    requireServiceConfig("MAIL_FROM", process.env.MAIL_FROM),
  );

  return {
    runtime: "node",
    db: sqlite,
    auth: createBetterAuthService(sqlite.instance, {
      baseURL: process.env.AUTH_URL ?? "http://localhost:3000",
      secret: requireServiceConfig("AUTH_SECRET", process.env.AUTH_SECRET),
      mail,
      google: optionalProvider("GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"),
      twitter: optionalProvider("X_CLIENT_ID", "X_CLIENT_SECRET"),
    }),
    objects: new FileSystemObjectStore(objectRoot),
    images: new HttpImageTransformer(
      requireServiceConfig(
        "IMAGE_TRANSFORMER_URL",
        process.env.IMAGE_TRANSFORMER_URL,
      ),
      process.env.IMAGE_TRANSFORMER_API_KEY,
    ),
    mail,
  };
}

function optionalProvider(
  clientIdEnv: string,
  clientSecretEnv: string,
): { clientId: string; clientSecret: string } | undefined {
  const clientId = process.env[clientIdEnv];
  const clientSecret = process.env[clientSecretEnv];
  return clientId && clientSecret
    ? { clientId, clientSecret }
    : undefined;
}
