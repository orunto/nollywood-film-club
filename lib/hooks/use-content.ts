import { useQuery } from '@tanstack/react-query';

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

// API functions
async function fetchMovieOfTheWeek(): Promise<Content | null> {
  const response = await fetch('/api/movie-of-the-week');
  if (!response.ok) {
    throw new Error('Failed to fetch movie of the week');
  }
  const data = await response.json();
  return data.success ? data.data : null;
}

async function fetchPastSpaces(): Promise<Content[]> {
  const response = await fetch('/api/past-spaces');
  if (!response.ok) {
    throw new Error('Failed to fetch past spaces');
  }
  const data = await response.json();
  return data.success ? data.data : [];
}

async function fetchReviews(): Promise<Review[]> {
  const response = await fetch('/api/reviews');
  if (!response.ok) {
    throw new Error('Failed to fetch reviews');
  }
  const data = await response.json();
  return data.success ? data.data : [];
}

// Custom hooks
export function useMovieOfTheWeek() {
  return useQuery({
    queryKey: ['movie-of-the-week'],
    queryFn: fetchMovieOfTheWeek,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function usePastSpaces() {
  return useQuery({
    queryKey: ['past-spaces'],
    queryFn: fetchPastSpaces,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useReviews() {
  return useQuery({
    queryKey: ['reviews'],
    queryFn: fetchReviews,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
