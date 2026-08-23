import assert from "node:assert/strict";
import { rm, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import {
  normalizeHexclaveUser,
  type HexclaveExportUser,
} from "../../tools/migration/import-hexclave-users";
import {
  mapBlogPostRow,
  mapCommentRow,
  mapContactRow,
  mapContentRow,
  mapDiscussionContentRow,
  mapDiscussionRow,
  mapRatingRow,
  mapReportRow,
  mapReviewRow,
  mapUserRow,
  planSqliteImport,
  renderImportSql,
  type SqliteImportInput,
} from "../../tools/migration/transform-sqlite";
import { applySqliteMigrations } from "../helpers/sqlite-migrations";

function hexclaveUser(
  overrides: Partial<HexclaveExportUser> = {},
): HexclaveExportUser {
  return {
    id: "user-1",
    displayName: "Iroko Critic",
    primaryEmail: "Critic@Example.com",
    primaryEmailVerified: true,
    profileImageUrl: null,
    signedUpAt: "2024-01-15T10:00:00.000Z",
    clientMetadata: { username: "IrokoCritic" },
    clientReadOnlyMetadata: { role: "user", regular: true },
    hasPassword: true,
    isAnonymous: false,
    oauthProviders: ["google"],
    ...overrides,
  };
}

function baseInput(
  overrides: Partial<SqliteImportInput> = {},
): SqliteImportInput {
  return {
    userMirrors: [],
    hexclaveUsers: [],
    content: [],
    discussions: [],
    ratings: [],
    reviews: [],
    comments: [],
    reports: [],
    contacts: [],
    blogPosts: [],
    ...overrides,
  };
}

test("user rows are normalized identically to the standalone import tool", () => {
  const user = hexclaveUser();
  const plan = planSqliteImport(
    baseInput({
      hexclaveUsers: [user],
      userMirrors: [{ id: user.id, email: "critic@example.com", username: null }],
    }),
  );

  const planned = normalizeHexclaveUser(user);
  assert.equal(plan.rowCounts.users, 1);
  assert.deepEqual(plan.definitions[0].rows, [mapUserRow(planned)]);
  assert.deepEqual(mapUserRow(planned), {
    id: "user-1",
    name: "Iroko Critic",
    email: "critic@example.com",
    email_verified: 1,
    image: null,
    username: "irokocritic",
    role: "user",
    regular: 1,
    created_at: new Date("2024-01-15T10:00:00.000Z").getTime(),
    updated_at: new Date("2024-01-15T10:00:00.000Z").getTime(),
  });
});

test("the Neon user mirror's username is authoritative and lowercased", () => {
  const user = hexclaveUser({
    clientMetadata: { username: "HexclaveHandle" },
  });
  const plan = planSqliteImport(
    baseInput({
      hexclaveUsers: [user],
      userMirrors: [{ id: user.id, email: "critic@example.com", username: "MirrorHandle" }],
    }),
  );
  assert.equal(plan.definitions[0].rows[0].username, "mirrorhandle");
});

test("a missing mirror username falls back to Hexclave metadata, lowercased", () => {
  const user = hexclaveUser({ clientMetadata: { username: "MetaHandle" } });
  const plan = planSqliteImport(
    baseInput({
      hexclaveUsers: [user],
      userMirrors: [{ id: user.id, email: "critic@example.com", username: null }],
    }),
  );
  assert.equal(plan.definitions[0].rows[0].username, "metahandle");
});

test("a username collision drops the incoming username instead of failing", () => {
  const first = hexclaveUser({ id: "u1", clientMetadata: { username: "Shared" } });
  const second = hexclaveUser({
    id: "u2",
    displayName: "Other",
    primaryEmail: "other@example.com",
    clientMetadata: { username: "shared" },
  });
  const plan = planSqliteImport(
    baseInput({ hexclaveUsers: [first, second] }),
  );

  const rows = plan.definitions[0].rows as Array<{ id: string; username: string | null }>;
  assert.equal(rows[0].username, "shared");
  assert.equal(rows[1].username, null);
  assert.deepEqual(plan.usernameDropped, ["u2 (u2)"]);
});

test("an email collision is fatal", () => {
  const first = hexclaveUser({ id: "u1", primaryEmail: "same@example.com" });
  const second = hexclaveUser({
    id: "u2",
    primaryEmail: "Same@Example.com",
    displayName: "Other",
  });
  assert.throws(
    () => planSqliteImport(baseInput({ hexclaveUsers: [first, second] })),
    /Email collision/,
  );
});

test("claims and row counts are reported for every table", () => {
  const plan = planSqliteImport(
    baseInput({
      hexclaveUsers: [hexclaveUser()],
      content: [
        {
          id: "c1",
          title: "Ijé",
          content_type: "movie",
          is_movie_of_the_week: false,
          created_at: "2024-01-01T00:00:00.000Z",
          updated_at: "2024-01-01T00:00:00.000Z",
        },
      ],
    }),
  );
  assert.deepEqual(plan.rowCounts, {
    users: 1,
    media: 0,
    content: 1,
    discussions: 0,
    discussion_content: 0,
    user_ratings: 0,
    reviews: 0,
    comments: 0,
    reports: 0,
    contact_messages: 0,
    blog_posts: 0,
  });
  assert.deepEqual(plan.claims, [
    {
      userId: "user-1",
      hasPassword: true,
      providers: ["google"],
      requiresPasswordReset: true,
      requiresProviderClaim: true,
      requiresEmailClaim: false,
    },
  ]);
});

test("content rows map Postgres types onto canonical columns", () => {
  const row = mapContentRow({
    id: "c1",
    title: "Ijé",
    content_type: "movie",
    runtime: 90,
    release_date: "2024-05-01T00:00:00.000Z",
    rating: "PG",
    synopsis: "A story",
    genre: ["Drama", "Music"],
    poster_image: "nfc/poster",
    poster_version: 3,
    trailer_url: "https://trailer",
    streaming_url: "https://stream",
    streaming_platform: "netflix",
    other_platform: null,
    viewing_category: "streaming",
    cast_members: [
      { role: "actor", name: "Chioma", characterName: null },
    ],
    is_movie_of_the_week: true,
    catalog_number: null,
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-06-01 12:30:00",
  });

  assert.deepEqual(row, {
    id: "c1",
    title: "Ijé",
    content_type: "movie",
    runtime: 90,
    release_date: new Date("2024-05-01T00:00:00.000Z").getTime(),
    rating: "PG",
    synopsis: "A story",
    genre: '["Drama","Music"]',
    poster_media_id: null,
    poster_image: "nfc/poster",
    poster_version: 3,
    trailer_url: "https://trailer",
    streaming_url: "https://stream",
    streaming_platform: "netflix",
    other_platform: null,
    viewing_category: "streaming",
    cast_members:
      '[{"role":"actor","name":"Chioma","characterName":null}]',
    is_movie_of_the_week: 1,
    catalog_number: null,
    created_at: new Date("2024-01-01T00:00:00.000Z").getTime(),
    updated_at: new Date("2024-06-01T12:30:00Z").getTime(),
  });
});

test("content genre defaults to an empty JSON array when absent", () => {
  const row = mapContentRow({
    id: "c1",
    title: "Ijé",
    content_type: "movie",
    genre: null,
    is_movie_of_the_week: false,
    cast_members: null,
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-01-01T00:00:00.000Z",
  });
  assert.equal(row.genre, "[]");
  assert.equal(row.is_movie_of_the_week, 0);
  assert.equal(row.cast_members, null);
});

test("media references are deterministic and shared by imported rows", () => {
  const plan = planSqliteImport(
    baseInput({
      content: [
        {
          id: "c1",
          title: "Ijé",
          content_type: "movie",
          poster_image: "https://res.cloudinary.com/demo/image/upload/v42/nfc/poster.jpg",
          poster_version: 42,
          is_movie_of_the_week: false,
          created_at: "2024-01-01T00:00:00.000Z",
          updated_at: "2024-01-01T00:00:00.000Z",
        },
      ],
      reviews: [
        {
          id: "rv1",
          content_id: "c1",
          title: "Review",
          description: "A review",
          score: "8",
          reviewer: "Critic",
          review_image: "nfc/review",
          created_at: "2024-01-01T00:00:00.000Z",
          updated_at: "2024-01-01T00:00:00.000Z",
        },
      ],
    }),
  );

  const mediaRows = plan.definitions.find((definition) => definition.table === "media")?.rows ?? [];
  const contentRow = plan.definitions.find((definition) => definition.table === "content")?.rows[0];
  const reviewRow = plan.definitions.find((definition) => definition.table === "reviews")?.rows[0];
  assert.equal(mediaRows.length, 2);
  assert.equal(contentRow?.poster_media_id, mediaRows[0]?.id);
  assert.equal(reviewRow?.review_media_id, mediaRows[1]?.id);
  assert.equal(mediaRows[0]?.original_provider, "cloudinary");
});

test("legacy discussion content links become join rows", () => {
  const row = mapDiscussionRow({
    id: "d1",
    title: "Episode 12",
    description: null,
    content_id: "c1",
    space_url: "https://space",
    podcast_links: ["https://podcast/1"],
    episode_number: 12,
    discussion_date: null,
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-01-01T00:00:00.000Z",
  });
  assert.equal(row.podcast_links, '["https://podcast/1"]');
  assert.equal(row.episode_number, 12);
  assert.equal(row.discussion_date, null);
  assert.equal("content_id" in row, false);
  assert.deepEqual(
    mapDiscussionContentRow({ id: "d1", content_id: "c1" }),
    { discussion_id: "d1", content_id: "c1" },
  );
  assert.equal(mapDiscussionContentRow({ id: "d2", content_id: null }), null);
});

test("rating rows convert booleans and keep the canonical rating scale", () => {
  const row = mapRatingRow({
    id: "r1",
    content_id: "c1",
    user_id: "u1",
    rating: 10,
    review: "Loved it",
    edited: true,
    flagged: false,
    restricted: false,
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-01-01T00:00:00.000Z",
  });
  assert.deepEqual(row, {
    id: "r1",
    content_id: "c1",
    user_id: "u1",
    rating: 10,
    review: "Loved it",
    edited: 1,
    flagged: 0,
    restricted: 0,
    created_at: new Date("2024-01-01T00:00:00.000Z").getTime(),
    updated_at: new Date("2024-01-01T00:00:00.000Z").getTime(),
  });
});

test("review scores become integer tenths", () => {
  assert.equal(mapReviewRow({
    id: "rv1",
    content_id: "c1",
    title: "Great",
    description: "Loved it",
    score: "7.5",
    reviewer: "Filmbuzz",
    external_url: null,
    review_image: "nfc/review",
    published_at: "2024-01-01T00:00:00.000Z",
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-01-01T00:00:00.000Z",
  }).score_tenths, 75);
  assert.equal(mapReviewRow({
    id: "rv1",
    content_id: "c1",
    title: "Great",
    description: "Loved it",
    score: "8",
    reviewer: "Filmbuzz",
    external_url: null,
    review_image: null,
    published_at: null,
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-01-01T00:00:00.000Z",
  }).score_tenths, 80);
  assert.throws(
    () => mapReviewRow({
      id: "rv1",
      content_id: "c1",
      title: "Great",
      description: "Loved it",
      score: "not-a-score",
      reviewer: "Filmbuzz",
      external_url: null,
      review_image: null,
      published_at: null,
      created_at: "2024-01-01T00:00:00.000Z",
      updated_at: "2024-01-01T00:00:00.000Z",
    }),
    /Invalid review score/,
  );
});

test("comment, report, contact, and blog rows map cleanly", () => {
  const comment = mapCommentRow({
    id: "cm1",
    review_id: "r1",
    parent_id: null,
    user_id: "u1",
    body: "I agree",
    depth: 0,
    flagged: false,
    restricted: true,
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-01-01T00:00:00.000Z",
  });
  assert.equal(comment.depth, 0);
  assert.equal(comment.restricted, 1);

  const report = mapReportRow({
    id: "rp1",
    target_type: "review",
    target_id: "rv1",
    reporter_id: "u2",
    reason: "spoiler",
    note: null,
    status: "open",
    resolved_by: null,
    resolved_at: null,
    created_at: "2024-01-01T00:00:00.000Z",
  });
  assert.equal(report.status, "open");
  assert.equal(report.resolved_at, null);

  const contact = mapContactRow({
    id: "ct1",
    category: "bug",
    message: "It broke",
    email: "a@b.com",
    user_id: null,
    status: "open",
    resolved_by: null,
    resolved_at: null,
    created_at: "2024-01-01T00:00:00.000Z",
  });
  assert.equal(contact.user_id, null);

  const blog = mapBlogPostRow({
    id: "b1",
    title: "Post",
    content: "Body",
    excerpt: "Short",
    slug: "post",
    published: true,
    published_at: "2024-01-01T00:00:00.000Z",
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-01-01T00:00:00.000Z",
  });
  assert.equal(blog.published, 1);
  assert.equal(blog.slug, "post");
});

test("rendered SQL is transactional, clears in FK-safe order, and recomputes catalog numbers", () => {
  const plan = planSqliteImport(
    baseInput({
      hexclaveUsers: [hexclaveUser()],
      content: [{ id: "c1", title: "Ijé", content_type: "movie", is_movie_of_the_week: true, created_at: "2024-01-01T00:00:00.000Z", updated_at: "2024-01-01T00:00:00.000Z" }],
    }),
  );
  const sql = renderImportSql(plan.definitions);

  assert.match(sql, /PRAGMA foreign_keys = ON/);
  assert.match(sql, /BEGIN IMMEDIATE/);
  assert.match(sql, /COMMIT/);
  assert.ok(
    sql.indexOf('DELETE FROM "comments"') < sql.indexOf('DELETE FROM "users"'),
  );
  assert.ok(
    sql.indexOf('DELETE FROM "discussion_content"') <
      sql.indexOf('DELETE FROM "discussions"'),
  );
  assert.match(sql, /catalog_number = \(/);
  assert.ok(sql.includes('INSERT INTO "users"'));
});

test("string literals escape single quotes", () => {
  const plan = planSqliteImport(
    baseInput({
      hexclaveUsers: [hexclaveUser({ displayName: "It's the Critic" })],
    }),
  );
  const sql = renderImportSql(plan.definitions);
  assert.ok(sql.includes("'It''s the Critic'"));
});

test("the rendered SQL applies cleanly to a fresh canonical schema database", async () => {
  const directory = await mkdtemp(join(tmpdir(), "nfc-transform-"));
  const databasePath = join(directory, "test.sqlite");
  const setup = new DatabaseSync(databasePath);
  try {
    await applySqliteMigrations(setup);
  } finally {
    setup.close();
  }

  try {
    const plan = planSqliteImport({
      userMirrors: [
        { id: "u1", email: "critic@example.com", username: "IrokoCritic" },
      ],
      hexclaveUsers: [
        hexclaveUser({ id: "u1", clientMetadata: { username: "MetaHandle" } }),
        hexclaveUser({
          id: "u2",
          displayName: "Other Critic",
          primaryEmail: "other@example.com",
          clientMetadata: { username: "IrokoCritic" },
        }),
      ],
      content: [
        {
          id: "c1",
          title: "Ijé",
          content_type: "movie",
          runtime: 90,
          genre: ["Drama"],
          is_movie_of_the_week: true,
          created_at: "2024-01-01T00:00:00.000Z",
          updated_at: "2024-01-01T00:00:00.000Z",
        },
        {
          id: "c2",
          title: "Without Discussion",
          content_type: "short_film",
          genre: [],
          is_movie_of_the_week: false,
          created_at: "2024-01-01T00:00:00.000Z",
          updated_at: "2024-01-01T00:00:00.000Z",
        },
      ],
      discussions: [
        {
          id: "d1",
          title: "Ije Watch",
          content_id: "c1",
          podcast_links: [],
          episode_number: 3,
          created_at: "2024-01-01T00:00:00.000Z",
          updated_at: "2024-01-01T00:00:00.000Z",
        },
      ],
      ratings: [
        {
          id: "r1",
          content_id: "c1",
          user_id: "u1",
          rating: 10,
          edited: false,
          flagged: false,
          restricted: false,
          created_at: "2024-01-01T00:00:00.000Z",
          updated_at: "2024-01-01T00:00:00.000Z",
        },
      ],
      reviews: [],
      comments: [],
      reports: [],
      contacts: [],
      blogPosts: [
        {
          id: "b1",
          title: "Announcement",
          content: "Body",
          excerpt: null,
          slug: "announcement",
          published: true,
          published_at: null,
          created_at: "2024-01-01T00:00:00.000Z",
          updated_at: "2024-01-01T00:00:00.000Z",
        },
      ],
    });

    const database = new DatabaseSync(databasePath);
    try {
      database.exec("PRAGMA foreign_keys = ON");
      database.exec(renderImportSql(plan.definitions));
      assert.deepEqual(database.prepare("PRAGMA foreign_key_check").all(), []);

      const usernames = database
        .prepare("SELECT username FROM users ORDER BY id")
        .all() as Array<{ username: string | null }>;
      assert.deepEqual(
        usernames.map((row) => row.username),
        ["irokocritic", null],
      );
      assert.equal(
        (database.prepare("SELECT count(*) AS count FROM content").get() as { count: number }).count,
        2,
      );
      const catalogNumbers = database
        .prepare("SELECT catalog_number FROM content ORDER BY id")
        .all() as Array<{ catalog_number: number | null }>;
      assert.deepEqual(
        catalogNumbers.map((row) => row.catalog_number),
        [3, null],
      );
      assert.equal(
        (database.prepare("SELECT count(*) AS count FROM user_ratings").get() as { count: number }).count,
        1,
      );
      assert.deepEqual(
        database
          .prepare(
            "SELECT discussion_id, content_id FROM discussion_content",
          )
          .all()
          .map((row) => ({ ...row })),
        [{ discussion_id: "d1", content_id: "c1" }],
      );
      const rating = database.prepare("SELECT rating FROM user_ratings").get() as {
        rating: number;
      };
      assert.equal(rating.rating, 10);
    } finally {
      database.close();
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
