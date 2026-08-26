import type { UserStatus } from "@/features/users/usersApi";
import { cn } from "@/lib/utils";

interface UserStatusBadgeProps {
  status: UserStatus;
  className?: string;
}

const STATUS_CONFIG: Record<
  UserStatus,
  { label: string; border: string; bg: string; text: string; dot: string }
> = {
  active: {
    label: "Active",
    border: "border-l-[#1d8102]",
    bg: "bg-[#f0f8ee]",
    text: "text-[#1d8102]",
    dot: "bg-[#1d8102]",
  },
  inactive: {
    label: "Inactive",
    border: "border-l-[#d13212]",
    bg: "bg-[#fdf3f2]",
    text: "text-[#d13212]",
    dot: "bg-[#d13212]",
  },
};

export function UserStatusBadge({ status, className }: UserStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.active;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[2px] border border-[#d5d9d9] border-l-[3px] px-2 py-0.5 text-[11px] font-medium tracking-tight select-none",
        config.border,
        config.bg,
        config.text,
        className
      )}
    >
      <span className={cn("size-1.5 rounded-full shrink-0", config.dot)} />
      <span>{config.label}</span>
    </span>
  );
}
