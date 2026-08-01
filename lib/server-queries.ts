import { cache } from "react";
import { db } from "@/db/client";
import {
  contactMessages,
  content,
  discussions,
  comments,
  reports,
  reviews,
  userRatings,
  users,
  type CastMember,
} from "@/db/schema";
import { eq, avg, asc, desc, sql, and, inArray, isNotNull, isNull, lte, ne, or } from "drizzle-orm";
import { stackServerApp } from "@/stack";
import { isAdminUser, isRegularUser } from "@/lib/roles";
import { contentSlug, type ViewingCategory } from "@/lib/utils";
import type { NavUser } from "@/components/custom/nav";

export type { CastMember };

// Types
export interface Content {
  id: string;
  title: string;
  contentType: "movie" | "tv_show" | "short_film";
  runtime: number | null;
  releaseDate: string | null;
  rating: string | null;
  synopsis: string | null;
  genre: string[] | null;
  posterImage: string | null;
  posterVersion: number | null;
  trailerUrl: string | null;
  streamingUrl: string | null;
  streamingPlatform: string | null;
  otherPlatform: string | null;
  viewingCategory: ViewingCategory | null;
  castMembers: CastMember[] | null;
  isMovieOfTheWeek: boolean;
  catalogNumber: number | null;
  createdAt: string;
  updatedAt: string;
  userRating: number | null;
}

export interface Discussion {
  id: string;
  title: string;
  description: string | null;
  contentId: string | null;
  spaceUrl: string | null;
  podcastLinks: string[] | null;
  episodeNumber: number | null;
  discussionDate: string | null;
  createdAt: string;
  updatedAt: string;
  // Joined info about the related movie/TV show, null for standalone discussions
  content: {
    id: string;
    title: string;
    contentType: "movie" | "tv_show" | "short_film";
    releaseDate: string | null;
    synopsis: string | null;
    runtime: number | null;
  } | null;
}

