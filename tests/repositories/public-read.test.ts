import assert from "node:assert/strict";
import { readFile, rm, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { NodeSqliteDatabase } from "../../src/services/node";

test("public reads preserve catalog, aggregate, and discussion behavior", async () => {
  const directory = await mkdtemp(join(tmpdir(), "nfc-public-reads-"));
  const databasePath = join(directory, "test.sqlite");
  const setup = new DatabaseSync(databasePath);

  try {
    setup.exec(
      await readFile(
        resolve("drizzle-sqlite/0000_secret_iron_monger.sql"),
        "utf8",
      ),
    );
    const contentInsert = setup.prepare(`
      INSERT INTO content (
        id, title, content_type, genre, is_movie_of_the_week,
        catalog_number, created_at, updated_at
      ) VALUES (?, ?, 'movie', '[]', ?, ?, ?, ?)
    `);
    contentInsert.run("motw", "Movie of the week", 1, 1, 1000, 1000);
    contentInsert.run("top", "Top catalog title", 0, 4, 4000, 4000);
    contentInsert.run("zero", "Zero-rated title", 0, 3, 3000, 3000);
    contentInsert.run(
      "uncatalogued",
      "Uncatalogued title",
      0,
      null,
      2000,
      2000,
    );

    const ratingInsert = setup.prepare(`
      INSERT INTO user_ratings (
        id, content_id, user_id, rating, edited, flagged, restricted,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, 0, 0, 0, 1000, 1000)
    `);
    ratingInsert.run("rating-motw", "motw", "member-1", 10);
    ratingInsert.run("rating-top-1", "top", "member-1", 0);
    ratingInsert.run("rating-top-2", "top", "member-2", 10);
    ratingInsert.run("rating-zero", "zero", "member-1", 0);

    const discussionInsert = setup.prepare(`
      INSERT INTO discussions (
        id, title, content_id, podcast_links, episode_number,
        discussion_date, created_at, updated_at
      ) VALUES (?, ?, ?, '[]', ?, ?, ?, ?)
    `);
    discussionInsert.run("future", "Future", "top", 3, 3000, 3000, 3000);
    discussionInsert.run("past", "Past", "top", 2, 1000, 1000, 1000);
    discussionInsert.run("undated", "Undated", "top", 1, null, 2000, 2000);
    discussionInsert.run(
      "standalone",
      "Standalone",
      null,
      4,
      1000,
      1000,
      1000,
    );
  } finally {
    setup.close();
  }

  const database = new NodeSqliteDatabase(databasePath);
  try {
    const movieOfTheWeek = await database.publicReads.getMovieOfTheWeek();
    assert.equal(movieOfTheWeek?.id, "motw");
    assert.equal(movieOfTheWeek?.userRating, null);

    const catalog = await database.publicReads.getAllContent();
    assert.deepEqual(
      catalog.map(({ id, userRating }) => ({ id, userRating })),
      [
        { id: "top", userRating: 5 },
        { id: "zero", userRating: 0 },
        { id: "motw", userRating: 10 },
        { id: "uncatalogued", userRating: null },
      ],
    );
    assert.deepEqual(
      (await database.publicReads.getMoviesAndTVSeries()).map((item) => item.id),
      ["top", "zero", "uncatalogued"],
    );

    const scoreboard = await database.publicReads.getScoreboard();
    assert.deepEqual(
      scoreboard.map(({ id, userRating, ratingsCount }) => ({
        id,
        userRating,
        ratingsCount,
      })),
      [
        { id: "motw", userRating: 10, ratingsCount: 1 },
        { id: "top", userRating: 5, ratingsCount: 2 },
        { id: "zero", userRating: 0, ratingsCount: 1 },
      ],
    );

    const visible = await database.publicReads.getDiscussions({
      now: new Date(2000),
    });
    assert.deepEqual(
      visible.map((discussion) => discussion.id),
      ["standalone", "past", "undated"],
    );
    assert.equal(visible[0].content, null);
    assert.equal(await database.publicReads.countDiscussions(new Date(2000)), 3);
    assert.deepEqual(
      (
        await database.publicReads.getDiscussionsForContent("top")
      ).map((discussion) => discussion.id),
      ["undated", "past", "future"],
    );
  } finally {
    database.close();
    await rm(directory, { recursive: true, force: true });
  }
});
