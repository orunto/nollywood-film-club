import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { content } from '@/db/schema';
import { eq, desc, sql } from 'drizzle-orm';

export async function GET() {
  try {
    const moviesAndTVSeries = await db
      .select()
      .from(content)
      .where(eq(content.isMovieOfTheWeek, false))
      .orderBy(sql`${content.catalogNumber} DESC NULLS LAST`, desc(content.createdAt))
      .limit(4);

    return NextResponse.json({ 
      success: true, 
      data: moviesAndTVSeries 
    });
  } catch (error) {
    console.error('Error fetching movies and tv series:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Something went wrong. Please try again.' 
    }, { status: 500 });
  }
}
