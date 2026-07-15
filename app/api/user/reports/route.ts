import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/client';
import { pushbacks, reports, userRatings } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { authenticateUser } from '@/lib/user-auth';
import { REPORT_REASONS, type ReportReason, type ReportTarget } from '@/lib/pushback';

const TARGET_TYPES: ReportTarget[] = ['review', 'pushback'];
const REASONS = REPORT_REASONS.map((r) => r.value) as readonly string[];

// Reports a review or a pushback to the admins.
// Body: { targetType, targetId, reason, note? }
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateUser();
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { targetType, targetId, reason, note } = await request.json();

    if (!TARGET_TYPES.includes(targetType)) {
      return NextResponse.json({
        success: false,
        error: 'Unknown report target',
      }, { status: 400 });
    }
    if (typeof targetId !== 'string' || !targetId) {
      return NextResponse.json({
        success: false,
        error: 'A targetId is required',
      }, { status: 400 });
    }
    if (!REASONS.includes(reason)) {
      return NextResponse.json({
        success: false,
        error: 'Pick a reason for the report',
      }, { status: 400 });
    }

    // Confirm the target exists before recording anything against it — the
    // reports table is polymorphic and has no FK to lean on.
    const table = targetType === 'review' ? userRatings : pushbacks;
    const [target] = await db
      .select({ id: table.id })
      .from(table)
      .where(eq(table.id, targetId))
      .limit(1);

    if (!target) {
      return NextResponse.json({
        success: false,
        error: 'That post no longer exists',
      }, { status: 404 });
    }

    // Unique on (reporter, targetType, targetId): reporting twice is a no-op
    // rather than an error, so the button stays idempotent.
    await db
      .insert(reports)
      .values({
        targetType: targetType as ReportTarget,
        targetId,
        reporterId: authResult.user.id,
        reason: reason as ReportReason,
        note: typeof note === 'string' && note.trim() ? note.trim() : null,
      })
      .onConflictDoNothing();

    // Flag the target so it shows up in the moderation view admins already use.
    // Flagged stays publicly visible — restricting is a separate, admin-only
    // call, so one bad-faith report can't take a review down on its own.
    await db
      .update(table)
      .set({ flagged: true, updatedAt: new Date() })
      .where(eq(table.id, targetId));

    return NextResponse.json({
      success: true,
      message: 'Reported. The admins will take a look.',
    });
  } catch (error) {
    console.error('Error creating report:', error);
    return NextResponse.json({
      success: false,
      error: 'Something went wrong. Please try again.',
    }, { status: 500 });
  }
}
