import { NextResponse } from 'next/server';
import { authenticateAdmin } from '@/lib/admin-auth';
import { getContactMessagesForAdmin } from '@/lib/server-queries';

export async function GET() {
  try {
    const authResult = await authenticateAdmin();
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const data = await getContactMessagesForAdmin();

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching contact messages:', error);
    return NextResponse.json({
      success: false,
      error: 'Something went wrong. Please try again.',
    }, { status: 500 });
  }
}
