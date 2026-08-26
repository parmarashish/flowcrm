"use client";

import Link from "next/link";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Mail, Phone, ExternalLink } from "lucide-react";
import type { Lead, LeadStatus } from "@/features/leads/leadsApi";
import { cn } from "@/lib/utils";

const STATUS_LEFT_BORDER: Record<LeadStatus, string> = {
  New: "border-l-[#0066cc]",
  Contacted: "border-l-[#e07b00]",
  Qualified: "border-l-[#7b2cbf]",
  Proposal: "border-l-[#3f51b5]",
  Won: "border-l-[#1d8102]",
  Lost: "border-l-[#d13212]",
};

export function KanbanCard({ lead }: { lead: Lead }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
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
        STATUS_LEFT_BORDER[lead.status] || "border-l-[#0066cc]",
        isDragging ? "ring-2 ring-[#0066cc] shadow-md" : "hover:border-[#aab7b8]"
      )}
    >
      {/* Header Row: Drag Handle + Lead Name + Link */}
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
            href={`/leads/${lead.id}`}
            className="font-semibold text-[13px] text-[#0f1923] hover:text-[#0066cc] hover:underline truncate"
          >
            {lead.name}
          </Link>
        </div>
        <Link
          href={`/leads/${lead.id}`}
          className="text-[#879596] hover:text-[#0066cc] p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
          title="Open lead details"
        >
          <ExternalLink className="size-3" />
        </Link>
      </div>

      {/* Details (Email / Phone) */}
      <div className="flex flex-col gap-0.5 text-[11px] text-[#545b64] pl-3.5">
        {lead.email && (
          <div className="flex items-center gap-1 truncate">
            <Mail className="size-3 text-[#879596] shrink-0" />
            <span className="truncate">{lead.email}</span>
          </div>
        )}
        {lead.phone && (
          <div className="flex items-center gap-1 truncate">
            <Phone className="size-3 text-[#879596] shrink-0" />
            <span className="truncate">{lead.phone}</span>
          </div>
        )}
      </div>

      {/* Footer: Source badge + Notes indicator */}
      <div className="mt-1 flex items-center justify-between border-t border-[#f1f3f4] pt-1.5 pl-3.5 text-[10px]">
        <span className="rounded-[2px] bg-[#f1f3f4] px-1.5 py-0.5 font-medium text-[#545b64] border border-[#d5d9d9]">
          {lead.source}
        </span>
        {lead.notes && (
          <span className="text-[#879596] italic truncate max-w-[110px]" title={lead.notes}>
            {lead.notes}
          </span>
        )}
      </div>
    </div>
  );
}
