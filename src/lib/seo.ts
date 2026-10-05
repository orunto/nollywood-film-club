import { SITE_URL } from "./meta";

// These pages must be crawlable for search engines to observe their noindex tag.
const UTILITY_PATHS = [
  "/auth", "/onboarding", "/forgot-password", "/reset-password",
  "/account-claim", "/user-dashboard", "/admin",
];

const BROWSE_QUERY_KEYS = ["type", "year", "platform", "genre", "score", "watch", "sort", "q"];

export function shouldNoIndex(pathname: string, search = ""): boolean {
  if (UTILITY_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) return true;
  if (pathname !== "/movies-and-tv") return false;
  const params = new URLSearchParams(search);
  return BROWSE_QUERY_KEYS.some((key) => {
    const value = params.get(key)?.trim();
    return Boolean(value && !(key === "sort" && value === "newest") && !(key === "type" && value === "all"));
  });
}

export function paginatedPath(path: string, page: number, search = ""): string {
  const params = new URLSearchParams();
  if (path === "/movies-and-tv") {
    const source = new URLSearchParams(search);
    for (const key of BROWSE_QUERY_KEYS) {
      const value = source.get(key)?.trim();
      if (value && !(key === "sort" && value === "newest") && !(key === "type" && value === "all")) {
        params.set(key, value);
      }
    }
  }
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

export const ROBOTS_TXT = [
  "User-agent: *",
  "Allow: /",
  "Disallow: /api/",
  "Disallow: /health",
  "",
  `Sitemap: ${SITE_URL}/sitemap.xml`,
  "",
].join("\n");

export const SITEMAP_PAGE_SIZE = 1000;
export const SITEMAP_STATIC_PATHS = [
  "/", "/movies-and-tv", "/scoreboard", "/discussions", "/reviews",
  "/about", "/contact", "/privacy", "/terms",
];

export interface SitemapEntry {
  path: string;
  lastModified?: string;
}

function escapeXml(value: string): string {
  return value.replace(/[<>&"']/g, (character) => ({
    "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;",
  })[character]!);
}

export function sitemapXml(entries: SitemapEntry[], index = false): string {
  const root = index ? "sitemapindex" : "urlset";
  const tag = index ? "sitemap" : "url";
  const body = entries.map(({ path, lastModified }) => {
    const date = lastModified ? new Date(lastModified) : null;
    const lastmod = date && !Number.isNaN(date.getTime())
      ? `<lastmod>${date.toISOString()}</lastmod>` : "";
    return `<${tag}><loc>${escapeXml(new URL(path, SITE_URL).href)}</loc>${lastmod}</${tag}>`;
  }).join("");
  return `<?xml version="1.0" encoding="UTF-8"?><${root} xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</${root}>`;
}

export function sitemapResponse(entries: SitemapEntry[], index = false): Response {
  return new Response(sitemapXml(entries, index), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
