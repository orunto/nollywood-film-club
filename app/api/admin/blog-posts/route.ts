import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/client';
import { blogPosts } from '@/db/schema';

export async function GET() {
  try {
    const posts = await db
      .select()
      .from(blogPosts)
      .orderBy(blogPosts.createdAt);

    return NextResponse.json({ 
      success: true, 
      data: posts 
    });
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const postData = await request.json();
    
    const newPost = await db.insert(blogPosts).values({
      title: postData.title,
      content: postData.content,
      excerpt: postData.excerpt,
      slug: postData.slug,
      published: postData.published,
      publishedAt: postData.publishedAt,
    }).returning();

    return NextResponse.json({ 
      success: true, 
      data: newPost[0],
      message: 'Blog post created successfully' 
    });
  } catch (error) {
    console.error('Error creating blog post:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
