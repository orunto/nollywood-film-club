import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { userRatings } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { authenticateAdmin } from '@/lib/admin-auth';

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
      .update(userRatings)
      .set({
        flagged,
        updatedAt: new Date(),
      })
      .where(eq(userRatings.id, id))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Review not found',
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: updated[0],
      message: flagged ? 'Review flagged' : 'Review unflagged',
    });
  } catch (error) {
    console.error('Error updating review flag:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
