import assert from "node:assert/strict";
import { rm, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { createBetterAuthService } from "../../src/auth/server";
import { createNodeSqliteDatabase } from "../../src/services/node";
import type { MailMessage } from "../../src/services/contracts";
import { applySqliteMigrations } from "../helpers/sqlite-migrations";

const BASE_URL = "http://localhost:3000";

interface TestAuth {
  auth: ReturnType<typeof createBetterAuthService>;
  database: ReturnType<typeof createNodeSqliteDatabase>;
  messages: MailMessage[];
  directory: string;
  databasePath: string;
}

async function createTestAuth(): Promise<TestAuth> {
  const directory = await mkdtemp(join(tmpdir(), "nfc-auth-"));
  const databasePath = join(directory, "test.sqlite");
  const setup = new DatabaseSync(databasePath);
  try {
    await applySqliteMigrations(setup);
  } finally {
    setup.close();
  }
  const database = createNodeSqliteDatabase(databasePath);
  const messages: MailMessage[] = [];
  const auth = createBetterAuthService(database.instance, {
    baseURL: BASE_URL,
    secret: "test-secret-that-is-long-enough-32chars",
    mail: { send: async (message) => messages.push(message) },
  });
  return { auth, database, messages, directory, databasePath };
}

function post(path: string, body: unknown): Request {
  return new Request(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: BASE_URL,
    },
    body: JSON.stringify(body),
  });
}

function cookieHeader(response: Response): string {
  const cookies = response.headers.getSetCookie?.() ?? [];
  return cookies.map((cookie) => cookie.split(";")[0]).join("; ");
}

function readOnlyRow(databasePath: string, sql: string, ...params: unknown[]) {
  const connection = new DatabaseSync(databasePath, { readOnly: true });
  try {
    return connection.prepare(sql).get(...params);
  } finally {
    connection.close();
  }
}

async function signUp(
  t: TestAuth,
  email = "critic@example.com",
  password = "correct-horse-battery",
  name = "Iroko Critic",
) {
  return t.auth.handler(
    post("/api/auth/sign-up/email", { email, password, name }),
  );
}

test("email sign-up creates a user with server-owned defaults", async () => {
  const t = await createTestAuth();
  try {
    const response = await signUp(t);
    assert.equal(response.status, 200);
    const data = (await response.json()) as { user?: { id?: string } };
    assert.equal(typeof data.user?.id, "string");

    const user = readOnlyRow(
      t.databasePath,
      "SELECT * FROM users WHERE id = ?",
      data.user?.id,
    ) as {
      email: string;
      email_verified: number;
      username: string | null;
      role: string;
      regular: number;
    };
    assert.equal(user.email, "critic@example.com");
    assert.equal(user.email_verified, 0);
    assert.equal(user.username, null);
    assert.equal(user.role, "user");
    assert.equal(user.regular, 0);

    const accountCount = readOnlyRow(
      t.databasePath,
      "SELECT count(*) AS count FROM accounts WHERE user_id = ?",
      data.user?.id,
    ) as { count: number };
    assert.equal(accountCount.count, 1);
  } finally {
    t.database.close();
    await rm(t.directory, { recursive: true, force: true });
  }
});

test("unverified sign-up does not issue an authenticated session", async () => {
  const t = await createTestAuth();
  try {
    const response = await signUp(t);
    const cookies = cookieHeader(response);
    assert.equal(cookies, "");

    const session = await t.auth.getSession(
      new Request(`${BASE_URL}/`, { headers: { Cookie: cookies } }),
    );
    assert.equal(session, null);
  } finally {
    t.database.close();
    await rm(t.directory, { recursive: true, force: true });
  }
});

test("email sign-in with correct credentials yields a session", async () => {
  const t = await createTestAuth();
  try {
    await signUp(t);

    const verificationUrl = t.messages[0].text.match(
      /http:\/\/[^\s]+\/verify-email\?[^\s]+/,
    );
    assert.ok(verificationUrl, "expected a verification URL in the email");
    const verification = await t.auth.handler(new Request(verificationUrl[0]));
    assert.equal(verification.status, 302);

    const signIn = await t.auth.handler(
      post("/api/auth/sign-in/email", {
        email: "critic@example.com",
        password: "correct-horse-battery",
      }),
    );
    assert.equal(signIn.status, 200);

    const session = await t.auth.getSession(
      new Request(`${BASE_URL}/`, {
        headers: { Cookie: cookieHeader(signIn) },
      }),
    );
    assert.equal(typeof session?.userId, "string");
  } finally {
    t.database.close();
    await rm(t.directory, { recursive: true, force: true });
  }
});

test("unverified email sign-in is rejected and sends a verification link", async () => {
  const t = await createTestAuth();
  try {
    await signUp(t);
    t.messages.length = 0;

    const signIn = await t.auth.handler(
      post("/api/auth/sign-in/email", {
        email: "critic@example.com",
        password: "correct-horse-battery",
      }),
    );
    assert.equal(signIn.status, 403);
    assert.equal(t.messages.length, 1);
    assert.match(t.messages[0].subject, /verify/i);
  } finally {
    t.database.close();
    await rm(t.directory, { recursive: true, force: true });
  }
});

