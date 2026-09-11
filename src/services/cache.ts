import { sql } from "drizzle-orm";
import type { Database } from "./contracts";

export const CACHE_TAGS = [
  "catalog",
  "scoreboard",
  "content",
  "discussions",
  "feed",
  "members",
] as const;

export type CacheTag = (typeof CACHE_TAGS)[number];

export function tagsForPath(pathname: string): CacheTag[] {
  if (pathname === "/" ) return ["catalog", "feed", "discussions", "content"];
  if (pathname === "/movies-and-tv") return ["catalog"];
  if (pathname === "/scoreboard") return ["scoreboard"];
  if (pathname === "/discussions") return ["discussions"];
  if (pathname === "/reviews") return ["feed"];
  if (pathname.startsWith("/movie/") || pathname.startsWith("/tv/") || pathname.startsWith("/short/")) return ["content"];
  if (pathname.startsWith("/members/")) return ["members"];
  if (pathname === "/api/movies-and-tv-series" || pathname === "/api/movie-of-the-week") return ["catalog"];
  if (pathname === "/api/reviews") return ["feed"];
  if (pathname.startsWith("/api/")) return [];
  return [];
}

export async function bumpCacheVersions(
  database: Database,
  tags: CacheTag[],
): Promise<void> {
  if (tags.length === 0) return;
  const now = Date.now();
  const commands = tags.map((tag) => ({
    sql: "INSERT INTO cache_versions (key, version, updated_at) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET version = version + 1, updated_at = excluded.updated_at",
    params: [tag, now],
  }));
  await database.atomic(commands);
}

export async function bumpCacheForContent(
  database: Database,
  contentIds: string[],
): Promise<void> {
  // Content changes affect catalog, scoreboard, and content pages
  const tags: CacheTag[] = ["catalog", "scoreboard", "content"];
  await bumpCacheVersions(database, tags);
  void contentIds;
}

export async function bumpCacheForRating(
  database: Database,
): Promise<void> {
  await bumpCacheVersions(database, ["catalog", "scoreboard", "content", "feed", "members"]);
}

export async function bumpCacheForDiscussion(
  database: Database,
): Promise<void> {
  await bumpCacheVersions(database, ["discussions", "catalog", "content"]);
}

export async function bumpCacheForModeration(
  database: Database,
): Promise<void> {
  await bumpCacheVersions(database, ["catalog", "scoreboard", "content", "feed"]);
}
