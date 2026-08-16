import assert from "node:assert/strict";
import { readFile, rm, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { users } from "../../src/db/schema";
import { createNodeSqliteDatabase } from "../../src/services/node";
import {
  applyHexclaveImport,
  normalizeHexclaveUser,
  planHexclaveImport,
  type HexclaveExportUser,
} from "../../tools/migration/import-hexclave-users";

function user(overrides: Partial<HexclaveExportUser> = {}): HexclaveExportUser {
  return {
    id: "user-1",
    displayName: "Iroko Critic",
    primaryEmail: "Critic@Example.com",
    primaryEmailVerified: true,
    profileImageUrl: "https://example.com/avatar.png",
    signedUpAt: "2024-01-15T10:00:00.000Z",
    clientMetadata: { username: "IrokoCritic" },
    clientReadOnlyMetadata: { role: "user", regular: true },
    hasPassword: true,
    isAnonymous: false,
    oauthProviders: ["google"],
    ...overrides,
  };
}

test("normalization maps Hexclave fields onto the local user row", () => {
  const row = normalizeHexclaveUser(user());
  assert.deepEqual(row, {
    id: "user-1",
    name: "Iroko Critic",
    email: "critic@example.com",
    emailVerified: true,
    image: "https://example.com/avatar.png",
    username: "irokocritic",
    role: "user",
    regular: true,
    createdAt: new Date("2024-01-15T10:00:00.000Z"),
    updatedAt: new Date("2024-01-15T10:00:00.000Z"),
  });
});

test("normalization falls back when names, emails, or roles are missing", () => {
  const row = normalizeHexclaveUser(
    user({
      displayName: null,
      primaryEmail: null,
      primaryEmailVerified: false,
      clientMetadata: null,
      clientReadOnlyMetadata: null,
    }),
  );
  assert.equal(row.email, "legacy-user-1@nfc.invalid");
  assert.equal(row.emailVerified, false);
  assert.equal(row.username, null);
  assert.equal(row.name, "NFC Member");
  assert.equal(row.role, "user");
  assert.equal(row.regular, false);
});

test("an admin role and regular flag carry through", () => {
  const row = normalizeHexclaveUser(
    user({
      clientReadOnlyMetadata: { role: "admin", regular: true },
    }),
  );
  assert.equal(row.role, "admin");
  assert.equal(row.regular, true);
});

test("planning drops a username that collides case-insensitively in the batch", () => {
  const first = user({ id: "user-1", clientMetadata: { username: "IrokoCritic" } });
  const second = user({
    id: "user-2",
    displayName: "Other Critic",
    primaryEmail: "other@example.com",
    clientMetadata: { username: "irokocritic" },
  });
  const plan = planHexclaveImport([first, second]);
  assert.equal(plan.rows[0].username, "irokocritic");
  assert.equal(plan.rows[1].username, null);
  assert.equal(plan.usernameDropped.length, 1);
});

test("planning drops a username already owned by someone in the target database", () => {
  const plan = planHexclaveImport([user()], [
    { id: "existing-owner", email: "owner@example.com", username: "IROKOCritic" },
  ]);
  assert.equal(plan.rows[0].username, null);
  assert.equal(plan.usernameDropped.length, 1);
});

test("planning throws on a case-insensitive email collision", () => {
  const first = user({ id: "user-1", primaryEmail: "Same@Example.com" });
  const second = user({
    id: "user-2",
    displayName: "Other",
    primaryEmail: "same@example.com",
  });
  assert.throws(() => planHexclaveImport([first, second]), /Email collision/);
});

test("claims describe how each identity must be reclaimed", () => {
  const plan = planHexclaveImport([
    user({ id: "u1", hasPassword: true, oauthProviders: ["google"] }),
    user({
      id: "u2",
      primaryEmail: null,
      primaryEmailVerified: false,
      hasPassword: false,
      oauthProviders: [],
    }),
  ]);
  assert.deepEqual(plan.claims, [
    {
      userId: "u1",
      hasPassword: true,
      providers: ["google"],
      requiresPasswordReset: true,
      requiresProviderClaim: true,
      requiresEmailClaim: false,
    },
    {
      userId: "u2",
      hasPassword: false,
      providers: [],
      requiresPasswordReset: false,
      requiresProviderClaim: false,
      requiresEmailClaim: true,
    },
  ]);
});

test("applyHexclaveImport inserts rows and upserts on rerun", async () => {
  const directory = await mkdtemp(join(tmpdir(), "nfc-import-"));
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

  try {
    const plan = planHexclaveImport([user()]);
    await applyHexclaveImport(databasePath, plan);

    const database = createNodeSqliteDatabase(databasePath);
    try {
      const [row] = await database.instance
        .select({
          id: users.id,
          email: users.email,
          username: users.username,
          role: users.role,
        })
        .from(users);
      assert.deepEqual(row, {
        id: "user-1",
        email: "critic@example.com",
        username: "irokocritic",
        role: "user",
      });

      // Rerunning the same export updates the row rather than duplicating it.
      const rerun = planHexclaveImport([
        user({ displayName: "Renamed", clientMetadata: { username: "renamed" } }),
      ]);
      await applyHexclaveImport(databasePath, rerun);
      const [after] = await database.instance
        .select({ name: users.name, username: users.username })
        .from(users);
      assert.equal(after?.name, "Renamed");
      assert.equal(after?.username, "renamed");
    } finally {
      database.close();
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});