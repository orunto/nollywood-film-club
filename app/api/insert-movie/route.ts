import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/client';
import { content } from '@/db/schema';

export async function POST(request: NextRequest) {
  try {
    const movieData = await request.json();
    
    const insertedMovie = await db.insert(content).values({
      title: movieData.title,
      contentType: movieData.contentType,
      runtime: movieData.runtime,
      releaseDate: movieData.releaseDate,
      rating: movieData.rating,
      synopsis: movieData.synopsis,
      genre: movieData.genre,
      posterImage: movieData.posterImage,
      trailerUrl: movieData.trailerUrl,
      streamingUrl: movieData.streamingUrl,
      streamingPlatform: movieData.streamingPlatform,
      otherPlatform: movieData.otherPlatform,
      spaceUrl: movieData.spaceUrl,
      podcastLinks: movieData.podcastLinks,
      isMovieOfTheWeek: movieData.isMovieOfTheWeek,
    }).returning();

    return NextResponse.json({ 
      success: true, 
      id: insertedMovie[0]?.id,
      message: 'Movie inserted successfully' 
    });
  } catch (error) {
    console.error('Error inserting movie:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}