export interface Review {
  id: string;
  contentId: string;
  title: string;
  description: string;
  score: number | null;
  reviewer: string;
  externalUrl: string | null;
  reviewImage: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BlogPost {
  id: string;
  title: string;
  content: string;
  excerpt: string | null;
  slug: string;
  published: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserRating {
  id: string;
  contentId: string;
  userId: string;
  rating: number | null; // 0 (didn't like), 5 (okay), or 10 (liked)
  review: string | null;
  edited: boolean; // user re-submitted their rating/review
  flagged: boolean;
  restricted: boolean;
  createdAt: string;
  updatedAt: string;
  // Added username and profileImage fields to store the user info from Stack Auth
  username?: string;
  profileImage?: string;
  isRegular?: boolean;
  // Real local username, or null — only link to a profile when this is set.
  profileUsername?: string | null;
}

// Admin-only view of a user rating, with the related content's title joined in
export interface AdminUserRating extends UserRating {
  contentTitle: string;
}

// Server-side data fetching functions
export async function getMovieOfTheWeek(): Promise<Content | null> {
  try {
    const movieOfTheWeek = await db
      .select()
      .from(content)
      .where(eq(content.isMovieOfTheWeek, true))
      .limit(1);

    const result = movieOfTheWeek[0];
    if (!result) return null;

    return {
      ...result,
      id: result.id || "",
      title: result.title || "",
      contentType: result.contentType || "movie",
      releaseDate: result.releaseDate?.toISOString() || null,
      createdAt: result.createdAt?.toISOString() || "",
      updatedAt: result.updatedAt?.toISOString() || "",
      isMovieOfTheWeek: result.isMovieOfTheWeek ?? false,
      userRating: null,
    };
  } catch (error) {
    console.error("Error fetching movie of the week:", error);
    return null;
  }
}

export async function getMoviesAndTVSeries(): Promise<Content[]> {
  try {
    const moviesAndTVSeries = await db
      .select({
        id: content.id,
        title: content.title,
        contentType: content.contentType,
        runtime: content.runtime,
        releaseDate: content.releaseDate,
        rating: content.rating,
        synopsis: content.synopsis,
        genre: content.genre,
        posterImage: content.posterImage,
        posterVersion: content.posterVersion,
        trailerUrl: content.trailerUrl,
        streamingUrl: content.streamingUrl,
        streamingPlatform: content.streamingPlatform,
        otherPlatform: content.otherPlatform,
        viewingCategory: content.viewingCategory,
        castMembers: content.castMembers,
        isMovieOfTheWeek: content.isMovieOfTheWeek,
        catalogNumber: content.catalogNumber,
        createdAt: content.createdAt,
        updatedAt: content.updatedAt,
        userRating: avg(userRatings.rating),
      })
      .from(content)
      .leftJoin(userRatings, eq(content.id, userRatings.contentId))
      .where(eq(content.isMovieOfTheWeek, false))
      .groupBy(content.id)
      .orderBy(
        sql`${content.catalogNumber} DESC NULLS LAST`,
        desc(content.createdAt),
      )
      .limit(20);

    return moviesAndTVSeries.map((item) => ({
      ...item,
      id: item.id || "",
      title: item.title || "",
      contentType: item.contentType || "movie",
      releaseDate: item.releaseDate?.toISOString() || null,
      createdAt: item.createdAt?.toISOString() || "",
      updatedAt: item.updatedAt?.toISOString() || "",
      isMovieOfTheWeek: item.isMovieOfTheWeek ?? false,
      userRating: item.userRating ? parseFloat(item.userRating) : null,
    }));
  } catch (error) {
    console.error("Error fetching movies and tv series:", error);
    return [];
  }
}

// Full catalog for the /movies-and-tv browse page — includes the movie of the
// week and has no limit; filtering/sorting happens client-side over the result.
export async function getAllContent(): Promise<Content[]> {
  try {
    const allContent = await db
      .select({
        id: content.id,
        title: content.title,
        contentType: content.contentType,
        runtime: content.runtime,
        releaseDate: content.releaseDate,
        rating: content.rating,
        synopsis: content.synopsis,
        genre: content.genre,
        posterImage: content.posterImage,
        posterVersion: content.posterVersion,
        trailerUrl: content.trailerUrl,
        streamingUrl: content.streamingUrl,
        streamingPlatform: content.streamingPlatform,
        otherPlatform: content.otherPlatform,
        viewingCategory: content.viewingCategory,
        castMembers: content.castMembers,
        isMovieOfTheWeek: content.isMovieOfTheWeek,
        catalogNumber: content.catalogNumber,
        createdAt: content.createdAt,
        updatedAt: content.updatedAt,
        userRating: avg(userRatings.rating),
      })
      .from(content)
      .leftJoin(userRatings, eq(content.id, userRatings.contentId))
      .groupBy(content.id)
      .orderBy(
        sql`${content.catalogNumber} DESC NULLS LAST`,
        desc(content.createdAt),
      );

    return allContent.map((item) => ({
      ...item,
      id: item.id || "",
      title: item.title || "",
      contentType: item.contentType || "movie",
      releaseDate: item.releaseDate?.toISOString() || null,
      createdAt: item.createdAt?.toISOString() || "",
      updatedAt: item.updatedAt?.toISOString() || "",
      isMovieOfTheWeek: item.isMovieOfTheWeek ?? false,
      userRating: item.userRating ? parseFloat(item.userRating) : null,
    }));
  } catch (error) {
    console.error("Error fetching all content:", error);
    return [];
  }
}

// A scoreboard row: a title plus how many votes fed its NFC score. The count
// includes legacy poll votes (userRatings rows seeded from the pre-site NFC
// Data.xlsx import, userId formatted "legacy-poll:<slug>:<n>") — they're
// ordinary userRatings rows, so counting the join picks them up same as any
// member vote.
export interface ScoreboardEntry extends Content {
  ratingsCount: number;
}

// Content ranked by NFC score for the /scoreboard page. Unrated titles are
// dropped entirely (an "N/A" row at the top of a ranking reads as broken),
// and the aggregate itself — not one of the select aliases — drives the sort,
// since a groupBy query can't order by its own select alias in Drizzle.
export async function getScoreboard({
  contentType,
  limit = 100,
}: {
  contentType?: "movie" | "tv_show" | "short_film";
  limit?: number;
} = {}): Promise<ScoreboardEntry[]> {
  try {
    const ranked = await db
      .select({
        id: content.id,
        title: content.title,
        contentType: content.contentType,
        runtime: content.runtime,
        releaseDate: content.releaseDate,
        rating: content.rating,
        synopsis: content.synopsis,
        genre: content.genre,
        posterImage: content.posterImage,
        posterVersion: content.posterVersion,
        trailerUrl: content.trailerUrl,
        streamingUrl: content.streamingUrl,
        streamingPlatform: content.streamingPlatform,
        otherPlatform: content.otherPlatform,
        viewingCategory: content.viewingCategory,
        castMembers: content.castMembers,
        isMovieOfTheWeek: content.isMovieOfTheWeek,
        catalogNumber: content.catalogNumber,
        createdAt: content.createdAt,
        updatedAt: content.updatedAt,
        userRating: avg(userRatings.rating),
        ratingsCount: sql<number>`count(${userRatings.id})::int`,
      })
      .from(content)
      .leftJoin(userRatings, eq(content.id, userRatings.contentId))
      .where(contentType ? eq(content.contentType, contentType) : undefined)
      .groupBy(content.id)
      .having(sql`avg(${userRatings.rating}) is not null`)
      .orderBy(desc(sql`avg(${userRatings.rating})`))
      .limit(limit);

    return ranked.map((item) => ({
      ...item,
      id: item.id || "",
      title: item.title || "",
      contentType: item.contentType || "movie",
      releaseDate: item.releaseDate?.toISOString() || null,
      createdAt: item.createdAt?.toISOString() || "",
      updatedAt: item.updatedAt?.toISOString() || "",
      isMovieOfTheWeek: item.isMovieOfTheWeek ?? false,
      userRating: item.userRating ? parseFloat(item.userRating) : null,
      ratingsCount: Number(item.ratingsCount ?? 0),
    }));
  } catch (error) {
    console.error("Error fetching scoreboard:", error);
    return [];
  }
}

export async function getReviews(): Promise<Review[]> {
  try {
    const reviewsData = await db
      .select()
      .from(reviews)
      .orderBy(reviews.publishedAt)
      .limit(4);

    return reviewsData.map((item) => ({
      ...item,
      id: item.id || "",
      contentId: item.contentId || "",
      title: item.title || "",
      description: item.description || "",
      reviewer: item.reviewer || "",
      score:
        typeof item.score === "string"
          ? parseFloat(item.score) || null
          : item.score,
      publishedAt: item.publishedAt?.toISOString() || null,
      createdAt: item.createdAt?.toISOString() || "",
      updatedAt: item.updatedAt?.toISOString() || "",
    }));
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return [];
  }
}

// Critic reviews published for one content item, newest first
export async function getReviewsForContent(
  contentId: string,
): Promise<Review[]> {
  try {
    const rows = await db
      .select()
      .from(reviews)
      .where(eq(reviews.contentId, contentId))
      .orderBy(
        sql`${reviews.publishedAt} DESC NULLS LAST`,
        desc(reviews.createdAt),
      );

    return rows.map((item) => ({
      ...item,
      id: item.id || "",
      contentId: item.contentId || "",
      title: item.title || "",
      description: item.description || "",
      reviewer: item.reviewer || "",
      score:
        typeof item.score === "string"
          ? parseFloat(item.score) || null
          : item.score,
      publishedAt: item.publishedAt?.toISOString() || null,
      createdAt: item.createdAt?.toISOString() || "",
      updatedAt: item.updatedAt?.toISOString() || "",
    }));
  } catch (error) {
    console.error("Error fetching reviews for content:", error);
    return [];
  }
}

// Titles to suggest under "More Like This" on a details page — ranked by how
// many genres they share with the current item, falling back to same type.
// The catalog is small, so ranking in JS over the full list is fine.
export async function getRelatedContent(item: Content, limit = 4): Promise<Content[]> {
  const all = await getAllContent();
  const genres = new Set((item.genre ?? []).map((g) => g.toLowerCase()));

  return all
    .filter((other) => other.id !== item.id)
    .map((other) => ({
      other,
      shared: (other.genre ?? []).filter((g) => genres.has(g.toLowerCase())).length,
    }))
    .filter(({ other, shared }) => shared > 0 || other.contentType === item.contentType)
    .sort((a, b) => b.shared - a.shared)
    .slice(0, limit)
    .map(({ other }) => other);
}

function mapDiscussion(
  item: typeof discussions.$inferSelect,
  related: typeof content.$inferSelect | null,
): Discussion {
  return {
    id: item.id || "",
    title: item.title || "",
    description: item.description,
    contentId: item.contentId,
    spaceUrl: item.spaceUrl,
    podcastLinks: item.podcastLinks,
    episodeNumber: item.episodeNumber,
    discussionDate: item.discussionDate?.toISOString() || null,
    createdAt: item.createdAt?.toISOString() || "",
    updatedAt: item.updatedAt?.toISOString() || "",
    content: related
      ? {
          id: related.id,
          title: related.title,
          contentType: related.contentType || "movie",
          releaseDate: related.releaseDate?.toISOString() || null,
          synopsis: related.synopsis,
          runtime: related.runtime,
        }
      : null,
  };
}

export async function getDiscussions(): Promise<Discussion[]> {
  try {
    const rows = await db
      .select()
      .from(discussions)
      .leftJoin(content, eq(discussions.contentId, content.id))
      // A scheduled space has not been held yet, so it has nothing to listen to:
      // keep it off the homepage until its date arrives. Undated discussions stay,
      // since a missing date means unscheduled, not upcoming. Filtered in SQL so an
      // upcoming episode can't take a slot from the 20 the homepage asks for.
      .where(
        or(
          isNull(discussions.discussionDate),
          lte(discussions.discussionDate, new Date()),
        ),
      )
      .orderBy(
        sql`${discussions.episodeNumber} DESC NULLS LAST`,
        sql`${discussions.discussionDate} DESC NULLS LAST`,
        desc(discussions.createdAt),
      )
      .limit(20);

    return rows.map((row) => mapDiscussion(row.discussions, row.content));
  } catch (error) {
    console.error("Error fetching discussions:", error);
    return [];
  }
}

// A scheduled-but-not-yet-held space has nothing to listen to — same rule
// getDiscussions uses, shared here so the full archive and the homepage strip
// agree on what counts as "out."
const DISCUSSION_VISIBLE = or(
  isNull(discussions.discussionDate),
  lte(discussions.discussionDate, new Date()),
);
const DISCUSSION_ORDER = [
  sql`${discussions.episodeNumber} DESC NULLS LAST`,
  sql`${discussions.discussionDate} DESC NULLS LAST`,
  desc(discussions.createdAt),
];

// The full, paginated episode archive for /discussions — newest first.
export async function getAllDiscussions({
  limit = 20,
  offset = 0,
}: { limit?: number; offset?: number } = {}): Promise<Discussion[]> {
  try {
    const rows = await db
      .select()
      .from(discussions)
      .leftJoin(content, eq(discussions.contentId, content.id))
      .where(DISCUSSION_VISIBLE)
      .orderBy(...DISCUSSION_ORDER)
      .limit(limit)
      .offset(offset);

    return rows.map((row) => mapDiscussion(row.discussions, row.content));
  } catch (error) {
    console.error("Error fetching all discussions:", error);
    return [];
  }
}

// Total archive size, for pagination.
export async function countDiscussions(): Promise<number> {
  try {
    const [row] = await db
      .select({ total: sql<number>`COUNT(*)::int` })
      .from(discussions)
      .where(DISCUSSION_VISIBLE);
    return Number(row?.total ?? 0);
  } catch (error) {
    console.error("Error counting discussions:", error);
    return 0;
  }
}

// Every episode that discussed this film, earliest first. A film can be covered
// more than once — a rewatch, or a sequel week that revisits the original — and
// the earliest is the canonical one: it is the same episode that sets
// content.catalog_number via MIN(episode_number) in lib/catalog-sync.ts.
export async function getDiscussionsForContent(
  contentId: string,
): Promise<Discussion[]> {
  try {
    const rows = await db
      .select()
      .from(discussions)
      .leftJoin(content, eq(discussions.contentId, content.id))
      .where(eq(discussions.contentId, contentId))
      .orderBy(
        sql`${discussions.episodeNumber} ASC NULLS LAST`,
        sql`${discussions.discussionDate} ASC NULLS LAST`,
        asc(discussions.createdAt),
      );

    return rows.map((row) => mapDiscussion(row.discussions, row.content));
  } catch (error) {
    console.error("Error fetching discussions for content:", error);
    return [];
  }
}

// Flattens a film's episodes into the single set of values the hero and the
// detail page take. Deliberately permissive, because a film discussed twice
// should be at least as available as one discussed once:
//   - the date is the earliest, i.e. when the club first covered it
//   - podcast links are pooled, so any episode's link unlocks rating
//     (isRatingOpen short-circuits on a link) and all of them are listenable
//   - the Space is the earliest episode's, matching the date beside it
export function mergeDiscussions(list: Discussion[]): {
  spaceUrl: string | null;
  podcastLinks: string[] | null;
  discussionDate: string | null;
} {
  if (list.length === 0) {
    return { spaceUrl: null, podcastLinks: null, discussionDate: null };
  }

  const podcastLinks = [
    ...new Set(list.flatMap((discussion) => discussion.podcastLinks ?? [])),
  ];
  const dates = list
    .map((discussion) => discussion.discussionDate)
    .filter((date): date is string => Boolean(date))
    .sort();

  return {
    spaceUrl: list.find((discussion) => discussion.spaceUrl)?.spaceUrl ?? null,
    podcastLinks: podcastLinks.length > 0 ? podcastLinks : null,
    discussionDate: dates[0] ?? null,
  };
}

// Combined function to fetch all homepage data.
// `reviews` here is the trending *member* feed — critic reviews still live on
// the film detail pages via getReviewsForContent.
export async function getHomepageData() {
  try {
    const [movieOfTheWeek, moviesAndTVSeries, reviews, discussions] = await Promise.all([
      getMovieOfTheWeek(),
      getMoviesAndTVSeries(),
      getTrendingReviews({ limit: 4 }),
      getDiscussions(),
    ]);

    // The hero only wants the flattened space/links/date, so merge here — the
    // movie of the week can have been discussed more than once too.
    const movieOfTheWeekDiscussion = movieOfTheWeek
      ? mergeDiscussions(await getDiscussionsForContent(movieOfTheWeek.id))
      : null;

    return {
      movieOfTheWeek,
      movieOfTheWeekDiscussion,
      moviesAndTVSeries,
      reviews,
      discussions,
    };
  } catch (error) {
    console.error("Error fetching homepage data:", error);
    return {
      movieOfTheWeek: null,
      movieOfTheWeekDiscussion: null,
      moviesAndTVSeries: [],
      reviews: [] as FeedReview[],
      discussions: [],
    };
  }
}

// New function to get content by ID
export async function getContentById(id: string): Promise<Content | null> {
  try {
    const result = await db
      .select({
        id: content.id,
        title: content.title,
        contentType: content.contentType,
        runtime: content.runtime,
        releaseDate: content.releaseDate,
        rating: content.rating,
        synopsis: content.synopsis,
        genre: content.genre,
        posterImage: content.posterImage,
        posterVersion: content.posterVersion,
        trailerUrl: content.trailerUrl,
        streamingUrl: content.streamingUrl,
        streamingPlatform: content.streamingPlatform,
        otherPlatform: content.otherPlatform,
        viewingCategory: content.viewingCategory,
        castMembers: content.castMembers,
        isMovieOfTheWeek: content.isMovieOfTheWeek,
        catalogNumber: content.catalogNumber,
        createdAt: content.createdAt,
        updatedAt: content.updatedAt,
        userRating: avg(userRatings.rating),
      })
      .from(content)
      .leftJoin(userRatings, eq(content.id, userRatings.contentId))
      .where(eq(content.id, id))
      .groupBy(content.id)
      .limit(1);

    const item = result[0];
    if (!item) return null;

    return {
      ...item,
      id: item.id || "",
      title: item.title || "",
      contentType: item.contentType || "movie",
      releaseDate: item.releaseDate?.toISOString() || null,
      createdAt: item.createdAt?.toISOString() || "",
      updatedAt: item.updatedAt?.toISOString() || "",
      isMovieOfTheWeek: item.isMovieOfTheWeek ?? false,
      userRating: item.userRating ? parseFloat(item.userRating) : null,
    };
  } catch (error) {
    console.error("Error fetching content by ID:", error);
    return null;
  }
}

// Resolves an SEO slug ("everybody-loves-jenifa-2024") to a content row.
// Slugs aren't stored — they're derived from title + release year — so we
// match against the computed slug of every row (the catalog is small).
export async function getContentBySlug(slug: string): Promise<Content | null> {
  try {
    const rows = await db
      .select({
        id: content.id,
        title: content.title,
        releaseDate: content.releaseDate,
      })
      .from(content);

    const match = rows.find(
      (row) => contentSlug(row.title, row.releaseDate) === slug,
    );
    return match ? getContentById(match.id) : null;
  } catch (error) {
    console.error("Error fetching content by slug:", error);
    return null;
  }
}

export interface UserDisplay {
  username: string;
  profileImage?: string;
  isRegular: boolean;
  // The real local `users.username` (nullable — plenty of members never set
  // one), distinct from `username` above which always falls back to a
  // displayable name. Only link to a profile when this is set; `username`
  // alone is not a valid /members/[username] route segment (it might be a
  // display name with spaces, or "Deleted member").
  profileUsername: string | null;
}

// Shape shared by the About page's regulars roster and public profile pages.
// `username` here IS the real local username (nullable) — unlike
// UserDisplay.username, there is no display-name fallback baked in.
export interface PublicProfile {
  id: string;
  username: string | null;
  displayName: string | null;
  profileImage?: string;
  isRegular: boolean;
  joinedAt: string | null;
}

// The one place a reviewer's public byline is decided. Onboarding only sets
// clientMetadata.username for accounts that pass through /auth/callback, so
// plenty of members have none — those used to render as a slice of their Stack
// UUID ("User 1b2h3f4a"), which is not a name anybody recognises.
//
// The chain stops at displayName on purpose. The local part of an email address
// would name far more people, but it is a fragment of something private that
// they never chose to publish. It is used to *prefill* the editable fields in
// onboarding instead (see lib/username.ts), so it can only become a byline if
// the member accepts it.
export function resolveUsername(user: {
  clientMetadata?: unknown;
  displayName?: string | null;
}): string {
  const username = (user.clientMetadata as { username?: string } | null)?.username;
  if (username) return username;
  if (user.displayName?.trim()) return user.displayName.trim();
  return "Member";
}

// Indexed username -> Stack user id lookup, for public profile routing
// (/members/[username]). Backed by the local `users` table (db/schema.ts),
// which is the real source of truth for username uniqueness — Stack's
// clientMetadata never enforced it.
export async function resolveUserIdByUsername(username: string): Promise<string | null> {
  const [row] = await db
    .select({ id: users.id })
    .from(users)
    .where(sql`lower(${users.username}) = lower(${username})`)
    .limit(1);
  return row?.id ?? null;
}

// Legacy poll rows (imported from NFC Data.xlsx) carry a synthetic userId —
// "legacy-poll:<slug>:<n>" — with no matching Stack Auth account. Recognized
// up front so getUserDisplay can skip straight to a fallback instead of
// issuing a Stack Auth lookup that is guaranteed to 400 (non-UUID user_id).
const LEGACY_POLL_PREFIX = "legacy-poll:";

// Display info for one reviewer, from Stack Auth (displayName/profileImage
// aren't mirrored locally — only username is, see resolveUserIdByUsername
// above). Wrapped in React cache() so a request that renders the same author
// more than once — a feed and the threads under it — only looks them up once.
const getUserDisplay = cache(async (userId: string): Promise<UserDisplay> => {
  if (userId.startsWith(LEGACY_POLL_PREFIX)) {
    return { username: "Legacy Member", isRegular: false, profileUsername: null };
  }
  try {
    const user = await stackServerApp.getUser(userId);
    if (user) {
      const [localRow] = await db
        .select({ username: users.username })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      return {
        username: resolveUsername(user),
        profileImage: user.profileImageUrl || undefined,
        isRegular: isRegularUser(user),
        profileUsername: localRow?.username ?? null,
      };
    }
  } catch (error) {
    console.error("Error fetching Stack user", userId, error);
  }
  // Deleted user, or Stack Auth is unreachable — never fail the whole page
  return { username: "Deleted member", isRegular: false, profileUsername: null };
});

// Resolve a batch of user IDs at once. Deduped and issued in parallel: this
// previously awaited one Stack Auth round-trip per user *in sequence*, which is
// tolerable for a single film's reviews but not for a cross-catalogue feed
// where nearly every row is a different author.
export async function getUserDisplayMap(
  userIds: string[],
): Promise<Map<string, UserDisplay>> {
  const unique = [...new Set(userIds)];
  const entries = await Promise.all(
    unique.map(async (id) => [id, await getUserDisplay(id)] as const),
  );
  return new Map(entries);
}

// Members an admin has flagged as "regulars" (see lib/roles.ts), for the
// About page roster. Same 200-account cap the admin users list already
// accepts — the regulars list will always be a small subset of that.
export async function getRegularUsers(): Promise<PublicProfile[]> {
  const allUsers = await stackServerApp.listUsers({ limit: 200 });
  const regulars = allUsers.filter(isRegularUser);
  if (regulars.length === 0) return [];

  const localRows = await db
    .select({ id: users.id, username: users.username })
    .from(users)
    .where(inArray(users.id, regulars.map((u) => u.id)));
  const usernameMap = new Map(localRows.map((row) => [row.id, row.username]));

  return regulars.map((user) => ({
    id: user.id,
    username: usernameMap.get(user.id) ?? null,
    displayName: user.displayName ?? null,
    profileImage: user.profileImageUrl || undefined,
    isRegular: true,
    joinedAt: user.signedUpAt.toISOString(),
  }));
}

// Current request's user serialized to the nav's minimal shape, plus the admin
// flag. Wrapped in cache() so this getUser() is shared with any other
// server-side getUser() in the same request.
export const getNavUser = cache(
  async (): Promise<{ user: NavUser | null; isAdmin: boolean }> => {
    const user = await stackServerApp.getUser();
    if (!user) return { user: null, isAdmin: false };
    const username =
      (user.clientMetadata as { username?: string } | null)?.username ?? null;
    return {
      user: {
        displayName: user.displayName ?? null,
        primaryEmail: user.primaryEmail ?? null,
        profileImageUrl: user.profileImageUrl ?? null,
        username,
      },
      isAdmin: isAdminUser(user),
    };
  },
);

// Shared helper: given raw userRatings rows, look up each reviewer's
// username/profileImage from Stack Auth and map to the public UserRating shape.
async function enrichRatingsWithUsernames(
  ratings: (typeof userRatings.$inferSelect)[],
): Promise<UserRating[]> {
  const userMap = await getUserDisplayMap(ratings.map((rating) => rating.userId));

  // Map ratings with usernames and profile images
  return ratings.map((item) => ({
    ...item,
    id: item.id || "",
    contentId: item.contentId || "",
    userId: item.userId || "",
    rating: item.rating ?? null,
    flagged: item.flagged ?? false,
    restricted: item.restricted ?? false,
    createdAt: item.createdAt?.toISOString() || "",
    updatedAt: item.updatedAt?.toISOString() || "",
    username: userMap.get(item.userId)?.username ?? "Deleted member",
    profileImage: userMap.get(item.userId)?.profileImage,
    isRegular: userMap.get(item.userId)?.isRegular ?? false,
    profileUsername: userMap.get(item.userId)?.profileUsername ?? null,
  }));
}

// New function to get user ratings for a specific content with usernames from Stack Auth.
// Deliberately NOT filtered by `restricted` here — the NFC score average above
// it never filters on `restricted` either, and every legacy-poll row (imported
// from NFC Data.xlsx, userId "legacy-poll:<slug>:<n>") was written with
// restricted=true, so a restricted=false filter here would silently drop them
// from the count/distribution while the score still counted them. Callers that
// render individual review cards must filter `!restricted` themselves — see
// `ratingsWithReview` in content-details-client.tsx.
export async function getUserRatingsForContent(
  contentId: string,
): Promise<UserRating[]> {
  try {
    const ratings = await db
      .select()
      .from(userRatings)
      .where(eq(userRatings.contentId, contentId))
      .orderBy(userRatings.createdAt);

    return await enrichRatingsWithUsernames(ratings);
  } catch (error) {
    console.error("Error fetching user ratings for content:", error);
    return [];
  }
}

// A review as it appears in the trending feed. Carries its film alongside it —
// the feed spans the whole catalogue, so unlike the detail page there is no
// surrounding context to say what is being reviewed.
export interface FeedReview extends UserRating {
  commentCount: number;
  film: {
    title: string;
    contentType: "movie" | "tv_show" | "short_film";
    releaseDate: string | null;
    posterImage: string | null;
  } | null;
}

// Trending = interaction, decayed by age.
//
//   (comment_count + 1) / (hours_since_posted + 2)^1.5
//
// The +1 matters: on a bare count every review with no comments scores zero, so
// nothing new could ever surface and the feed would start empty forever. With
// it, a fresh review ranks on recency alone and comments multiply from there.
// The +2 keeps a minutes-old review from dividing by ~0 and pinning the top.
const HOT_SCORE = sql<number>`
  (COUNT(${comments.id}) + 1)::float
  / POWER(EXTRACT(EPOCH FROM (NOW() - ${userRatings.createdAt})) / 3600 + 2, 1.5)
`;

// Only rows that are actually reviews (a bare rating with no text is not a
// feed item) and not hidden by a moderator.
const FEED_VISIBLE = and(
  eq(userRatings.restricted, false),
  isNotNull(userRatings.review),
  ne(userRatings.review, ""),
);

// Trending user reviews across the whole catalogue, newest-and-busiest first.
export async function getTrendingReviews({
  limit = 12,
  offset = 0,
}: { limit?: number; offset?: number } = {}): Promise<FeedReview[]> {
  try {
    const rows = await db
      .select({
        rating: userRatings,
        title: content.title,
        contentType: content.contentType,
        releaseDate: content.releaseDate,
        posterImage: content.posterImage,
        // Restricted comment must not inflate the ranking, so it is filtered
        // in the join condition rather than the WHERE clause — a WHERE would
        // drop reviews that have no comment at all.
        commentCount: sql<number>`COUNT(${comments.id})::int`,
      })
      .from(userRatings)
      .leftJoin(content, eq(userRatings.contentId, content.id))
      .leftJoin(
        comments,
        and(eq(comments.reviewId, userRatings.id), eq(comments.restricted, false)),
      )
      .where(FEED_VISIBLE)
      .groupBy(userRatings.id, content.id)
      .orderBy(desc(HOT_SCORE))
      .limit(limit)
      .offset(offset);

    const enriched = await enrichRatingsWithUsernames(rows.map((r) => r.rating));

    return enriched.map((rating, i) => ({
      ...rating,
      commentCount: Number(rows[i].commentCount ?? 0),
      film: rows[i].title
        ? {
            title: rows[i].title as string,
            contentType: rows[i].contentType as "movie" | "tv_show" | "short_film",
            releaseDate: rows[i].releaseDate?.toISOString() ?? null,
            posterImage: rows[i].posterImage,
          }
        : null,
    }));
  } catch (error) {
    console.error("Error fetching trending reviews:", error);
    return [];
  }
}

// Total feed size, for pagination.
export async function countTrendingReviews(): Promise<number> {
  try {
    const [row] = await db
      .select({ total: sql<number>`COUNT(*)::int` })
      .from(userRatings)
      .where(FEED_VISIBLE);
    return Number(row?.total ?? 0);
  } catch (error) {
    console.error("Error counting trending reviews:", error);
    return 0;
  }
}

// One review by id, for its permalink page. Returns null when missing or
// restricted, so the page can 404 rather than render a hidden review.
export async function getFeedReviewById(id: string): Promise<FeedReview | null> {
  try {
    const rows = await db
      .select({
        rating: userRatings,
        title: content.title,
        contentType: content.contentType,
        releaseDate: content.releaseDate,
        posterImage: content.posterImage,
        commentCount: sql<number>`COUNT(${comments.id})::int`,
      })
      .from(userRatings)
      .leftJoin(content, eq(userRatings.contentId, content.id))
      .leftJoin(
        comments,
        and(eq(comments.reviewId, userRatings.id), eq(comments.restricted, false)),
      )
      .where(and(eq(userRatings.id, id), eq(userRatings.restricted, false)))
      .groupBy(userRatings.id, content.id)
      .limit(1);

    const row = rows[0];
    if (!row) return null;

    const [enriched] = await enrichRatingsWithUsernames([row.rating]);
    return {
      ...enriched,
      commentCount: Number(row.commentCount ?? 0),
      film: row.title
        ? {
            title: row.title,
            contentType: row.contentType as "movie" | "tv_show" | "short_film",
            releaseDate: row.releaseDate?.toISOString() ?? null,
            posterImage: row.posterImage,
          }
        : null,
    };
  } catch (error) {
    console.error("Error fetching review by id:", error);
    return null;
  }
}

// Public profile for /members/[username]. Resolves the username through the
// local `users` table (Stack has no indexed way to do this), then pulls
// display fields from Stack itself. Returns null on no match so the page can
// 404 — covers both "no such username" and "account since deleted".
export async function getPublicProfile(username: string): Promise<PublicProfile | null> {
  try {
    const id = await resolveUserIdByUsername(username);
    if (!id) return null;

    const user = await stackServerApp.getUser(id);
    if (!user) return null;

    return {
      id: user.id,
      // Storage is always lowercased (create-username, the backfill script),
      // so the input already matches the canonical stored casing.
      username: username.toLowerCase(),
      displayName: user.displayName ?? null,
      profileImage: user.profileImageUrl || undefined,
      isRegular: isRegularUser(user),
      joinedAt: user.signedUpAt.toISOString(),
    };
  } catch (error) {
    console.error("Error fetching public profile:", error);
    return null;
  }
}

// Like/okay/disliked counts for a member's profile header.
export async function getUserRatingStats(
  userId: string,
): Promise<{ total: number; liked: number; okay: number; disliked: number }> {
  try {
    const rows = await db
      .select({ rating: userRatings.rating, n: sql<number>`COUNT(*)::int` })
      .from(userRatings)
      .where(and(eq(userRatings.userId, userId), eq(userRatings.restricted, false)))
      .groupBy(userRatings.rating);

    const stats = { total: 0, liked: 0, okay: 0, disliked: 0 };
    for (const row of rows) {
      const n = Number(row.n);
      stats.total += n;
      if (row.rating === 10) stats.liked += n;
      else if (row.rating === 5) stats.okay += n;
      else if (row.rating === 0) stats.disliked += n;
    }
    return stats;
  } catch (error) {
    console.error("Error fetching user rating stats:", error);
    return { total: 0, liked: 0, okay: 0, disliked: 0 };
  }
}

// A member's ratings for their public profile page. Unlike the trending feed
// this deliberately does NOT require review text — a profile should show
// every title a member rated, including score-only ratings.
export async function getRatingsByUser(
  userId: string,
  { limit = 12, offset = 0 }: { limit?: number; offset?: number } = {},
): Promise<FeedReview[]> {
  try {
    const rows = await db
      .select({
        rating: userRatings,
        title: content.title,
        contentType: content.contentType,
        releaseDate: content.releaseDate,
        posterImage: content.posterImage,
        commentCount: sql<number>`COUNT(${comments.id})::int`,
      })
      .from(userRatings)
      .leftJoin(content, eq(userRatings.contentId, content.id))
      .leftJoin(
        comments,
        and(eq(comments.reviewId, userRatings.id), eq(comments.restricted, false)),
      )
      .where(and(eq(userRatings.userId, userId), eq(userRatings.restricted, false)))
      .groupBy(userRatings.id, content.id)
      .orderBy(desc(userRatings.createdAt))
      .limit(limit)
      .offset(offset);

    const enriched = await enrichRatingsWithUsernames(rows.map((r) => r.rating));

    return enriched.map((rating, i) => ({
      ...rating,
      commentCount: Number(rows[i].commentCount ?? 0),
      film: rows[i].title
        ? {
            title: rows[i].title as string,
            contentType: rows[i].contentType as "movie" | "tv_show" | "short_film",
            releaseDate: rows[i].releaseDate?.toISOString() ?? null,
            posterImage: rows[i].posterImage,
          }
        : null,
    }));
  } catch (error) {
    console.error("Error fetching ratings by user:", error);
    return [];
  }
}

// Total for a member's profile, for pagination.
export async function countRatingsByUser(userId: string): Promise<number> {
  try {
    const [row] = await db
      .select({ total: sql<number>`COUNT(*)::int` })
      .from(userRatings)
      .where(and(eq(userRatings.userId, userId), eq(userRatings.restricted, false)));
    return Number(row?.total ?? 0);
  } catch (error) {
    console.error("Error counting ratings by user:", error);
    return 0;
  }
}

export interface CommentNode {
  id: string;
  reviewId: string;
  parentId: string | null;
  userId: string;
  body: string;
  depth: number;
  createdAt: string;
  username: string;
  profileImage?: string;
  replies: CommentNode[];
}

// A whole thread in one flat query, assembled into a tree in memory. This is
// what the denormalised `reviewId` on every comment buys us — nesting with no
// recursive CTE, at one round-trip regardless of depth.
export async function getReviewThread(reviewId: string): Promise<CommentNode[]> {
  try {
    const rows = await db
      .select()
      .from(comments)
      .where(and(eq(comments.reviewId, reviewId), eq(comments.restricted, false)))
      .orderBy(comments.createdAt);

    const userMap = await getUserDisplayMap(rows.map((r) => r.userId));

    const nodes = new Map<string, CommentNode>(
      rows.map((r) => [
        r.id,
        {
          id: r.id,
          reviewId: r.reviewId,
          parentId: r.parentId,
          userId: r.userId,
          body: r.body,
          depth: r.depth,
          createdAt: r.createdAt?.toISOString() ?? "",
          username: userMap.get(r.userId)?.username ?? "Deleted member",
          profileImage: userMap.get(r.userId)?.profileImage,
          replies: [],
        },
      ]),
    );

    const roots: CommentNode[] = [];
    for (const row of rows) {
      const node = nodes.get(row.id)!;
      if (!row.parentId) {
        roots.push(node);
        continue;
      }
      const parent = nodes.get(row.parentId);
      // Parent missing means it was restricted and filtered out above. Drop the
      // orphan rather than re-parenting it to the root: hiding a comment hides
      // the conversation hanging off it, which is the point of restricting it.
      if (parent) parent.replies.push(node);
    }
    return roots;
  } catch (error) {
    console.error("Error fetching review thread:", error);
    return [];
  }
}

// A report as the admin queue shows it: the report plus enough of what was
// reported to judge it without opening another tab.
export interface AdminReport {
  id: string;
  targetType: "review" | "comment";
  targetId: string;
  reason: string;
  note: string | null;
  status: "open" | "actioned" | "dismissed";
  createdAt: string;
  reporterId: string;
  reporterName: string;
  // Null when the target has since been deleted — reports.targetId is
  // polymorphic and carries no FK, so orphans are expected, not a bug.
  targetBody: string | null;
  targetAuthor: string | null;
  targetFlagged: boolean;
  targetRestricted: boolean;
  contentTitle: string | null;
  reviewId: string | null; // permalink anchor for either target type
}

// Admin-only: the report queue, open reports first, newest first within that.
export async function getReportsForAdmin(): Promise<AdminReport[]> {
  try {
    const rows = await db
      .select()
      .from(reports)
      .orderBy(
        // 'open' sorts before actioned/dismissed so triage lands on top
        asc(sql`CASE WHEN ${reports.status} = 'open' THEN 0 ELSE 1 END`),
        desc(reports.createdAt),
      );

    if (rows.length === 0) return [];

    const reviewIds = rows.filter((r) => r.targetType === "review").map((r) => r.targetId);
    const commentIds = rows.filter((r) => r.targetType === "comment").map((r) => r.targetId);

    // Two batched lookups rather than one per report
    const reviewRows = reviewIds.length
      ? await db
          .select({
            id: userRatings.id,
            body: userRatings.review,
            userId: userRatings.userId,
            flagged: userRatings.flagged,
            restricted: userRatings.restricted,
            contentTitle: content.title,
          })
          .from(userRatings)
          .leftJoin(content, eq(userRatings.contentId, content.id))
          .where(inArray(userRatings.id, reviewIds))
      : [];

    const commentRows = commentIds.length
      ? await db
          .select({
            id: comments.id,
            body: comments.body,
            userId: comments.userId,
            flagged: comments.flagged,
            restricted: comments.restricted,
            reviewId: comments.reviewId,
            contentTitle: content.title,
          })
          .from(comments)
          .leftJoin(userRatings, eq(comments.reviewId, userRatings.id))
          .leftJoin(content, eq(userRatings.contentId, content.id))
          .where(inArray(comments.id, commentIds))
      : [];

    const reviewMap = new Map(reviewRows.map((r) => [r.id, r]));
    const commentMap = new Map(commentRows.map((r) => [r.id, r]));

    const userMap = await getUserDisplayMap([
      ...rows.map((r) => r.reporterId),
      ...reviewRows.map((r) => r.userId),
      ...commentRows.map((r) => r.userId),
    ]);

    return rows.map((report) => {
      const target =
        report.targetType === "review"
          ? reviewMap.get(report.targetId)
          : commentMap.get(report.targetId);

      return {
        id: report.id,
        targetType: report.targetType,
        targetId: report.targetId,
        reason: report.reason,
        note: report.note,
        status: report.status,
        createdAt: report.createdAt?.toISOString() ?? "",
        reporterId: report.reporterId,
        reporterName: userMap.get(report.reporterId)?.username ?? "Deleted member",
        targetBody: target?.body ?? null,
        targetAuthor: target ? (userMap.get(target.userId)?.username ?? null) : null,
        targetFlagged: target?.flagged ?? false,
        targetRestricted: target?.restricted ?? false,
        contentTitle: target?.contentTitle ?? null,
        reviewId:
          report.targetType === "review"
            ? report.targetId
            : (commentMap.get(report.targetId)?.reviewId ?? null),
      };
    });
  } catch (error) {
    console.error("Error fetching reports for admin:", error);
    return [];
  }
}

// Admin-only: every user rating/review across all content, unfiltered
// (includes restricted rows so admins can review/un-restrict them), joined
// with the content title for display in the moderation table.
export async function getAllUserRatingsForAdmin(): Promise<AdminUserRating[]> {
  try {
    const rows = await db
      .select({
        rating: userRatings,
        contentTitle: content.title,
      })
      .from(userRatings)
      .leftJoin(content, eq(userRatings.contentId, content.id))
      .orderBy(desc(userRatings.createdAt));

    const enriched = await enrichRatingsWithUsernames(rows.map((r) => r.rating));

    return enriched.map((rating, i) => ({
      ...rating,
      contentTitle: rows[i].contentTitle || "Unknown",
    }));
  } catch (error) {
    console.error("Error fetching user ratings for admin:", error);
    return [];
  }
}

// A contact-form submission as the admin queue shows it.
export interface AdminContactMessage {
  id: string;
  category: "bug" | "improvement" | "other";
  message: string;
  email: string | null;
  status: "open" | "actioned" | "dismissed";
  createdAt: string;
  // Null when the sender was not signed in, which the form allows on purpose
  senderName: string | null;
}

// Admin-only: the Contact page inbox, newest first. Senders are resolved
// through the same Stack Auth lookup reviewers get, so an admin sees a name
// rather than a user id — when there is a sender at all.
export async function getContactMessagesForAdmin(): Promise<AdminContactMessage[]> {
  try {
    const rows = await db
      .select()
      .from(contactMessages)
      .orderBy(desc(contactMessages.createdAt));

    const userMap = await getUserDisplayMap(
      rows.map((row) => row.userId).filter((id): id is string => Boolean(id)),
    );

    return rows.map((row) => ({
      id: row.id,
      category: row.category,
      message: row.message,
      email: row.email,
      status: row.status,
      createdAt: row.createdAt?.toISOString() ?? "",
      senderName: row.userId ? (userMap.get(row.userId)?.username ?? null) : null,
    }));
  } catch (error) {
    console.error("Error fetching contact messages for admin:", error);
    return [];
  }
}
