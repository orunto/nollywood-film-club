import { NextResponse } from 'next/server';
import { authenticateAdmin } from '@/lib/admin-auth';
import { getReportsForAdmin } from '@/lib/server-queries';

export async function GET() {
  try {
    const authResult = await authenticateAdmin();
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const data = await getReportsForAdmin();

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching reports:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
