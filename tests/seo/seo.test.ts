import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { RouterContextProvider } from "react-router";
import { applySqliteMigrations } from "../helpers/sqlite-migrations";
import { createNodeSqliteDatabase } from "../../src/services/node";
import { appServicesContext } from "../../src/app/context";
import type { AppServices } from "../../src/services/contracts";
import { ROBOTS_TXT, shouldNoIndex, sitemapXml } from "../../src/lib/seo";
import { contentStructuredData, reviewStructuredData, serializeStructuredData } from "../../src/lib/structured-data";
import { loader as sitemapIndex } from "../../src/app/routes/sitemap";
import { loader as sitemapChunk } from "../../src/app/routes/sitemap.chunk";
import type { Content, FeedReview } from "../../src/repositories/public-read";

test("utility indexing rules preserve public pages and let crawlers read noindex", () => {
  for (const path of ["/auth", "/auth/callback", "/reset-password/token", "/account-claim", "/admin/catalog", "/user-dashboard", "/onboarding", "/forgot-password"]) {
    assert.equal(shouldNoIndex(path), true, path);
    assert.ok(!ROBOTS_TXT.includes(`Disallow: ${path}`));
  }
  for (const path of ["/", "/movie/auth-2026", "/members/admin", "/reviews/review-1", "/about", "/administrator"]) {
    assert.equal(shouldNoIndex(path), false, path);
  }
  assert.match(ROBOTS_TXT, /Sitemap: https:\/\/nollywoodfilm\.club\/sitemap\.xml/);
  assert.match(sitemapXml([{ path: "/reviews/a?x=1&y=2", lastModified: "invalid" }]), /x=1&amp;y=2/);
  assert.ok(!sitemapXml([{ path: "/about" }]).includes("lastmod"));
});

test("sitemaps paginate the canonical catalogue and exclude hidden or empty reviews", async () => {
  const directory = await mkdtemp(join(tmpdir(), "nfc-seo-"));
  const path = join(directory, "test.sqlite");
  const setup = new DatabaseSync(path);
  try {
    await applySqliteMigrations(setup);
    setup.exec(`
      INSERT INTO content (id, title, content_type, created_at, updated_at) VALUES
        ('a', 'Àjàkájú', 'movie', 0, 1000), ('b', 'A Series', 'tv_show', 0, 2000), ('c', 'A Short', 'short_film', 0, 3000);
      INSERT INTO user_ratings (id, content_id, user_id, rating, review, restricted, created_at, updated_at) VALUES
        ('written', 'a', 'one', 8, 'A public review', 0, 0, 1000),
        ('hidden', 'a', 'two', 7, 'Hidden review', 1, 0, 1000),
        ('blank', 'a', 'three', 6, '   ', 0, 0, 1000),
        ('rating', 'a', 'four', 5, NULL, 0, 0, 1000);
    `);
  } finally {
    setup.close();
  }
  const database = createNodeSqliteDatabase(path);
  try {
    assert.deepEqual(await database.publicReads.getSitemapCounts(), { content: 3, reviews: 1 });
    const first = await database.publicReads.getSitemapEntries("content", 2, 0);
    const second = await database.publicReads.getSitemapEntries("content", 2, 2);
    assert.deepEqual([...first, ...second].map((entry) => entry.path), ["/movie/ajakaju", "/tv/a-series", "/short/a-short"]);
    assert.equal(first[0].lastModified, "1970-01-01T00:00:01.000Z");
    assert.deepEqual((await database.publicReads.getSitemapEntries("reviews", 10, 0)).map((entry) => entry.path), ["/reviews/written"]);

    const context = new RouterContextProvider();
    context.set(appServicesContext, { db: database } as unknown as AppServices);
    const request = new Request("https://preview.example/sitemap.xml");
    const index = await sitemapIndex({ context, request, params: {} } as Parameters<typeof sitemapIndex>[0]);
    assert.match(index.headers.get("Content-Type")!, /application\/xml/);
    const xml = await index.text();
    assert.match(xml, /https:\/\/nollywoodfilm\.club\/sitemaps\/content\/1.xml/);
    assert.match(xml, /sitemaps\/reviews\/1.xml/);
    assert.ok(!xml.includes("preview.example"));
    for (const params of [{ kind: "private", page: "1.xml" }, { kind: "content", page: "0.xml" }, { kind: "content", page: "1" }, { kind: "reviews", page: "2.xml" }]) {
      await assert.rejects(() => sitemapChunk({ context, request, params } as Parameters<typeof sitemapChunk>[0]),
        (error: unknown) => error instanceof Response && error.status === 404);
    }
    const chunk = await sitemapChunk({ context, request, params: { kind: "content", page: "1.xml" } } as Parameters<typeof sitemapChunk>[0]);
    assert.match(await chunk.text(), /\/movie\/ajakaju/);
  } finally {
    database.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test("structured data reflects displayed scores and safely encodes user content", () => {
  const item = {
    title: "Test Film", contentType: "movie", releaseDate: "2024-01-01", runtime: 90,
    synopsis: "A film", posterImage: "/media/poster.jpg", posterVersion: null,
    genre: ["Drama"], rating: "PG", userRating: 7.64, ratingsCount: 25,
    castMembers: [{ role: "director", name: "Director" }, { role: "actor", name: "Actor" }],
  } as Content;
  const film = (contentStructuredData(item)["@graph"] as Record<string, unknown>[])[0];
  assert.equal(film["@type"], "Movie");
  assert.equal(film.duration, "PT90M");
  assert.deepEqual(film.aggregateRating, { "@type": "AggregateRating", ratingValue: 76, ratingCount: 25, bestRating: 100, worstRating: 0 });
  const tv = (contentStructuredData({ ...item, contentType: "tv_show", userRating: null })["@graph"] as Record<string, unknown>[])[0];
  assert.equal(tv["@type"], "TVSeries");
  assert.equal(tv.duration, undefined);
  assert.equal(tv.aggregateRating, undefined);
  assert.equal((contentStructuredData({ ...item, contentType: "short_film" })["@graph"] as Record<string, unknown>[])[0]["@type"], "Movie");

  const review = { id: "review", username: "Member", review: "**Worth watching**", restricted: false, film: item, createdAt: "2026-01-01", updatedAt: "2026-01-02" } as unknown as FeedReview;
  const node = (reviewStructuredData(review)!["@graph"] as Record<string, unknown>[])[0];
  assert.equal(node.reviewBody, "Worth watching");
  assert.equal(node.reviewRating, undefined);
  assert.equal(reviewStructuredData({ ...review, restricted: true }), null);
  assert.equal(reviewStructuredData({ ...review, review: "  " }), null);
  const attack = { text: "</script><script>alert(1)</script>&\u2028" };
  const serialized = serializeStructuredData(attack);
  assert.ok(!serialized.includes("<"));
  assert.deepEqual(JSON.parse(serialized), attack);
});
