"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Clock, Mail } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/UserAvatar";
import { RoleBadge } from "@/components/RoleBadge";
import { UserStatusBadge } from "@/components/UserStatusBadge";
import {
  useGetUserQuery,
  useGetUserActivityQuery,
  useUpdateUserPermissionsMutation,
  PERMISSION_MODULES,
  type PermissionModule,
  type UserPermissions,
} from "@/features/users/usersApi";
import { formatRelativeTime } from "@/lib/utils";

const MODULE_LABELS: Record<PermissionModule, string> = {
  leads: "Leads",
  contacts: "Contacts",
  companies: "Companies",
  deals: "Deals",
  tasks: "Tasks",
  reports: "Reports",
};

const PERMISSION_KEYS = ["read", "write", "delete"] as const;
type PermissionKey = (typeof PERMISSION_KEYS)[number];

interface UserDetailDrawerProps {
  userId: string | null;
  onOpenChange: (open: boolean) => void;
}

export function UserDetailDrawer({ userId, onOpenChange }: UserDetailDrawerProps) {
  const open = userId !== null;
  const { data, isLoading } = useGetUserQuery(userId ?? "", { skip: !userId });
  const { data: activityData, isLoading: activityLoading } = useGetUserActivityQuery(
    userId ?? "",
    { skip: !userId }
  );
  const [updatePermissions, { isLoading: isSaving }] = useUpdateUserPermissionsMutation();

  const [permissions, setPermissions] = useState<UserPermissions | null>(null);

  useEffect(() => {
    if (open && data?.user) {
      setPermissions(data.user.permissions);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, data?.user]);

  const user = data?.user;
  const isAdminRole = user?.role === "admin";
  const isAgentRole = user?.role === "agent";

  function toggleCell(mod: PermissionModule, key: PermissionKey) {
    setPermissions((prev) => {
      if (!prev) return prev;
      return { ...prev, [mod]: { ...prev[mod], [key]: !prev[mod][key] } };
    });
  }

  function isCellDisabled(key: PermissionKey) {
    if (isAdminRole) return true;
    if (isAgentRole && key === "delete") return true;
    return false;
  }

  async function handleSavePermissions() {
    if (!user || !permissions) return;
    try {
      await updatePermissions({ id: user.id, permissions }).unwrap();
      toast.success("Permissions updated");
    } catch {
      toast.error("Failed to update permissions");
    }
  }

  function formatTimestamp(dateStr: string) {
    try {
      return new Date(dateStr).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) onOpenChange(false);
      }}
    >
      <SheetContent className="w-full max-w-[440px]">
        {isLoading || !user || !permissions ? (
          <div className="p-4 space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <div className="flex flex-col h-full overflow-y-auto">
            {/* Top: Profile */}
            <SheetHeader>
              <div className="flex items-center gap-3">
                <UserAvatar name={user.name} size="lg" />
                <div className="flex flex-col gap-0.5 min-w-0">
                  <SheetTitle className="truncate">{user.name}</SheetTitle>
                  <SheetDescription className="flex items-center gap-1 truncate">
                    <Mail className="size-3 shrink-0" /> {user.email}
                  </SheetDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <RoleBadge role={user.role} />
                <UserStatusBadge status={user.status} />
              </div>
              <div className="flex items-center gap-1 text-[11px] text-[#879596]">
                <Clock className="size-3" />
                Last login: {formatRelativeTime(user.lastLogin)}
              </div>
            </SheetHeader>

            {/* Middle: Permission Grid */}
            <div className="border-b border-[#d5d9d9]">
              <div className="px-4 py-2.5 bg-[#f8f9fa] border-b border-[#d5d9d9]">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#0f1923]">
                  Permission Grid
                </h3>
                {isAdminRole && (
                  <p className="text-[11px] text-[#879596] mt-0.5">
                    Admins always have full access — not editable.
                  </p>
                )}
                {isAgentRole && (
                  <p className="text-[11px] text-[#879596] mt-0.5">
                    Agents can never be granted delete access.
                  </p>
                )}
              </div>
              <div className="p-3">
                <table className="w-full text-left text-[12px] border-collapse">
                  <thead>
                    <tr className="text-[10px] font-semibold uppercase tracking-wider text-[#545b64]">
                      <th className="py-1.5 pr-2">Module</th>
                      <th className="py-1.5 px-2 text-center">Read</th>
                      <th className="py-1.5 px-2 text-center">Write</th>
                      <th className="py-1.5 px-2 text-center">Delete</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#eaeded]">
                    {PERMISSION_MODULES.map((mod) => (
                      <tr key={mod}>
                        <td className="py-1.5 pr-2 font-medium text-[#0f1923]">
                          {MODULE_LABELS[mod]}
                        </td>
                        {PERMISSION_KEYS.map((key) => (
                          <td key={key} className="py-1.5 px-2 text-center">
                            <input
                              type="checkbox"
                              checked={permissions[mod][key]}
                              disabled={isCellDisabled(key)}
                              onChange={() => toggleCell(mod, key)}
                              className="rounded-[2px] border-[#aab7b8] text-[#0066cc] focus:ring-[#0066cc] disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex justify-end mt-3">
                  <Button size="sm" onClick={handleSavePermissions} disabled={isSaving}>
                    {isSaving ? "Saving..." : "Save Permissions"}
                  </Button>
                </div>
              </div>
            </div>

            {/* Bottom: Recent Activity */}
            <div className="flex-1">
              <div className="px-4 py-2.5 bg-[#f8f9fa] border-b border-[#d5d9d9]">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#0f1923]">
                  Recent Activity
                </h3>
              </div>
              <div className="divide-y divide-[#d5d9d9]">
                {activityLoading ? (
                  <div className="p-3 space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                ) : !activityData?.items.length ? (
                  <p className="p-4 text-xs text-[#879596]">No recent activity.</p>
                ) : (
                  activityData.items.map((item) => (
                    <div key={item.id} className="flex items-start gap-2.5 px-4 py-2.5">
                      <Clock className="size-3.5 text-[#879596] mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-[#0f1923]">
                          {item.message}
                          {item.lead && (
                            <Link
                              href={`/leads/${item.lead.id}`}
                              className="ml-1 font-medium text-[#0066cc] hover:underline"
                            >
                              ({item.lead.name})
                            </Link>
                          )}
                        </p>
                        <p className="text-[11px] text-[#879596] mt-0.5">
                          {formatTimestamp(item.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
