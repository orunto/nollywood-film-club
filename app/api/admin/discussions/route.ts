import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/client';
import { discussions } from '@/db/schema';
import { desc, sql } from 'drizzle-orm';
import { authenticateAdmin } from '@/lib/admin-auth';
import { syncCatalogNumbers } from '@/lib/catalog-sync';

export async function GET() {
  try {
    // Latest first: episode number is the order discussions were held
    const rows = await db
      .select()
      .from(discussions)
      .orderBy(
        sql`${discussions.episodeNumber} DESC NULLS LAST`,
        desc(discussions.createdAt),
      );

    return NextResponse.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Error fetching discussions:', error);
    return NextResponse.json({
      success: false,
      error: 'Something went wrong. Please try again.'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateAdmin();
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const discussionData = await request.json();

    if (!discussionData.title || typeof discussionData.title !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'Title is required and must be a string'
      }, { status: 400 });
    }

    const newDiscussion = await db.insert(discussions).values({
      title: discussionData.title,
      description: discussionData.description || null,
      contentId: discussionData.contentId || null,
      spaceUrl: discussionData.spaceUrl || null,
      podcastLinks: discussionData.podcastLinks || [],
      episodeNumber: discussionData.episodeNumber ?? null,
      discussionDate: discussionData.discussionDate ? new Date(discussionData.discussionDate) : null,
    }).returning();

    await syncCatalogNumbers([newDiscussion[0].contentId]);

    return NextResponse.json({
      success: true,
      data: newDiscussion[0],
      message: 'Discussion created successfully'
    });
  } catch (error) {
    console.error('Error creating discussion:', error);
    return NextResponse.json({
      success: false,
      error: 'Something went wrong. Please try again.'
    }, { status: 500 });
  }
}
