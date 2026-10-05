import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

test("integer rating migration preserves votes, nested comments, and feed with foreign keys enabled", async () => {
  const database = new DatabaseSync(":memory:");
  try {
    database.exec("PRAGMA foreign_keys = ON");
    for (const name of (await readdir("drizzle-sqlite")).filter((name) => /^\d{4}_.*\.sql$/.test(name) && name < "0014").sort()) {
      database.exec(await readFile(`drizzle-sqlite/${name}`, "utf8"));
    }
    database.exec(`
      INSERT INTO content (id, title, content_type, created_at, updated_at) VALUES ('film', 'Film', 'movie', 0, 0);
      INSERT INTO user_ratings (id, content_id, user_id, rating, review, restricted, created_at, updated_at) VALUES
        ('legacy', 'film', 'legacy-poll:film:1', 0, 'Imported', 1, 0, 0),
        ('member', 'film', 'member', 10, 'A review', 0, 0, 0);
      INSERT INTO comments (id, review_id, parent_id, user_id, body, depth, created_at, updated_at) VALUES
        ('parent', 'member', NULL, 'reader', 'Comment', 0, 0, 0),
        ('child', 'member', 'parent', 'reader', 'Reply', 1, 1, 1);
    `);
    const tables = ["user_ratings", "comments", "review_feed_summary", "content_rating_summary"];
    const before = tables.map((table) => database.prepare(`SELECT * FROM ${table} ORDER BY 1`).all());
    database.exec("BEGIN IMMEDIATE");
    database.exec(await readFile("drizzle-sqlite/0014_integer_member_ratings.sql", "utf8"));
    database.exec("COMMIT");
    tables.forEach((table, i) => assert.deepEqual(database.prepare(`SELECT * FROM ${table} ORDER BY 1`).all(), before[i]));
    assert.deepEqual(database.prepare("PRAGMA foreign_key_check").all(), []);
    assert.equal(database.prepare("PRAGMA integrity_check").get()?.integrity_check, "ok");
    const insert = database.prepare("INSERT INTO user_ratings (id, content_id, user_id, rating, created_at, updated_at) VALUES (?, 'film', ?, ?, 0, 0)");
    for (let rating = 1; rating <= 10; rating++) insert.run(`slider-${rating}`, `slider-${rating}`, rating);
    for (const invalid of [-1, 11, 5.5]) assert.throws(() => insert.run(`invalid-${invalid}`, `invalid-${invalid}`, invalid));
    assert.equal(database.prepare("SELECT average_rating FROM content_rating_summary WHERE content_id = 'film'").get()?.average_rating, 65 / 12);
    database.exec("UPDATE user_ratings SET rating = 8 WHERE id = 'member'");
    assert.equal(database.prepare("SELECT average_rating FROM content_rating_summary WHERE content_id = 'film'").get()?.average_rating, 63 / 12);
    database.exec("INSERT INTO comments (id, review_id, user_id, body, created_at, updated_at) VALUES ('later', 'member', 'reader', 'Later', 2, 2)");
    assert.equal(database.prepare("SELECT comment_count FROM review_feed_summary WHERE review_id = 'member'").get()?.comment_count, 3);
    database.exec("DELETE FROM user_ratings WHERE id = 'member'");
    assert.equal(database.prepare("SELECT COUNT(*) AS n FROM comments").get()?.n, 0);
  } finally {
    database.close();
  }
});
