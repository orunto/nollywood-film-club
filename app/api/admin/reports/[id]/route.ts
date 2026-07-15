import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { reports } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { authenticateAdmin } from '@/lib/admin-auth';

const STATUSES = ['open', 'actioned', 'dismissed'] as const;
type Status = (typeof STATUSES)[number];

// Resolves a report. Deciding what happens to the reported post itself is a
// separate call (the flag/restrict routes) — closing a report is only a
// statement about the report.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await authenticateAdmin();
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { id } = await params;
    const { status } = await request.json();

    if (!STATUSES.includes(status)) {
      return NextResponse.json({
        success: false,
        error: 'Unknown report status',
      }, { status: 400 });
    }

    const isResolved = status !== 'open';
    const updated = await db
      .update(reports)
      .set({
        status: status as Status,
        resolvedBy: isResolved ? authResult.user.id : null,
        resolvedAt: isResolved ? new Date() : null,
      })
      .where(eq(reports.id, id))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Report not found',
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: updated[0],
      message: status === 'open' ? 'Report reopened' : `Report ${status}`,
    });
  } catch (error) {
    console.error('Error updating report:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
