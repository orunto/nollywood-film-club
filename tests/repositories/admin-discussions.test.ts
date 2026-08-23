import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { createNodeSqliteDatabase } from "../../src/services/node";
import { applySqliteMigrations } from "../helpers/sqlite-migrations";

test("discussion writes replace multiple content links and sync catalog numbers", async () => {
  const directory = await mkdtemp(join(tmpdir(), "nfc-admin-discussions-"));
  const databasePath = join(directory, "test.sqlite");
  const setup = new DatabaseSync(databasePath);

  try {
    await applySqliteMigrations(setup);
    setup.exec(`
      INSERT INTO content (
        id, title, content_type, genre, is_movie_of_the_week, created_at, updated_at
      ) VALUES
        ('first', 'First title', 'movie', '[]', 0, 1000, 1000),
        ('second', 'Second title', 'movie', '[]', 0, 1000, 1000);
    `);
  } finally {
    setup.close();
  }

  const database = createNodeSqliteDatabase(databasePath);
  try {
    const created = await database.adminDiscussions.create({
      title: "Double feature",
      description: null,
      contentIds: ["first", "second", "first"],
      spaceUrl: null,
      podcastLinks: [],
      episodeNumber: 7,
      discussionDate: null,
    });
    assert.deepEqual(new Set(created.contentIds), new Set(["first", "second"]));
    assert.equal((await database.publicReads.getContentById("first"))?.catalogNumber, 7);
    assert.equal((await database.publicReads.getContentById("second"))?.catalogNumber, 7);

    const updated = await database.adminDiscussions.update(created.id, {
      title: "Double feature revised",
      description: "Updated",
      contentIds: ["second"],
      spaceUrl: null,
      podcastLinks: [],
      episodeNumber: 4,
      discussionDate: null,
    });
    assert.deepEqual(updated?.contentIds, ["second"]);
    assert.equal((await database.publicReads.getContentById("first"))?.catalogNumber, null);
    assert.equal((await database.publicReads.getContentById("second"))?.catalogNumber, 4);

    const relinked = await database.adminDiscussions.replaceContentLinks(created.id, ["first", "second"]);
    assert.deepEqual(new Set(relinked?.contentIds), new Set(["first", "second"]));
    assert.equal((await database.publicReads.getContentById("first"))?.catalogNumber, 4);

    assert.equal(await database.adminDiscussions.replaceDiscussionsForContent("first", []), true);
    assert.deepEqual((await database.adminDiscussions.list())[0].contentIds, ["second"]);
    assert.equal((await database.publicReads.getContentById("first"))?.catalogNumber, null);
    assert.equal(await database.adminDiscussions.replaceDiscussionsForContent("first", [created.id]), true);

    await assert.rejects(
      database.adminDiscussions.replaceContentLinks(created.id, ["missing"]),
      /not found/,
    );
    assert.deepEqual(new Set((await database.adminDiscussions.list())[0].contentIds), new Set(["first", "second"]));

    await database.adminDiscussions.delete(created.id);
    assert.equal((await database.publicReads.getContentById("first"))?.catalogNumber, null);
    assert.equal((await database.publicReads.getContentById("second"))?.catalogNumber, null);
  } finally {
    database.close();
    await rm(directory, { recursive: true, force: true });
  }
});
