import assert from "node:assert/strict";
import test from "node:test";
import { RouterContextProvider, type MetaDescriptor } from "react-router";
import { appServicesContext } from "../../src/app/context";
import type { AppServices } from "../../src/services/contracts";
import type { Content } from "../../src/repositories/public-read";
import { paginatedPath, shouldNoIndex } from "../../src/lib/seo";
import { parseBrowseParams } from "../../src/lib/browse";
import { loader as browseLoader, meta as browseMeta } from "../../src/app/routes/movies-and-tv";
import { loader as discussionLoader, meta as discussionMeta } from "../../src/app/routes/discussions";
import { loader as reviewLoader, meta as reviewMeta } from "../../src/app/routes/reviews";
import { loader as movieLoader, meta as movieMeta } from "../../src/app/routes/movie.$slug";
import { loader as tvLoader, meta as tvMeta } from "../../src/app/routes/tv.$slug";
import { loader as shortLoader, meta as shortMeta } from "../../src/app/routes/short.$slug";
import { contentMetadata } from "../../src/services/content-detail";

const film: Content = {
  id: "10000000-0000-4000-8000-000000000001", title: "Test Film", contentType: "movie",
  releaseDate: "2024-01-01T00:00:00.000Z", synopsis: "A film.", runtime: 90,
  rating: null, genre: [], posterImage: null, posterVersion: null, trailerUrl: null,
  streamingUrl: null, streamingPlatform: null, otherPlatform: null, viewingCategory: null,
  castMembers: [], isMovieOfTheWeek: false, nfcCertified: false, catalogNumber: 1,
  createdAt: "2024-01-01T00:00:00.000Z", updatedAt: "2024-01-01T00:00:00.000Z",
  userRating: null, ratingsCount: 0,
};

function contextFor(item = film) {
  const context = new RouterContextProvider();
  context.set(appServicesContext, {
    db: { publicReads: {
      getAllContent: async () => Array.from({ length: 25 }, (_, i) => ({ ...film, id: String(i) })),
      getContentById: async () => item, getContentBySlug: async () => item,
      getUserRatingsForContent: async () => [], getDiscussionsForContent: async () => [],
      getCriticReviewsForContent: async () => [], getRelatedContentCandidates: async () => [],
      getRatingDistribution: async () => ({ positive: 0, mixed: 0, negative: 0 }),
      countDiscussions: async () => 30, getAllDiscussions: async () => [],
      countTrendingReviews: async () => 30, getTrendingReviews: async () => [],
    } },
    objects: { exists: async () => false },
  } as unknown as AppServices);
  return context;
}

function canonical(tags: MetaDescriptor[]) {
  return tags.find((tag) => "rel" in tag && tag.rel === "canonical");
}

test("pagination preserves each page while stripping tracking parameters", async () => {
  const context = contextFor();
  const request = new Request("https://preview.example/movies-and-tv?page=2&utm_source=test");
  const data = await browseLoader({ context, request, params: {} } as never);
  assert.equal(data.page, 2);
  assert.deepEqual(canonical(browseMeta({ matches: [{ id: "routes/movies-and-tv", loaderData: data }] } as never)), {
    tagName: "link", rel: "canonical", href: "https://nollywoodfilm.club/movies-and-tv?page=2",
  });
  const clamped = await browseLoader({ context, request: new Request("https://preview.example/movies-and-tv?page=999"), params: {} } as never);
  assert.equal(clamped.canonicalPath, "/movies-and-tv?page=3");
  for (const [path, loader, meta] of [
    ["discussions", discussionLoader, discussionMeta], ["reviews", reviewLoader, reviewMeta],
  ] as const) {
    const data = await loader({ context, request: new Request(`https://preview.example/${path}?page=2`), params: {} } as never);
    assert.deepEqual(canonical(meta({ matches: [{ id: `routes/${path}`, loaderData: data }] } as never)), {
      tagName: "link", rel: "canonical", href: `https://nollywoodfilm.club/${path}?page=2`,
    });
  }
});