test("verification link marks the account verified and safely handles replay", async () => {
  const t = await createTestAuth();
  try {
    await signUp(t);
    const verificationUrl = t.messages[0].text.match(
      /http:\/\/[^\s]+\/verify-email\?[^\s]+/,
    );
    assert.ok(verificationUrl, "expected a verification URL in the email");

    const response = await t.auth.handler(new Request(verificationUrl[0]));
    assert.equal(response.status, 302);
    const user = readOnlyRow(
      t.databasePath,
      "SELECT email_verified FROM users WHERE email = ?",
      "critic@example.com",
    ) as { email_verified: number };
    assert.equal(user.email_verified, 1);

    const replay = await t.auth.handler(new Request(verificationUrl[0]));
    assert.equal(replay.status, 302);
    assert.equal(
      (readOnlyRow(
        t.databasePath,
        "SELECT email_verified FROM users WHERE email = ?",
        "critic@example.com",
      ) as { email_verified: number }).email_verified,
      1,
    );
  } finally {
    t.database.close();
    await rm(t.directory, { recursive: true, force: true });
  }
});

test("sign-in rejects a wrong password", async () => {
  const t = await createTestAuth();
  try {
    await signUp(t);
    t.messages.length = 0;

    const signIn = await t.auth.handler(
      post("/api/auth/sign-in/email", {
        email: "critic@example.com",
        password: "wrong-password",
      }),
    );
    assert.equal(signIn.status, 401);
  } finally {
    t.database.close();
    await rm(t.directory, { recursive: true, force: true });
  }
});

test("getSession returns null without a cookie", async () => {
  const t = await createTestAuth();
  try {
    const session = await t.auth.getSession(new Request(`${BASE_URL}/`));
    assert.equal(session, null);
  } finally {
    t.database.close();
    await rm(t.directory, { recursive: true, force: true });
  }
});

test("password reset request emails a link and never confirms existence", async () => {
  const t = await createTestAuth();
  try {
    const response = await t.auth.handler(
      post("/api/auth/request-password-reset", { email: "critic@example.com" }),
    );
    // Anti-enumeration: the message is identical whether or not the account
    // exists, and no email is sent for an unknown address.
    assert.equal(response.status, 200);
    assert.equal(t.messages.length, 0);

    await signUp(t);
    t.messages.length = 0;

    const knownResponse = await t.auth.handler(
      post("/api/auth/request-password-reset", { email: "critic@example.com" }),
    );
    assert.equal(knownResponse.status, 200);
    assert.equal(t.messages.length, 1);
    assert.match(t.messages[0].subject, /reset/i);
    assert.match(t.messages[0].text, /reset-password\//);
  } finally {
    t.database.close();
    await rm(t.directory, { recursive: true, force: true });
  }
});

test("a reset link works once, signs out old sessions, and lets the new password in", async () => {
  const t = await createTestAuth();
  try {
    await signUp(t);
    const verificationUrl = t.messages[0].text.match(
      /http:\/\/[^\s]+\/verify-email\?[^\s]+/,
    );
    assert.ok(verificationUrl, "expected a verification URL in the email");
    await t.auth.handler(new Request(verificationUrl[0]));
    const oldCookie = cookieHeader(
      await t.auth.handler(
        post("/api/auth/sign-in/email", {
          email: "critic@example.com",
          password: "correct-horse-battery",
        }),
      ),
    );
    t.messages.length = 0;

    await t.auth.handler(
      post("/api/auth/request-password-reset", { email: "critic@example.com" }),
    );
    assert.equal(t.messages.length, 1);
    const resetUrl = t.messages[0].text.match(/http:\/\/[^\s]+\/reset-password\/([^\s?]+)/);
    assert.ok(resetUrl, "expected a reset URL in the email");
    const token = resetUrl[1];

    const resetResponse = await t.auth.handler(
      post("/api/auth/reset-password", { token, newPassword: "brand-new-pass-123" }),
    );
    assert.equal(resetResponse.status, 200);

    // The old session was revoked as part of the reset.
    const oldSession = await t.auth.getSession(
      new Request(`${BASE_URL}/`, { headers: { Cookie: oldCookie } }),
    );
    assert.equal(oldSession, null);

    const oldPasswordSignIn = await t.auth.handler(
      post("/api/auth/sign-in/email", {
        email: "critic@example.com",
        password: "correct-horse-battery",
      }),
    );
    assert.equal(oldPasswordSignIn.status, 401);

    const newPasswordSignIn = await t.auth.handler(
      post("/api/auth/sign-in/email", {
        email: "critic@example.com",
        password: "brand-new-pass-123",
      }),
    );
    assert.equal(newPasswordSignIn.status, 200);

    // The token is single-use.
    const replay = await t.auth.handler(
      post("/api/auth/reset-password", { token, newPassword: "again-123" }),
    );
    assert.notEqual(replay.status, 200);
  } finally {
    t.database.close();
    await rm(t.directory, { recursive: true, force: true });
  }
});
