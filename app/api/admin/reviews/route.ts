import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/client';
import { reviews } from '@/db/schema';
import { authenticateAdmin } from '@/lib/admin-auth';

export async function GET() {
  try {
    const authResult = await authenticateAdmin();
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const reviewsData = await db
      .select()
      .from(reviews)
      .orderBy(reviews.publishedAt);

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

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateAdmin();
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const reviewData = await request.json();
    
    const newReview = await db.insert(reviews).values({
      contentId: reviewData.contentId,
      title: reviewData.title,
      description: reviewData.description,
      score: reviewData.score,
      reviewer: reviewData.reviewer,
      externalUrl: reviewData.externalUrl,
      reviewImage: reviewData.reviewImage,
      publishedAt: reviewData.publishedAt,
    }).returning();

    return NextResponse.json({ 
      success: true, 
      data: newReview[0],
      message: 'Review created successfully' 
    });
  } catch (error) {
    console.error('Error creating review:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Something went wrong. Please try again.' 
    }, { status: 500 });
  }
}
