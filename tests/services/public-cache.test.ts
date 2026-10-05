import assert from "node:assert/strict";
import test from "node:test";
import { RouterContextProvider } from "react-router";
import { appServicesContext } from "../../src/app/context";
import { loader as homeLoader, headers as homeHeaders } from "../../src/app/routes/home";
import type { AppServices } from "../../src/services/contracts";
import { getHomepageData } from "../../src/services/homepage";
import type { PublicReadRepository } from "../../src/repositories/public-read";
import { canStorePublicResponse, publicCacheKey, revalidatingHtmlResponse } from "../../src/runtime/public-cache";

test("failed homepage sections are marked uncacheable rather than becoming cached empty content", async (t) => {
  const log = t.mock.method(console, "error", () => {});
  let fail = true;
  const repository = {
    getMovieOfTheWeek: async () => null,
    getMoviesAndTVSeries: async () => {
      if (fail) throw new Error("Temporary catalogue read failure");
      return [];
    },
    getTrendingReviews: async () => [],
    getDiscussions: async () => {
      if (fail) throw new Error("Temporary discussions read failure");
      return [];
    },
    getContentPosters: async () => [],
  } as unknown as PublicReadRepository;
  const context = new RouterContextProvider();
  context.set(appServicesContext, { db: { publicReads: repository } } as unknown as AppServices);
  const result = await homeLoader({ context, params: {}, request: new Request("https://nollywoodfilm.club/") } as never);
  assert.deepEqual(result.data.moviesAndTVSeries, []);
  assert.equal(result.data.latestEpisode, null);
  const loaderHeaders = new Headers(result.init?.headers);
  assert.equal(loaderHeaders.get("Cache-Control"), "no-store");
  assert.equal(new Headers(homeHeaders({ loaderHeaders } as never)).get("Cache-Control"), "no-store");
  assert.equal(canStorePublicResponse(new Response("Coming soon", { headers: loaderHeaders })), false);
  assert.equal(log.mock.callCount(), 2);

  fail = false;
  const recovered = await getHomepageData(repository);
  assert.equal(recovered.degraded, false, "genuinely empty successful reads may still be cached");
});

test("public cache refuses no-store, private, no-cache and personalized responses", () => {
  assert.equal(canStorePublicResponse(new Response("healthy")), true);
  for (const policy of ["no-store", "public, NO-STORE", "private, max-age=60", "public, no-cache", 'private="Set-Cookie"']) {
    assert.equal(canStorePublicResponse(new Response("unavailable", { headers: { "Cache-Control": policy } })), false, policy);
  }
  assert.equal(canStorePublicResponse(new Response("personalized", { headers: { "Set-Cookie": "session=test" } })), false);
  assert.equal(canStorePublicResponse(new Response("error", { status: 500 })), false);
  assert.equal(canStorePublicResponse(new Response("vary", { headers: { Vary: "*" } })), false);
});

test("browser revalidation is separate from the Worker cache lifetime", async () => {
  const edge = new Response("healthy catalogue", { headers: { "Cache-Control": "public, max-age=300, s-maxage=300", "Content-Type": "text/html" } });
  const client = revalidatingHtmlResponse(edge);
  assert.equal(edge.headers.get("Cache-Control"), "public, max-age=300, s-maxage=300");
  assert.equal(client.headers.get("Cache-Control"), "no-cache");
  assert.equal(client.headers.get("Cloudflare-CDN-Cache-Control"), "no-store");
  assert.equal(await client.text(), "healthy catalogue");
  const degraded = revalidatingHtmlResponse(new Response("Coming soon", { headers: { "Cache-Control": "no-store" } }));
  assert.equal(degraded.headers.get("Cache-Control"), "no-store");
  assert.equal(revalidatingHtmlResponse(new Response("error", { status: 500 })).headers.get("Cache-Control"), "no-store");
});

test("deployments and content mutations produce distinct public cache keys", () => {
  const request = new Request("https://nollywoodfilm.club/movies-and-tv?page=2");
  const first = publicCacheKey(request, "catalog-1", "build-a");
  assert.notEqual(first.url, publicCacheKey(request, "catalog-1", "build-b").url);
  assert.notEqual(first.url, publicCacheKey(request, "catalog-2", "build-a").url);
  assert.equal(new URL(first.url).searchParams.get("page"), "2");
  assert.equal(request.url, "https://nollywoodfilm.club/movies-and-tv?page=2");
});
