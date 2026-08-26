import type { TaskStatus } from "@/features/tasks/tasksApi";
import { cn } from "@/lib/utils";

interface TaskStatusBadgeProps {
  status: TaskStatus;
  className?: string;
}

const STATUS_CONFIG: Record<
  TaskStatus,
  { label: string; border: string; bg: string; text: string; dot: string }
> = {
  Todo: {
    label: "Todo",
    border: "border-l-[#879596]",
    bg: "bg-[#f4f4f5]",
    text: "text-[#545b64]",
    dot: "bg-[#879596]",
  },
  "In Progress": {
    label: "In Progress",
    border: "border-l-[#0066cc]",
    bg: "bg-[#f1f6fd]",
    text: "text-[#0066cc]",
    dot: "bg-[#0066cc]",
  },
  Done: {
    label: "Done",
    border: "border-l-[#1d8102]",
    bg: "bg-[#f0f8ee]",
    text: "text-[#1d8102]",
    dot: "bg-[#1d8102]",
  },
};

export function TaskStatusBadge({ status, className }: TaskStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.Todo;

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
