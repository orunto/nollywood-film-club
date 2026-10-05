import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { calculateNfcRating } from "../../src/lib/nfc-rating";
import { applySqliteMigrations } from "../helpers/sqlite-migrations";

test("ratings use equal-weight averages across the full 0–10 range", async () => {
  const database = new DatabaseSync(":memory:");
  try {
    await applySqliteMigrations(database);
    database.exec("INSERT INTO content (id, title, content_type, created_at, updated_at) VALUES ('film', 'Film', 'movie', 0, 0)");
    const insert = database.prepare("INSERT INTO user_ratings (id, content_id, user_id, rating, created_at, updated_at) VALUES (?, 'film', ?, ?, 0, 0)");
    const cases = [
      { votes: [], score: null },
      { votes: [0], score: 0 },
      { votes: [5], score: 5 },
      { votes: [10], score: 10 },
      { votes: [0, 0, 0, 10, 10], score: 4 },
      { votes: [0, 10], score: 5 },
      { votes: [0, 0, 0, 10, 10, 5, 5], score: 30 / 7 },
      { votes: [0, 5, 5], score: 10 / 3 },
      { votes: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], score: 5.5 },
    ];
    for (const { votes, score } of cases) {
      database.exec("DELETE FROM user_ratings");
      votes.forEach((vote, index) => insert.run(String(index), String(index), vote));
      const row = database.prepare("SELECT average_rating FROM content_rating_summary").get();
      assert.equal(row?.average_rating ?? null, score);
      assert.equal(calculateNfcRating(votes.map((rating) => ({ rating }))), score);
    }
    // Exhaustive small-population comparisons catch drift between SQL and JS,
    // and ensure adding positive/negative votes changes scores monotonically.
    for (let bad = 0; bad <= 5; bad++) {
      for (let okay = 0; okay <= 5; okay++) {
        for (let good = 0; good <= 5; good++) {
          const ratings = [...Array(bad).fill(0), ...Array(okay).fill(5), ...Array(good).fill(10)].map((rating) => ({ rating }));
          database.exec("DELETE FROM user_ratings");
          ratings.forEach(({ rating }, i) => insert.run(String(i), String(i), rating));
          const score = calculateNfcRating(ratings);
          const sqlScore = database.prepare("SELECT average_rating FROM content_rating_summary").get()?.average_rating ?? null;
          if (score === null) assert.equal(sqlScore, null);
          else assert.ok(Math.abs(Number(sqlScore) - score) < 1e-12);
          if (score !== null) {
            assert.ok(score >= 0 && score <= 10);
            assert.ok(calculateNfcRating([...ratings, { rating: 10 }])! >= score);
            assert.ok(calculateNfcRating([...ratings, { rating: 0 }])! <= score);
          }
        }
      }
    }
    assert.equal(calculateNfcRating([{ rating: 10, restricted: true }, { rating: 0 }]), 0);
    assert.equal(calculateNfcRating([{ rating: 10, restricted: true, userId: "legacy-poll:film:1" }, { rating: 0 }]), 5);
  } finally {
    database.close();
  }
});

