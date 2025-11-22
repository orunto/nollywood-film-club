import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/client';
import { userRatings, content } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { authenticateUser } from '@/lib/user-auth';

export async function GET() {
  try {
    const authResult = await authenticateUser();
    if (authResult instanceof NextResponse) {
      return authResult;
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
      error: error instanceof Error ? error.message : 'Unknown error' 
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
    
    if (!ratingData.rating || isNaN(parseFloat(ratingData.rating.toString()))) {
      return NextResponse.json({ 
        success: false, 
        error: 'Rating is required and must be a number' 
      }, { status: 400 });
    }
    
    const ratingValue = parseFloat(ratingData.rating.toString());
    if (ratingValue < 1 || ratingValue > 5) {
      return NextResponse.json({ 
        success: false, 
        error: 'Rating must be between 1 and 5' 
      }, { status: 400 });
    }

    const newRating = await db.insert(userRatings).values({
      contentId: ratingData.contentId,
      userId: authResult.user.id,
      rating: ratingData.rating,
      review: ratingData.review,
    }).returning();

    return NextResponse.json({ 
      success: true, 
      data: newRating[0],
      message: 'Rating created successfully' 
    });
  } catch (error) {
    console.error('Error creating rating:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}