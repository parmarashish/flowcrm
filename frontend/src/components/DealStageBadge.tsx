import type { DealStage } from "@/features/deals/dealsApi";
import { cn } from "@/lib/utils";

interface DealStageBadgeProps {
  stage: DealStage;
  className?: string;
}

const STAGE_CONFIG: Record<
  DealStage,
  { label: string; border: string; bg: string; text: string; dot: string }
> = {
  Negotiation: {
    label: "Negotiation",
    border: "border-l-[#0066cc]",
    bg: "bg-[#f1f6fd]",
    text: "text-[#0066cc]",
    dot: "bg-[#0066cc]",
  },
  Proposal: {
    label: "Proposal",
    border: "border-l-[#3f51b5]",
    bg: "bg-[#f0f2fb]",
    text: "text-[#3f51b5]",
    dot: "bg-[#3f51b5]",
  },
  "Contract Sent": {
    label: "Contract Sent",
    border: "border-l-[#7b2cbf]",
    bg: "bg-[#f6f0fd]",
    text: "text-[#7b2cbf]",
    dot: "bg-[#7b2cbf]",
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

export function DealStageBadge({ stage, className }: DealStageBadgeProps) {
  const config = STAGE_CONFIG[stage] ?? STAGE_CONFIG.Negotiation;

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
