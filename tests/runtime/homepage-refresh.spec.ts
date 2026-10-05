import { expect, test } from "@playwright/test";

test.use({
  channel: process.env.BROWSER_CHANNEL ?? (process.platform === "win32" ? "msedge" : undefined),
  timezoneId: "UTC",
});

test("homepage content survives a full browser refresh", async ({ page }) => {
  test.setTimeout(60000);
  page.on("pageerror", (error) => console.error("Homepage browser error:", error.message));
  page.on("console", (message) => {
    if (message.type() === "error") console.error("Homepage console error:", message.text());
  });
  page.on("requestfailed", (request) => {
    if (request.resourceType() === "script") console.error("Homepage script failed:", request.url(), request.failure()?.errorText);
  });
  const initial = await page.goto("/", { waitUntil: "domcontentloaded" });
  expect(initial?.status()).toBe(200);
  const html = await initial!.text();
  const movieSection = /<section id="movies-and-tv-series"[\s\S]*?<\/section>/.exec(html)?.[0] ?? "";
  const discussionSection = /<section id="discussions"[\s\S]*?<\/section>/.exec(html)?.[0] ?? "";
  const movies = movieSection.match(/href="\/(?:movie|tv|short)\//g)?.length ?? 0;
  const discussions = discussionSection.match(/data-slot="card"/g)?.length ?? 0;
  expect(movies, "the runtime fixture should contain catalogue content").toBeGreaterThan(0);

  const movieCards = page.locator('#movies-and-tv-series a[href^="/movie/"], #movies-and-tv-series a[href^="/tv/"], #movies-and-tv-series a[href^="/short/"]');
  const discussionCards = page.locator('#discussions [data-slot="card"]');
  await expect(movieCards).toHaveCount(movies);
  await expect(discussionCards).toHaveCount(discussions);
  const hasEpisode = html.includes("open.spotify.com/episode/");
  if (hasEpisode) await expect(page.locator('iframe[src^="https://open.spotify.com/embed/"]')).toHaveCount(1, { timeout: 30000 });

  const refreshed = await page.reload({ waitUntil: "domcontentloaded" });
  expect(refreshed?.status()).toBe(200);
  await expect(movieCards).toHaveCount(movies);
  await expect(discussionCards).toHaveCount(discussions);
  if (hasEpisode) await expect(page.locator('iframe[src^="https://open.spotify.com/embed/"]')).toHaveCount(1);
  if (process.env.RUNTIME_TARGET === "cloudflare") {
    expect(initial!.headers()["cache-control"]).toBe("no-cache");
    expect(refreshed!.headers()["cache-control"]).toBe("no-cache");
    expect(refreshed!.headers()["cloudflare-cdn-cache-control"]).toBe("no-store");
  }
});
