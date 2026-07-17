import { cache } from "react";
import { db } from "@/db/client";
import {
  content,
  discussions,
  pushbacks,
  reports,
  reviews,
  userRatings,
  type CastMember,
} from "@/db/schema";
import { eq, avg, asc, desc, sql, and, inArray, isNotNull, ne } from "drizzle-orm";
import { stackServerApp } from "@/stack";
import { contentSlug, type ViewingCategory } from "@/lib/utils";

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

export async function getDiscussionForContent(
  contentId: string,
): Promise<Discussion | null> {
  try {
    const rows = await db
      .select()
      .from(discussions)
      .leftJoin(content, eq(discussions.contentId, content.id))
      .where(eq(discussions.contentId, contentId))
      .orderBy(desc(discussions.createdAt))
      .limit(1);

    const row = rows[0];
    return row ? mapDiscussion(row.discussions, row.content) : null;
  } catch (error) {
    console.error("Error fetching discussion for content:", error);
    return null;
  }
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

    const movieOfTheWeekDiscussion = movieOfTheWeek
      ? await getDiscussionForContent(movieOfTheWeek.id)
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
}

// Display info for one reviewer, from Stack Auth (there is no local users
// table). Wrapped in React cache() so a request that renders the same author
// more than once — a feed and the threads under it — only looks them up once.
const getUserDisplay = cache(async (userId: string): Promise<UserDisplay> => {
  try {
    const user = await stackServerApp.getUser(userId);
    if (user) {
      return {
        username: user.clientMetadata?.username || `User ${user.id.substring(0, 8)}`,
        profileImage: user.profileImageUrl || undefined,
      };
    }
  } catch (error) {
    console.error("Error fetching Stack user", userId, error);
  }
  // Deleted user, or Stack Auth is unreachable — never fail the whole page
  return { username: `User ${userId.substring(0, 8)}` };
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
    username:
      userMap.get(item.userId)?.username ||
      `User ${item.userId.substring(0, 8)}`,
    profileImage: userMap.get(item.userId)?.profileImage,
  }));
}

