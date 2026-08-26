"use client";

import { useState } from "react";
import Link from "next/link";
import { DndContext, type DragEndEvent } from "@dnd-kit/core";
import { toast } from "sonner";
import { Plus, RefreshCw, Layers, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useGetLeadsQuery,
  useUpdateLeadMutation,
  type LeadStatus,
} from "@/features/leads/leadsApi";
import { KanbanColumn } from "@/components/kanban/KanbanColumn";

const STATUSES: LeadStatus[] = ["New", "Contacted", "Qualified", "Proposal", "Won", "Lost"];

export default function KanbanPage() {
  const { data, isLoading, isError, refetch } = useGetLeadsQuery({ limit: 100 });
  const [updateLead] = useUpdateLeadMutation();

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const newStatus = over.id as LeadStatus;
    const leadId = active.id as string;
    const lead = data?.items.find((l) => l.id === leadId);
    if (!lead || lead.status === newStatus) return;

    try {
      await updateLead({ id: leadId, body: { status: newStatus } }).unwrap();
      toast.success(`Moved ${lead.name} to ${newStatus}`);
    } catch {
      toast.error("Failed to update lead status");
    }
  }

  const totalLeads = data?.items.length ?? 0;

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#d5d9d9] pb-3">
        <div className="flex items-center gap-2">
          <Link href="/leads">
            <Button variant="outline" size="sm" className="h-7 px-2">
              <ArrowLeft className="size-3.5 mr-1" /> Table View
            </Button>
          </Link>
          <div className="border-l border-[#d5d9d9] pl-2 flex items-center gap-1.5">
            <h1 className="text-base font-semibold text-[#0f1923]">Pipeline Board</h1>
            <span className="text-xs font-normal text-[#545b64]">({totalLeads} leads in pipeline)</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} title="Refresh board">
            <RefreshCw className="size-3.5 mr-1.5" /> Refresh
          </Button>
          <Link href="/leads/new">
            <Button size="sm">
              <Plus className="size-3.5 mr-1.5" />
              Add Lead
            </Button>
          </Link>
        </div>
      </div>

      {/* Board Content */}
      {isLoading ? (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="w-[280px] shrink-0 space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-[2px] border border-[#d13212] bg-[#fdf3f2] p-4 text-xs text-[#d13212]">
          Failed to load pipeline leads from server.
        </div>
      ) : (
        <DndContext onDragEnd={handleDragEnd}>
          <div className="flex gap-3 overflow-x-auto pb-4 items-start flex-1">
            {STATUSES.map((status) => (
              <KanbanColumn
                key={status}
                status={status}
                leads={data?.items.filter((l) => l.status === status) ?? []}
              />
            ))}
          </div>
        </DndContext>
      )}
    </div>
  );
}
