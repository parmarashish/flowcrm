import type { TaskPriority } from "@/features/tasks/tasksApi";
import { cn } from "@/lib/utils";

interface PriorityBadgeProps {
  priority: TaskPriority;
  className?: string;
}

const PRIORITY_CONFIG: Record<
  TaskPriority,
  { label: string; border: string; bg: string; text: string; dot: string }
> = {
  High: {
    label: "High",
    border: "border-l-[#d13212]",
    bg: "bg-[#fdf3f2]",
    text: "text-[#d13212]",
    dot: "bg-[#d13212]",
  },
  Medium: {
    label: "Medium",
    border: "border-l-[#e07b00]",
    bg: "bg-[#fdf7ee]",
    text: "text-[#b36200]",
    dot: "bg-[#e07b00]",
  },
  Low: {
    label: "Low",
    border: "border-l-[#879596]",
    bg: "bg-[#f4f4f5]",
    text: "text-[#545b64]",
    dot: "bg-[#879596]",
  },
};

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const config = PRIORITY_CONFIG[priority] ?? PRIORITY_CONFIG.Medium;

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
