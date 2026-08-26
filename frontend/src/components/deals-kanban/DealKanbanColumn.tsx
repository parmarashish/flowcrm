"use client";

import { useDroppable } from "@dnd-kit/core";
import { Plus } from "lucide-react";
import type { Deal, DealStage } from "@/features/deals/dealsApi";
import { DealKanbanCard } from "./DealKanbanCard";
import { cn } from "@/lib/utils";

interface DealKanbanColumnProps {
  stage: DealStage;
  deals: Deal[];
  onAddDeal: (stage: DealStage) => void;
}

const STAGE_HEADER_COLORS: Record<DealStage, string> = {
  Negotiation: "border-t-[#0066cc]",
  Proposal: "border-t-[#3f51b5]",
  "Contract Sent": "border-t-[#7b2cbf]",
  Won: "border-t-[#1d8102]",
  Lost: "border-t-[#d13212]",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function DealKanbanColumn({ stage, deals, onAddDeal }: DealKanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const stageValue = deals.reduce((sum, d) => sum + d.value, 0);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-[280px] shrink-0 flex-col rounded-[2px] border border-[#d5d9d9] border-t-[3px] bg-[#f1f3f4] transition-colors",
        STAGE_HEADER_COLORS[stage] || "border-t-[#0066cc]",
        isOver && "bg-[#eaf3fc] border-[#0066cc]"
      )}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between border-b border-[#d5d9d9] bg-white px-3 py-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#0f1923]">
            {stage}
          </span>
          <span className="flex size-4 items-center justify-center rounded-[2px] bg-[#eaeded] text-[10px] font-bold text-[#545b64]">
            {deals.length}
          </span>
        </div>
        <button
          onClick={() => onAddDeal(stage)}
          className="text-[#879596] hover:text-[#0066cc] p-0.5 rounded-[2px] transition-colors cursor-pointer"
          title={`Add deal to ${stage}`}
        >
          <Plus className="size-3.5" />
        </button>
      </div>

      {/* Stage Value Subheader */}
      {deals.length > 0 && (
        <div className="border-b border-[#d5d9d9] bg-white px-3 py-1 text-[10px] text-[#879596]">
          {formatCurrency(stageValue)} total
        </div>
      )}

      {/* Cards List */}
      <div className="flex flex-1 flex-col gap-2 p-2 min-h-[360px] overflow-y-auto max-h-[calc(100vh-240px)]">
        {deals.map((deal) => (
          <DealKanbanCard key={deal.id} deal={deal} />
        ))}

        {deals.length === 0 && (
          <div className="flex flex-1 items-center justify-center rounded-[2px] border border-dashed border-[#d5d9d9] p-4 text-center text-[11px] text-[#879596]">
            No deals in {stage}
          </div>
        )}

        {/* Add Card Quick Action at Bottom */}
        <button
          onClick={() => onAddDeal(stage)}
          className="mt-auto flex items-center justify-center gap-1 rounded-[2px] border border-dashed border-[#aab7b8] bg-white/60 py-1.5 text-xs text-[#545b64] hover:border-[#0066cc] hover:bg-white hover:text-[#0066cc] transition-colors cursor-pointer"
        >
          <Plus className="size-3" />
          <span>Add deal</span>
        </button>
      </div>
    </div>
  );
}
