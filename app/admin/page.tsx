import { redirect } from 'next/navigation';
import { stackServerApp } from '../../stack';
import { isAdminUser } from '@/lib/roles';
import AdminDashboard from './admin-dashboard';

export default async function AdminPage() {
  const user = await stackServerApp.getUser();

  if (!user) {
    // Redirect to auth with return URL
    redirect('/auth?returnTo=/admin');
  }

  // Role comes from clientReadOnlyMetadata (server-write-only). This page guard
  // is convenience; every /api/admin route enforces the same check server-side.
  if (!isAdminUser(user)) {
    redirect('/user-dashboard');
  }

  return <AdminDashboard />;
}
