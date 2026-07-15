import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { pushbacks } from '@/db/schema';
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
      .update(pushbacks)
      .set({
        flagged,
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
      message: flagged ? 'Pushback flagged' : 'Pushback unflagged',
    });
  } catch (error) {
    console.error('Error updating pushback flag:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
