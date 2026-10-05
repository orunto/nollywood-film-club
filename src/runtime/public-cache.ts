export function canStorePublicResponse(response: Response): boolean {
  const policy = response.headers.get("Cache-Control") ?? "";
  return response.status === 200 && !response.headers.has("Set-Cookie") &&
    !/(?:^|,)\s*(?:private|no-store|no-cache)(?:\s|,|=|$)/i.test(policy) &&
    response.headers.get("Vary")?.trim() !== "*";
}

export function publicCacheKey(request: Request, contentVersion: string, buildVersion: string): Request {
  const url = new URL(request.url);
  url.searchParams.set("__cache_version", contentVersion);
  // Cached documents reference build-specific JS/CSS and must not cross deployments.
  url.searchParams.set("__build_version", buildVersion);
  return new Request(url, { method: "GET" });
}

export function revalidatingHtmlResponse(response: Response): Response {
  const headers = new Headers(response.headers);
  const originalPolicy = headers.get("Cache-Control") ?? "";
  if (response.status !== 200 || headers.has("Set-Cookie")) {
    headers.set("Cache-Control", "no-store");
  } else if (!/(?:^|,)\s*(?:private|no-store)(?:\s|,|=|$)/i.test(originalPolicy)) {
    // A browser TTL configured on the zone can increase max-age=60 to four hours.
    // Revalidation avoids that override while the Worker keeps its own edge cache.
    headers.set("Cache-Control", "no-cache");
  }
  // The Worker Cache API already owns caching; avoid a second unversioned CDN copy.
  headers.set("Cloudflare-CDN-Cache-Control", "no-store");
  return new Response(response.body, {
    status: response.status, statusText: response.statusText, headers,
  });
}
