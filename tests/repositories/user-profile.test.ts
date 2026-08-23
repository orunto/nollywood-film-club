import assert from "node:assert/strict";
import { rm, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { users } from "../../src/db/schema";
import { createNodeSqliteDatabase } from "../../src/services/node";
import { applySqliteMigrations } from "../helpers/sqlite-migrations";

async function createFixture() {
  const directory = await mkdtemp(join(tmpdir(), "nfc-profile-"));
  const databasePath = join(directory, "test.sqlite");
  const setup = new DatabaseSync(databasePath);
  try {
    await applySqliteMigrations(setup);
  } finally {
    setup.close();
  }
  const database = createNodeSqliteDatabase(databasePath);
  return { database, directory, databasePath };
}

async function insertUser(
  database: ReturnType<typeof createNodeSqliteDatabase>,
  row: { id: string; email: string; name?: string; username?: string | null },
) {
  await database.instance
    .insert(users)
    .values({
      id: row.id,
      email: row.email,
      name: row.name ?? "Member",
      username: row.username ?? null,
    })
    .onConflictDoNothing();
}

test("username availability starts open and flips once taken", async () => {
  const { database, directory } = await createFixture();
  try {
    await insertUser(database, {
      id: "user-a",
      email: "a@example.com",
      name: "A",
    });
    assert.equal(await database.profiles.isUsernameTaken("irokocritic"), false);

    const result = await database.profiles.setUsername("user-a", "irokocritic");
    assert.deepEqual(result, { status: "ok" });
    assert.equal(await database.profiles.isUsernameTaken("irokocritic"), true);
    assert.equal(await database.profiles.isUsernameTaken("IROKOCritic"), true);
  } finally {
    database.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test("setUsername stores the lowercased form and updates the display name", async () => {
  const { database, databasePath, directory } = await createFixture();
  try {
    await insertUser(database, {
      id: "user-a",
      email: "a@example.com",
      name: "Old Name",
    });

    const result = await database.profiles.setUsername(
      "user-a",
      "IrokoCritic",
      "New Name",
    );
    assert.deepEqual(result, { status: "ok" });

    const connection = new DatabaseSync(databasePath, { readOnly: true });
    try {
      const row = connection
        .prepare("SELECT username, name FROM users WHERE id = ?")
        .get("user-a") as { username: string; name: string };
      assert.equal(row.username, "irokocritic");
      assert.equal(row.name, "New Name");
    } finally {
      connection.close();
    }
  } finally {
    database.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test("setUsername without a display name leaves the existing name alone", async () => {
  const { database, databasePath, directory } = await createFixture();
  try {
    await insertUser(database, {
      id: "user-a",
      email: "a@example.com",
      name: "Keep Me",
    });

    await database.profiles.setUsername("user-a", "irokocritic");

    const connection = new DatabaseSync(databasePath, { readOnly: true });
    try {
      const row = connection
        .prepare("SELECT name FROM users WHERE id = ?")
        .get("user-a") as { name: string };
      assert.equal(row.name, "Keep Me");
    } finally {
      connection.close();
    }
  } finally {
    database.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test("a username owned by another user is rejected", async () => {
  const { database, directory } = await createFixture();
  try {
    await insertUser(database, { id: "user-a", email: "a@example.com" });
    await insertUser(database, { id: "user-b", email: "b@example.com" });
    await database.profiles.setUsername("user-a", "irokocritic");

    const result = await database.profiles.setUsername("user-b", "IROKOCritic");
    assert.deepEqual(result, { status: "taken" });

    const owner = await database.publicReads.getUsernameOwner("irokocritic");
    assert.equal(owner?.userId, "user-a");
  } finally {
    database.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test("re-setting your own username is an idempotent success", async () => {
  const { database, directory } = await createFixture();
  try {
    await insertUser(database, { id: "user-a", email: "a@example.com" });
    await database.profiles.setUsername("user-a", "irokocritic");

    const result = await database.profiles.setUsername("user-a", "IROKOCritic");
    assert.deepEqual(result, { status: "ok" });
  } finally {
    database.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test("setUsername reports a missing user instead of writing", async () => {
  const { database, directory } = await createFixture();
  try {
    const result = await database.profiles.setUsername(
      "no-such-user",
      "irokocritic",
    );
    assert.deepEqual(result, { status: "user-missing" });
  } finally {
    database.close();
    await rm(directory, { recursive: true, force: true });
  }
});
