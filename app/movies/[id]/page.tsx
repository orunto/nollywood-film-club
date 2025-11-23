import { notFound } from 'next/navigation';
import { getContentById, getUserRatingsForContent } from '@/lib/server-queries';
import MovieDetailsClient from './movie-details-client';

interface MovieDetailsPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function MovieDetailsPage({ params }: MovieDetailsPageProps) {
  const { id } = await params;
  
  // Fetch movie details
  const movie = await getContentById(id);
  
  // Fetch user ratings for this movie
  const userRatings = await getUserRatingsForContent(id);
  
  // If movie doesn't exist, show not found page
  if (!movie) {
    notFound();
  }
  
  return <MovieDetailsClient movie={movie} userRatings={userRatings} />;
}