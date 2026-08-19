import { expect, test, type APIResponse, type Page } from "@playwright/test";

const publicPages = [
  {
    path: "/privacy",
    title: "Privacy Policy | Nollywood Film Club",
    heading: "Privacy Policy",
  },
  {
    path: "/terms",
    title: "Terms of Service | Nollywood Film Club",
    heading: "Terms of Service",
  },
  {
    path: "/about",
    title: "About | Nollywood Film Club",
    heading: "What is Nollywood Film Club?",
  },
  {
    path: "/contact",
    title: "Contact | Nollywood Film Club",
    heading: "Something broken? Something missing?",
  },
] as const;

const securityHeaders = {
  "x-content-type-options": "nosniff",
  "x-frame-options": "SAMEORIGIN",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
  "strict-transport-security": "max-age=63072000; includeSubDomains; preload",
} as const;

async function expectJsonResponse(response: APIResponse) {
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("application/json");

  const body: unknown = await response.json();
  expect(body).toMatchObject({ success: true });
  expect(body).toHaveProperty("data");
}

async function capturePage(page: Page, name: string) {
  await page.screenshot({
    path: test.info().outputPath(`${name}.png`),
    fullPage: true,
  });
}

for (const publicPage of publicPages) {
  test(`${publicPage.path} preserves its public contract`, async ({ page }, testInfo) => {
    const response = await page.goto(publicPage.path, { waitUntil: "networkidle" });

    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle(publicPage.title);
    await expect(page.getByRole("heading", { level: 1, name: publicPage.heading })).toBeVisible();

    const headers = response?.headers() ?? {};
    for (const [name, value] of Object.entries(securityHeaders)) {
      expect(headers[name], `${name} on ${publicPage.path}`).toBe(value);
    }

    await capturePage(page, `${testInfo.project.name}-${publicPage.path.slice(1)}`);
  });
}

test("legacy plural movie URLs redirect permanently", async ({ request }) => {
  const response = await request.get("/movies/characterization-slug", {
    maxRedirects: 0,
  });

  expect(response.status()).toBe(308);
  expect(response.headers().location).toBe("/movie/characterization-slug");
});

for (const path of [
  "/api/movie-of-the-week",
  "/api/movies-and-tv-series",
  "/api/reviews",
]) {
  test(`${path} preserves its successful JSON envelope`, async ({ request }) => {
    await expectJsonResponse(await request.get(path));
  });
}

for (const path of ["/api/user/ratings", "/api/admin/users"]) {
  test(`${path} rejects anonymous requests`, async ({ request }) => {
    const response = await request.get(path);

    expect(response.status()).toBe(401);
    expect(response.headers()["content-type"]).toContain("application/json");
    expect(await response.json()).toEqual({
      success: false,
      error: "Authentication required",
    });
  });
}