test("filter/search variants are noindex but clean pagination remains indexable", async () => {
  assert.equal(shouldNoIndex("/movies-and-tv", "?page=2&utm_source=test"), false);
  assert.equal(shouldNoIndex("/movies-and-tv", "?sort=newest&type=all"), false);
  for (const query of ["?q=film", "?type=movie", "?genre=drama", "?platform=netflix", "?sort=score", "?year=2024", "?score=high", "?watch=streaming"]) {
    assert.equal(shouldNoIndex("/movies-and-tv", query), true, query);
  }
  assert.equal(paginatedPath("/movies-and-tv", 2, "?utm_source=test&q=film&platform=netflix"), "/movies-and-tv?platform=netflix&q=film&page=2");
  const data = await browseLoader({ context: contextFor(), request: new Request("https://preview.example/movies-and-tv?q=absent&page=2"), params: {} } as never);
  assert.equal(data.canonicalPath, "/movies-and-tv?q=absent");
  assert.equal(parseBrowseParams(new URLSearchParams("page=2junk")).page, 1);
  assert.equal(parseBrowseParams(new URLSearchParams("page=9007199254740992")).page, 1);
});

test("film metadata uses production URLs and legacy/wrong-type URLs redirect permanently", async () => {
  for (const [type, base, loader, meta, routeId] of [
    ["movie", "/movie", movieLoader, movieMeta, "routes/movie.$slug"],
    ["tv_show", "/tv", tvLoader, tvMeta, "routes/tv.$slug"],
    ["short_film", "/short", shortLoader, shortMeta, "routes/short.$slug"],
  ] as const) {
    const item = { ...film, contentType: type };
    const context = contextFor(item);
    const data = await loader({ context, request: new Request(`https://preview.example${base}/test-film-2024`), params: { slug: "test-film-2024" } } as never);
    assert.equal(data.canonicalUrl, `https://nollywoodfilm.club${base}/test-film-2024`);
    assert.equal(data.openGraphImageUrl, `https://nollywoodfilm.club${base}/test-film-2024/opengraph-image`);
    const tags = meta({ matches: [{ id: routeId, loaderData: data }] } as never);
    assert.deepEqual(canonical(tags), { tagName: "link", rel: "canonical", href: data.canonicalUrl });
    assert.ok(tags.some((tag) => "property" in tag && tag.property === "og:type" && tag.content === (type === "tv_show" ? "video.tv_show" : "video.movie")));
    for (const slug of [film.id, "old-film-slug"]) {
      await assert.rejects(() => loader({ context, request: new Request(`https://preview.example${base}/${slug}`), params: { slug } } as never),
        (error: unknown) => error instanceof Response && error.status === 301 && error.headers.get("Location") === `${base}/test-film-2024`);
    }
  }
  await assert.rejects(() => movieLoader({ context: contextFor({ ...film, contentType: "tv_show" }), params: { slug: film.id }, request: new Request(`https://preview.example/movie/${film.id}`) } as never),
    (error: unknown) => error instanceof Response && error.status === 301 && error.headers.get("Location") === "/tv/test-film-2024");
});

test("film descriptions keep the synopsis, displayed NFC score and available watch links", () => {
  const { title, description } = contentMetadata({ ...film, synopsis: "**A very long synopsis.** ".repeat(30), userRating: 0, streamingUrl: "https://www.netflix.com/title/example" });
  assert.match(title, /Test Film \(2024\) Reviews & Ratings/);
  assert.ok(description.length <= 160);
  assert.ok(description.startsWith("A very long synopsis."));
  assert.ok(!description.includes("**"));
  assert.match(description, /NFC score: 0%/);
  assert.match(description, /streaming links and club discussions\.$/);
  const empty = contentMetadata({ ...film, synopsis: "", userRating: null });
  assert.ok(empty.description.includes("Test Film"));
  assert.ok(!empty.description.includes("NFC score"));
  assert.ok(!empty.description.includes("streaming links"));
});
