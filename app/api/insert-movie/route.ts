import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/client';
import { content } from '@/db/schema';

export async function POST(request: NextRequest) {
  try {
    const movieData = await db.insert(content).values({
      title: "Everybody Loves Jenifa",
      contentType: "movie",
      runtime: 135, // 2 hours 15 minutes = 135 minutes
      releaseDate: new Date("2000-01-01"), // Assuming 2000 release
      rating: "PG-13",
      synopsis: "Jenifa must navigate through jealousy and suspicion when her philanthropy position is threatened by her new neighbour in the estate. A trip to Ghana with friends turns dangerous when they are caught up in a drug scandal, forcing Jenifa to confront betrayal and danger, risking everything to protect her reputation and life.",
      genre: ["Comedy", "Drama"],
      posterImage: "nollywood-film-club/elj",
      trailerUrl: "https://www.youtube.com/embed/x4JIoP5FlhU?si=s-yYKArOOO6QD42e",
      streamingUrl: "https://www.primevideo.com/detail/Everybody-Loves-Jenifa/0G4DEZL3GDUGGLRPTKG19ZFEEE",
      streamingPlatform: "prime_video",
      spaceUrl: "https://x.com/i/spaces/1djGXWjZOORKZ",
      podcastLinks: [], // Empty array for now, can add podcast URLs later
      isMovieOfTheWeek: true,
    }).returning();

    return NextResponse.json({ 
      success: true, 
      id: movieData[0]?.id,
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
