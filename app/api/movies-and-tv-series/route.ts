import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { content } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const moviesAndTVSeries = await db
      .select()
      .from(content)
      .where(eq(content.isMovieOfTheWeek, false))
      .orderBy(content.createdAt)
      .limit(4);

    return NextResponse.json({ 
      success: true, 
      data: moviesAndTVSeries 
    });
  } catch (error) {
    console.error('Error fetching movies and tv series:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
