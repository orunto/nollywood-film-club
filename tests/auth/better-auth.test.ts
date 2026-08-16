import assert from "node:assert/strict";
import { readFile, rm, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { createBetterAuthService } from "../../src/auth/server";
import { createNodeSqliteDatabase } from "../../src/services/node";
import type { MailMessage } from "../../src/services/contracts";

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

test("sign-up issues a session cookie that getSession recognizes", async () => {
  const t = await createTestAuth();
  try {
    const response = await signUp(t);
    const cookies = cookieHeader(response);
    assert.notEqual(cookies, "");

    const session = await t.auth.getSession(
      new Request(`${BASE_URL}/`, { headers: { Cookie: cookies } }),
    );
    assert.equal(typeof session?.userId, "string");
    assert.equal(session?.email, "critic@example.com");
    assert.equal(session?.name, "Iroko Critic");
    assert.equal(session?.username, null);
    assert.equal(session?.role, "user");
    assert.equal(session?.regular, false);
  } finally {
    t.database.close();
    await rm(t.directory, { recursive: true, force: true });
  }
});

test("email sign-in with correct credentials yields a session", async () => {
  const t = await createTestAuth();
  try {
    await signUp(t);

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

test("sign-in rejects a wrong password", async () => {
  const t = await createTestAuth();
  try {
    await signUp(t);

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
    const signUpResponse = await signUp(t);
    const oldCookie = cookieHeader(signUpResponse);

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