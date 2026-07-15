import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { discussions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { authenticateAdmin } from '@/lib/admin-auth';
import { syncCatalogNumbers } from '@/lib/catalog-sync';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authResult = await authenticateAdmin();
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const discussionData = await request.json();

    const [existing] = await db
      .select({ contentId: discussions.contentId })
      .from(discussions)
      .where(eq(discussions.id, id));

    const updatedDiscussion = await db
      .update(discussions)
      .set({
        title: discussionData.title,
        description: discussionData.description || null,
        contentId: discussionData.contentId || null,
        spaceUrl: discussionData.spaceUrl || null,
        podcastLinks: discussionData.podcastLinks || [],
        episodeNumber: discussionData.episodeNumber ?? null,
        discussionDate: discussionData.discussionDate ? new Date(discussionData.discussionDate) : null,
        updatedAt: new Date(),
      })
      .where(eq(discussions.id, id))
      .returning();

    if (updatedDiscussion.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Discussion not found'
      }, { status: 404 });
    }

    await syncCatalogNumbers([existing?.contentId, updatedDiscussion[0].contentId]);

    return NextResponse.json({
      success: true,
      data: updatedDiscussion[0],
      message: 'Discussion updated successfully'
    });
  } catch (error) {
    console.error('Error updating discussion:', error);
    return NextResponse.json({
      success: false,
      error: 'Something went wrong. Please try again.'
    }, { status: 500 });
  }
}

// Link/unlink a discussion to content without touching its other fields
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authResult = await authenticateAdmin();
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { contentId } = await request.json();

    const [existing] = await db
      .select({ contentId: discussions.contentId })
      .from(discussions)
      .where(eq(discussions.id, id));

    const updatedDiscussion = await db
      .update(discussions)
      .set({
        contentId: contentId || null,
        updatedAt: new Date(),
      })
      .where(eq(discussions.id, id))
      .returning();

    if (updatedDiscussion.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Discussion not found'
      }, { status: 404 });
    }

    await syncCatalogNumbers([existing?.contentId, updatedDiscussion[0].contentId]);

    return NextResponse.json({
      success: true,
      data: updatedDiscussion[0],
      message: contentId ? 'Discussion linked to content' : 'Discussion unlinked from content'
    });
  } catch (error) {
    console.error('Error linking discussion:', error);
    return NextResponse.json({
      success: false,
      error: 'Something went wrong. Please try again.'
    }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authResult = await authenticateAdmin();
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const deletedDiscussion = await db
      .delete(discussions)
      .where(eq(discussions.id, id))
      .returning();

    if (deletedDiscussion.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Discussion not found'
      }, { status: 404 });
    }

    await syncCatalogNumbers([deletedDiscussion[0].contentId]);

    return NextResponse.json({
      success: true,
      message: 'Discussion deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting discussion:', error);
    return NextResponse.json({
      success: false,
      error: 'Something went wrong. Please try again.'
    }, { status: 500 });
  }
}
