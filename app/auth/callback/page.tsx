import { redirect } from 'next/navigation';
import { stackServerApp } from '../../stack';
import { db } from '@/db/client';
import { usernames } from '@/db/schema';
import { eq } from 'drizzle-orm';

export default async function AuthCallbackPage() {
  const user = await stackServerApp.getUser();
  
  if (!user) {
    redirect('/auth');
  }

  // Check user role and redirect accordingly
  const userRole = user.metadata?.role;
  
  if (userRole === 'admin') {
    redirect('/admin');
  }

  // For regular users, check if they have a username
  // First check if username exists in metadata
  const usernameInMetadata = user.clientMetadata?.username;
  
  // If no username in metadata, check database
  if (!usernameInMetadata || usernameInMetadata.trim() === '') {
    const existingUsername = await db
      .select()
      .from(usernames)
      .where(eq(usernames.stackUserId, user.id))
      .limit(1);

    if (existingUsername.length === 0) {
      // User doesn't have a username, redirect to onboarding
      redirect('/onboarding');
    }
  }

  // User has username, redirect to home page
  redirect('/');
}
