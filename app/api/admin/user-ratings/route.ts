import { NextResponse } from 'next/server';
import { authenticateAdmin } from '@/lib/admin-auth';
import { getAllUserRatingsForAdmin } from '@/lib/server-queries';

export async function GET() {
  try {
    const authResult = await authenticateAdmin();
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const ratings = await getAllUserRatingsForAdmin();

    return NextResponse.json({
      success: true,
      data: ratings,
    });
  } catch (error) {
    console.error('Error fetching user ratings:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
