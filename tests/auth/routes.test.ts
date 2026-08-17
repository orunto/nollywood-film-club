import assert from "node:assert/strict";
import { readFile, rm, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import * as callbackRoute from "../../src/app/routes/auth.callback";
import * as checkUsernameRoute from "../../src/app/routes/api.check-username";
import * as createUsernameRoute from "../../src/app/routes/api.create-username";
import { createBetterAuthService } from "../../src/auth/server";
import { createNodeSqliteDatabase } from "../../src/services/node";
import { PassthroughImageTransformer } from "../../src/services/pending";
import { users } from "../../src/db/schema";
import type { AppServices, MailService } from "../../src/services/contracts";

const BASE_URL = "http://localhost:3000";

async function createFixture() {
  const directory = await mkdtemp(join(tmpdir(), "nfc-routes-"));
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
  const mail: MailService = { send: async () => undefined };
  const auth = createBetterAuthService(database.instance, {
    baseURL: BASE_URL,
    secret: "test-secret-that-is-long-enough-32chars",
    mail,
  });
  const services: AppServices = {
    runtime: "node",
    db: database,
    auth,
    objects: {
      check: async () => undefined,
      get: async () => null,
      put: async () => undefined,
    },
    images: new PassthroughImageTransformer(),
    mail,
  };
  const context = { get: () => services };
  return { database, services, context, directory, databasePath };
}

function post(path: string, body: unknown, cookie?: string): Request {
  return new Request(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: BASE_URL,
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify(body),
  });
}

function cookieHeader(response: Response): string {
  const cookies = response.headers.getSetCookie?.() ?? [];
  return cookies.map((cookie) => cookie.split(";")[0]).join("; ");
}

async function signUp(
  services: AppServices,
  email = "critic@example.com",
  password = "correct-horse-battery",
): Promise<string> {
  const response = await services.auth.handler(
    post("/api/auth/sign-up/email", { email, password, name: "Iroko Critic" }),
  );
  assert.equal(response.status, 200);
  return cookieHeader(response);
}

