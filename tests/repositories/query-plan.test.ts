import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { applySqliteMigrations } from "../helpers/sqlite-migrations";

async function withDatabase(check: (database: DatabaseSync) => void) {
  const database = new DatabaseSync(":memory:");
  try {
    await applySqliteMigrations(database);
    check(database);
  } finally {
    database.close();
  }
}

function planDetails(database: DatabaseSync, query: string) {
  return database
    .prepare(`EXPLAIN QUERY PLAN ${query}`)
    .all()
    .map((row) => String((row as { detail: string }).detail));
}

test("public read indexes support profile, feed, comment, and member lookups", async () => {
  await withDatabase((database) => {
    const profilePlan = planDetails(
      database,
      "SELECT id FROM user_ratings WHERE user_id = 'member' AND restricted = 0 ORDER BY created_at DESC LIMIT 12",
    );
    assert.ok(
      profilePlan.some((detail) =>
        detail.includes("user_ratings_user_visible_created_at_idx"),
      ),
      profilePlan.join("\n"),
    );

    const feedPlan = planDetails(
      database,
      "SELECT id FROM user_ratings WHERE restricted = 0 AND review IS NOT NULL AND review <> '' AND created_at >= 0 ORDER BY created_at DESC LIMIT 250",
    );
    assert.ok(
      feedPlan.some((detail) =>
        detail.includes("user_ratings_visible_review_created_at_idx"),
      ),
      feedPlan.join("\n"),
    );

    const commentPlan = planDetails(
      database,
      "SELECT id FROM comments WHERE review_id = 'review' AND restricted = 0 ORDER BY created_at ASC",
    );
    assert.ok(
      commentPlan.some((detail) =>
        detail.includes("comments_review_visible_created_at_idx"),
      ),
      commentPlan.join("\n"),
    );

    const membersPlan = planDetails(
      database,
      "SELECT id FROM users WHERE regular = 1 ORDER BY created_at ASC LIMIT 200",
    );
    assert.ok(
      membersPlan.some((detail) => detail.includes("users_regular_created_at_idx")),
      membersPlan.join("\n"),
    );
  });
});
