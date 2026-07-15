import { NextRequest, NextResponse } from 'next/server';
import { stackServerApp } from '@/stack';
import { isAdminUser } from '@/lib/roles';

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

    // Update the user's metadata with the username
    try {
      // Get the current user to verify they exist
      const currentUser = await stackServerApp.getUser();
      if (!currentUser) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }

      // Only allow users to set their own username, or admins to set any
      // username. Admin status is read from clientReadOnlyMetadata (the client
      // cannot forge it) — see lib/roles.ts.
      const isCurrentUser = currentUser.id === stackUserId;
      const isAdmin = isAdminUser(currentUser);

      if (!isCurrentUser && !isAdmin) {
        return NextResponse.json(
          { error: 'Unauthorized to set username for this user' },
          { status: 403 }
        );
      }

      // Get the target user (could be the current user or another user if admin)
      const targetUser = isCurrentUser ? currentUser : await stackServerApp.getUser(stackUserId);

      if (targetUser) {
        // Merge, don't overwrite: a bare { username } would wipe any other
        // clientMetadata the user has.
        await targetUser.update({
          clientMetadata: {
            ...(targetUser.clientMetadata as object ?? {}),
            username: username.toLowerCase(),
          },
        });
        
        return NextResponse.json(
          { success: true, username: username.toLowerCase() },
          { status: 201 }
        );
      } else {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }
    } catch (metadataError) {
      console.error('Error updating user metadata:', metadataError);
      return NextResponse.json(
        { error: 'Failed to create username' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error creating username:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}