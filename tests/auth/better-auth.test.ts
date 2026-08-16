import assert from "node:assert/strict";
import { readFile, rm, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { createBetterAuthService } from "../../src/auth/server";
import { createNodeSqliteDatabase } from "../../src/services/node";

const BASE_URL = "http://localhost:3000";

async function createTestAuth() {
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
  const auth = createBetterAuthService(database.instance, {
    baseURL: BASE_URL,
    secret: "test-secret-that-is-long-enough-32chars",
  });
  return { auth, database, directory, databasePath };
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

test("email sign-up creates a user with server-owned defaults", async () => {
  const { auth, database, directory, databasePath } = await createTestAuth();
  try {
    const response = await auth.handler(
      post("/api/auth/sign-up/email", {
        email: "critic@example.com",
        password: "correct-horse-battery",
        name: "Iroko Critic",
      }),
    );
    assert.equal(response.status, 200);
    const data = (await response.json()) as { user?: { id?: string } };
    assert.equal(typeof data.user?.id, "string");

    const user = readOnlyRow(
      databasePath,
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
      databasePath,
      "SELECT count(*) AS count FROM accounts WHERE user_id = ?",
      data.user?.id,
    ) as { count: number };
    assert.equal(accountCount.count, 1);
  } finally {
    database.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test("sign-up issues a session cookie that getSession recognizes", async () => {
  const { auth, database, directory } = await createTestAuth();
  try {
    const response = await auth.handler(
      post("/api/auth/sign-up/email", {
        email: "critic@example.com",
        password: "correct-horse-battery",
        name: "Iroko Critic",
      }),
    );
    const cookies = cookieHeader(response);
    assert.notEqual(cookies, "");

    const session = await auth.getSession(
      new Request(`${BASE_URL}/`, { headers: { Cookie: cookies } }),
    );
    assert.equal(typeof session?.userId, "string");
  } finally {
    database.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test("email sign-in with correct credentials yields a session", async () => {
  const { auth, database, directory } = await createTestAuth();
  try {
    await auth.handler(
      post("/api/auth/sign-up/email", {
        email: "critic@example.com",
        password: "correct-horse-battery",
        name: "Iroko Critic",
      }),
    );

    const signIn = await auth.handler(
      post("/api/auth/sign-in/email", {
        email: "critic@example.com",
        password: "correct-horse-battery",
      }),
    );
    assert.equal(signIn.status, 200);

    const session = await auth.getSession(
      new Request(`${BASE_URL}/`, {
        headers: { Cookie: cookieHeader(signIn) },
      }),
    );
    assert.equal(typeof session?.userId, "string");
  } finally {
    database.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test("sign-in rejects a wrong password", async () => {
  const { auth, database, directory } = await createTestAuth();
  try {
    await auth.handler(
      post("/api/auth/sign-up/email", {
        email: "critic@example.com",
        password: "correct-horse-battery",
        name: "Iroko Critic",
      }),
    );

    const signIn = await auth.handler(
      post("/api/auth/sign-in/email", {
        email: "critic@example.com",
        password: "wrong-password",
      }),
    );
    assert.equal(signIn.status, 401);
  } finally {
    database.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test("getSession returns null without a cookie", async () => {
  const { auth, database, directory } = await createTestAuth();
  try {
    const session = await auth.getSession(new Request(`${BASE_URL}/`));
    assert.equal(session, null);
  } finally {
    database.close();
    await rm(directory, { recursive: true, force: true });
  }
});