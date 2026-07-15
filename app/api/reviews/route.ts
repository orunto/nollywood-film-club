import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { reviews } from '@/db/schema';

export async function GET() {
  try {
    const reviewsData = await db
      .select()
      .from(reviews)
      .orderBy(reviews.publishedAt)
      .limit(4);

    return NextResponse.json({ 
      success: true, 
      data: reviewsData 
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Something went wrong. Please try again.' 
    }, { status: 500 });
  }
}