test("username checks require a signed-in user", async () => {
  const { context, database, directory } = await createFixture();
  try {
    const response = await checkUsernameRoute.action({
      request: post("/api/check-username", { username: "irokocritic" }),
      context,
    } as never);
    assert.equal(response.status, 401);
  } finally {
    database.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test("single and batch username checks answer availability", async () => {
  const { context, services, database, directory } = await createFixture();
  try {
    const cookie = await signUp(services);

    const single = await checkUsernameRoute.action({
      request: post(
        "/api/check-username",
        { username: "irokocritic" },
        cookie,
      ),
      context,
    } as never);
    assert.equal(single.status, 200);
    const singleData = (await single.json()) as {
      available: boolean;
      message: string;
    };
    assert.equal(singleData.available, true);

    await services.db.profiles.setUsername(
      (await services.auth.getSession(new Request(`${BASE_URL}/`, { headers: { Cookie: cookie } })))!
        .userId,
      "irokocritic",
    );

    const taken = await checkUsernameRoute.action({
      request: post("/api/check-username", { username: "IROKOCritic" }, cookie),
      context,
    } as never);
    const takenData = (await taken.json()) as { available: boolean };
    assert.equal(takenData.available, false);

    const batch = await checkUsernameRoute.action({
      request: post(
        "/api/check-username",
        { usernames: ["irokocritic", "fresh_handle"] },
        cookie,
      ),
      context,
    } as never);
    const batchData = (await batch.json()) as {
      results: { username: string; available: boolean }[];
    };
    assert.deepEqual(batchData.results, [
      { username: "irokocritic", available: false },
      { username: "fresh_handle", available: true },
    ]);
  } finally {
    database.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test("create-username requires a signed-in user and validates the format", async () => {
  const { context, services, database, directory } = await createFixture();
  try {
    const unauthenticated = await createUsernameRoute.action({
      request: post("/api/create-username", { username: "irokocritic" }),
      context,
    } as never);
    assert.equal(unauthenticated.status, 401);

    const cookie = await signUp(services);
    const invalid = await createUsernameRoute.action({
      request: post("/api/create-username", { username: "has space" }, cookie),
      context,
    } as never);
    assert.equal(invalid.status, 400);
  } finally {
    database.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test("create-username persists the lowercased username for the signed-in user", async () => {
  const { context, services, database, databasePath, directory } =
    await createFixture();
  try {
    const cookie = await signUp(services);

    const response = await createUsernameRoute.action({
      request: post(
        "/api/create-username",
        { username: "IrokoCritic", displayName: "Iroko Critic" },
        cookie,
      ),
      context,
    } as never);
    assert.equal(response.status, 201);
    const data = (await response.json()) as { username: string };
    assert.equal(data.username, "irokocritic");

    const session = await services.auth.getSession(
      new Request(`${BASE_URL}/`, { headers: { Cookie: cookie } }),
    );
    assert.equal(session?.username, "irokocritic");
    assert.equal(session?.name, "Iroko Critic");

    const connection = new DatabaseSync(databasePath, { readOnly: true });
    try {
      const row = connection
        .prepare("SELECT username FROM users WHERE id = ?")
        .get(session?.userId) as { username: string };
      assert.equal(row.username, "irokocritic");
    } finally {
      connection.close();
    }
  } finally {
    database.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test("create-username returns 409 when the username is already taken", async () => {
  const { context, services, database, directory } = await createFixture();
  try {
    const cookieA = await signUp(services, "a@example.com");
    const cookieB = await signUp(services, "b@example.com");

    const first = await createUsernameRoute.action({
      request: post("/api/create-username", { username: "irokocritic" }, cookieA),
      context,
    } as never);
    assert.equal(first.status, 201);

    const second = await createUsernameRoute.action({
      request: post(
        "/api/create-username",
        { username: "IROKOCritic" },
        cookieB,
      ),
      context,
    } as never);
    assert.equal(second.status, 409);
  } finally {
    database.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test("the callback redirect routes by role and username", async () => {
  const { context, services, database, directory } = await createFixture();
  try {
    const cookie = await signUp(services);

    const requireAuth = async () =>
      callbackRoute.loader({
        request: new Request(`${BASE_URL}/auth/callback`),
        context,
      } as never);
    await assert.rejects(requireAuth, (response: Response) => {
      assert.equal(response.status, 302);
      assert.equal(response.headers.get("Location"), "/auth");
      return true;
    });

    const session = await services.auth.getSession(
      new Request(`${BASE_URL}/`, { headers: { Cookie: cookie } }),
    );
    assert.ok(session);

    const toOnboarding = async () =>
      callbackRoute.loader({
        request: new Request(`${BASE_URL}/auth/callback`, {
          headers: { Cookie: cookie },
        }),
        context,
      } as never);
    await assert.rejects(toOnboarding, (response: Response) => {
      assert.equal(response.headers.get("Location"), "/onboarding");
      return true;
    });

    await database.instance
      .update(users)
      .set({ username: "irokocritic" });

    const toHome = async () =>
      callbackRoute.loader({
        request: new Request(`${BASE_URL}/auth/callback`, {
          headers: { Cookie: cookie },
        }),
        context,
      } as never);
    await assert.rejects(toHome, (response: Response) => {
      assert.equal(response.headers.get("Location"), "/");
      return true;
    });

    await database.instance.update(users).set({ role: "admin" });

    const toAdmin = async () =>
      callbackRoute.loader({
        request: new Request(`${BASE_URL}/auth/callback`, {
          headers: { Cookie: cookie },
        }),
        context,
      } as never);
    await assert.rejects(toAdmin, (response: Response) => {
      assert.equal(response.headers.get("Location"), "/admin");
      return true;
    });
  } finally {
    database.close();
    await rm(directory, { recursive: true, force: true });
  }
});
