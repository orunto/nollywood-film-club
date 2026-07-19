import { redirect } from 'next/navigation';
import { stackServerApp } from '@/stack';
import UserDashboard from './user-dashboard';

export default async function UserDashboardPage() {
  const user = await stackServerApp.getUser();
  
  if (!user) {
    redirect('/auth');
  }

  // Extract only serializable user data. Display fields come from the server so
  // the header renders without a client fetch and the profile form preloads.
  const userData = {
    id: user.id,
    email: user.primaryEmail || '',
    displayName: user.displayName ?? null,
    username: (user.clientMetadata as { username?: string })?.username ?? null,
    profileImageUrl: user.profileImageUrl ?? null,
  };

  return <UserDashboard user={userData} />;
}
