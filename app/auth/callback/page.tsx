import { redirect } from 'next/navigation';
import { stackServerApp } from '@/stack';

export default async function AuthCallbackPage() {
  const user = await stackServerApp.getUser();
  
  if (!user) {
    redirect('/auth');
  }

  // Check user role and redirect accordingly
  const userRole = user.clientMetadata?.role;
  
  if (userRole === 'admin') {
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