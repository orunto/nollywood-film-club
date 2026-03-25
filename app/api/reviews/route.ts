import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { userRatings, content } from '@/db/schema';
import { eq, desc, isNotNull, and, ne } from 'drizzle-orm';
import { stackServerApp } from '@/stack';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');
  const offset = (page - 1) * limit;

  try {
    const reviewsData = await db
      .select({
        id: userRatings.id,
        contentId: userRatings.contentId,
        userId: userRatings.userId,
        rating: userRatings.rating,
        review: userRatings.review,
        createdAt: userRatings.createdAt,
        updatedAt: userRatings.updatedAt,
        contentTitle: content.title,
      })
      .from(userRatings)
      .innerJoin(content, eq(userRatings.contentId, content.id))
      .where(
        and(
          isNotNull(userRatings.review),
          ne(userRatings.review, "")
        )
      )
      .orderBy(desc(userRatings.createdAt))
      .limit(limit)
      .offset(offset);

    // Get unique user IDs
    const userIds = [...new Set(reviewsData.map((rating) => rating.userId))];

    // Fetch user information from Stack Auth
    const userMap = new Map<string, { username: string; profileImage?: string }>();

    for (const userId of userIds) {
      try {
        const user = await stackServerApp.getUser(userId);
        if (user) {
          const username = user.clientMetadata?.username || `User ${user.id.substring(0, 8)}`;
          const profileImage = user.profileImageUrl || undefined;
          userMap.set(userId, { username, profileImage });
        } else {
          userMap.set(userId, { username: `User ${userId.substring(0, 8)}` });
        }
      } catch (error) {
        userMap.set(userId, { username: `User ${userId.substring(0, 8)}` });
      }
    }

    const formattedReviews = reviewsData.map((item) => ({
      ...item,
      id: item.id || "",
      contentId: item.contentId || "",
      userId: item.userId || "",
      rating: item.rating ?? null,
      review: item.review ?? null,
      createdAt: item.createdAt?.toISOString() || "",
      updatedAt: item.updatedAt?.toISOString() || "",
      username: userMap.get(item.userId)?.username || `User ${item.userId.substring(0, 8)}`,
      profileImage: userMap.get(item.userId)?.profileImage,
      contentTitle: item.contentTitle || "",
    }));

    return NextResponse.json({ 
      success: true, 
      data: formattedReviews,
      hasMore: formattedReviews.length === limit
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
