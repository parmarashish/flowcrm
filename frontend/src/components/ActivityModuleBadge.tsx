import type { ActivityModule } from "@/features/activity/activityApi";
import { cn } from "@/lib/utils";

interface ActivityModuleBadgeProps {
  module: ActivityModule;
  className?: string;
}

const MODULE_CONFIG: Record<
  ActivityModule,
  { label: string; border: string; bg: string; text: string; dot: string }
> = {
  leads: {
    label: "Leads",
    border: "border-l-[#0066cc]",
    bg: "bg-[#f1f6fd]",
    text: "text-[#0066cc]",
    dot: "bg-[#0066cc]",
  },
  contacts: {
    label: "Contacts",
    border: "border-l-[#7b2cbf]",
    bg: "bg-[#f6f0fd]",
    text: "text-[#7b2cbf]",
    dot: "bg-[#7b2cbf]",
  },
  companies: {
    label: "Companies",
    border: "border-l-[#3f51b5]",
    bg: "bg-[#f0f2fb]",
    text: "text-[#3f51b5]",
    dot: "bg-[#3f51b5]",
  },
  deals: {
    label: "Deals",
    border: "border-l-[#059669]",
    bg: "bg-[#ecfdf5]",
    text: "text-[#047857]",
    dot: "bg-[#059669]",
  },
  tasks: {
    label: "Tasks",
    border: "border-l-[#e07b00]",
    bg: "bg-[#fdf7ee]",
    text: "text-[#b36200]",
    dot: "bg-[#e07b00]",
  },
  users: {
    label: "Users",
    border: "border-l-[#d13212]",
    bg: "bg-[#fdf3f2]",
    text: "text-[#d13212]",
    dot: "bg-[#d13212]",
  },
};

export function ActivityModuleBadge({ module, className }: ActivityModuleBadgeProps) {
  const config = MODULE_CONFIG[module] ?? MODULE_CONFIG.leads;

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
