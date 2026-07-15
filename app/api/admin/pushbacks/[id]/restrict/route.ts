import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { pushbacks } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { authenticateAdmin } from '@/lib/admin-auth';

// Mirrors app/api/admin/user-ratings/[id]/restrict — restricted hides the row
// from public display. Note this also hides any replies nested under it: the
// thread builder in getReviewThread drops orphans rather than re-parenting them.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await authenticateAdmin();
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { restricted } = await request.json();
    const { id } = await params;

    const updated = await db
      .update(pushbacks)
      .set({
        restricted,
        updatedAt: new Date(),
      })
      .where(eq(pushbacks.id, id))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Pushback not found',
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: updated[0],
      message: restricted ? 'Pushback restricted' : 'Pushback restored',
    });
  } catch (error) {
    console.error('Error updating pushback restriction:', error);
    return NextResponse.json({
      success: false,
      error: 'Something went wrong. Please try again.',
    }, { status: 500 });
  }
}
