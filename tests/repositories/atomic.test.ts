import assert from "node:assert/strict";
import { readFile, rm, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { createNodeSqliteDatabase } from "../../src/services/node";

const contentInsert = `
  INSERT INTO content (
    id, title, content_type, genre, is_movie_of_the_week,
    catalog_number, created_at, updated_at
  ) VALUES (?, ?, 'movie', '[]', 0, ?, ?, ?)
`;

async function createTestDatabase() {
  const directory = await mkdtemp(join(tmpdir(), "nfc-atomic-"));
  const databasePath = join(directory, "test.sqlite");
  const setup = new DatabaseSync(databasePath);
  try {
    setup.exec(
      await readFile(
        resolve("drizzle-sqlite/0000_secret_iron_monger.sql"),
        "utf8",
      ),
    );
  } finally {
    setup.close();
  }
  return { database: createNodeSqliteDatabase(databasePath), directory };
}

test("atomic commits all statements and reports per-statement results", async () => {
  const { database, directory } = await createTestDatabase();
  try {
    const results = await database.atomic([
      {
        sql: contentInsert,
        params: ["first", "First title", 1, 1000, 1000],
      },
      {
        sql: contentInsert,
        params: ["second", "Second title", 2, 1000, 1000],
      },
    ]);

    assert.deepEqual(
      results.map(({ changes }) => changes),
      [1, 1],
    );

    const catalog = await database.publicReads.getAllContent();
    assert.deepEqual(
      catalog.map(({ id }) => id),
      ["second", "first"],
    );
  } finally {
    database.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test("atomic rolls back earlier statements when a later statement fails", async () => {
  const { database, directory } = await createTestDatabase();
  try {
    await assert.rejects(
      database.atomic([
        {
          sql: contentInsert,
          params: ["orphan", "Orphan title", 1, 1000, 1000],
        },
        {
          sql: contentInsert,
          params: ["orphan", "Duplicate title", 2, 1000, 1000],
        },
      ]),
    );

    const catalog = await database.publicReads.getAllContent();
    assert.equal(catalog.some(({ id }) => id === "orphan"), false);
  } finally {
    database.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test("atomic upsert differentiates insert from update via changes", async () => {
  const { database, directory } = await createTestDatabase();
  try {
    await database.atomic([
      {
        sql: contentInsert,
        params: ["film", "Film title", 1, 1000, 1000],
      },
    ]);

    const ratingInsert = `
      INSERT INTO user_ratings (
        id, content_id, user_id, rating, review, edited, flagged,
        restricted, created_at, updated_at
      ) VALUES (?, 'film', 'member-1', ?, ?, 0, 0, 0, 1000, 1000)
      ON CONFLICT (content_id, user_id) DO NOTHING
    `;

    const created = await database.atomic([
      { sql: ratingInsert, params: ["rating-1", 5, null] },
    ]);
    assert.equal(created[0].changes, 1);
    assert.ok(created[0].lastRowId > 0);

    const updated = await database.atomic([
      { sql: ratingInsert, params: ["rating-2", 10, "A fresh review"] },
      {
        sql: `
          UPDATE user_ratings
          SET rating = ?, review = ?, edited = 1, updated_at = 2000
          WHERE content_id = 'film' AND user_id = 'member-1'
        `,
        params: [10, "A fresh review"],
      },
    ]);
    assert.equal(updated[0].changes, 0);
    assert.equal(updated[1].changes, 1);

    const ratings = await database.publicReads.getUserRatingsForContent(
      "film",
    );
    assert.equal(ratings.length, 1);
    assert.equal(ratings[0].id, "rating-1");
    assert.equal(ratings[0].rating, 10);
    assert.equal(ratings[0].review, "A fresh review");
    assert.equal(ratings[0].edited, true);
  } finally {
    database.close();
    await rm(directory, { recursive: true, force: true });
  }
});