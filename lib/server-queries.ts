import { db } from "@/db/client";
import { content, reviews, userRatings } from "@/db/schema";
import { eq, avg } from "drizzle-orm";
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
  spaceUrl: string | null;
  podcastLinks: string[] | null;
  isMovieOfTheWeek: boolean;
  createdAt: string;
  updatedAt: string;
  userRating: number | null;
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
  createdAt: string;
  updatedAt: string;
  // Added username and profileImage fields to store the user info from Stack Auth
  username?: string;
  profileImage?: string;
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

export async function getPastSpaces(): Promise<Content[]> {
  try {
    const pastSpaces = await db
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
        spaceUrl: content.spaceUrl,
        podcastLinks: content.podcastLinks,
        isMovieOfTheWeek: content.isMovieOfTheWeek,
        createdAt: content.createdAt,
        updatedAt: content.updatedAt,
        userRating: avg(userRatings.rating),
      })
      .from(content)
      .leftJoin(userRatings, eq(content.id, userRatings.contentId))
      .where(eq(content.isMovieOfTheWeek, false))
      .groupBy(content.id)
      .orderBy(content.createdAt)
      .limit(4);

    return pastSpaces.map((item) => ({
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
    console.error("Error fetching past spaces:", error);
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

// Combined function to fetch all homepage data
export async function getHomepageData() {
  try {
    const [movieOfTheWeek, pastSpaces, reviews] = await Promise.all([
      getMovieOfTheWeek(),
      getPastSpaces(),
      getReviews(),
    ]);

    return {
      movieOfTheWeek,
      pastSpaces,
      reviews,
    };
  } catch (error) {
    console.error("Error fetching homepage data:", error);
    return {
      movieOfTheWeek: null,
      pastSpaces: [],
      reviews: [],
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
        spaceUrl: content.spaceUrl,
        podcastLinks: content.podcastLinks,
        isMovieOfTheWeek: content.isMovieOfTheWeek,
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

// New function to get user ratings for a specific content with usernames from Stack Auth
export async function getUserRatingsForContent(
  contentId: string,
): Promise<UserRating[]> {
  try {
    // First get the ratings from the database
    const ratings = await db
      .select()
      .from(userRatings)
      .where(eq(userRatings.contentId, contentId))
      .orderBy(userRatings.createdAt);

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
      createdAt: item.createdAt?.toISOString() || "",
      updatedAt: item.updatedAt?.toISOString() || "",
      username:
        userMap.get(item.userId)?.username ||
        `User ${item.userId.substring(0, 8)}`,
      profileImage: userMap.get(item.userId)?.profileImage,
    }));
  } catch (error) {
    console.error("Error fetching user ratings for content:", error);
    return [];
  }
}
