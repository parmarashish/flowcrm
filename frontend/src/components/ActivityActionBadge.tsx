import type { ActivityActionType } from "@/features/activity/activityApi";
import { cn } from "@/lib/utils";

interface ActivityActionBadgeProps {
  type: ActivityActionType;
  className?: string;
}

const ACTION_CONFIG: Record<
  ActivityActionType,
  { label: string; border: string; bg: string; text: string; dot: string }
> = {
  created: {
    label: "Created",
    border: "border-l-[#1d8102]",
    bg: "bg-[#f0f8ee]",
    text: "text-[#1d8102]",
    dot: "bg-[#1d8102]",
  },
  updated: {
    label: "Updated",
    border: "border-l-[#0066cc]",
    bg: "bg-[#f1f6fd]",
    text: "text-[#0066cc]",
    dot: "bg-[#0066cc]",
  },
  deleted: {
    label: "Deleted",
    border: "border-l-[#d13212]",
    bg: "bg-[#fdf3f2]",
    text: "text-[#d13212]",
    dot: "bg-[#d13212]",
  },
  status_changed: {
    label: "Status Changed",
    border: "border-l-[#e07b00]",
    bg: "bg-[#fdf7ee]",
    text: "text-[#b36200]",
    dot: "bg-[#e07b00]",
  },
  assigned: {
    label: "Assigned",
    border: "border-l-[#7b2cbf]",
    bg: "bg-[#f6f0fd]",
    text: "text-[#7b2cbf]",
    dot: "bg-[#7b2cbf]",
  },
};

export function ActivityActionBadge({ type, className }: ActivityActionBadgeProps) {
  const config = ACTION_CONFIG[type] ?? ACTION_CONFIG.updated;

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
