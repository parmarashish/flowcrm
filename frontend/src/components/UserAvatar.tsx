import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const AVATAR_COLORS = ["#0066cc", "#6366f1", "#059669", "#d97706", "#dc2626", "#7c3aed"];

export function hashNameToColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface UserAvatarProps {
  name: string;
  size?: "sm" | "default" | "lg";
  className?: string;
}

export function UserAvatar({ name, size = "default", className }: UserAvatarProps) {
  return (
    <Avatar size={size} className={cn("rounded-[2px]", className)}>
      <AvatarFallback
        className="rounded-[2px] text-white font-semibold"
        style={{ backgroundColor: hashNameToColor(name) }}
      >
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
