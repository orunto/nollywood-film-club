'use client';
import { useState, useEffect } from 'react';
import { useUser } from '@stackframe/stack';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ShieldCheckIcon, ShieldSlashIcon } from "@phosphor-icons/react";
import { EmptyListIllustration } from '@/components/graphics';
import { toast } from 'sonner';
import { SortableHead, useTableSort, SortAccessors } from './table-sort';

const inputClass = "border-black/20 rounded-sm focus-visible:ring-black/20 focus-visible:border-black shadow-none";
const badgeClass = "text-xs bg-black text-white rounded-sm";

interface AdminUser {
  id: string;
  displayName: string | null;
  primaryEmail: string | null;
  profileImageUrl: string | null;
  signedUpAt: string;
  role: 'admin' | 'user';
  reviewCount: number;
}

const sortAccessors: SortAccessors<AdminUser> = {
  user: (u) => u.displayName,
  email: (u) => u.primaryEmail,
  role: (u) => u.role,
  reviews: (u) => u.reviewCount,
  joined: (u) => new Date(u.signedUpAt),
};

export default function UsersManagement() {
  const currentUser = useUser();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingChange, setPendingChange] = useState<{ user: AdminUser; makeAdmin: boolean } | null>(null);

  useEffect(() => {
    fetchUsers(true);
  }, []);

  const fetchUsers = async (isInitial = false) => {
    try {
      const response = await fetch('/api/admin/users');
      const data = await response.json();
      if (data.success) {
        setUsers(data.data);
      } else if (isInitial) {
        toast.error('Failed to load users');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      if (isInitial) toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const confirmRoleChange = async () => {
    if (!pendingChange) return;
    const { user, makeAdmin } = pendingChange;
    try {
      const response = await fetch(`/api/admin/users/${user.id}/admin-role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAdmin: makeAdmin }),
      });
      const result = await response.json();
      if (result.success) {
        await fetchUsers();
        toast.success(result.message);
      } else {
        toast.error(result.error || 'Failed to update user role');
      }
    } catch (error) {
      console.error('Error updating user role:', error);
      toast.error('Failed to update user role. Please try again.');
    } finally {
      setPendingChange(null);
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (u.displayName ?? '').toLowerCase().includes(q) || (u.primaryEmail ?? '').toLowerCase().includes(q);
  });
  const { sorted: sortedUsers, sortKey, direction, toggleSort } = useTableSort(filteredUsers, sortAccessors);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Users</h2>
        <p className="text-sm font-light text-black/60">View accounts and manage admin access</p>
      </div>

      <Input
        placeholder="Search by name or email…"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className={`max-w-sm ${inputClass}`}
      />

      {loading ? (
        <div className="border border-black/10 rounded-sm divide-y divide-black/10">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between gap-4 p-3">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-1/3 bg-black/10" />
                <Skeleton className="h-3 w-1/4 bg-black/10" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-16 border border-black/10 rounded-sm">
          <EmptyListIllustration className="w-24 md:w-28 mx-auto mb-4 text-black/70" />
          <h2 className="text-xl font-semibold mb-2">
            {searchQuery ? 'No matches found' : 'No users yet'}
          </h2>
          <p className="text-gray-600 text-sm">
            {searchQuery ? `No users match "${searchQuery}".` : 'Registered users will appear here.'}
          </p>
        </div>
      ) : (
        <div className="border border-black/10 rounded-sm">
          <Table>
            <TableHeader>
              <TableRow className="border-black/10 hover:bg-transparent">
                <SortableHead label="User" sortKey="user" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                <SortableHead label="Email" sortKey="email" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                <SortableHead label="Role" sortKey="role" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                <SortableHead label="Reviews" sortKey="reviews" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                <SortableHead label="Joined" sortKey="joined" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                <TableHead className="text-black text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedUsers.map((user) => {
                const isSelf = user.id === currentUser?.id;
                return (
                  <TableRow key={user.id} className="border-black/10 hover:bg-black/5 group">
                    <TableCell className="font-medium whitespace-normal">
                      {user.displayName || 'Unnamed User'}
                      {isSelf && <span className="text-black/40 font-light"> (you)</span>}
                    </TableCell>
                    <TableCell className="text-black/60">{user.primaryEmail || '—'}</TableCell>
                    <TableCell>
                      {user.role === 'admin' && <Badge className={badgeClass}>Admin</Badge>}
                    </TableCell>
                    <TableCell className="text-black/60">{user.reviewCount}</TableCell>
                    <TableCell className="text-black/60">
                      {new Date(user.signedUpAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-black/60 hover:text-black hover:bg-black/10 disabled:opacity-30"
                          disabled={isSelf && user.role === 'admin'}
                          onClick={() => setPendingChange({ user, makeAdmin: user.role !== 'admin' })}
                          title={user.role === 'admin' ? 'Remove admin access' : 'Grant admin access'}
                        >
                          {user.role === 'admin' ? <ShieldSlashIcon className="w-4 h-4" /> : <ShieldCheckIcon className="w-4 h-4" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog open={pendingChange !== null} onOpenChange={(open) => !open && setPendingChange(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingChange?.makeAdmin ? 'Grant admin access?' : 'Remove admin access?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingChange?.makeAdmin
                ? `"${pendingChange.user.displayName || pendingChange.user.primaryEmail}" will be able to manage all content, reviews, and users.`
                : `"${pendingChange?.user.displayName || pendingChange?.user.primaryEmail}" will lose access to the admin dashboard.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRoleChange} className="bg-black text-white hover:bg-black/80">
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
