  import { NextRequest, NextResponse } from 'next/server';
  import { db } from '@/db/client';
  import { content } from '@/db/schema';
  import { desc, sql } from 'drizzle-orm';
  import { authenticateAdmin } from '@/lib/admin-auth';

  export async function GET() {
    try {
      // Latest first: catalog number is the order content was added
      const movies = await db
        .select()
        .from(content)
        .orderBy(
          sql`${content.catalogNumber} DESC NULLS LAST`,
          desc(content.createdAt),
        );
  
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
      const authResult = await authenticateAdmin();
      if (authResult instanceof NextResponse) {
        return authResult;
      }
  
      const movieData = await request.json();
      
      // Basic validation
      if (!movieData.title || typeof movieData.title !== 'string') {
        return NextResponse.json({ 
          success: false, 
          error: 'Title is required and must be a string' 
        }, { status: 400 });
      }
      
      if (!movieData.contentType || !['movie', 'tv_show'].includes(movieData.contentType)) {
        return NextResponse.json({ 
          success: false, 
          error: 'Content type must be either "movie" or "tv_show"' 
        }, { status: 400 });
      }
      
      const newMovie = await db.insert(content).values({
        title: movieData.title,
        contentType: movieData.contentType,
        runtime: movieData.runtime,
        releaseDate: movieData.releaseDate ? new Date(movieData.releaseDate) : null,
        // Empty strings are not valid enum values — store null instead
        rating: movieData.rating || null,
        synopsis: movieData.synopsis,
        genre: movieData.genre,
        posterImage: movieData.posterImage,
        trailerUrl: movieData.trailerUrl,
        streamingUrl: movieData.streamingUrl,
        streamingPlatform: movieData.streamingPlatform || null,
        otherPlatform: movieData.otherPlatform,
        isMovieOfTheWeek: movieData.isMovieOfTheWeek || false,
        catalogNumber: movieData.catalogNumber ?? null,
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