// New function to get user ratings for a specific content with usernames from Stack Auth
export async function getUserRatingsForContent(
  contentId: string,
): Promise<UserRating[]> {
  try {
    // Restricted reviews are hidden from public display
    const ratings = await db
      .select()
      .from(userRatings)
      .where(
        and(eq(userRatings.contentId, contentId), eq(userRatings.restricted, false)),
      )
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
  pushbackCount: number;
  film: {
    title: string;
    contentType: "movie" | "tv_show" | "short_film";
    releaseDate: string | null;
    posterImage: string | null;
  } | null;
}

// Trending = interaction, decayed by age.
//
//   (pushback_count + 1) / (hours_since_posted + 2)^1.5
//
// The +1 matters: on a bare count every review with no pushback scores zero, so
// nothing new could ever surface and the feed would start empty forever. With
// it, a fresh review ranks on recency alone and pushback multiplies from there.
// The +2 keeps a minutes-old review from dividing by ~0 and pinning the top.
const HOT_SCORE = sql<number>`
  (COUNT(${pushbacks.id}) + 1)::float
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
        // Restricted pushback must not inflate the ranking, so it is filtered
        // in the join condition rather than the WHERE clause — a WHERE would
        // drop reviews that have no pushback at all.
        pushbackCount: sql<number>`COUNT(${pushbacks.id})::int`,
      })
      .from(userRatings)
      .leftJoin(content, eq(userRatings.contentId, content.id))
      .leftJoin(
        pushbacks,
        and(eq(pushbacks.reviewId, userRatings.id), eq(pushbacks.restricted, false)),
      )
      .where(FEED_VISIBLE)
      .groupBy(userRatings.id, content.id)
      .orderBy(desc(HOT_SCORE))
      .limit(limit)
      .offset(offset);

    const enriched = await enrichRatingsWithUsernames(rows.map((r) => r.rating));

    return enriched.map((rating, i) => ({
      ...rating,
      pushbackCount: Number(rows[i].pushbackCount ?? 0),
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
        pushbackCount: sql<number>`COUNT(${pushbacks.id})::int`,
      })
      .from(userRatings)
      .leftJoin(content, eq(userRatings.contentId, content.id))
      .leftJoin(
        pushbacks,
        and(eq(pushbacks.reviewId, userRatings.id), eq(pushbacks.restricted, false)),
      )
      .where(and(eq(userRatings.id, id), eq(userRatings.restricted, false)))
      .groupBy(userRatings.id, content.id)
      .limit(1);

    const row = rows[0];
    if (!row) return null;

    const [enriched] = await enrichRatingsWithUsernames([row.rating]);
    return {
      ...enriched,
      pushbackCount: Number(row.pushbackCount ?? 0),
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

export interface PushbackNode {
  id: string;
  reviewId: string;
  parentId: string | null;
  userId: string;
  body: string;
  depth: number;
  createdAt: string;
  username: string;
  profileImage?: string;
  replies: PushbackNode[];
}

// A whole thread in one flat query, assembled into a tree in memory. This is
// what the denormalised `reviewId` on every pushback buys us — nesting with no
// recursive CTE, at one round-trip regardless of depth.
export async function getReviewThread(reviewId: string): Promise<PushbackNode[]> {
  try {
    const rows = await db
      .select()
      .from(pushbacks)
      .where(and(eq(pushbacks.reviewId, reviewId), eq(pushbacks.restricted, false)))
      .orderBy(pushbacks.createdAt);

    const userMap = await getUserDisplayMap(rows.map((r) => r.userId));

    const nodes = new Map<string, PushbackNode>(
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
          username: userMap.get(r.userId)?.username ?? `User ${r.userId.substring(0, 8)}`,
          profileImage: userMap.get(r.userId)?.profileImage,
          replies: [],
        },
      ]),
    );

    const roots: PushbackNode[] = [];
    for (const row of rows) {
      const node = nodes.get(row.id)!;
      if (!row.parentId) {
        roots.push(node);
        continue;
      }
      const parent = nodes.get(row.parentId);
      // Parent missing means it was restricted and filtered out above. Drop the
      // orphan rather than re-parenting it to the root: hiding a pushback hides
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
  targetType: "review" | "pushback";
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
    const pushbackIds = rows.filter((r) => r.targetType === "pushback").map((r) => r.targetId);

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

    const pushbackRows = pushbackIds.length
      ? await db
          .select({
            id: pushbacks.id,
            body: pushbacks.body,
            userId: pushbacks.userId,
            flagged: pushbacks.flagged,
            restricted: pushbacks.restricted,
            reviewId: pushbacks.reviewId,
            contentTitle: content.title,
          })
          .from(pushbacks)
          .leftJoin(userRatings, eq(pushbacks.reviewId, userRatings.id))
          .leftJoin(content, eq(userRatings.contentId, content.id))
          .where(inArray(pushbacks.id, pushbackIds))
      : [];

    const reviewMap = new Map(reviewRows.map((r) => [r.id, r]));
    const pushbackMap = new Map(pushbackRows.map((r) => [r.id, r]));

    const userMap = await getUserDisplayMap([
      ...rows.map((r) => r.reporterId),
      ...reviewRows.map((r) => r.userId),
      ...pushbackRows.map((r) => r.userId),
    ]);

    return rows.map((report) => {
      const target =
        report.targetType === "review"
          ? reviewMap.get(report.targetId)
          : pushbackMap.get(report.targetId);

      return {
        id: report.id,
        targetType: report.targetType,
        targetId: report.targetId,
        reason: report.reason,
        note: report.note,
        status: report.status,
        createdAt: report.createdAt?.toISOString() ?? "",
        reporterId: report.reporterId,
        reporterName:
          userMap.get(report.reporterId)?.username ??
          `User ${report.reporterId.substring(0, 8)}`,
        targetBody: target?.body ?? null,
        targetAuthor: target ? (userMap.get(target.userId)?.username ?? null) : null,
        targetFlagged: target?.flagged ?? false,
        targetRestricted: target?.restricted ?? false,
        contentTitle: target?.contentTitle ?? null,
        reviewId:
          report.targetType === "review"
            ? report.targetId
            : (pushbackMap.get(report.targetId)?.reviewId ?? null),
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
