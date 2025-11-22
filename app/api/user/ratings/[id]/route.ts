import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { userRatings } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { authenticateUser } from '@/lib/user-auth';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const authResult = await authenticateUser();
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const ratingData = await request.json();

    const updatedRating = await db
      .update(userRatings)
      .set({
        rating: ratingData.rating,
        review: ratingData.review,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(userRatings.id, id),
          eq(userRatings.userId, authResult.user.id)
        )
      )
      .returning();

    if (updatedRating.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Rating not found or access denied'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: updatedRating[0],
      message: 'Rating updated successfully'
    });
  } catch (error) {
    console.error('Error updating rating:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authResult = await authenticateUser();
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const deletedRating = await db
      .delete(userRatings)
      .where(
        and(
          eq(userRatings.id, id),
          eq(userRatings.userId, authResult.user.id)
        )
      )
      .returning();

    if (deletedRating.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Rating not found or access denied'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Rating deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting rating:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}