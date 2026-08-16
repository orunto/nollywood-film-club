import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { users } from "../../src/db/schema";
import { createNodeSqliteDatabase } from "../../src/services/node";

// Standalone importer for the Hexclave user export
// (data/migration/hexclave/users.json, produced by export-hexclave.ts). It
// follows the same normalization the full pipeline applies in
// transform-sqlite.ts, but applies rows directly to a target SQLite database
// and reconciles case-insensitive username collisions against whatever is
// already there instead of failing the whole run.
//
// Because Hexclave does not export provider account IDs or password hashes,
// imported users get rows in the claims manifest (account-claims.json) that
// describe how each identity must be claimed later: password reset links,
// verified-email provider claims, or manual account claims.

export interface HexclaveExportUser {
  id: string;
  displayName: string | null;
  primaryEmail: string | null;
  primaryEmailVerified: boolean;
  profileImageUrl: string | null;
  signedUpAt: string;
  clientMetadata?: Record<string, unknown> | null;
  clientReadOnlyMetadata?: Record<string, unknown> | null;
  hasPassword?: boolean;
  isAnonymous?: boolean;
  oauthProviders?: string[];
}

export interface PlannedUserRow {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  username: string | null;
  role: "user" | "admin";
  regular: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExistingUser {
  id: string;
  email?: string;
  username: string | null;
}

export interface ImportPlan {
  rows: PlannedUserRow[];
  claims: Record<string, unknown>[];
  usernameDropped: string[];
}

export function normalizeHexclaveUser(
  user: HexclaveExportUser,
): PlannedUserRow {
  const metadata =
    user.clientMetadata && typeof user.clientMetadata === "object"
      ? user.clientMetadata
      : {};
  const readOnlyMetadata =
    user.clientReadOnlyMetadata && typeof user.clientReadOnlyMetadata === "object"
      ? user.clientReadOnlyMetadata
      : {};

  const email = user.primaryEmail?.trim().toLowerCase() ?? `legacy-${user.id}@nfc.invalid`;
  const username =
    typeof metadata.username === "string" && metadata.username.trim()
      ? metadata.username.trim().toLowerCase()
      : null;

  return {
    id: user.id,
    name:
      user.displayName?.trim() ||
      user.primaryEmail?.split("@")[0] ||
      "NFC Member",
    email,
    emailVerified: user.primaryEmail ? user.primaryEmailVerified : false,
    image: user.profileImageUrl,
    username,
    role: readOnlyMetadata.role === "admin" ? "admin" : "user",
    regular: readOnlyMetadata.regular === true ? true : false,
    createdAt: new Date(user.signedUpAt),
    updatedAt: new Date(user.signedUpAt),
  };
}

// Reconciles emails and usernames case-insensitively against both the batch
// and the target database. Email collisions are fatal (users.email_lower is a
// hard unique index); username collisions drop the incoming username rather
// than the row — the user reclaims it via onboarding.
export function planHexclaveImport(
  usersToImport: HexclaveExportUser[],
  existing: ExistingUser[] = [],
): ImportPlan {
  const emailOwners = new Map<string, string>();
  const usernameOwners = new Map<string, string>();
  for (const row of existing) {
    if (row.email) {
      emailOwners.set(row.email.toLowerCase(), row.id);
    }
    if (row.username) {
      usernameOwners.set(row.username.toLowerCase(), row.id);
    }
  }

  const rows: PlannedUserRow[] = [];
  const claims: Record<string, unknown>[] = [];
  const usernameDropped: string[] = [];

  for (const user of usersToImport) {
    const row = normalizeHexclaveUser(user);
    const existingEmailOwner = emailOwners.get(row.email);
    if (existingEmailOwner && existingEmailOwner !== row.id) {
      throw new Error(
        `Email collision: ${row.email} belongs to both ${existingEmailOwner} and ${row.id}`,
      );
    }
    emailOwners.set(row.email, row.id);

    if (row.username) {
      const owner = usernameOwners.get(row.username);
      if (owner && owner !== row.id) {
        row.username = null;
        usernameDropped.push(`${row.id} (${user.id})`);
      } else {
        usernameOwners.set(row.username, row.id);
      }
    }

    claims.push({
      userId: row.id,
      hasPassword: Boolean(user.hasPassword),
      providers: user.oauthProviders ?? [],
      requiresPasswordReset: Boolean(user.hasPassword),
      requiresProviderClaim: (user.oauthProviders ?? []).length > 0,
      requiresEmailClaim: user.primaryEmail === null,
    });

    rows.push(row);
  }

  return { rows, claims, usernameDropped };
}

export async function applyHexclaveImport(
  databasePath: string,
  plan: ImportPlan,
) {
  const database = createNodeSqliteDatabase(databasePath);
  try {
    for (const row of plan.rows) {
      await database.instance
        .insert(users)
        .values(row)
        .onConflictDoUpdate({
          target: users.id,
          set: {
            name: row.name,
            email: row.email,
            emailVerified: row.emailVerified,
            image: row.image,
            username: row.username,
            role: row.role,
            regular: row.regular,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
          },
        });
    }
  } finally {
    database.close();
  }
}

export async function readHexclaveExport(path: string) {
  const raw = JSON.parse(await readFile(path, "utf8")) as {
    users?: HexclaveExportUser[];
  } | HexclaveExportUser[];
  return Array.isArray(raw) ? raw : (raw.users ?? []);
}

async function main() {
  const [exportPath = "data/migration/hexclave/users.json", databasePath = "data/nollywood-film-club.sqlite"] =
    process.argv.slice(2);

  const exportFile = resolve(exportPath);
  const databaseFile = resolve(databasePath);

  const database = createNodeSqliteDatabase(databaseFile);
  let existing: ExistingUser[] = [];
  try {
    existing = await database.instance
      .select({
        id: users.id,
        email: users.email,
        username: users.username,
      })
      .from(users);
  } finally {
    database.close();
  }

  const exportedUsers = await readHexclaveExport(exportFile);
  const plan = planHexclaveImport(exportedUsers, existing);
  await applyHexclaveImport(databaseFile, plan);

  const { writeFile } = await import("node:fs/promises");
  await writeFile(
    resolve("data/migration/account-claims.json"),
    `${JSON.stringify({ users: plan.claims }, null, 2)}\n`,
  );

  console.log(
    JSON.stringify(
      {
        message: "Hexclave user import complete",
        usersImported: plan.rows.length,
        usernameCollisionsDropped: plan.usernameDropped.length,
        claimsWritten: plan.claims.length,
      },
      null,
      2,
    ),
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}