import { redirect } from 'next/navigation';
import { stackServerApp } from '../../stack';
import UserDashboard from './user-dashboard';

export default async function UserDashboardPage() {
  const user = await stackServerApp.getUser();
  
  if (!user) {
    redirect('/auth');
  }

  // Extract only serializable user data
  const userData = {
    id: user.id,
    email: user.primaryEmail,
    clientMetadata: user.clientMetadata,
  };

  return <UserDashboard user={userData} />;
}
