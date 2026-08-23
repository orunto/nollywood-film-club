import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { checksum } from "./io";

type JsonObject = Record<string, unknown>;
type NeonManifest = {
  tables: Record<string, { rowCount: number }>;
};
type HexclaveExport = { count: number; users: Array<{ id: string }> };
type ClaimsExport = { users: Array<{ userId: string }> };

async function readJson<T>(path: string) {
  return JSON.parse(await readFile(resolve(path), "utf8")) as T;
}

function idChecksum(ids: string[]) {
  return checksum(JSON.stringify([...ids].sort()));
}

const stateDirectory = resolve(
  ".wrangler/state/v3/d1/miniflare-D1DatabaseObject",
);
const databaseFiles = (await readdir(stateDirectory)).filter(
  (name) => name.endsWith(".sqlite") && name !== "metadata.sqlite",
);
assert.equal(databaseFiles.length, 1, "Expected one local D1 database file");

const [neonManifest, hexclave, claims, sourceRatings, sourceDiscussions] =
  await Promise.all([
    readJson<NeonManifest>("data/migration/neon/manifest.json"),
    readJson<HexclaveExport>("data/migration/hexclave/users.json"),
    readJson<ClaimsExport>("data/migration/account-claims.json"),
    readJson<JsonObject[]>("data/migration/neon/user_ratings.json"),
    readJson<JsonObject[]>("data/migration/neon/discussions.json"),
  ]);
const database = new DatabaseSync(resolve(stateDirectory, databaseFiles[0]), {
  readOnly: true,
});
const sourceTables = [
  "content",
  "discussions",
  "user_ratings",
  "reviews",
  "comments",
  "reports",
  "contact_messages",
  "blog_posts",
] as const;
const rowCounts: Record<string, number> = {};

try {
  assert.deepEqual(database.prepare("PRAGMA foreign_key_check").all(), []);

  for (const table of sourceTables) {
    const count = database
      .prepare(`SELECT count(*) AS count FROM "${table}"`)
      .get() as { count: number };
    rowCounts[table] = count.count;
    assert.equal(count.count, neonManifest.tables[table].rowCount, `${table} count`);

    const sourceRows = await readJson<Array<{ id: string }>>(
      `data/migration/neon/${table}.json`,
    );
    const importedIds = database
      .prepare(`SELECT id FROM "${table}" ORDER BY id`)
      .all() as Array<{ id: string }>;
    assert.equal(
      idChecksum(importedIds.map((row) => row.id)),
      idChecksum(sourceRows.map((row) => row.id)),
      `${table} ID checksum`,
    );
  }

  const expectedDiscussionContent = sourceDiscussions
    .filter((row) => row.content_id !== null && row.content_id !== undefined)
    .map((row) => `${String(row.id)}:${String(row.content_id)}`);
  const importedDiscussionContent = database
    .prepare(
      `SELECT discussion_id, content_id
       FROM discussion_content
       ORDER BY discussion_id, content_id`,
    )
    .all() as Array<{ discussion_id: string; content_id: string }>;
  rowCounts.discussion_content = importedDiscussionContent.length;
  assert.equal(
    importedDiscussionContent.length,
    expectedDiscussionContent.length,
    "discussion_content count",
  );
  assert.equal(
    idChecksum(
      importedDiscussionContent.map(
        (row) => `${row.discussion_id}:${row.content_id}`,
      ),
    ),
    idChecksum(expectedDiscussionContent),
    "discussion_content key checksum",
  );

  const importedUsers = database
    .prepare("SELECT id FROM users ORDER BY id")
    .all() as Array<{ id: string }>;
  rowCounts.users = importedUsers.length;
  assert.equal(importedUsers.length, hexclave.count);
  assert.equal(
    idChecksum(importedUsers.map((user) => user.id)),
    idChecksum(hexclave.users.map((user) => user.id)),
  );
  assert.equal(claims.users.length, hexclave.count);

  const sourceRatingDistribution = new Map<number, number>();
  for (const rating of sourceRatings) {
    const value = Number(rating.rating);
    sourceRatingDistribution.set(
      value,
      (sourceRatingDistribution.get(value) ?? 0) + 1,
    );
  }
  const importedRatingDistribution = database
    .prepare(
      "SELECT rating, count(*) AS count FROM user_ratings GROUP BY rating ORDER BY rating",
    )
    .all() as Array<{ rating: number; count: number }>;
  assert.deepEqual(
    importedRatingDistribution.map(({ rating, count }) => ({ rating, count })),
    [...sourceRatingDistribution.entries()]
      .sort(([left], [right]) => left - right)
      .map(([rating, count]) => ({ rating, count })),
  );

  const catalogMismatches = database
    .prepare(
      `SELECT count(*) AS count
       FROM content
       WHERE catalog_number IS NOT (
          SELECT MIN(episode_number)
          FROM discussion_content
          INNER JOIN discussions
            ON discussions.id = discussion_content.discussion_id
          WHERE discussion_content.content_id = content.id
        )`,
    )
    .get() as { count: number };
  assert.equal(catalogMismatches.count, 0);

  const usernameCollisions = database
    .prepare(
      `SELECT count(*) AS count
       FROM (
         SELECT lower(username)
         FROM users
         WHERE username IS NOT NULL
         GROUP BY lower(username)
         HAVING count(*) > 1
       )`,
    )
    .get() as { count: number };
  assert.equal(usernameCollisions.count, 0);

  const unresolvedCommunityUsers = database
    .prepare(
      `SELECT count(DISTINCT user_id) AS count
       FROM user_ratings
       WHERE user_id NOT IN (SELECT id FROM users)`,
    )
    .get() as { count: number };

  console.log(
    JSON.stringify({
      message: "Local D1 import validation complete",
      rowCounts,
      catalogMismatches: catalogMismatches.count,
      foreignKeyViolations: 0,
      unresolvedCommunityUserCount: unresolvedCommunityUsers.count,
    }),
  );
} finally {
  database.close();
}
