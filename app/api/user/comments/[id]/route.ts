import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { comments } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { authenticateUser } from '@/lib/user-auth';

// Deletes your own comment. Replies hanging off it go too, via the
// ON DELETE CASCADE on comments.parent_id.
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

    const deleted = await db
      .delete(comments)
      .where(
        and(
          eq(comments.id, id),
          eq(comments.userId, authResult.user.id)
        )
      )
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Comment not found or access denied',
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Comment deleted',
    });
  } catch (error) {
    console.error('Error deleting comment:', error);
    return NextResponse.json({
      success: false,
      error: 'Something went wrong. Please try again.',
    }, { status: 500 });
  }
}
