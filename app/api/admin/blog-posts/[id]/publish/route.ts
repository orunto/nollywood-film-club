import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { blogPosts } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { published, publishedAt } = await request.json();
    const {id} = await params
    const updatedPost = await db
      .update(blogPosts)
      .set({
        published,
        publishedAt: published ? publishedAt : null,
        updatedAt: new Date(),
      })
      .where(eq(blogPosts.id, id))
      .returning();

    if (updatedPost.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Blog post not found' 
      }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      data: updatedPost[0],
      message: `Blog post ${published ? 'published' : 'unpublished'}` 
    });
  } catch (error) {
    console.error('Error updating blog post publish status:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
