import assert from "node:assert/strict";
import { readFile, rm, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { NodeSqliteDatabase } from "../../src/services/node";
import {
  getHomepageData,
  mergeDiscussions,
} from "../../src/services/homepage";

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
    setup.exec(`
      INSERT INTO users (
        id, name, email, email_verified, regular, role, created_at, updated_at
      ) VALUES (
        'member-1', 'Ada Member', 'ada@example.com', 1, 1, 'user', 1000, 1000
      );
      UPDATE user_ratings
      SET review = 'A fresh local review', created_at = 32400000
      WHERE id = 'rating-top-1';
      UPDATE user_ratings
      SET user_id = 'legacy-poll:top:1', review = 'A busy legacy review', created_at = 0
      WHERE id = 'rating-top-2';
      UPDATE user_ratings
      SET user_id = 'deleted-member', review = 'A deleted member review', created_at = 18000000
      WHERE id = 'rating-zero';
      INSERT INTO comments (
        id, review_id, user_id, body, depth, flagged, restricted,
        created_at, updated_at
      ) VALUES
        ('comment-1', 'rating-top-2', 'member-1', 'First', 0, 0, 0, 1000, 1000),
        ('comment-2', 'rating-top-2', 'member-1', 'Second', 0, 0, 0, 1000, 1000),
        ('comment-hidden', 'rating-top-2', 'member-1', 'Hidden', 0, 0, 1, 1000, 1000);
    `);

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
    setup.exec(`
      UPDATE discussions
      SET space_url = 'https://space.example/past',
          podcast_links = '["https://podcast.example/past"]'
      WHERE id = 'past';
      UPDATE discussions
      SET podcast_links = '["https://podcast.example/future"]'
      WHERE id = 'future';
    `);
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

    const now = new Date(36_000_000);
    const trending = await database.publicReads.getTrendingReviews({ now });
    assert.deepEqual(
      trending.map(
        ({ id, username, profileUsername, isRegular, commentCount }) => ({
          id,
          username,
          profileUsername,
          isRegular,
          commentCount,
        }),
      ),
      [
        {
          id: "rating-top-1",
          username: "Ada Member",
          profileUsername: null,
          isRegular: true,
          commentCount: 0,
        },
        {
          id: "rating-top-2",
          username: "Legacy Member",
          profileUsername: null,
          isRegular: false,
          commentCount: 2,
        },
        {
          id: "rating-zero",
          username: "Deleted member",
          profileUsername: null,
          isRegular: false,
          commentCount: 0,
        },
      ],
    );
    assert.equal(await database.publicReads.countTrendingReviews(), 3);
    assert.equal(trending[0].film?.title, "Top catalog title");

    const contentDiscussions =
      await database.publicReads.getDiscussionsForContent("top");
    assert.deepEqual(mergeDiscussions(contentDiscussions), {
      spaceUrl: "https://space.example/past",
      podcastLinks: [
        "https://podcast.example/past",
        "https://podcast.example/future",
      ],
      discussionDate: new Date(1000).toISOString(),
    });

    const homepage = await getHomepageData(database.publicReads, now);
    assert.equal(homepage.movieOfTheWeek?.id, "motw");
    assert.equal(homepage.moviesAndTVSeries.length, 3);
    assert.equal(homepage.reviews.length, 3);
    assert.equal(homepage.discussions.length, 4);
    assert.deepEqual(homepage.movieOfTheWeekDiscussion, {
      spaceUrl: null,
      podcastLinks: null,
      discussionDate: null,
    });
  } finally {
    database.close();
    await rm(directory, { recursive: true, force: true });
  }
});
