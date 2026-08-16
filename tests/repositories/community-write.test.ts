import assert from "node:assert/strict";
import { readFile, rm, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { NodeSqliteDatabase } from "../../src/services/node";

async function createTestDatabase() {
  const directory = await mkdtemp(join(tmpdir(), "nfc-community-write-"));
  const databasePath = join(directory, "test.sqlite");
  const setup = new DatabaseSync(databasePath);
  try {
    setup.exec(
      await readFile(
        resolve("drizzle-sqlite/0000_secret_iron_monger.sql"),
        "utf8",
      ),
    );
    setup.exec(`
      INSERT INTO content (
        id, title, content_type, genre, is_movie_of_the_week,
        catalog_number, created_at, updated_at
      ) VALUES ('film', 'Film title', 'movie', '[]', 0, 1, 1000, 1000);
      INSERT INTO user_ratings (
        id, content_id, user_id, rating, edited, flagged, restricted,
        created_at, updated_at
      ) VALUES ('rating-1', 'film', 'member-1', 10, 0, 0, 0, 1000, 1000);
      INSERT INTO user_ratings (
        id, content_id, user_id, rating, edited, flagged, restricted,
        created_at, updated_at
      ) VALUES ('rating-2', 'film', 'member-2', 5, 0, 0, 0, 1000, 1000);
      INSERT INTO comments (
        id, review_id, parent_id, user_id, body, depth, flagged, restricted,
        created_at, updated_at
      ) VALUES ('comment-1', 'rating-1', NULL, 'member-2', 'First', 0, 0, 0, 1000, 1000);
      INSERT INTO comments (
        id, review_id, parent_id, user_id, body, depth, flagged, restricted,
        created_at, updated_at
      ) VALUES ('comment-2', 'rating-1', 'comment-1', 'member-3', 'Reply', 1, 0, 0, 1000, 1000);
    `);
  } finally {
    setup.close();
  }
  return { database: new NodeSqliteDatabase(databasePath), directory, databasePath };
}

function readOnlyRow(databasePath: string, sql: string, ...params: unknown[]) {
  const connection = new DatabaseSync(databasePath, { readOnly: true });
  try {
    return connection.prepare(sql).get(...params);
  } finally {
    connection.close();
  }
}

test("reporting a review records a report and flags the review", async () => {
  const { database, directory, databasePath } = await createTestDatabase();
  try {
    const result = await database.writes.reportTarget({
      targetType: "review",
      targetId: "rating-1",
      reporterId: "member-9",
      reason: "spam",
      note: "  Duplicate account spam  ",
    });

    assert.deepEqual(result, { status: "created" });
    assert.equal(
      (
        readOnlyRow(
          databasePath,
          "SELECT id FROM reports WHERE reporter_id = ? AND target_id = ?",
          "member-9",
          "rating-1",
        ) ?? null
      ) !== null,
      true,
    );
    assert.equal(
      readOnlyRow(
        databasePath,
        "SELECT flagged FROM user_ratings WHERE id = ?",
        "rating-1",
      )?.flagged,
      1,
    );
    assert.equal(
      readOnlyRow(
        databasePath,
        "SELECT note FROM reports WHERE reporter_id = ?",
        "member-9",
      )?.note,
      "Duplicate account spam",
    );
  } finally {
    database.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test("reporting twice is an idempotent no-op", async () => {
  const { database, directory, databasePath } = await createTestDatabase();
  try {
    const first = await database.writes.reportTarget({
      targetType: "review",
      targetId: "rating-1",
      reporterId: "member-9",
      reason: "harassment",
      note: null,
    });
    const second = await database.writes.reportTarget({
      targetType: "review",
      targetId: "rating-1",
      reporterId: "member-9",
      reason: "spam",
      note: null,
    });

    assert.deepEqual(first, { status: "created" });
    assert.deepEqual(second, { status: "already-reported" });
    const count = readOnlyRow(
      databasePath,
      "SELECT count(*) AS count FROM reports WHERE reporter_id = ?",
      "member-9",
    )?.count;
    assert.equal(Number(count), 1);
    assert.equal(
      readOnlyRow(
        databasePath,
        "SELECT flagged FROM user_ratings WHERE id = ?",
        "rating-1",
      )?.flagged,
      1,
    );
  } finally {
    database.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test("reporting a comment flags the comment", async () => {
  const { database, directory, databasePath } = await createTestDatabase();
  try {
    const result = await database.writes.reportTarget({
      targetType: "comment",
      targetId: "comment-1",
      reporterId: "member-9",
      reason: "off_topic",
      note: null,
    });

    assert.deepEqual(result, { status: "created" });
    assert.equal(
      readOnlyRow(
        databasePath,
        "SELECT flagged FROM comments WHERE id = ?",
        "comment-1",
      )?.flagged,
      1,
    );
  } finally {
    database.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test("reporting a missing target records nothing", async () => {
  const { database, directory, databasePath } = await createTestDatabase();
  try {
    const result = await database.writes.reportTarget({
      targetType: "review",
      targetId: "missing-review",
      reporterId: "member-9",
      reason: "other",
      note: null,
    });

    assert.deepEqual(result, { status: "target-missing" });
    const count = readOnlyRow(
      databasePath,
      "SELECT count(*) AS count FROM reports",
    )?.count;
    assert.equal(Number(count), 0);
  } finally {
    database.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test("upserting a rating creates an unedited review, then updates it", async () => {
  const { database, directory, databasePath } = await createTestDatabase();
  try {
    const created = await database.writes.upsertRating({
      contentId: "film",
      userId: "member-9",
      rating: 10,
      review: "  A fresh review  ",
    });
    assert.equal(created.status, "created");
    assert.ok(created.id);

    const updated = await database.writes.upsertRating({
      contentId: "film",
      userId: "member-9",
      rating: 5,
      review: null,
    });
    assert.equal(updated.status, "updated");
    assert.equal(updated.id, created.id);

    const row = readOnlyRow(
      databasePath,
      "SELECT rating, review, edited FROM user_ratings WHERE id = ?",
      created.id,
    );
    assert.equal(row?.rating, 5);
    assert.equal(row?.review, null);
    assert.equal(row?.edited, 1);

    const count = readOnlyRow(
      databasePath,
      "SELECT count(*) AS count FROM user_ratings WHERE content_id = 'film' AND user_id = 'member-9'",
    )?.count;
    assert.equal(Number(count), 1);
  } finally {
    database.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test("deleting a rating only works for its owner", async () => {
  const { database, directory, databasePath } = await createTestDatabase();
  try {
    assert.equal(
      await database.writes.deleteRating("rating-1", "member-2"),
      false,
    );
    assert.equal(
      await database.writes.deleteRating("rating-1", "member-1"),
      true,
    );
    assert.equal(
      readOnlyRow(
        databasePath,
        "SELECT id FROM user_ratings WHERE id = 'rating-1'",
      ) ?? null,
      null,
    );
  } finally {
    database.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test("posting a comment and a reply derives depth from the parent", async () => {
  const { database, directory, databasePath } = await createTestDatabase();
  try {
    const comment = await database.writes.addComment({
      reviewId: "rating-1",
      userId: "member-9",
      parentId: null,
      body: "Root comment",
    });
    assert.deepEqual(comment, { status: "created", id: comment.id });

    const reply = await database.writes.addComment({
      reviewId: "rating-1",
      userId: "member-9",
      parentId: comment.id,
      body: "A reply",
    });
    assert.equal(reply.status, "created");

    const row = readOnlyRow(
      databasePath,
      "SELECT depth FROM comments WHERE id = ?",
      reply.id,
    );
    assert.equal(row?.depth, 1);
  } finally {
    database.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test("comment posting rejects restricted and cross-review parents", async () => {
  const { database, directory } = await createTestDatabase();
  try {
    await database.atomic([
      {
        sql: "UPDATE user_ratings SET restricted = 1 WHERE id = 'rating-1'",
        params: [],
      },
    ]);

    assert.deepEqual(
      await database.writes.addComment({
        reviewId: "rating-1",
        userId: "member-9",
        parentId: null,
        body: "Nope",
      }),
      { status: "review-restricted" },
    );

    await database.atomic([
      {
        sql: "UPDATE user_ratings SET restricted = 0 WHERE id = 'rating-1'",
        params: [],
      },
    ]);
    assert.deepEqual(
      await database.writes.addComment({
        reviewId: "rating-2",
        userId: "member-9",
        parentId: "comment-1",
        body: "Wrong tree",
      }),
      { status: "parent-wrong-review" },
    );
    assert.deepEqual(
      await database.writes.addComment({
        reviewId: "rating-1",
        userId: "member-9",
        parentId: "missing-comment",
        body: "Gone",
      }),
      { status: "parent-missing" },
    );
  } finally {
    database.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test("comment threads stop past the maximum depth", async () => {
  const { database, directory } = await createTestDatabase();
  try {
    let parentId: string | null = null;
    for (let depth = 1; depth <= 6; depth += 1) {
      const result = await database.writes.addComment({
        reviewId: "rating-1",
        userId: `member-${depth}`,
        parentId,
        body: `Depth ${depth}`,
      });
      assert.equal(result.status, "created");
      parentId = result.id;
    }

    assert.deepEqual(
      await database.writes.addComment({
        reviewId: "rating-1",
        userId: "member-9",
        parentId,
        body: "Too deep",
      }),
      { status: "too-deep" },
    );
  } finally {
    database.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test("deleting a comment cascades to its replies", async () => {
  const { database, directory, databasePath } = await createTestDatabase();
  try {
    assert.equal(
      await database.writes.deleteComment("comment-1", "member-2"),
      true,
    );
    assert.equal(
      readOnlyRow(
        databasePath,
        "SELECT id FROM comments WHERE id IN ('comment-1', 'comment-2')",
      ) ?? null,
      null,
    );
  } finally {
    database.close();
    await rm(directory, { recursive: true, force: true });
  }
});