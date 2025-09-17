import { db } from '@/db/client';
import { content, reviews } from '@/db/schema';
import { eq } from 'drizzle-orm';

// Types
export interface Content {
  id: string;
  title: string;
  contentType: 'movie' | 'tv_show';
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
      id: result.id || '',
      title: result.title || '',
      contentType: result.contentType || 'movie',
      releaseDate: result.releaseDate?.toISOString() || null,
      createdAt: result.createdAt?.toISOString() || '',
      updatedAt: result.updatedAt?.toISOString() || '',
      isMovieOfTheWeek: result.isMovieOfTheWeek ?? false,
    };
  } catch (error) {
    console.error('Error fetching movie of the week:', error);
    return null;
  }
}

export async function getPastSpaces(): Promise<Content[]> {
  try {
    const pastSpaces = await db
      .select()
      .from(content)
      .where(eq(content.isMovieOfTheWeek, false))
      .orderBy(content.createdAt)
      .limit(4);

    return pastSpaces.map(item => ({
      ...item,
      id: item.id || '',
      title: item.title || '',
      contentType: item.contentType || 'movie',
      releaseDate: item.releaseDate?.toISOString() || null,
      createdAt: item.createdAt?.toISOString() || '',
      updatedAt: item.updatedAt?.toISOString() || '',
      isMovieOfTheWeek: item.isMovieOfTheWeek ?? false,
    }));
  } catch (error) {
    console.error('Error fetching past spaces:', error);
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

    return reviewsData.map(item => ({
      ...item,
      id: item.id || '',
      contentId: item.contentId || '',
      title: item.title || '',
      description: item.description || '',
      reviewer: item.reviewer || '',
      score: typeof item.score === 'string' ? parseFloat(item.score) || null : item.score,
      publishedAt: item.publishedAt?.toISOString() || null,
      createdAt: item.createdAt?.toISOString() || '',
      updatedAt: item.updatedAt?.toISOString() || '',
    }));
  } catch (error) {
    console.error('Error fetching reviews:', error);
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
    console.error('Error fetching homepage data:', error);
    return {
      movieOfTheWeek: null,
      pastSpaces: [],
      reviews: [],
    };
  }
}

