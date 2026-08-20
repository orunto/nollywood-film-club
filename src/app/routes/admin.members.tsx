import type { Route } from "./+types/admin.members";
import { useEffect, useState } from "react";
import { useLoaderData } from "react-router";
import { appServicesContext } from "../context";
import { requireAdmin } from "../admin-auth";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../components/ui/alert-dialog";
import { ShieldCheckIcon, ShieldSlashIcon, SealCheckIcon, SealIcon } from "@phosphor-icons/react";
import { toast } from "sonner";
import { SortableHead, useTableSort, type SortAccessors } from "../../components/ui/table-sort";
import RegularBadge from "../../components/custom/regular-badge";
import {
  AdminPageHeader,
  AdminCard,
  AdminEmptyState,
  AdminSearchInput,
  LoadingRows,
  adminBadgeClass,
  jsonResponse,
} from "../../components/admin/admin-ui";

interface AdminUser {
  id: string;
  displayName: string;
  primaryEmail: string;
  profileImageUrl: string | null;
  signedUpAt: string;
  role: "admin" | "user";
  regular: boolean;
  reviewCount: number;
}

const sortAccessors: SortAccessors<AdminUser> = {
  user: (u) => u.displayName,
  email: (u) => u.primaryEmail,
  role: (u) => u.role,
  regular: (u) => u.regular,
  reviews: (u) => u.reviewCount,
  joined: (u) => new Date(u.signedUpAt),
};

type PendingChange =
  | { field: "role"; user: AdminUser; next: boolean }
  | { field: "regular"; user: AdminUser; next: boolean };

export async function loader({ context, request }: Route.LoaderArgs) {
  const services = context.get(appServicesContext);
  const authorization = await requireAdmin(services, request);
  if (authorization instanceof Response) return authorization;
  return {
    currentUserId: authorization.session.userId,
    users: await services.db.adminUsers.list(),
  };
}

export default function AdminMembersRoute() {
  const { currentUserId, users: initialUsers } = useLoaderData<typeof loader>();
  const [users, setUsers] = useState<AdminUser[]>(initialUsers);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingChange, setPendingChange] = useState<PendingChange | null>(null);

  useEffect(() => {
    setUsers(initialUsers);
  }, [initialUsers]);

  const fetchUsers = async (isInitial = false) => {
    try {
      const response = await fetch("/api/admin/users");
      const data = await jsonResponse<AdminUser[]>(response);
      if (data.success) {
        setUsers(data.data ?? []);
      } else if (isInitial) {
        toast.error("Failed to load users");
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      if (isInitial) toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const confirmChange = async () => {
    if (!pendingChange) return;
    const { field, user, next } = pendingChange;
    const endpoint = field === "role" ? "admin-role" : "regular-role";
    const body = field === "role" ? { isAdmin: next } : { regular: next };
    try {
      const response = await fetch(`/api/admin/users/${user.id}/${endpoint}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await jsonResponse(response);
      if (result.success) {
        await fetchUsers();
        toast.success(result.message);
      } else {
        toast.error(result.error || "Failed to update user");
      }
    } catch (error) {
      console.error("Error updating user:", error);
      toast.error("Failed to update user. Please try again.");
    } finally {
      setPendingChange(null);
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      (u.displayName ?? "").toLowerCase().includes(q) ||
      (u.primaryEmail ?? "").toLowerCase().includes(q)
    );
  });
  const { sorted: sortedUsers, sortKey, direction, toggleSort } = useTableSort(
    filteredUsers,
    sortAccessors,
  );
  const pending = pendingChange;
  const pendingUserName = pending
    ? pending.user.displayName || pending.user.primaryEmail
    : "";

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Members"
        title="Member accounts"
        description="View accounts and manage admin access and regular status."
      />

      <AdminSearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Search by name or email…" />

      {loading ? (
        <LoadingRows />
      ) : filteredUsers.length === 0 ? (
        <AdminEmptyState
          filtered={searchQuery.trim() !== ""}
          title="No users yet"
          message={
            searchQuery
              ? `No users match "${searchQuery}".`
              : "Registered users will appear here."
          }
        />
      ) : (
        <AdminCard>
          <Table>
            <TableHeader>
              <TableRow className="border-black/10 hover:bg-transparent">
                <SortableHead label="User" sortKey="user" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                <SortableHead label="Email" sortKey="email" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                <SortableHead label="Role" sortKey="role" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                <SortableHead label="Regular" sortKey="regular" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                <SortableHead label="Reviews" sortKey="reviews" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                <SortableHead label="Joined" sortKey="joined" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedUsers.map((user) => {
                const isSelf = user.id === currentUserId;
                return (
                  <TableRow key={user.id} className="border-black/10 hover:bg-black/5">
                    <TableCell className="font-medium whitespace-normal">
                      {user.displayName || "Unnamed User"}
                      {isSelf && <span className="text-black/40 font-light"> (you)</span>}
                    </TableCell>
                    <TableCell className="text-black/60">{user.primaryEmail || "—"}</TableCell>
                    <TableCell>
                      {user.role === "admin" && <Badge className={adminBadgeClass}>Admin</Badge>}
                    </TableCell>
                    <TableCell>{user.regular && <RegularBadge />}</TableCell>
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
                          disabled={isSelf && user.role === "admin"}
                          onClick={() => setPendingChange({ field: "role", user, next: user.role !== "admin" })}
                          title={user.role === "admin" ? "Remove admin access" : "Grant admin access"}
                        >
                          {user.role === "admin" ? <ShieldSlashIcon className="h-4 w-4" /> : <ShieldCheckIcon className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-black/60 hover:text-black hover:bg-black/10"
                          onClick={() => setPendingChange({ field: "regular", user, next: !user.regular })}
                          title={user.regular ? "Remove regular status" : "Mark as a regular"}
                        >
                          {user.regular ? <SealIcon className="h-4 w-4" /> : <SealCheckIcon className="h-4 w-4" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </AdminCard>
      )}

      <AlertDialog open={pendingChange !== null} onOpenChange={(open) => !open && setPendingChange(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pending?.field === "role"
                ? pending.next
                  ? "Grant admin access?"
                  : "Remove admin access?"
                : pending?.next
                  ? "Mark as a regular?"
                  : "Remove regular status?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pending?.field === "role"
                ? pending.next
                  ? `"${pendingUserName}" will be able to manage all content, reviews, and users.`
                  : `"${pendingUserName}" will lose access to the admin dashboard.`
                : pending?.next
                  ? `"${pendingUserName}" will be highlighted as a regular on reviews and the About page.`
                  : `"${pendingUserName}" will no longer be highlighted as a regular.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmChange} className="bg-black text-white hover:bg-black/80">
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}