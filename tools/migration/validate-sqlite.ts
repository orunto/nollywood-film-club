import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

const migrationPath = process.env.SQLITE_MIGRATION_PATH
  ? resolve(process.env.SQLITE_MIGRATION_PATH)
  : await findInitialMigration();
const migration = await readFile(migrationPath, "utf8");
const database = new DatabaseSync(":memory:");

database.exec("PRAGMA foreign_keys = ON");
database.exec(migration);

const tableCount = database
  .prepare(
    "SELECT count(*) AS count FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'",
  )
  .get() as { count: number };
assert.equal(tableCount.count, 13);
assert.deepEqual(database.prepare("PRAGMA foreign_key_check").all(), []);

const now = Date.now();
database
  .prepare(
    `INSERT INTO users
      (id, name, email, username, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  )
  .run("user-1", "Test User", "test@example.com", "Member", now, now);

assert.throws(() =>
  database
    .prepare(
      `INSERT INTO users
        (id, name, email, username, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(
      "user-2",
      "Second User",
      "second@example.com",
      "member",
      now,
      now,
    ),
);

database
  .prepare(
    `INSERT INTO content
      (id, title, content_type, is_movie_of_the_week, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  )
  .run("content-1", "First Film", "movie", 1, now, now);

assert.throws(() =>
  database
    .prepare(
      `INSERT INTO content
        (id, title, content_type, is_movie_of_the_week, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run("content-2", "Second Film", "movie", 1, now, now),
);

assert.throws(() =>
  database
    .prepare(
      `INSERT INTO content
        (id, title, content_type, genre, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run("content-3", "Bad JSON", "movie", "not-json", now, now),
);

assert.throws(() =>
  database
    .prepare(
      `INSERT INTO user_ratings
        (id, content_id, user_id, rating, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run("rating-1", "content-1", "user-1", 7, now, now),
);

assert.throws(() =>
  database
    .prepare(
      `INSERT INTO sessions
        (id, expires_at, token, created_at, updated_at, user_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run("session-1", now + 60_000, "token", now, now, "missing-user"),
);

database.close();
console.log(
  JSON.stringify({
    message: "SQLite migration validation complete",
    migrationPath,
    tableCount: tableCount.count,
  }),
);

async function findInitialMigration() {
  const directory = resolve("drizzle-sqlite");
  const migrations = (await readdir(directory))
    .filter((name) => /^0000_.+\.sql$/.test(name))
    .sort();

  assert.equal(migrations.length, 1, "Expected exactly one initial migration");
  return resolve(directory, migrations[0]);
}
