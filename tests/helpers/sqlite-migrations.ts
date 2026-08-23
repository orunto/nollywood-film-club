import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { DatabaseSync } from "node:sqlite";

export async function applySqliteMigrations(database: DatabaseSync) {
  const directory = resolve("drizzle-sqlite");
  const migrations = (await readdir(directory))
    .filter((name) => /^\d{4}_.+\.sql$/.test(name))
    .sort();

  if (migrations.length === 0) {
    throw new Error(`No numbered SQLite migrations found in ${directory}`);
  }

  for (const migration of migrations) {
    database.exec(await readFile(resolve(directory, migration), "utf8"));
  }
}
