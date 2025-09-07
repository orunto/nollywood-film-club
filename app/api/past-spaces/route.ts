import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { content } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const pastSpaces = await db
      .select()
      .from(content)
      .where(eq(content.isMovieOfTheWeek, false))
      .orderBy(content.createdAt)
      .limit(4);

    return NextResponse.json({ 
      success: true, 
      data: pastSpaces 
    });
  } catch (error) {
    console.error('Error fetching past spaces:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
