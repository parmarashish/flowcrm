import type { UserRole } from "@/features/auth/authSlice";
import { cn } from "@/lib/utils";

interface RoleBadgeProps {
  role: UserRole;
  className?: string;
}

const ROLE_CONFIG: Record<
  UserRole,
  { label: string; border: string; bg: string; text: string; dot: string }
> = {
  admin: {
    label: "Admin",
    border: "border-l-[#0066cc]",
    bg: "bg-[#f1f6fd]",
    text: "text-[#0066cc]",
    dot: "bg-[#0066cc]",
  },
  team_leader: {
    label: "Manager",
    border: "border-l-[#7b2cbf]",
    bg: "bg-[#f6f0fd]",
    text: "text-[#7b2cbf]",
    dot: "bg-[#7b2cbf]",
  },
  agent: {
    label: "Agent",
    border: "border-l-[#879596]",
    bg: "bg-[#f4f4f5]",
    text: "text-[#545b64]",
    dot: "bg-[#879596]",
  },
};

export function RoleBadge({ role, className }: RoleBadgeProps) {
  const config = ROLE_CONFIG[role] ?? ROLE_CONFIG.agent;

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
