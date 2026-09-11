import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { applySqliteMigrations } from "../helpers/sqlite-migrations";

test("rating summaries remain correct after combined updates", async () => {
  const database = new DatabaseSync(":memory:");
  try {
    await applySqliteMigrations(database);
    database.exec(`
      INSERT INTO content (id, title, content_type, genre, is_movie_of_the_week, created_at, updated_at)
      VALUES ('first', 'First', 'movie', '[]', 0, 0, 0), ('second', 'Second', 'movie', '[]', 0, 0, 0);
      INSERT INTO user_ratings (id, content_id, user_id, rating, edited, flagged, restricted, created_at, updated_at)
      VALUES ('rating', 'first', 'member', 10, 0, 0, 0, 0, 0);
    `);

    database.exec("UPDATE user_ratings SET content_id = 'second', rating = 5, restricted = 1 WHERE id = 'rating'");
    assert.deepEqual(
      database.prepare("SELECT content_id, rating_count, rating_total, average_rating FROM content_rating_summary ORDER BY content_id").all(),
      [],
    );

    database.exec("UPDATE user_ratings SET rating = 10, restricted = 0 WHERE id = 'rating'");
    assert.deepEqual(
      database.prepare("SELECT content_id, rating_count, rating_total, average_rating FROM content_rating_summary").all().map((row) => ({ ...row })),
      [{ content_id: "second", rating_count: 1, rating_total: 10, average_rating: 10 }],
    );
  } finally {
    database.close();
  }
});

test("SQL migrations leave canonical slug generation to the application backfill", async () => {
  const database = new DatabaseSync(":memory:");
  try {
    await applySqliteMigrations(database);
    database.exec(`
      INSERT INTO content (id, title, content_type, genre, is_movie_of_the_week, created_at, updated_at)
      VALUES ('accented', 'Àjàkájú', 'movie', '[]', 0, 0, 0);
    `);
    const row = database.prepare("SELECT slug FROM content WHERE id = 'accented'").get() as { slug: string | null };
    assert.equal(row.slug, null);
  } finally {
    database.close();
  }
});
