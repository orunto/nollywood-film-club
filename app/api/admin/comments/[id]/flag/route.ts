import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { comments } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { authenticateAdmin } from '@/lib/admin-auth';

// Mirrors app/api/admin/user-ratings/[id]/flag — flagged stays publicly
// visible, it only marks the row for admin attention.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await authenticateAdmin();
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { flagged } = await request.json();
    const { id } = await params;

    const updated = await db
      .update(comments)
      .set({
        flagged,
        updatedAt: new Date(),
      })
      .where(eq(comments.id, id))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Comment not found',
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: updated[0],
      message: flagged ? 'Comment flagged' : 'Comment unflagged',
    });
  } catch (error) {
    console.error('Error updating comment flag:', error);
    return NextResponse.json({
      success: false,
      error: 'Something went wrong. Please try again.',
    }, { status: 500 });
  }
}
