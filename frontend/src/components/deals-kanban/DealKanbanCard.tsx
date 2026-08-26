"use client";

import Link from "next/link";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Building2, ExternalLink, Calendar, User as UserIcon } from "lucide-react";
import type { Deal, DealStage } from "@/features/deals/dealsApi";
import { cn } from "@/lib/utils";

const STAGE_LEFT_BORDER: Record<DealStage, string> = {
  Negotiation: "border-l-[#0066cc]",
  Proposal: "border-l-[#3f51b5]",
  "Contract Sent": "border-l-[#7b2cbf]",
  Won: "border-l-[#1d8102]",
  Lost: "border-l-[#d13212]",
};

function formatCurrency(value: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${currency} ${value.toLocaleString()}`;
  }
}

function formatDate(dateStr?: string) {
  if (!dateStr) return null;
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export function DealKanbanCard({ deal }: { deal: Deal }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: deal.id,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : "auto",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative flex flex-col gap-1.5 rounded-[2px] border border-[#d5d9d9] border-l-[4px] bg-white p-2.5 text-xs text-[#0f1923] shadow-none transition-all",
        STAGE_LEFT_BORDER[deal.stage] || "border-l-[#0066cc]",
        isDragging ? "ring-2 ring-[#0066cc] shadow-md" : "hover:border-[#aab7b8]"
      )}
    >
      {/* Header Row: Drag Handle + Title + Link */}
      <div className="flex items-start justify-between gap-1">
        <div className="flex items-center gap-1 min-w-0 flex-1">
          <div
            {...listeners}
            {...attributes}
            className="cursor-grab active:cursor-grabbing p-0.5 text-[#879596] hover:text-[#0f1923] -ml-1 rounded-[1px]"
            title="Drag card"
          >
            <GripVertical className="size-3.5" />
          </div>
          <Link
            href={`/deals/${deal.id}`}
            className="font-semibold text-[13px] text-[#0f1923] hover:text-[#0066cc] hover:underline truncate"
          >
            {deal.title}
          </Link>
        </div>
        <Link
          href={`/deals/${deal.id}`}
          className="text-[#879596] hover:text-[#0066cc] p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
          title="Open deal details"
        >
          <ExternalLink className="size-3" />
        </Link>
      </div>

      {/* Contact */}
      {deal.contact?.name && (
        <div className="flex items-center gap-1 truncate pl-3.5 text-[11px] text-[#545b64]">
          <Building2 className="size-3 text-[#879596] shrink-0" />
          <span className="truncate">{deal.contact.name}</span>
        </div>
      )}

      {/* Value */}
      <div className="pl-3.5 text-[15px] font-bold text-[#0f1923]">
        {formatCurrency(deal.value, deal.currency)}
      </div>

      {/* Footer: Closing date + Assigned agent */}
      <div className="mt-1 flex items-center justify-between border-t border-[#f1f3f4] pt-1.5 pl-3.5 text-[10px] text-[#879596]">
        <div className="flex items-center gap-1">
          <Calendar className="size-3" />
          <span>{formatDate(deal.closingDate) ?? "No close date"}</span>
        </div>
        <div className="flex items-center gap-1 truncate max-w-[90px]">
          <UserIcon className="size-3 shrink-0" />
          <span className="truncate">{deal.assignedTo?.name ?? "Unassigned"}</span>
        </div>
      </div>
    </div>
  );
}
