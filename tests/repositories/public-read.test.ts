import assert from "node:assert/strict";
import { rm, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { applySqliteMigrations } from "../helpers/sqlite-migrations";
import { createNodeSqliteDatabase } from "../../src/services/node";
import type { ContentInput } from "../../src/repositories/admin-content";
import {
  getHomepageData,
  mergeDiscussions,
} from "../../src/services/homepage";
import {
  contentSlug,
  getContentDetailData,
  resolveContent,
} from "../../src/services/content-detail";
import {
  getReviewPermalinkData,
  getReviewThread,
  getReviewsPage,
} from "../../src/services/review-thread";

test("scoreboard requires 25 ratings, includes qualifying titles beyond 100, and preserves precision", async () => {
  const directory = await mkdtemp(join(tmpdir(), "nfc-scoreboard-"));
  const databasePath = join(directory, "test.sqlite");
  const setup = new DatabaseSync(databasePath);
  try {
    await applySqliteMigrations(setup);
    const insert = setup.prepare("INSERT INTO content (id, title, content_type, created_at, updated_at) VALUES (?, ?, 'movie', 0, 0)");
    for (let i = 0; i < 102; i++) insert.run(`film-${i}`, `Film ${i}`);
    const vote = setup.prepare("INSERT INTO user_ratings (id, content_id, user_id, rating, created_at, updated_at) VALUES (?, ?, ?, ?, 0, 0)");
    for (let i = 0; i < 102; i++) {
      for (let j = 0; j < 25; j++) vote.run(`vote-${i}-${j}`, `film-${i}`, `member-${j}`, i === 0 ? 0 : 5);
    }
    setup.exec(`
      INSERT INTO content (id, title, content_type, created_at, updated_at) VALUES ('tv', 'TV', 'tv_show', 0, 0);
      INSERT INTO user_ratings (id, content_id, user_id, rating, created_at, updated_at) VALUES
        ('a', 'film-0', 'a', 0, 0, 0),
        ('b', 'film-0', 'b', 5, 0, 0),
        ('c', 'film-0', 'c', 5, 0, 0);
    `);
    const legacyVote = setup.prepare("INSERT INTO user_ratings (id, content_id, user_id, rating, restricted, created_at, updated_at) VALUES (?, 'tv', ?, 10, 1, 0, 0)");
    for (let i = 0; i < 24; i++) legacyVote.run(`tv-${i}`, `legacy-poll:tv:${i}`);
  } finally {
    setup.close();
  }
  const database = createNodeSqliteDatabase(databasePath);
  try {
    const rows = await database.publicReads.getScoreboard();
    assert.equal(rows.length, 102);
    assert.equal(rows.find((row) => row.id === "film-0")?.userRating, 10 / 28);
    assert.ok(rows.every((row) => row.ratingsCount >= 25 && row.userRating !== null));
    assert.equal((await database.publicReads.getScoreboard({ contentType: "movie" })).length, 102);
    assert.deepEqual(await database.publicReads.getScoreboard({ contentType: "tv_show" }), []);
    assert.equal((await database.publicReads.getContentById("tv"))?.userRating, null);
    assert.equal((await database.publicReads.getScoreboard({ limit: 2 })).length, 2);
    const writer = new DatabaseSync(databasePath);
    try {
      writer.exec("INSERT INTO user_ratings (id, content_id, user_id, rating, created_at, updated_at) VALUES ('tv-member', 'tv', 'member', 0, 0, 0)");
      assert.equal((await database.publicReads.getContentById("tv"))?.userRating, 240 / 25);
      assert.deepEqual((await database.publicReads.getScoreboard({ contentType: "tv_show" })).map((row) => row.id), ["tv"]);
      writer.exec("DELETE FROM user_ratings WHERE id = 'tv-member'");
      assert.equal((await database.publicReads.getContentById("tv"))?.userRating, null);
      assert.deepEqual(await database.publicReads.getScoreboard({ contentType: "tv_show" }), []);
    } finally {
      writer.close();
    }
  } finally {
    database.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test("detail distributions include legacy polls and all member votes beyond the review page", async () => {
  const directory = await mkdtemp(join(tmpdir(), "nfc-distribution-"));
  const databasePath = join(directory, "test.sqlite");
  const setup = new DatabaseSync(databasePath);
  try {
    await applySqliteMigrations(setup);
    setup.exec("INSERT INTO content (id, title, content_type, created_at, updated_at) VALUES ('legacy', 'Legacy', 'movie', 0, 0), ('mixed', 'Mixed', 'movie', 0, 0), ('empty', 'Empty', 'movie', 0, 0)");
    const insert = setup.prepare("INSERT INTO user_ratings (id, content_id, user_id, rating, restricted, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 0, 0)");
    for (const contentId of ["legacy", "mixed"]) {
      for (let i = 0; i < 30; i++) insert.run(`${contentId}-${i}`, contentId, `legacy-poll:${contentId}:${i}`, [0, 5, 10][i % 3], 1);
    }
    for (let i = 0; i < 60; i++) insert.run(`member-${i}`, "mixed", `member-${i}`, 8, 0);
    insert.run("member-okay", "mixed", "member-okay", 6, 0);
    insert.run("member-bad", "mixed", "member-bad", 2, 0);
    insert.run("hidden", "mixed", "hidden-member", 0, 1);
  } finally {
    setup.close();
  }
  const database = createNodeSqliteDatabase(databasePath);
  try {
    assert.deepEqual(await database.publicReads.getRatingDistribution("empty"), { positive: 0, mixed: 0, negative: 0 });
    for (const [contentId, expected] of [
      ["legacy", { positive: 10, mixed: 10, negative: 10 }],
      ["mixed", { positive: 70, mixed: 11, negative: 11 }],
    ] as const) {
      const detail = await getContentDetailData(database.publicReads, contentId, "movie");
      assert.ok(detail);
      assert.deepEqual(detail.ratingDistribution, expected);
      assert.equal(Object.values(detail.ratingDistribution).reduce((sum, value) => sum + value, 0), detail.item.ratingsCount);
      assert.equal(detail.userRatings.length, contentId === "legacy" ? 0 : 50);
    }
  } finally {
    database.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test("public reads preserve catalog, aggregate, and discussion behavior", async () => {
  const directory = await mkdtemp(join(tmpdir(), "nfc-public-reads-"));
  const databasePath = join(directory, "test.sqlite");
  const setup = new DatabaseSync(databasePath);

  try {
    await applySqliteMigrations(setup);
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
    setup.exec(`
      UPDATE content SET genre = '["Drama", "Comedy"]' WHERE id = 'top';
      UPDATE content SET genre = '["drama"]' WHERE id = 'zero';
      UPDATE content SET genre = '["Action"]' WHERE id = 'motw';
      UPDATE content SET genre = '["Comedy"]' WHERE id = 'uncatalogued';
      INSERT INTO reviews (
        id, content_id, title, description, score_tenths, reviewer,
        published_at, created_at, updated_at
      ) VALUES
        ('critic-published', 'top', 'Published review', 'Published first', 75, 'Critic A', 5000, 5000, 5000),
        ('critic-undated', 'top', 'Undated review', 'Null date last', NULL, 'Critic B', NULL, 7000, 7000);
    `);

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
      UPDATE user_ratings
      SET review = 'Restricted review', restricted = 1
      WHERE id = 'rating-motw';
      INSERT INTO user_ratings (id, content_id, user_id, rating, restricted, review, created_at, updated_at) VALUES
        ('imported-poll', 'top', 'legacy-poll:top:imported', 10, 1, 'Hidden imported text', 0, 0),
        ('hidden-member', 'top', 'hidden-member', 10, 1, 'Moderated member text', 0, 0);
      INSERT INTO comments (
        id, review_id, parent_id, user_id, body, depth, flagged, restricted,
        created_at, updated_at
      ) VALUES
        ('comment-1', 'rating-top-2', NULL, 'member-1', 'First', 0, 0, 0, 1000, 1000),
        ('comment-2', 'rating-top-2', 'comment-1', 'legacy-poll:top:2', 'Second', 1, 0, 0, 2000, 2000),
        ('comment-hidden', 'rating-top-2', NULL, 'member-1', 'Hidden', 0, 0, 1, 3000, 3000),
        ('comment-orphan', 'rating-top-2', 'comment-hidden', 'deleted-member', 'Orphan', 1, 0, 0, 4000, 4000);
    `);

    const discussionInsert = setup.prepare(`
      INSERT INTO discussions (
        id, title, podcast_links, episode_number,
        discussion_date, created_at, updated_at
      ) VALUES (?, ?, '[]', ?, ?, ?, ?)
    `);
    discussionInsert.run("future", "Future", 3, 3000, 3000, 3000);
    discussionInsert.run("past", "Past", 2, 1000, 1000, 1000);
    discussionInsert.run("undated", "Undated", 1, null, 2000, 2000);
    discussionInsert.run(
      "standalone",
      "Standalone",
      4,
      1000,
      1000,
      1000,
    );
    setup.exec(`
      INSERT INTO discussion_content (discussion_id, content_id) VALUES
        ('future', 'top'),
        ('past', 'top'),
        ('past', 'zero'),
        ('undated', 'top');
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

  const database = createNodeSqliteDatabase(databasePath);
  try {
    const movieOfTheWeek = await database.publicReads.getMovieOfTheWeek();
    assert.equal(movieOfTheWeek?.id, "motw");
    assert.equal(movieOfTheWeek?.userRating, null);

    const catalog = await database.publicReads.getAllContent();
    assert.deepEqual(
      catalog.map(({ id, userRating }) => ({ id, userRating })),
      [
        { id: "top", userRating: null },
        { id: "zero", userRating: null },
        { id: "motw", userRating: null },
        { id: "uncatalogued", userRating: null },
      ],
    );
    assert.deepEqual(
      (await database.publicReads.getMoviesAndTVSeries()).map((item) => item.id),
      ["top", "zero", "uncatalogued"],
    );

    const poster = await database.media.create({
      objectKey: "media/nfc/top_catalog_title/v42.jpg",
      publicId: "nfc/top_catalog_title",
      version: 42,
      mimeType: "image/jpeg",
      byteSize: 100,
      checksum: "poster-checksum",
    });
    const contentUpdate = {
      title: "Top catalog title",
      contentType: "movie",
      runtime: null,
      releaseDate: null,
      rating: null,
      synopsis: null,
      genre: ["Drama", "Comedy"],
      posterImage: "/media/media/nfc/top_catalog_title/v42.jpg",
      posterVersion: null,
      trailerUrl: null,
      streamingUrl: null,
      streamingPlatform: null,
      otherPlatform: null,
      viewingCategory: null,
      castMembers: null,
      isMovieOfTheWeek: false,
      nfcCertified: true,
    } satisfies ContentInput;
    const updatedContent = await database.adminContent.update("top", contentUpdate);
    assert.equal(updatedContent?.posterMediaId, poster.id);
    assert.equal(updatedContent?.posterObjectKey, "media/nfc/top_catalog_title/v42.jpg");
    assert.equal(
      (await database.publicReads.getContentById("top"))?.posterImage,
      "/media/media/nfc/top_catalog_title/v42.jpg",
    );
    assert.equal((await database.publicReads.getContentById("top"))?.nfcCertified, true);
    assert.deepEqual(await database.publicReads.getScoreboard(), []);
    const { nfcCertified: _certification, ...withoutCertification } = contentUpdate;
    await database.adminContent.update("top", withoutCertification);
    assert.equal((await database.publicReads.getContentById("top"))?.nfcCertified, true);
    await database.adminContent.update("top", { ...withoutCertification, nfcCertified: false });
    assert.equal((await database.publicReads.getContentById("top"))?.nfcCertified, false);
    assert.equal((await database.publicReads.getContentById("top"))?.userRating, null);

    const scoreboard = await database.publicReads.getScoreboard();
    assert.deepEqual(
      scoreboard.map(({ id, userRating, ratingsCount }) => ({
        id,
        userRating,
        ratingsCount,
      })),
      [],
    );

    const visible = await database.publicReads.getDiscussions({
      now: new Date(2000),
    });
    assert.deepEqual(
      visible.map((discussion) => discussion.id),
      ["standalone", "past", "undated"],
    );
    assert.deepEqual(visible[0].contents, []);
    assert.deepEqual(
      visible
        .find((discussion) => discussion.id === "past")
        ?.contents.map(({ id }) => id),
      ["top", "zero"],
    );
    assert.equal(await database.publicReads.countDiscussions(new Date(2000)), 3);
    assert.deepEqual(
      (
        await database.publicReads.getDiscussionsForContent("top", new Date(2000))
      ).map((discussion) => discussion.id),
      ["undated", "past"],
    );
    assert.deepEqual(
      (
        await database.publicReads.getDiscussionsForContent("zero", new Date(2000))
      ).map((discussion) => discussion.id),
      ["past"],
    );
    const firstDiscussionPage = await database.publicReads.getDiscussions({
      limit: 2,
      offset: 0,
      now: new Date(2000),
    });
    const secondDiscussionPage = await database.publicReads.getDiscussions({
      limit: 2,
      offset: 2,
      now: new Date(2000),
    });
    assert.deepEqual(
      [...firstDiscussionPage, ...secondDiscussionPage].map(({ id }) => id),
      ["standalone", "past", "undated"],
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
          commentCount: 3,
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

    const contentById = await database.publicReads.getContentById("top");
    assert.equal(contentById?.userRating, null);
    assert.equal(contentById?.ratingsCount, 3);
    assert.equal(contentSlug("Àjàkájú", new Date("2024-01-01Z")), "ajakaju-2024");
    assert.equal(
      (await resolveContent(database.publicReads, "top-catalog-title", "movie"))?.id,
      "top",
    );
    assert.equal(
      await resolveContent(database.publicReads, "missing-title", "movie"),
      null,
    );

    const detail = await getContentDetailData(
      database.publicReads,
      "top-catalog-title",
      "movie",
    );
    assert.equal(detail?.canonicalPath, "/movie/top-catalog-title");
    assert.equal(detail?.item.ratingsCount, 3);
    assert.deepEqual(
      detail?.userRatings.map(({ id, username }) => ({ id, username })),
      [
        { id: "rating-top-2", username: "Legacy Member" },
        { id: "rating-top-1", username: "Ada Member" },
      ],
    );
    const firstRatingsPage = await database.publicReads.getUserRatingsForContent(
      "top",
      { limit: 1 },
    );
    const secondRatingsPage = await database.publicReads.getUserRatingsForContent(
      "top",
      { limit: 1, cursor: firstRatingsPage[0].id },
    );
    assert.equal(firstRatingsPage.length, 1);
    assert.equal(secondRatingsPage.length, 1);
    assert.notEqual(firstRatingsPage[0].id, secondRatingsPage[0].id);
    assert.deepEqual(
      detail?.criticReviews.map(({ id, score }) => ({ id, score })),
      [
        { id: "critic-published", score: 7.5 },
        { id: "critic-undated", score: null },
      ],
    );
    assert.deepEqual(
      detail?.related.map((item) => item.id),
      ["zero", "uncatalogued", "motw"],
    );

    const feedReview = await database.publicReads.getFeedReviewById(
      "rating-top-2",
    );
    assert.equal(feedReview?.username, "Legacy Member");
    assert.equal(feedReview?.commentCount, 3);
    assert.equal(
      await database.publicReads.getFeedReviewById("rating-motw"),
      null,
    );

    const thread = await getReviewThread(
      database.publicReads,
      "rating-top-2",
    );
    assert.deepEqual(
      thread.map(({ id, username, replies }) => ({
        id,
        username,
        replies: replies.map((reply) => ({
          id: reply.id,
          username: reply.username,
        })),
      })),
      [
        {
          id: "comment-1",
          username: "Ada Member",
          replies: [{ id: "comment-2", username: "Legacy Member" }],
        },
      ],
    );
    const firstCommentsPage = await database.publicReads.getVisibleCommentsForReview(
      "rating-top-2",
      { limit: 1 },
    );
    const secondCommentsPage = await database.publicReads.getVisibleCommentsForReview(
      "rating-top-2",
      { limit: 1, cursor: firstCommentsPage[0].id },
    );
    assert.equal(firstCommentsPage.length, 1);
    assert.equal(secondCommentsPage.length, 1);
    assert.notEqual(firstCommentsPage[0].id, secondCommentsPage[0].id);
    const permalink = await getReviewPermalinkData(
      database.publicReads,
      "rating-top-2",
    );
    assert.equal(permalink?.review.id, "rating-top-2");
    assert.equal(permalink?.thread[0].replies[0].id, "comment-2");
    assert.equal(
      await getReviewPermalinkData(database.publicReads, "rating-motw"),
      null,
    );
    const firstReviewsPage = await getReviewsPage(database.publicReads, "-2", {
      pageSize: 2,
      now,
    });
    assert.deepEqual(
      {
        ids: firstReviewsPage.reviews.map((review) => review.id),
        total: firstReviewsPage.total,
        totalPages: firstReviewsPage.totalPages,
        page: firstReviewsPage.page,
      },
      {
        ids: ["rating-top-1", "rating-top-2"],
        total: 3,
        totalPages: 2,
        page: 1,
      },
    );
    const lastReviewsPage = await getReviewsPage(database.publicReads, "99", {
      pageSize: 2,
      now,
    });
    assert.equal(lastReviewsPage.page, 2);
    assert.deepEqual(
      lastReviewsPage.reviews.map((review) => review.id),
      ["rating-zero"],
    );

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
