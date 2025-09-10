import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/client';
import { usernames } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const { username, stackUserId } = await request.json();

    if (!username || typeof username !== 'string') {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      );
    }

    if (!stackUserId || typeof stackUserId !== 'string') {
      return NextResponse.json(
        { error: 'Stack user ID is required' },
        { status: 400 }
      );
    }

    // Check if username is valid (alphanumeric, underscores, hyphens, 3-20 chars)
    const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
    if (!usernameRegex.test(username)) {
      return NextResponse.json(
        { error: 'Username must be 3-20 characters long and contain only letters, numbers, underscores, and hyphens' },
        { status: 400 }
      );
    }

    // Check if username already exists
    const existingUser = await db
      .select()
      .from(usernames)
      .where(eq(usernames.username, username.toLowerCase()))
      .limit(1);

    if (existingUser.length > 0) {
      return NextResponse.json(
        { error: 'Username is already taken' },
        { status: 409 }
      );
    }

    // Check if stackUserId already has a username
    const existingStackUser = await db
      .select()
      .from(usernames)
      .where(eq(usernames.stackUserId, stackUserId))
      .limit(1);

    if (existingStackUser.length > 0) {
      return NextResponse.json(
        { error: 'User already has a username' },
        { status: 409 }
      );
    }

    // Create the username record
    const newUsername = await db
      .insert(usernames)
      .values({
        stackUserId,
        username: username.toLowerCase(),
      })
      .returning();

    return NextResponse.json(
      { success: true, username: newUsername[0] },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating username:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
