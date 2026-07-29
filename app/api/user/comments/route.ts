import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/client';
import { comments, userRatings } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { authenticateUser } from '@/lib/user-auth';
import { getReviewThread } from '@/lib/server-queries';
import { MAX_COMMENT_DEPTH, MAX_COMMENT_LENGTH_STORED } from '@/lib/comments';

// Returns a review's comment thread (public, same data the permalink renders).
// Lets the comment sheet load a thread client-side without a page navigation.
// Query: ?reviewId=
export async function GET(request: NextRequest) {
  const reviewId = request.nextUrl.searchParams.get('reviewId');
  if (!reviewId) {
    return NextResponse.json({ success: false, error: 'A reviewId is required' }, { status: 400 });
  }
  const thread = await getReviewThread(reviewId);
  return NextResponse.json({ success: true, data: thread });
}

// Posts a comment on a review, or a reply to an existing comment.
// Body: { reviewId, parentId?, body }
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateUser();
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { reviewId, parentId, body } = await request.json();

    const text = typeof body === 'string' ? body.trim() : '';
    if (typeof reviewId !== 'string' || !reviewId) {
      return NextResponse.json({
        success: false,
        error: 'A reviewId is required',
      }, { status: 400 });
    }
    if (!text) {
      return NextResponse.json({
        success: false,
        error: 'Comment cannot be empty',
      }, { status: 400 });
    }
    if (text.length > MAX_COMMENT_LENGTH_STORED) {
      return NextResponse.json({
        success: false,
        error: 'Comment is too long',
      }, { status: 400 });
    }

    // The review has to exist and still be public — no piling onto something a
    // moderator has already taken down.
    const [review] = await db
      .select({ id: userRatings.id })
      .from(userRatings)
      .where(and(eq(userRatings.id, reviewId), eq(userRatings.restricted, false)))
      .limit(1);

    if (!review) {
      return NextResponse.json({
        success: false,
        error: 'Review not found',
      }, { status: 404 });
    }

    // Depth is derived from the parent, never trusted from the client.
    let depth = 0;
    if (parentId) {
      const [parent] = await db
        .select()
        .from(comments)
        .where(eq(comments.id, parentId))
        .limit(1);

      if (!parent) {
        return NextResponse.json({
          success: false,
          error: 'That comment no longer exists',
        }, { status: 404 });
      }
      // Threads are keyed on reviewId, so a reply whose parent sits under a
      // different review would be invisible in both trees. Reject rather than
      // write a row nothing can render.
      if (parent.reviewId !== reviewId) {
        return NextResponse.json({
          success: false,
          error: 'That comment belongs to a different review',
        }, { status: 400 });
      }
      if (parent.restricted) {
        return NextResponse.json({
          success: false,
          error: 'That comment is no longer available',
        }, { status: 400 });
      }

      depth = parent.depth + 1;
      if (depth > MAX_COMMENT_DEPTH) {
        return NextResponse.json({
          success: false,
          error: 'This thread has gone deep enough. Take it to the Space.',
        }, { status: 400 });
      }
    }

    const [created] = await db
      .insert(comments)
      .values({
        reviewId,
        parentId: parentId ?? null,
        userId: authResult.user.id,
        body: text,
        depth,
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: created,
      message: 'Comment posted',
    });
  } catch (error) {
    console.error('Error posting comment:', error);
    return NextResponse.json({
      success: false,
      error: 'Something went wrong. Please try again.',
    }, { status: 500 });
  }
}
