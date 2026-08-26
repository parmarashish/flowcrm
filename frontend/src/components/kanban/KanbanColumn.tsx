"use client";

import Link from "next/link";
import { useDroppable } from "@dnd-kit/core";
import { Plus } from "lucide-react";
import type { Lead, LeadStatus } from "@/features/leads/leadsApi";
import { KanbanCard } from "./KanbanCard";
import { cn } from "@/lib/utils";

interface KanbanColumnProps {
  status: LeadStatus;
  leads: Lead[];
}

const STATUS_HEADER_COLORS: Record<LeadStatus, string> = {
  New: "border-t-[#0066cc]",
  Contacted: "border-t-[#e07b00]",
  Qualified: "border-t-[#7b2cbf]",
  Proposal: "border-t-[#3f51b5]",
  Won: "border-t-[#1d8102]",
  Lost: "border-t-[#d13212]",
};

export function KanbanColumn({ status, leads }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-[280px] shrink-0 flex-col rounded-[2px] border border-[#d5d9d9] border-t-[3px] bg-[#f1f3f4] transition-colors",
        STATUS_HEADER_COLORS[status] || "border-t-[#0066cc]",
        isOver && "bg-[#eaf3fc] border-[#0066cc]"
      )}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between border-b border-[#d5d9d9] bg-white px-3 py-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#0f1923]">
            {status}
          </span>
          <span className="flex size-4 items-center justify-center rounded-[2px] bg-[#eaeded] text-[10px] font-bold text-[#545b64]">
            {leads.length}
          </span>
        </div>
        <Link
          href={`/leads/new`}
          className="text-[#879596] hover:text-[#0066cc] p-0.5 rounded-[2px] transition-colors"
          title={`Add lead to ${status}`}
        >
          <Plus className="size-3.5" />
        </Link>
      </div>

      {/* Cards List */}
      <div className="flex flex-1 flex-col gap-2 p-2 min-h-[360px] overflow-y-auto max-h-[calc(100vh-210px)]">
        {leads.map((lead) => (
          <KanbanCard key={lead.id} lead={lead} />
        ))}

        {leads.length === 0 && (
          <div className="flex flex-1 items-center justify-center rounded-[2px] border border-dashed border-[#d5d9d9] p-4 text-center text-[11px] text-[#879596]">
            No leads in {status}
          </div>
        )}

        {/* Add Card Quick Action at Bottom */}
        <Link
          href="/leads/new"
          className="mt-auto flex items-center justify-center gap-1 rounded-[2px] border border-dashed border-[#aab7b8] bg-white/60 py-1.5 text-xs text-[#545b64] hover:border-[#0066cc] hover:bg-white hover:text-[#0066cc] transition-colors"
        >
          <Plus className="size-3" />
          <span>Add lead</span>
        </Link>
      </div>
    </div>
  );
}
