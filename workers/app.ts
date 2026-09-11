import { createRequestHandler, RouterContextProvider } from "react-router";
import { appServicesContext } from "../src/app/context";
import { createCloudflareServices } from "../src/services/cloudflare";
import { withSecurityHeaders } from "../src/runtime/security-headers";

const MEDIA_PREFIX = "/media/";
const ANONYMOUS_HTML_CACHE_SECONDS = 300;
const ANONYMOUS_JSON_CACHE_SECONDS = 300;
const ANONYMOUS_HTML_CACHE = "nfc-public-html";
const ANONYMOUS_JSON_CACHE = "nfc-public-json";

const VERSION_TTL_MS = 30_000;
const versionMemory = new Map<string, { version: number; expires: number }>();

function isCacheableAnonymousHtmlRequest(request: Request) {
  if (request.method !== "GET") return false;
  if (request.headers.get("Cookie")?.includes("nollywood")) return false;

  const { pathname } = new URL(request.url);
  return (
    pathname === "/" ||
    pathname === "/movies-and-tv" ||
    pathname === "/scoreboard" ||
    pathname === "/discussions" ||
    pathname === "/reviews" ||
    pathname.startsWith("/movie/") ||
    pathname.startsWith("/tv/") ||
    pathname.startsWith("/short/") ||
    pathname.startsWith("/members/")
  );
}

function isCacheableAnonymousJsonRequest(request: Request) {
  if (request.method !== "GET") return false;
  if (request.headers.get("Cookie")?.includes("nollywood")) return false;
  const { pathname } = new URL(request.url);
  return (
    pathname === "/api/movies-and-tv-series" ||
    pathname === "/api/movie-of-the-week" ||
    pathname === "/api/reviews" ||
    pathname.startsWith("/api/movies-and-tv-series") ||
    pathname.startsWith("/api/reviews")
  );
}

function tagsForPath(pathname: string): string[] {
  if (pathname === "/") return ["catalog", "feed", "discussions", "content"];
  if (pathname === "/movies-and-tv") return ["catalog"];
  if (pathname === "/scoreboard") return ["scoreboard"];
  if (pathname === "/discussions") return ["discussions"];
  if (pathname === "/reviews") return ["feed"];
  if (pathname.startsWith("/movie/") || pathname.startsWith("/tv/") || pathname.startsWith("/short/")) return ["content"];
  if (pathname.startsWith("/members/")) return ["members"];
  if (pathname === "/api/movies-and-tv-series" || pathname === "/api/movie-of-the-week") return ["catalog"];
  if (pathname === "/api/reviews") return ["feed"];
  return [];
}

async function getVersion(env: Env, tag: string): Promise<number> {
  const cached = versionMemory.get(tag);
  if (cached && cached.expires > Date.now()) return cached.version;
  try {
    const row = await env.DB.prepare("SELECT version FROM cache_versions WHERE key = ?").bind(tag).first<{ version: number }>();
    const version = row?.version ?? 1;
    versionMemory.set(tag, { version, expires: Date.now() + VERSION_TTL_MS });
    return version;
  } catch {
    return 1;
  }
}

async function cacheKeyFor(request: Request, env: Env) {
  const { pathname } = new URL(request.url);
  const tags = tagsForPath(pathname);
  if (tags.length === 0) return new Request(request.url, { method: "GET" });
  const versions = await Promise.all(tags.map((tag) => getVersion(env, tag)));
  const versionSuffix = tags.map((tag, i) => `${tag}-${versions[i]}`).join("_");
  const url = new URL(request.url);
  url.searchParams.set("__cache_version", versionSuffix);
  return new Request(url.toString(), { method: "GET" });
}

// Media requests never enter the SSR pipeline: they are served straight from
// R2 so an image URL can never fall through to an HTML response (status 200
// or not — social crawlers like Twitterbot render whatever body arrives, and
// an HTML body silently kills the card). Mirrors routes/media.tsx, which
// remains the handler for the node runtime; the R2 key mapping is 1:1.
async function serveMedia(request: Request, env: Env): Promise<Response> {
  const key = new URL(request.url).pathname.slice(MEDIA_PREFIX.length);
  if (!key || key.includes("..") || key.includes("\\")) {
    return new Response("Invalid media key", { status: 400 });
  }

  const object = await env.OBJECTS.get(key);
  if (!object) return new Response("Not found", { status: 404 });

  const headers = new Headers();
  headers.set(
    "Content-Type",
    object.httpMetadata?.contentType ?? "application/octet-stream",
  );
  headers.set("Content-Length", String(object.size));
  if (object.etag) headers.set("ETag", object.etag);
  headers.set("Cache-Control", "public, max-age=31536000, immutable");

  const response =
    request.method === "HEAD"
      ? new Response(null, { headers })
      : new Response(object.body, { headers });
  return withSecurityHeaders(response);
}

const requestHandler = createRequestHandler(
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE,
);

export default {
  async fetch(request, env, ctx) {
    if (new URL(request.url).pathname.startsWith(MEDIA_PREFIX)) {
      return serveMedia(request, env);
    }

    const isHtmlCacheable = isCacheableAnonymousHtmlRequest(request);
    const isJsonCacheable = !isHtmlCacheable && isCacheableAnonymousJsonRequest(request);
    const cacheable = isHtmlCacheable || isJsonCacheable;
    const cacheName = isJsonCacheable ? ANONYMOUS_JSON_CACHE : ANONYMOUS_HTML_CACHE;
    const cacheKey = cacheable ? await cacheKeyFor(request, env) : null;
    const cache = cacheKey ? await caches.open(cacheName) : null;
    if (cacheKey && cache) {
      const cached = await cache.match(cacheKey);
      if (cached) return withSecurityHeaders(cached);
    }

    const context = new RouterContextProvider();
    context.set(appServicesContext, createCloudflareServices(env));
    const response = await requestHandler(request, context);

    const cacheSeconds = isJsonCacheable ? ANONYMOUS_JSON_CACHE_SECONDS : ANONYMOUS_HTML_CACHE_SECONDS;
    const contentType = response.headers.get("Content-Type") ?? "";
    const isCacheableContent = isHtmlCacheable
      ? contentType.includes("text/html")
      : isJsonCacheable
        ? contentType.includes("application/json")
        : false;

    if (
      cacheKey &&
      cache &&
      response.status === 200 &&
      isCacheableContent &&
      !response.headers.has("Set-Cookie")
    ) {
      const headers = new Headers(response.headers);
      headers.set(
        "Cache-Control",
        `public, max-age=60, s-maxage=${cacheSeconds}`,
      );
      const cacheableResponse = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
      ctx.waitUntil(cache.put(cacheKey, cacheableResponse.clone()));
      return withSecurityHeaders(cacheableResponse);
    }

    return withSecurityHeaders(response);
  },
} satisfies ExportedHandler<Env>;
