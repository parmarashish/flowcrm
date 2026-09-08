"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ShieldCheck, RefreshCw, Plus, MoreVertical, Edit2, UserX, UserCheck, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/UserAvatar";
import { RoleBadge } from "@/components/RoleBadge";
import { UserStatusBadge } from "@/components/UserStatusBadge";
import { UserFormDialog } from "@/components/UserFormDialog";
import { UserDetailDrawer } from "@/components/UserDetailDrawer";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import {
  useGetUsersQuery,
  useUpdateUserStatusMutation,
  type AdminUser,
} from "@/features/users/usersApi";
import { useAppSelector } from "@/store/hooks";
import { selectCurrentUser } from "@/features/auth/authSlice";
import { cn, formatRelativeTime } from "@/lib/utils";

export default function UsersPage() {
  const currentUser = useAppSelector(selectCurrentUser);
  const router = useRouter();
  const { data, isLoading, isFetching, isError, refetch } = useGetUsersQuery(undefined, {
    skip: currentUser?.role !== "admin",
  });
  const [updateUserStatus] = useUpdateUserStatusMutation();

  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | undefined>(undefined);
  const [drawerUserId, setDrawerUserId] = useState<string | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<AdminUser | null>(null);

  useEffect(() => {
    if (currentUser && currentUser.role !== "admin") {
      router.replace("/dashboard");
    }
  }, [currentUser, router]);

  if (!currentUser || currentUser.role !== "admin") {
    return null;
  }

  const total = data?.users.length ?? 0;

  function openAddDialog() {
    setEditingUser(undefined);
    setFormOpen(true);
  }

  function openEditDialog(user: AdminUser) {
    setEditingUser(user);
    setFormOpen(true);
  }

  function openDrawer(userId: string) {
    setDrawerUserId(userId);
  }

  async function handleToggleStatus(user: AdminUser) {
    if (user.status === "active") {
      setDeactivateTarget(user);
      return;
    }
    try {
      await updateUserStatus({ id: user.id, status: "active" }).unwrap();
      toast.success("User activated");
    } catch {
      toast.error("Failed to update user status");
    }
  }

  async function confirmDeactivate() {
    if (!deactivateTarget) return;
    try {
      await updateUserStatus({ id: deactivateTarget.id, status: "inactive" }).unwrap();
      toast.success("User deactivated");
    } catch {
      toast.error("Failed to update user status");
    } finally {
      setDeactivateTarget(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#d5d9d9] pb-3">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-[2px] bg-[#0066cc] text-white">
            <ShieldCheck className="size-4" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-[#0f1923]">
              Users <span className="text-xs font-normal text-[#545b64]">({total})</span>
              {isFetching && <RefreshCw className="inline size-3 ml-2 animate-spin text-[#0066cc]" />}
            </h1>
            <p className="text-xs text-[#545b64]">
              Manage accounts, roles, and per-module permissions.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="size-3.5 mr-1.5" /> Refresh
          </Button>
          <Button size="sm" className="gap-1.5" onClick={openAddDialog}>
            <Plus className="size-3.5" />
            Add User
          </Button>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-[2px] border border-[#d5d9d9] bg-white">
        {isLoading ? (
          <div className="p-3 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : isError ? (
          <div className="p-6 text-center text-xs text-[#d13212]">
            Failed to load user directory.
          </div>
        ) : (
          <table className="w-full text-left text-[13px] border-collapse">
            <thead className="bg-[#f1f3f4] border-b border-[#d5d9d9] select-none">
              <tr>
                <th className="w-12 px-3 py-2" />
                <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[#545b64]">
                  Name
                </th>
                <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[#545b64]">
                  Email
                </th>
                <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[#545b64]">
                  Role
                </th>
                <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[#545b64]">
                  Status
                </th>
                <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[#545b64]">
                  Last Login
                </th>
                <th className="w-12 px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-[#545b64]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#d5d9d9]">
              {data?.users.map((user) => {
                const isSelf = user.id === currentUser.id;
                const isInactive = user.status === "inactive";

                return (
                  <tr
                    key={user.id}
                    onClick={() => openDrawer(user.id)}
                    className="h-10 transition-colors hover:bg-[#f8f9fa] cursor-pointer"
                  >
                    <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                      <UserAvatar name={user.name} size="sm" />
                    </td>
                    <td className={cn("px-3 py-2 font-medium text-[#0f1923]", isInactive && "opacity-60")}>
                      {user.name} {isSelf && <span className="text-[10px] text-[#0066cc] font-normal">(You)</span>}
                    </td>
                    <td className={cn("px-3 py-2 text-[#545b64]", isInactive && "opacity-60")}>
                      {user.email}
                    </td>
                    <td className="px-3 py-2">
                      <RoleBadge role={user.role} />
                    </td>
                    <td className="px-3 py-2">
                      <UserStatusBadge status={user.status} />
                    </td>
                    <td className="px-3 py-2 text-[12px] text-[#879596]">
                      {formatRelativeTime(user.lastLogin)}
                    </td>
                    <td className="px-3 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="flex size-7 items-center justify-center rounded-[2px] text-[#545b64] hover:bg-[#eaeded] hover:text-[#0f1923] transition-colors ml-auto cursor-pointer">
                            <MoreVertical className="size-3.5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem onClick={() => openEditDialog(user)} className="cursor-pointer">
                            <Edit2 className="size-3.5 mr-2" />
                            <span>Edit</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleToggleStatus(user)}
                            disabled={isSelf && !isInactive}
                            title={isSelf && !isInactive ? "You cannot deactivate your own account" : undefined}
                            className={cn(
                              "cursor-pointer",
                              !isInactive && "text-[#d13212] focus:text-[#d13212]"
                            )}
                          >
                            {isInactive ? (
                              <UserCheck className="size-3.5 mr-2" />
                            ) : (
                              <UserX className="size-3.5 mr-2" />
                            )}
                            <span>{isInactive ? "Activate" : "Deactivate"}</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => openDrawer(user.id)} className="cursor-pointer">
                            <Eye className="size-3.5 mr-2" />
                            <span>View Details</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}

              {data?.users.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-[#879596]">
                    No users found in directory.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <UserFormDialog open={formOpen} onOpenChange={setFormOpen} user={editingUser} />

      <UserDetailDrawer
        userId={drawerUserId}
        onOpenChange={(open) => {
          if (!open) setDrawerUserId(null);
        }}
      />

      <ConfirmDialog
        open={Boolean(deactivateTarget)}
        onOpenChange={(open) => !open && setDeactivateTarget(null)}
        title="Deactivate User"
        description={`Deactivate "${deactivateTarget?.name}"? They will be signed out immediately and unable to log back in until reactivated.`}
        confirmLabel="Deactivate"
        variant="destructive"
        onConfirm={confirmDeactivate}
      />
    </div>
  );
}
