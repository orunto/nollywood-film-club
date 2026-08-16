import { access, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { drizzle, type AsyncRemoteCallback } from "drizzle-orm/sqlite-proxy";
import * as schema from "../db/schema";
import { PublicReadRepository } from "../repositories/public-read";
import type {
  AppServices,
  AtomicCommand,
  AtomicResult,
  Database,
  ObjectStore,
} from "./contracts";
import {
  PassthroughImageTransformer,
  PendingAuthService,
  PendingMailService,
} from "./pending";

export class NodeSqliteDatabase implements Database {
  private readonly database: DatabaseSync;
  readonly publicReads: PublicReadRepository;

  constructor(path: string, options: { readOnly?: boolean } = {}) {
    this.database = new DatabaseSync(path, options);
    const execute: AsyncRemoteCallback = async (query, params, method) => {
      const statement = this.database.prepare(query);
      const values = params as SQLInputValue[];
      statement.setReturnArrays(true);

      if (method === "run") {
        const result = statement.run(...values);
        return { rows: [result] };
      }

      if (method === "get") {
        const row = statement.get(...values);
        return { rows: row ? Object.values(row) : [] };
      }

      return {
        rows: statement.all(...values).map((row) => Object.values(row)),
      };
    };

    this.publicReads = new PublicReadRepository(
      drizzle(execute, { schema }),
    );
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

  return {
    runtime: "node",
    db: new NodeSqliteDatabase(sqlitePath),
    auth: new PendingAuthService(),
    objects: new FileSystemObjectStore(objectRoot),
    images: new PassthroughImageTransformer(),
    mail: new PendingMailService(),
  };
}
