"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateUserMutation, useUpdateUserMutation, type AdminUser } from "@/features/users/usersApi";
import type { UserRole } from "@/features/auth/authSlice";

const ROLES: { value: UserRole; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "team_leader", label: "Manager" },
  { value: "agent", label: "Agent" },
];

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: AdminUser;
}

function extractErrorMessage(err: unknown, fallback: string): string {
  if (
    err &&
    typeof err === "object" &&
    "data" in err &&
    err.data &&
    typeof err.data === "object" &&
    "error" in err.data
  ) {
    const errObj = (err.data as { error?: { message?: string } }).error;
    if (errObj?.message) return errObj.message;
  }
  return fallback;
}

export function UserFormDialog({ open, onOpenChange, user }: UserFormDialogProps) {
  const isEdit = Boolean(user);
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [role, setRole] = useState<UserRole>(user?.role ?? "agent");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [createUser, { isLoading: isCreating }] = useCreateUserMutation();
  const [updateUser, { isLoading: isUpdating }] = useUpdateUserMutation();
  const isSubmitting = isCreating || isUpdating;

  const roleChanged = isEdit && user !== undefined && role !== user.role;

  // Radix's onOpenChange only fires for its own internally-initiated close/open
  // events (Escape, overlay click) — not when the parent flips `open` externally,
  // which is how both "Add User" and "Edit User" actually open this dialog. Sync
  // the form fields via effect instead, keyed on `open` and the target user's id,
  // so switching edit targets (or add vs. edit) always re-seeds the right values.
  useEffect(() => {
    if (open) {
      setName(user?.name ?? "");
      setEmail(user?.email ?? "");
      setRole(user?.role ?? "agent");
      setPassword("");
      setShowPassword(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user?.id]);

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      if (isEdit && user) {
        await updateUser({ id: user.id, body: { name, email, role } }).unwrap();
        toast.success("User updated");
      } else {
        await createUser({ name, email, role, password }).unwrap();
        toast.success("User created");
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(extractErrorMessage(err, isEdit ? "Failed to update user" : "Failed to create user"));
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit User" : "Add User"}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? "Update this user's profile and role."
                : "Create a new user account with a temporary password."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 p-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="user-name" className="text-xs font-semibold text-[#545b64]">
                Full Name <span className="text-[#d13212]">*</span>
              </Label>
              <Input
                id="user-name"
                required
                placeholder="e.g. Jane Smith"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="user-email" className="text-xs font-semibold text-[#545b64]">
                Email Address <span className="text-[#d13212]">*</span>
              </Label>
              <Input
                id="user-email"
                type="email"
                required
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold text-[#545b64]">
                Role <span className="text-[#d13212]">*</span>
              </Label>
              <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
                <SelectTrigger className="h-8 w-full text-xs">
                  <SelectValue placeholder="Select Role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {roleChanged && (
                <p className="text-[11px] text-[#b36200] bg-[#fdf7ee] border border-[#e07b00]/30 rounded-[2px] px-2 py-1 mt-0.5">
                  Changing role will reset permissions to role defaults.
                </p>
              )}
            </div>

            {!isEdit && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="user-password" className="text-xs font-semibold text-[#545b64]">
                  Temporary Password <span className="text-[#d13212]">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="user-password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={8}
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-8 text-xs pr-8"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[#879596] hover:text-[#0f1923] cursor-pointer"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                  </button>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : isEdit ? "Save Changes" : "Add User"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
