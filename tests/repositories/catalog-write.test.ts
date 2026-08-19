import assert from "node:assert/strict";
import { readFile, rm, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { createNodeSqliteDatabase } from "../../src/services/node";

async function createTestDatabase() {
  const directory = await mkdtemp(join(tmpdir(), "nfc-catalog-write-"));
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
      ) VALUES
        ('current', 'Current pick', 'movie', '[]', 1, 1, 1000, 1000),
        ('other', 'Other film', 'movie', '[]', 0, 2, 1000, 1000),
        ('orphan', 'Orphan film', 'movie', '[]', 0, 3, 1000, 1000);
      INSERT INTO discussions (
        id, title, content_id, podcast_links, episode_number,
        discussion_date, created_at, updated_at
      ) VALUES
        ('d1', 'Early', 'other', '[]', 2, 1000, 1000, 1000),
        ('d2', 'Late', 'other', '[]', 5, 1000, 1000, 1000);
    `);
  } finally {
    setup.close();
  }
  return { database: createNodeSqliteDatabase(databasePath), directory, databasePath };
}

function query(
  databasePath: string,
  sql: string,
  ...params: unknown[]
): Record<string, unknown>[] {
  const connection = new DatabaseSync(databasePath, { readOnly: true });
  try {
    return connection.prepare(sql).all(...params);
  } finally {
    connection.close();
  }
}

test("promoting a movie demotes every other in one transaction", async () => {
  const { database, directory, databasePath } = await createTestDatabase();
  try {
    const result = await database.catalog.setMovieOfTheWeek("other", true);
    assert.deepEqual(result, { status: "ok" });

    const rows = query(
      databasePath,
      "SELECT id, is_movie_of_the_week AS flag FROM content ORDER BY id",
    );
    assert.deepEqual(
      rows.map(({ id, flag }) => ({ id, flag })),
      [
        { id: "current", flag: 0 },
        { id: "orphan", flag: 0 },
        { id: "other", flag: 1 },
      ],
    );
  } finally {
    database.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test("promoting the current pick leaves the singleton intact", async () => {
  const { database, directory, databasePath } = await createTestDatabase();
  try {
    const result = await database.catalog.setMovieOfTheWeek("current", true);
    assert.deepEqual(result, { status: "ok" });

    const flags = query(
      databasePath,
      "SELECT is_movie_of_the_week AS flag FROM content",
    );
    assert.equal(flags.filter(({ flag }) => flag === 1).length, 1);
  } finally {
    database.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test("demoting clears the pick without touching other films", async () => {
  const { database, directory, databasePath } = await createTestDatabase();
  try {
    const result = await database.catalog.setMovieOfTheWeek("current", false);
    assert.deepEqual(result, { status: "ok" });

    const flags = query(
      databasePath,
      "SELECT is_movie_of_the_week AS flag FROM content",
    );
    assert.equal(flags.filter(({ flag }) => flag === 1).length, 0);
  } finally {
    database.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test("a missing movie is rejected and nothing is demoted", async () => {
  const { database, directory, databasePath } = await createTestDatabase();
  try {
    const result = await database.catalog.setMovieOfTheWeek(
      "missing-movie",
      true,
    );
    assert.deepEqual(result, { status: "movie-missing" });

    const flags = query(
      databasePath,
      "SELECT is_movie_of_the_week AS flag FROM content",
    );
    assert.equal(flags.filter(({ flag }) => flag === 1).length, 1);
  } finally {
    database.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test("syncing catalog numbers takes the minimum linked episode number", async () => {
  const { database, directory, databasePath } = await createTestDatabase();
  try {
    await database.catalog.syncCatalogNumbers(["other", "orphan", null]);

    const rows = query(
      databasePath,
      "SELECT id, catalog_number AS catalog FROM content ORDER BY id",
    );
    assert.deepEqual(
      rows.map(({ id, catalog }) => ({ id, catalog })),
      [
        { id: "current", catalog: 1 },
        { id: "orphan", catalog: null },
        { id: "other", catalog: 2 },
      ],
    );
  } finally {
    database.close();
    await rm(directory, { recursive: true, force: true });
  }
});