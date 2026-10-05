import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { calculateNfcRating } from "../../src/lib/nfc-rating";

const snapshot = process.argv[2];
if (!snapshot) throw new Error("Usage: tsx tools/repositories/validate-weighted-snapshot.ts snapshot.sql");
const database = new DatabaseSync(":memory:");
const localPath = process.argv[3];
const local = localPath ? new DatabaseSync(localPath, { readOnly: true }) : null;
try {
  // D1 exports tables in name order, before some referenced tables exist.
  database.exec("PRAGMA foreign_keys = OFF");
  database.exec(await readFile(snapshot, "utf8"));
  database.exec("PRAGMA foreign_keys = ON");
  const rows = database.prepare("SELECT * FROM user_ratings ORDER BY id").all();
  const fingerprint = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
  const before = fingerprint(rows);
  if (!local) {
    database.exec(await readFile("drizzle-sqlite/0010_weighted_nfc_scores.sql", "utf8"));
    database.exec(await readFile("drizzle-sqlite/0011_include_legacy_poll_counts.sql", "utf8"));
    database.exec(await readFile("drizzle-sqlite/0012_equal_weight_nfc_scores.sql", "utf8"));
    database.exec(await readFile("drizzle-sqlite/0013_include_legacy_poll_scores.sql", "utf8"));
    database.exec(await readFile("drizzle-sqlite/0014_integer_member_ratings.sql", "utf8"));
  }
  const target = local ?? database;
  assert.equal(fingerprint(target.prepare("SELECT * FROM user_ratings ORDER BY id").all()), before);
  for (const table of ["comments", "review_feed_summary", "reports"]) {
    assert.deepEqual(target.prepare(`SELECT * FROM ${table} ORDER BY 1`).all(), database.prepare(`SELECT * FROM ${table} ORDER BY 1`).all(), `${table} records must be preserved`);
  }
  assert.equal(target.prepare("PRAGMA integrity_check").get()?.integrity_check, "ok");
  assert.deepEqual(target.prepare("PRAGMA foreign_key_check").all(), []);
  const titles = target.prepare("SELECT id FROM content").all();
  assert.equal(titles.length, database.prepare("SELECT COUNT(*) AS n FROM content").get()?.n);
  for (const { id } of titles) {
    const ratings = rows.filter((row) => row.content_id === id).map((row) => ({ rating: Number(row.rating), restricted: Boolean(row.restricted), userId: String(row.user_id) }));
    const expected = calculateNfcRating(ratings);
    const summary = target.prepare("SELECT average_rating, rating_count FROM content_rating_summary WHERE content_id = ?").get(id!);
    if (expected === null) assert.equal(summary?.average_rating ?? null, null);
    else assert.ok(Math.abs(Number(summary?.average_rating) - expected) < 1e-12);
    const expectedCount = ratings.filter((rating) => !rating.restricted || rating.userId.startsWith("legacy-poll:")).length;
    assert.equal(summary?.rating_count ?? 0, expectedCount);
  }
  console.log(JSON.stringify({ verified: true, ratingRowsPreserved: rows.length, legacyRowsPreserved: rows.filter((row) => String(row.user_id).startsWith("legacy-poll:")).length, contentChecked: titles.length, ratingsSha256: before }, null, 2));
} finally {
  local?.close();
  database.close();
}
