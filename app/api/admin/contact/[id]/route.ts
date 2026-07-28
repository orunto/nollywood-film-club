import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { contactMessages } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { authenticateAdmin } from '@/lib/admin-auth';
import { CONTACT_STATUSES, type ContactStatus } from '@/lib/contact';

// Closes out a contact message. Same open/actioned/dismissed lifecycle the
// reports queue uses, so the two admin tabs behave identically.
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

    if (!CONTACT_STATUSES.includes(status)) {
      return NextResponse.json({
        success: false,
        error: 'Unknown status',
      }, { status: 400 });
    }

    const isResolved = status !== 'open';
    const updated = await db
      .update(contactMessages)
      .set({
        status: status as ContactStatus,
        resolvedBy: isResolved ? authResult.user.id : null,
        resolvedAt: isResolved ? new Date() : null,
      })
      .where(eq(contactMessages.id, id))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Message not found',
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: updated[0],
      message: status === 'open' ? 'Message reopened' : `Message ${status}`,
    });
  } catch (error) {
    console.error('Error updating contact message:', error);
    return NextResponse.json({
      success: false,
      error: 'Something went wrong. Please try again.',
    }, { status: 500 });
  }
}
