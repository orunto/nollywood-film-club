import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { content } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { authenticateAdmin } from '@/lib/admin-auth';
import { demoteOtherMoviesOfTheWeek } from '@/lib/motw';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await authenticateAdmin();
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { isMovieOfTheWeek } = await request.json();
    const {id} = await params;
    const updatedMovie = await db.transaction(async (tx) => {
      if (isMovieOfTheWeek) {
        await demoteOtherMoviesOfTheWeek(tx, String(id));
      }
      return tx
        .update(content)
        .set({
          isMovieOfTheWeek,
          updatedAt: new Date(),
        })
        .where(eq(content.id, String(id)))
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
      message: `Movie ${isMovieOfTheWeek ? 'set as' : 'removed from'} movie of the week` 
    });
  } catch (error) {
    console.error('Error updating movie of the week:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Something went wrong. Please try again.' 
    }, { status: 500 });
  }
}
