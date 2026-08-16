import { access, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { AppServices, Database, ObjectStore } from "./contracts";
import {
  PassthroughImageTransformer,
  PendingAuthService,
  PendingMailService,
} from "./pending";

class NodeSqliteDatabase implements Database {
  private readonly database: DatabaseSync;

  constructor(path: string) {
    this.database = new DatabaseSync(path);
  }

  async check() {
    this.database.prepare("SELECT 1 AS ok").get();
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
