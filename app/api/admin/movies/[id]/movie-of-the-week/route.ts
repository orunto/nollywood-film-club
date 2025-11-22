import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { content } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { isMovieOfTheWeek } = await request.json();
    const {id} = await params;
    // If setting as movie of the week, first unset any existing movie of the week
    if (isMovieOfTheWeek) {
      await db
        .update(content)
        .set({ isMovieOfTheWeek: false })
        .where(eq(content.isMovieOfTheWeek, true));
    }
    
    const updatedMovie = await db
      .update(content)
      .set({
        isMovieOfTheWeek,
        updatedAt: new Date(),
      })
      .where(eq(content.id, String(id)))
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
      message: `Movie ${isMovieOfTheWeek ? 'set as' : 'removed from'} movie of the week` 
    });
  } catch (error) {
    console.error('Error updating movie of the week:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
