import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/client';
import { blogPosts } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const postData = await request.json();
    
    const updatedPost = await db
      .update(blogPosts)
      .set({
        title: postData.title,
        content: postData.content,
        excerpt: postData.excerpt,
        slug: postData.slug,
        published: postData.published,
        publishedAt: postData.publishedAt,
        updatedAt: new Date(),
      })
      .where(eq(blogPosts.id, params.id))
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
      message: 'Blog post updated successfully' 
    });
  } catch (error) {
    console.error('Error updating blog post:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const deletedPost = await db
      .delete(blogPosts)
      .where(eq(blogPosts.id, params.id))
      .returning();

    if (deletedPost.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Blog post not found' 
      }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Blog post deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting blog post:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
