import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/client';
import { userRatings, content } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { authenticateUser } from '@/lib/user-auth';

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateUser();
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    // ?contentId= returns the caller's single rating for that title (or null)
    // so the rating sheet can preload into edit mode.
    const contentId = request.nextUrl.searchParams.get('contentId');
    if (contentId) {
      const existing = await db
        .select()
        .from(userRatings)
        .where(and(
          eq(userRatings.contentId, contentId),
          eq(userRatings.userId, authResult.user.id)
        ));

      return NextResponse.json({
        success: true,
        data: existing[0] ?? null,
      });
    }

    const ratings = await db
      .select({
        id: userRatings.id,
        contentId: userRatings.contentId,
        userId: userRatings.userId,
        rating: userRatings.rating,
        review: userRatings.review,
        createdAt: userRatings.createdAt,
        updatedAt: userRatings.updatedAt,
        content: {
          id: content.id,
          title: content.title,
          contentType: content.contentType,
        }
      })
      .from(userRatings)
      .leftJoin(content, eq(userRatings.contentId, content.id))
      .where(eq(userRatings.userId, authResult.user.id))
      .orderBy(userRatings.createdAt);

    return NextResponse.json({ 
      success: true, 
      data: ratings 
    });
  } catch (error) {
    console.error('Error fetching user ratings:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Something went wrong. Please try again.' 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateUser();
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const ratingData = await request.json();
    
    // Basic validation
    if (!ratingData.contentId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Content ID is required' 
      }, { status: 400 });
    }
    
    if (ratingData.rating === null || ratingData.rating === undefined || isNaN(parseFloat(ratingData.rating.toString()))) {
      return NextResponse.json({ 
        success: false, 
        error: 'Rating is required and must be a number' 
      }, { status: 400 });
    }

    // Empty/whitespace review means "no review" — stored as null. The sheet
    // preloads the existing review before submitting, so an empty string here
    // is an intentional clear, not an accidental overwrite.
    const reviewValue =
      typeof ratingData.review === 'string' && ratingData.review.trim() !== ''
        ? ratingData.review
        : null;

    // Atomic upsert against the user_ratings_content_user_unique index. This
    // replaces a read-then-write that could race two concurrent submits into
    // duplicate rows — now impossible at the DB level.
    const existing = await db
      .select({ id: userRatings.id })
      .from(userRatings)
      .where(and(
        eq(userRatings.contentId, ratingData.contentId),
        eq(userRatings.userId, authResult.user.id)
      ));
    const isUpdate = existing.length > 0;

    const upserted = await db
      .insert(userRatings)
      .values({
        contentId: ratingData.contentId,
        userId: authResult.user.id,
        rating: ratingData.rating,
        review: reviewValue,
      })
      .onConflictDoUpdate({
        target: [userRatings.contentId, userRatings.userId],
        set: {
          rating: ratingData.rating,
          review: reviewValue,
          edited: true,
          updatedAt: new Date(),
        },
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: upserted[0],
      message: isUpdate ? 'Rating updated!' : 'Rating submitted!'
    });
  } catch (error) {
    console.error('Error creating rating:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Something went wrong. Please try again.' 
    }, { status: 500 });
  }
}