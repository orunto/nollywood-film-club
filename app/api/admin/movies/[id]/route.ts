import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { content } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { authenticateAdmin } from '@/lib/admin-auth';
import { VIEWING_CATEGORIES } from '@/lib/utils';
import { demoteOtherMoviesOfTheWeek } from '@/lib/motw';
import { sanitizeCastMembers } from '@/lib/cast';

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

    // Optional — an unset category is null, but a set one must be valid
    if (movieData.viewingCategory &&
        !VIEWING_CATEGORIES.some((c) => c.value === movieData.viewingCategory)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid viewing category'
      }, { status: 400 });
    }

    const updatedMovie = await db.transaction(async (tx) => {
      // The form's Movie of the Week switch promotes through this route, not
      // just the star toggle — demote the incumbent or we end up with two.
      if (movieData.isMovieOfTheWeek) {
        await demoteOtherMoviesOfTheWeek(tx, id);
      }
      return tx
        .update(content)
        .set({
          title: movieData.title,
          contentType: movieData.contentType,
          runtime: movieData.runtime,
          releaseDate: movieData.releaseDate ? new Date(movieData.releaseDate) : null,
          // Empty strings are not valid enum values — store null instead
          rating: movieData.rating || null,
          synopsis: movieData.synopsis,
          genre: movieData.genre,
          posterImage: movieData.posterImage,
          posterVersion: movieData.posterVersion ?? null,
          trailerUrl: movieData.trailerUrl,
          streamingUrl: movieData.streamingUrl,
          streamingPlatform: movieData.streamingPlatform || null,
          otherPlatform: movieData.otherPlatform,
          viewingCategory: movieData.viewingCategory || null,
          castMembers: sanitizeCastMembers(movieData.castMembers),
          isMovieOfTheWeek: movieData.isMovieOfTheWeek,
          // catalogNumber is derived from linked discussion episode numbers —
          // see lib/catalog-sync.ts. Never set directly from client input.
          updatedAt: new Date(),
        })
        .where(eq(content.id, id))
        .returning();
    });

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
      error: 'Something went wrong. Please try again.'
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
      error: 'Something went wrong. Please try again.'
    }, { status: 500 });
  }
}