import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

const stateDirectory = resolve(
  "data/local-d1-import/v3/d1/miniflare-D1DatabaseObject",
);
const migrationDirectory = resolve("drizzle-sqlite");
const migrations = (await readdir(migrationDirectory))
  .filter((name) => /^000[3-9]_.+\.sql$/.test(name))
  .sort();
const databaseFiles = (await readdir(stateDirectory)).filter(
  (name) => name.endsWith(".sqlite") && name !== "metadata.sqlite",
);

let migrated = 0;
for (const name of databaseFiles) {
  const database = new DatabaseSync(resolve(stateDirectory, name));
  try {
    const contentTable = database
      .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'content'")
      .get();
    if (!contentTable) continue;
    const contentCount = database.prepare("SELECT COUNT(*) AS count FROM content").get() as { count: number };
    if (contentCount.count === 0) continue;
    const discussionContent = database
      .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'discussion_content'")
      .get();
    if (!discussionContent) {
      database.exec(await readFile(resolve(migrationDirectory, "0002_discussion_content.sql"), "utf8"));
    }
    const summaryTable = database
      .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'content_rating_summary'")
      .get();
    if (summaryTable) {
      migrated += 1;
      continue;
    }
    for (const migration of migrations) {
      database.exec(await readFile(resolve(migrationDirectory, migration), "utf8"));
    }
    migrated += 1;
  } finally {
    database.close();
  }
}

if (migrated !== 1) throw new Error(`Expected one populated local D1 import, found ${migrated}`);
console.log(JSON.stringify({ migrated }));
