import { db } from "@/db/client";
import { content, discussions, reviews, userRatings } from "@/db/schema";
import { eq, avg, desc, sql, and } from "drizzle-orm";
import { stackServerApp } from "@/stack";

// Types
export interface Content {
  id: string;
  title: string;
  contentType: "movie" | "tv_show";
  runtime: number | null;
  releaseDate: string | null;
  rating: string | null;
  synopsis: string | null;
  genre: string[] | null;
  posterImage: string | null;
  trailerUrl: string | null;
  streamingUrl: string | null;
  streamingPlatform: string | null;
  otherPlatform: string | null;
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
    contentType: "movie" | "tv_show";
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
        trailerUrl: content.trailerUrl,
        streamingUrl: content.streamingUrl,
        streamingPlatform: content.streamingPlatform,
        otherPlatform: content.otherPlatform,
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

// Combined function to fetch all homepage data
export async function getHomepageData() {
  try {
    const [movieOfTheWeek, moviesAndTVSeries, reviews, discussions] = await Promise.all([
      getMovieOfTheWeek(),
      getMoviesAndTVSeries(),
      getReviews(),
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
      reviews: [],
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
        trailerUrl: content.trailerUrl,
        streamingUrl: content.streamingUrl,
        streamingPlatform: content.streamingPlatform,
        otherPlatform: content.otherPlatform,
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

// Shared helper: given raw userRatings rows, look up each reviewer's
// username/profileImage from Stack Auth and map to the public UserRating shape.
async function enrichRatingsWithUsernames(
  ratings: (typeof userRatings.$inferSelect)[],
): Promise<UserRating[]> {
  // Get unique user IDs
  const userIds = [...new Set(ratings.map((rating) => rating.userId))];

  // Fetch user information from Stack Auth for all users
  // We'll use a simplified approach since we don't have direct admin access
  const userMap = new Map<
    string,
    { username: string; profileImage?: string }
  >();

  // For each user ID, we'll try to get the user info
  for (const userId of userIds) {
    try {
      // Try to get user info - this is a simplified approach
      // In a real implementation with admin access, you would use the proper admin API
      const user = await stackServerApp.getUser(userId);
      if (user) {
        // Use username from metadata if available, otherwise use user ID
        const username =
          user.clientMetadata?.username || `User ${user.id.substring(0, 8)}`;
        const profileImage = user.profileImageUrl || undefined;
        userMap.set(userId, { username, profileImage });
      } else {
        userMap.set(userId, { username: `User ${userId.substring(0, 8)}` });
      }
    } catch (error) {
      // If we can't get user info, use a default display
      userMap.set(userId, { username: `User ${userId.substring(0, 8)}` });
      console.error(error);
    }
  }

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
