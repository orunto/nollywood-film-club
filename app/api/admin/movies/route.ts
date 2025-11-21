import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/client';
import { content } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { authenticateAdmin } from '@/lib/admin-auth';

export async function GET() {
  try {
    const movies = await db
      .select()
      .from(content)
      .orderBy(content.createdAt);

    return NextResponse.json({ 
      success: true, 
      data: movies 
    });
  } catch (error) {
    console.error('Error fetching movies:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateAdmin(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const movieData = await request.json();
    
    const newMovie = await db.insert(content).values({
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
      data: newMovie[0],
      message: 'Movie created successfully' 
    });
  } catch (error) {
    console.error('Error creating movie:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
