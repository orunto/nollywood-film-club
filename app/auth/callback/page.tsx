import { redirect } from 'next/navigation';
import { stackServerApp } from '@/stack';
import { isAdminUser } from '@/lib/roles';

export default async function AuthCallbackPage() {
  const user = await stackServerApp.getUser();

  if (!user) {
    redirect('/auth');
  }

  // Role comes from clientReadOnlyMetadata (server-write-only, unforgeable)
  if (isAdminUser(user)) {
    redirect('/admin');
  }

  // For regular users, check if they have a username in metadata
  const usernameInMetadata = user.clientMetadata?.username;
  
  // If no username in metadata, redirect to onboarding
  if (!usernameInMetadata || usernameInMetadata.trim() === '') {
    redirect('/onboarding');
  }

  // User has username, redirect to home page
  redirect('/');
}