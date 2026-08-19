import assert from "node:assert/strict";
import { readFile, rm, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { createNodeSqliteDatabase } from "../../src/services/node";

async function createFixture() {
  const directory = await mkdtemp(join(tmpdir(), "nfc-contact-"));
  const databasePath = join(directory, "test.sqlite");
  const setup = new DatabaseSync(databasePath);
  try {
    setup.exec(
      await readFile(
        resolve("drizzle-sqlite/0000_secret_iron_monger.sql"),
        "utf8",
      ),
    );
  } finally {
    setup.close();
  }
  const database = createNodeSqliteDatabase(databasePath);
  return { database, databasePath, directory };
}

test("create stores a contact message with its defaults", async () => {
  const { database, databasePath, directory } = await createFixture();
  try {
    await database.contacts.create({
      category: "bug",
      message: "The rating button does nothing.",
      email: "reporter@example.com",
      userId: null,
    });

    const connection = new DatabaseSync(databasePath, { readOnly: true });
    try {
      const row = connection
        .prepare("SELECT * FROM contact_messages")
        .get() as Record<string, unknown>;
      assert.equal(row.category, "bug");
      assert.equal(row.message, "The rating button does nothing.");
      assert.equal(row.email, "reporter@example.com");
      assert.equal(row.user_id, null);
      assert.equal(row.status, "open");
      assert.ok(row.id);
      assert.ok(row.created_at);
    } finally {
      connection.close();
    }
  } finally {
    database.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test("create attaches a user id when the sender is signed in", async () => {
  const { database, databasePath, directory } = await createFixture();
  try {
    await database.contacts.create({
      category: "improvement",
      message: "A dark mode would be nice.",
      email: null,
      userId: "user-42",
    });

    const connection = new DatabaseSync(databasePath, { readOnly: true });
    try {
      const row = connection
        .prepare("SELECT user_id FROM contact_messages")
        .get() as { user_id: string | null };
      assert.equal(row.user_id, "user-42");
    } finally {
      connection.close();
    }
  } finally {
    database.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test("create stores multiple messages independently", async () => {
  const { database, databasePath, directory } = await createFixture();
  try {
    await database.contacts.create({
      category: "bug",
      message: "First report.",
      email: null,
      userId: null,
    });
    await database.contacts.create({
      category: "other",
      message: "Second message.",
      email: "second@example.com",
      userId: "user-7",
    });

    const connection = new DatabaseSync(databasePath, { readOnly: true });
    try {
      const rows = connection
        .prepare("SELECT category, message FROM contact_messages ORDER BY created_at")
        .all() as { category: string; message: string }[];
      assert.equal(rows.length, 2);
      assert.equal(rows[0].category, "bug");
      assert.equal(rows[0].message, "First report.");
      assert.equal(rows[1].category, "other");
      assert.equal(rows[1].message, "Second message.");
    } finally {
      connection.close();
    }
  } finally {
    database.close();
    await rm(directory, { recursive: true, force: true });
  }
});