"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGetUsersQuery, useUpdateUserRoleMutation } from "@/features/users/usersApi";
import { useAppSelector } from "@/store/hooks";
import { selectCurrentUser, type UserRole } from "@/features/auth/authSlice";

const ROLES: UserRole[] = ["admin", "team_leader", "agent"];

export default function UsersPage() {
  const currentUser = useAppSelector(selectCurrentUser);
  const router = useRouter();
  const { data, isLoading, isError } = useGetUsersQuery(undefined, {
    skip: currentUser?.role !== "admin",
  });
  const [updateUserRole] = useUpdateUserRoleMutation();

  useEffect(() => {
    if (currentUser && currentUser.role !== "admin") {
      router.replace("/dashboard");
    }
  }, [currentUser, router]);

  if (!currentUser || currentUser.role !== "admin") {
    return null;
  }

  if (isError) return <p>Failed to load users.</p>;

  const teamLeaders = data?.users.filter((u) => u.role === "team_leader") ?? [];

  async function handleRoleChange(userId: string, role: UserRole) {
    try {
      await updateUserRole({ id: userId, role }).unwrap();
      toast.success("Role updated");
    } catch {
      toast.error("Failed to update role");
    }
  }

  async function handleTeamLeadChange(userId: string, teamLeadId: string) {
    try {
      await updateUserRole({ id: userId, teamLead: teamLeadId === "none" ? null : teamLeadId }).unwrap();
      toast.success("Team lead updated");
    } catch {
      toast.error("Failed to update team lead");
    }
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Manage Users</h1>
      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Team Lead</TableHead>
              <TableHead>ID</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Select
                    value={user.role}
                    onValueChange={(v) => handleRoleChange(user.id, v as UserRole)}
                    disabled={user.id === currentUser?.id}
                  >
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Select
                    value={user.teamLead ?? "none"}
                    onValueChange={(v) => handleTeamLeadChange(user.id, v)}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {teamLeaders.map((tl) => (
                        <SelectItem key={tl.id} value={tl.id}>
                          {tl.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="font-mono text-xs">{user.id}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
