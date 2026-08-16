import { access, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import {
  drizzle,
  type AsyncRemoteCallback,
  type SqliteRemoteDatabase,
} from "drizzle-orm/sqlite-proxy";
import * as schema from "../db/schema";
import { createBetterAuthService } from "../auth/server";
import { CatalogWriteRepository } from "../repositories/catalog-write";
import { CommunityWriteRepository } from "../repositories/community-write";
import { PublicReadRepository } from "../repositories/public-read";
import { UserProfileRepository } from "../repositories/user-profile";
import type {
  AppServices,
  AtomicCommand,
  AtomicResult,
  Database,
  ObjectStore,
} from "./contracts";
import {
  PassthroughImageTransformer,
  PendingMailService,
} from "./pending";

export class NodeSqliteDatabase implements Database {
  private readonly database: DatabaseSync;
  readonly instance: SqliteRemoteDatabase<typeof schema>;
  readonly publicReads: PublicReadRepository;
  readonly writes: CommunityWriteRepository;
  readonly catalog: CatalogWriteRepository;
  readonly profiles: UserProfileRepository;

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

class FileSystemObjectStore implements ObjectStore {
  constructor(private readonly root: string) {}

  async check() {
    await access(this.root);
  }
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

  const mail = new PendingMailService();

  return {
    runtime: "node",
    db: sqlite,
    auth: createBetterAuthService(sqlite.instance, {
      baseURL: process.env.AUTH_URL ?? "http://localhost:3000",
      secret: process.env.AUTH_SECRET ?? "dev-secret-change-me",
      mail,
      google: optionalProvider("GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"),
      twitter: optionalProvider("X_CLIENT_ID", "X_CLIENT_SECRET"),
    }),
    objects: new FileSystemObjectStore(objectRoot),
    images: new PassthroughImageTransformer(),
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
