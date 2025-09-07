import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { content } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const movieOfTheWeek = await db
      .select()
      .from(content)
      .where(eq(content.isMovieOfTheWeek, true))
      .limit(1);

    return NextResponse.json({ 
      success: true, 
      data: movieOfTheWeek[0] || null 
    });
  } catch (error) {
    console.error('Error fetching movie of the week:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
