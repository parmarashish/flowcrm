import type { LeadStatus } from "@/features/leads/leadsApi";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: LeadStatus;
  className?: string;
}

const STATUS_CONFIG: Record<
  LeadStatus,
  { label: string; border: string; bg: string; text: string; dot: string }
> = {
  New: {
    label: "New",
    border: "border-l-[#0066cc]",
    bg: "bg-[#f1f6fd]",
    text: "text-[#0066cc]",
    dot: "bg-[#0066cc]",
  },
  Contacted: {
    label: "Contacted",
    border: "border-l-[#e07b00]",
    bg: "bg-[#fdf7ee]",
    text: "text-[#b36200]",
    dot: "bg-[#e07b00]",
  },
  Qualified: {
    label: "Qualified",
    border: "border-l-[#7b2cbf]",
    bg: "bg-[#f6f0fd]",
    text: "text-[#7b2cbf]",
    dot: "bg-[#7b2cbf]",
  },
  Proposal: {
    label: "Proposal",
    border: "border-l-[#3f51b5]",
    bg: "bg-[#f0f2fb]",
    text: "text-[#3f51b5]",
    dot: "bg-[#3f51b5]",
  },
  Won: {
    label: "Won",
    border: "border-l-[#1d8102]",
    bg: "bg-[#f0f8ee]",
    text: "text-[#1d8102]",
    dot: "bg-[#1d8102]",
  },
  Lost: {
    label: "Lost",
    border: "border-l-[#d13212]",
    bg: "bg-[#fdf3f2]",
    text: "text-[#d13212]",
    dot: "bg-[#d13212]",
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.New;

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
