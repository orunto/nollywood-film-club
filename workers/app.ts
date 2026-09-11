import { createRequestHandler, RouterContextProvider } from "react-router";
import { appServicesContext } from "../src/app/context";
import { createCloudflareServices } from "../src/services/cloudflare";
import { withSecurityHeaders } from "../src/runtime/security-headers";

const MEDIA_PREFIX = "/media/";
const ANONYMOUS_HTML_CACHE_SECONDS = 300;
const ANONYMOUS_HTML_CACHE = "nfc-public-html";

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

function cacheKeyFor(request: Request) {
  return new Request(request.url, { method: "GET" });
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

    const cacheable = isCacheableAnonymousHtmlRequest(request);
    const cacheKey = cacheable ? cacheKeyFor(request) : null;
    const cache = cacheKey ? await caches.open(ANONYMOUS_HTML_CACHE) : null;
    if (cacheKey && cache) {
      const cached = await cache.match(cacheKey);
      if (cached) return withSecurityHeaders(cached);
    }

    const context = new RouterContextProvider();
    context.set(appServicesContext, createCloudflareServices(env));
    const response = await requestHandler(request, context);

    if (
      cacheKey &&
      cache &&
      response.status === 200 &&
      response.headers.get("Content-Type")?.includes("text/html") &&
      !response.headers.has("Set-Cookie")
    ) {
      const headers = new Headers(response.headers);
      headers.set(
        "Cache-Control",
        `public, max-age=60, s-maxage=${ANONYMOUS_HTML_CACHE_SECONDS}`,
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
