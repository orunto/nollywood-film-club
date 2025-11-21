import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/client';
import { reviews } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const reviewData = await request.json();
    
    const updatedReview = await db
      .update(reviews)
      .set({
        contentId: reviewData.contentId,
        title: reviewData.title,
        description: reviewData.description,
        score: reviewData.score,
        reviewer: reviewData.reviewer,
        externalUrl: reviewData.externalUrl,
        reviewImage: reviewData.reviewImage,
        publishedAt: reviewData.publishedAt,
        updatedAt: new Date(),
      })
      .where(eq(reviews.id, params.id))
      .returning();

    if (updatedReview.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Review not found' 
      }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      data: updatedReview[0],
      message: 'Review updated successfully' 
    });
  } catch (error) {
    console.error('Error updating review:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const deletedReview = await db
      .delete(reviews)
      .where(eq(reviews.id, params.id))
      .returning();

    if (deletedReview.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Review not found' 
      }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Review deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting review:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
