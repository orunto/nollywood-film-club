import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { NodeSqliteDatabase } from "../../src/services/node";
import { getHomepageData } from "../../src/services/homepage";
import {
  contentSlug,
  getContentDetailData,
} from "../../src/services/content-detail";
import { getReviewPermalinkData } from "../../src/services/review-thread";

const stateDirectory = resolve(
  "data/local-d1-import/v3/d1/miniflare-D1DatabaseObject",
);
const databaseFiles = (await readdir(stateDirectory)).filter(
  (name) => name.endsWith(".sqlite") && name !== "metadata.sqlite",
);
assert.equal(databaseFiles.length, 1, "Expected one local D1 database file");

const databasePath = resolve(stateDirectory, databaseFiles[0]);
const raw = new DatabaseSync(databasePath, { readOnly: true });
const database = new NodeSqliteDatabase(databasePath, { readOnly: true });
const now = new Date();

try {
  const [
    movieOfTheWeek,
    catalog,
    homepageCatalog,
    scoreboard,
    discussionRows,
    trendingReviews,
    homepage,
  ] = await Promise.all([
    database.publicReads.getMovieOfTheWeek(),
    database.publicReads.getAllContent(),
    database.publicReads.getMoviesAndTVSeries(),
    database.publicReads.getScoreboard(),
    database.publicReads.getDiscussions({ now }),
    database.publicReads.getTrendingReviews({ now }),
    getHomepageData(database.publicReads, now),
  ]);

  const expectedMovie = raw
    .prepare("SELECT id FROM content WHERE is_movie_of_the_week = 1 LIMIT 1")
    .get() as { id: string } | undefined;
  assert.equal(movieOfTheWeek?.id, expectedMovie?.id);

  const contentCount = raw.prepare("SELECT count(*) AS count FROM content").get() as {
    count: number;
  };
  assert.equal(catalog.length, contentCount.count);
  assert.equal(homepageCatalog.length, Math.min(contentCount.count - 1, 20));
  assert.ok(homepageCatalog.every((item) => !item.isMovieOfTheWeek));

  const expectedScoreboard = raw
    .prepare(`
      SELECT content.id, avg(user_ratings.rating) AS average, count(user_ratings.id) AS count
      FROM content
      LEFT JOIN user_ratings ON content.id = user_ratings.content_id
      GROUP BY content.id
      HAVING avg(user_ratings.rating) IS NOT NULL
      ORDER BY avg(user_ratings.rating) DESC
      LIMIT 100
    `)
    .all() as Array<{ id: string; average: number; count: number }>;
  assert.deepEqual(
    scoreboard.map(({ id, userRating, ratingsCount }) => ({
      id,
      average: userRating,
      count: ratingsCount,
    })),
    expectedScoreboard.map(({ id, average, count }) => ({ id, average, count })),
  );

  const visibleDiscussionCount = raw
    .prepare(
      "SELECT count(*) AS count FROM discussions WHERE discussion_date IS NULL OR discussion_date <= ?",
    )
    .get(now.getTime()) as { count: number };
  assert.equal(
    await database.publicReads.countDiscussions(now),
    visibleDiscussionCount.count,
  );
  assert.equal(
    discussionRows.length,
    Math.min(visibleDiscussionCount.count, 20),
  );

  const visibleReviewCount = raw
    .prepare(
      "SELECT count(*) AS count FROM user_ratings WHERE restricted = 0 AND review IS NOT NULL AND review <> ''",
    )
    .get() as { count: number };
  assert.equal(
    await database.publicReads.countTrendingReviews(),
    visibleReviewCount.count,
  );
  assert.equal(trendingReviews.length, Math.min(visibleReviewCount.count, 12));
  assert.equal(homepage.movieOfTheWeek?.id, movieOfTheWeek?.id);
  assert.equal(homepage.moviesAndTVSeries.length, homepageCatalog.length);
  assert.equal(homepage.reviews.length, Math.min(visibleReviewCount.count, 4));
  assert.equal(homepage.discussions.length, discussionRows.length);

  assert.ok(movieOfTheWeek);
  const detailById = await getContentDetailData(
    database.publicReads,
    movieOfTheWeek.id,
  );
  const detailBySlug = await getContentDetailData(
    database.publicReads,
    contentSlug(movieOfTheWeek.title, movieOfTheWeek.releaseDate),
  );
  assert.equal(detailById?.item.id, movieOfTheWeek.id);
  assert.equal(detailBySlug?.item.id, movieOfTheWeek.id);
  assert.equal(detailById?.canonicalPath, detailBySlug?.canonicalPath);

  const expectedDetailCounts = raw
    .prepare(`
      SELECT
        (SELECT count(*) FROM user_ratings WHERE content_id = ?) AS ratings,
        (SELECT count(*) FROM discussions WHERE content_id = ?) AS discussions,
        (SELECT count(*) FROM reviews WHERE content_id = ?) AS reviews
    `)
    .get(movieOfTheWeek.id, movieOfTheWeek.id, movieOfTheWeek.id) as {
      ratings: number;
      discussions: number;
      reviews: number;
    };
  assert.equal(detailById?.userRatings.length, expectedDetailCounts.ratings);
  assert.equal(detailById?.episodes.length, expectedDetailCounts.discussions);
  assert.equal(detailById?.criticReviews.length, expectedDetailCounts.reviews);
  assert.ok(
    detailById?.related.every((item) => item.id !== movieOfTheWeek.id),
  );

  let permalinkComments = 0;
  if (trendingReviews.length > 0) {
    const permalink = await getReviewPermalinkData(
      database.publicReads,
      trendingReviews[0].id,
    );
    assert.equal(permalink?.review.id, trendingReviews[0].id);
    const expectedComments = raw
      .prepare(
        "SELECT count(*) AS count FROM comments WHERE review_id = ? AND restricted = 0",
      )
      .get(trendingReviews[0].id) as { count: number };
    assert.equal(permalink?.review.commentCount, expectedComments.count);
    permalinkComments = expectedComments.count;
  }

  console.log(
    JSON.stringify({
      message: "Portable public-read repository validation complete",
      content: catalog.length,
      homepageContent: homepageCatalog.length,
      scoreboard: scoreboard.length,
      visibleDiscussions: visibleDiscussionCount.count,
      homepageDiscussions: discussionRows.length,
      trendingReviews: visibleReviewCount.count,
      detailRatings: expectedDetailCounts.ratings,
      detailDiscussions: expectedDetailCounts.discussions,
      detailCriticReviews: expectedDetailCounts.reviews,
      permalinkComments,
      movieOfTheWeek: movieOfTheWeek?.id ?? null,
    }),
  );
} finally {
  raw.close();
  database.close();
}
