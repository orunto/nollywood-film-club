import { NextResponse } from 'next/server';
import { authenticateAdmin } from '@/lib/admin-auth';
import { stackServerApp } from '@/stack';
import { db } from '@/db/client';
import { userRatings } from '@/db/schema';
import { count } from 'drizzle-orm';

export async function GET() {
  try {
    const authResult = await authenticateAdmin();
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const users = await stackServerApp.listUsers({ limit: 200, orderBy: 'signedUpAt', desc: true });

    const reviewCounts = await db
      .select({ userId: userRatings.userId, reviewCount: count() })
      .from(userRatings)
      .groupBy(userRatings.userId);
    const reviewCountMap = new Map(reviewCounts.map((r) => [r.userId, r.reviewCount]));

    const data = users.map((u) => ({
      id: u.id,
      displayName: u.displayName,
      primaryEmail: u.primaryEmail,
      profileImageUrl: u.profileImageUrl,
      signedUpAt: u.signedUpAt,
      role: (u.clientMetadata as { role?: string } | null)?.role === 'admin' ? 'admin' : 'user',
      reviewCount: reviewCountMap.get(u.id) ?? 0,
    }));

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
