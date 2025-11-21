import { redirect } from 'next/navigation';
import { stackServerApp } from '../../stack';
import AdminDashboard from './admin-dashboard';

export default async function AdminPage() {
  const user = await stackServerApp.getUser();
  
  if (!user) {
    // Redirect to auth with return URL
    redirect('/auth?returnTo=/admin');
  }

  // Check user metadata for role
  const userRole = user.clientMetadata?.role;
  
  if (userRole !== 'admin') {
    redirect('/user-dashboard');
  }

  return <AdminDashboard />;
}