test("migration preserves every legacy rating and restriction while rebuilding derived scores", async () => {
  const database = new DatabaseSync(":memory:");
  try {
    for (const name of (await readdir("drizzle-sqlite")).filter((name) => /^000\d_.*\.sql$/.test(name)).sort()) {
      database.exec(await readFile(`drizzle-sqlite/${name}`, "utf8"));
    }
    database.exec(`
      INSERT INTO content (id, title, content_type, created_at, updated_at) VALUES ('film', 'Film', 'movie', 0, 0);
      INSERT INTO user_ratings (id, content_id, user_id, rating, restricted, review, created_at, updated_at) VALUES
        ('legacy', 'film', 'legacy-poll:film:1', 0, 1, 'Imported', 1000, 2000),
        ('member', 'film', 'member', 10, 0, 'Member', 3000, 4000);
    `);
    const original = database.prepare("SELECT * FROM user_ratings ORDER BY id").all();
    database.exec(await readFile("drizzle-sqlite/0010_weighted_nfc_scores.sql", "utf8"));
    assert.deepEqual(database.prepare("SELECT * FROM user_ratings ORDER BY id").all(), original);
    assert.equal(database.prepare("SELECT average_rating FROM content_rating_summary").get()?.average_rating, 9.5);
    assert.equal(database.prepare("SELECT nfc_certified FROM content").get()?.nfc_certified, 0);
    database.exec(await readFile("drizzle-sqlite/0011_include_legacy_poll_counts.sql", "utf8"));
    assert.deepEqual(database.prepare("SELECT * FROM user_ratings ORDER BY id").all(), original);
    assert.equal(database.prepare("SELECT rating_count FROM content_rating_summary").get()?.rating_count, 2);
    assert.equal(database.prepare("SELECT average_rating FROM content_rating_summary").get()?.average_rating, 9.5);
    database.exec(await readFile("drizzle-sqlite/0012_equal_weight_nfc_scores.sql", "utf8"));
    assert.deepEqual(database.prepare("SELECT * FROM user_ratings ORDER BY id").all(), original);
    assert.equal(database.prepare("SELECT average_rating FROM content_rating_summary").get()?.average_rating, 10);
    database.exec(await readFile("drizzle-sqlite/0013_include_legacy_poll_scores.sql", "utf8"));
    assert.deepEqual(database.prepare("SELECT * FROM user_ratings ORDER BY id").all(), original);
    assert.equal(database.prepare("SELECT average_rating FROM content_rating_summary").get()?.average_rating, 5);
    database.exec("UPDATE content SET nfc_certified = 1");
    assert.equal(database.prepare("SELECT average_rating FROM content_rating_summary").get()?.average_rating, 5);
    database.exec("UPDATE user_ratings SET rating = 0 WHERE id = 'member'");
    assert.equal(database.prepare("SELECT average_rating FROM content_rating_summary").get()?.average_rating, 0);
    assert.equal(database.prepare("SELECT nfc_certified FROM content").get()?.nfc_certified, 1);
    database.exec("DELETE FROM user_ratings WHERE id = 'member'");
    assert.equal(database.prepare("SELECT rating_count FROM content_rating_summary").get()?.rating_count, 1);
    assert.equal(database.prepare("SELECT average_rating FROM content_rating_summary").get()?.average_rating, 0);
    assert.deepEqual(database.prepare("SELECT * FROM user_ratings WHERE id = 'legacy'").get(), original.find((row) => row.id === "legacy"));
  } finally {
    database.close();
  }
});

test("88 restricted legacy polls plus one member count as 89; hidden members stay excluded", async () => {
  const database = new DatabaseSync(":memory:");
  try {
    await applySqliteMigrations(database);
    database.exec("INSERT INTO content (id, title, content_type, created_at, updated_at) VALUES ('film', 'Film', 'movie', 0, 0), ('other', 'Other', 'movie', 0, 0)");
    const insert = database.prepare("INSERT INTO user_ratings (id, content_id, user_id, rating, restricted, created_at, updated_at) VALUES (?, 'film', ?, ?, ?, 0, 0)");
    for (let i = 0; i < 88; i++) insert.run(`poll-${i}`, `legacy-poll:film:${i}`, 10, 1);
    insert.run("member", "member", 0, 0);
    insert.run("hidden", "hidden-member", 10, 1);
    const summary = (id = "film") => database.prepare("SELECT rating_count, average_rating FROM content_rating_summary WHERE content_id = ?").get(id);
    assert.equal(summary()?.rating_count, 89);
    assert.equal(summary()?.average_rating, 880 / 89);

    database.exec("UPDATE user_ratings SET user_id = 'converted-member' WHERE id = 'poll-0'");
    assert.equal(summary()?.rating_count, 88);
    assert.equal(summary()?.average_rating, 870 / 88);
    database.exec("UPDATE user_ratings SET user_id = 'legacy-poll:film:0' WHERE id = 'poll-0'");
    assert.equal(summary()?.rating_count, 89);
    database.exec("UPDATE user_ratings SET restricted = 0 WHERE id = 'hidden'");
    assert.equal(summary()?.rating_count, 90);
    database.exec("UPDATE user_ratings SET restricted = 1 WHERE id = 'hidden'");
    assert.equal(summary()?.rating_count, 89);
    assert.equal(summary()?.average_rating, 880 / 89);

    database.exec("UPDATE user_ratings SET content_id = 'other' WHERE id = 'poll-0'");
    assert.equal(summary()?.rating_count, 88);
    assert.equal(summary("other")?.rating_count, 1);
    assert.equal(summary("other")?.average_rating, 10);
    database.exec("DELETE FROM user_ratings WHERE id = 'poll-0'");
    assert.equal(summary("other"), undefined);
    database.exec("DELETE FROM user_ratings WHERE id = 'member'");
    assert.equal(summary()?.rating_count, 87);
    assert.equal(summary()?.average_rating, 10);
  } finally {
    database.close();
  }
});
