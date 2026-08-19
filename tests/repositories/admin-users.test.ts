import assert from "node:assert/strict";
import { readFile, rm, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { content, userRatings, users } from "../../src/db/schema";
import { createNodeSqliteDatabase } from "../../src/services/node";

async function fixture() {
  const directory = await mkdtemp(join(tmpdir(), "nfc-admin-users-"));
  const databasePath = join(directory, "test.sqlite");
  const setup = new DatabaseSync(databasePath);
  setup.exec(await readFile(resolve("drizzle-sqlite/0000_secret_iron_monger.sql"), "utf8"));
  setup.close();
  return { database: createNodeSqliteDatabase(databasePath), directory };
}

test("admin users list includes roles, regular status, and review counts", async () => {
  const { database, directory } = await fixture();
  try {
    await database.instance.insert(users).values([
      { id: "admin", email: "admin@example.com", name: "Admin", role: "admin" },
      { id: "member", email: "member@example.com", name: "Member", regular: true },
    ]);
    await database.instance.insert(content).values({
      id: "content-1",
      title: "Film",
      contentType: "movie",
    });
    await database.instance.insert(userRatings).values({
      id: "rating-1",
      contentId: "content-1",
      userId: "member",
      rating: 10,
    });

    const rows = await database.adminUsers.list();
    const member = rows.find((row) => row.id === "member");
    const admin = rows.find((row) => row.id === "admin");
    assert.equal(member?.reviewCount, 1);
    assert.equal(member?.regular, true);
    assert.equal(admin?.role, "admin");
  } finally {
    database.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test("admin role changes protect self-demotion and update local authority", async () => {
  const { database, directory } = await fixture();
  try {
    await database.instance.insert(users).values([
      { id: "admin", email: "admin@example.com", name: "Admin", role: "admin" },
      { id: "member", email: "member@example.com", name: "Member" },
    ]);

    assert.deepEqual(
      await database.adminUsers.setAdminRole("admin", "admin", false),
      { status: "self-demotion" },
    );
    assert.deepEqual(
      await database.adminUsers.setAdminRole("admin", "member", true),
      { status: "ok", message: "User promoted to admin" },
    );
    assert.equal((await database.adminUsers.list()).find((row) => row.id === "member")?.role, "admin");
  } finally {
    database.close();
    await rm(directory, { recursive: true, force: true });
  }
});
