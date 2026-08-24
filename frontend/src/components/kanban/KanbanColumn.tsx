"use client";

import { useDroppable } from "@dnd-kit/core";
import type { Lead, LeadStatus } from "@/features/leads/leadsApi";
import { KanbanCard } from "./KanbanCard";

export function KanbanColumn({ status, leads }: { status: LeadStatus; leads: Lead[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={`flex w-64 flex-shrink-0 flex-col gap-2 rounded border p-2 ${
        isOver ? "bg-muted" : ""
      }`}
    >
      <h3 className="mb-1 text-sm font-semibold">
        {status} ({leads.length})
      </h3>
      <div className="flex flex-col gap-2">
        {leads.map((lead) => (
          <KanbanCard key={lead.id} lead={lead} />
        ))}
      </div>
    </div>
  );
}
