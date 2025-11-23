import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { content } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { authenticateAdmin } from '@/lib/admin-auth';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    // Add admin authentication
    const authResult = await authenticateAdmin();
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const movieData = await request.json();

    const updatedMovie = await db
      .update(content)
      .set({
        title: movieData.title,
        contentType: movieData.contentType,
        runtime: movieData.runtime,
        releaseDate: new Date(movieData.releaseDate),
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
        updatedAt: new Date(),
      })
      .where(eq(content.id, id))
      .returning();

    if (updatedMovie.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Movie not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: updatedMovie[0],
      message: 'Movie updated successfully'
    });
  } catch (error) {
    console.error('Error updating movie:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Add admin authentication
    const authResult = await authenticateAdmin();
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const deletedMovie = await db
      .delete(content)
      .where(eq(content.id, id))
      .returning();

    if (deletedMovie.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Movie not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Movie deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting movie:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}