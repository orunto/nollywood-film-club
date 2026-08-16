import { expect, test } from "@playwright/test";

test("health proves the selected runtime services", async ({ request }) => {
  const response = await request.get("/health");

  expect(response.status()).toBe(200);
  expect(response.headers()).toMatchObject({
    "content-type": expect.stringContaining("application/json"),
    "permissions-policy": "camera=(), microphone=(), geolocation=()",
    "referrer-policy": "strict-origin-when-cross-origin",
    "x-content-type-options": "nosniff",
    "x-frame-options": "SAMEORIGIN",
  });
  expect(await response.json()).toEqual({
    status: "ok",
    runtime: process.env.RUNTIME_TARGET,
    checks: {
      database: { ok: true },
      objects: { ok: true },
      session: { ok: true, authenticated: false },
    },
  });
});

test("homepage loader runs through the selected database adapter", async ({
  request,
}) => {
  const response = await request.get("/");

  expect(response.status()).toBe(200);
  expect(await response.text()).toContain("Nollywood, one film at a time.");
});
