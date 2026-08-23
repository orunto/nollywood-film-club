import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

test("discussion-content migration backfills links and preserves standalone discussions", async () => {
  const database = new DatabaseSync(":memory:");
  try {
    database.exec(await readFile(resolve("drizzle-sqlite/0000_secret_iron_monger.sql"), "utf8"));
    database.exec(`
      INSERT INTO content (
        id, title, content_type, genre, is_movie_of_the_week, created_at, updated_at
      ) VALUES ('content-1', 'Linked title', 'movie', '[]', 0, 1000, 1000);
      INSERT INTO discussions (
        id, title, content_id, podcast_links, created_at, updated_at
      ) VALUES
        ('linked', 'Linked discussion', 'content-1', '[]', 1000, 1000),
        ('standalone', 'Standalone discussion', NULL, '[]', 1000, 1000);
    `);

    database.exec(await readFile(resolve("drizzle-sqlite/0002_discussion_content.sql"), "utf8"));

    assert.deepEqual(
      database
        .prepare("SELECT discussion_id, content_id FROM discussion_content")
        .all()
        .map((row) => ({ ...row })),
      [{ discussion_id: "linked", content_id: "content-1" }],
    );
    assert.equal(database.prepare("SELECT count(*) AS count FROM discussions").get()?.count, 2);
    assert.equal(
      database.prepare("SELECT count(*) AS count FROM pragma_table_info('discussions') WHERE name = 'content_id'").get()?.count,
      0,
    );
  } finally {
    database.close();
  }
});
