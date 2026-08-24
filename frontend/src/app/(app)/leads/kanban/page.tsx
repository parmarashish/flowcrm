"use client";

import { DndContext, type DragEndEvent } from "@dnd-kit/core";
import { toast } from "sonner";
import { useGetLeadsQuery, useUpdateLeadMutation, type LeadStatus } from "@/features/leads/leadsApi";
import { KanbanColumn } from "@/components/kanban/KanbanColumn";

const STATUSES: LeadStatus[] = ["New", "Contacted", "Qualified", "Proposal", "Won", "Lost"];

export default function KanbanPage() {
  const { data, isLoading, isError } = useGetLeadsQuery({ limit: 100 });
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
      toast.success(`Moved to ${newStatus}`);
    } catch {
      toast.error("Failed to update lead status");
    }
  }

  if (isError) return <p>Failed to load leads.</p>;
  if (isLoading) return <p>Loading...</p>;

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Kanban Board</h1>
      <DndContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STATUSES.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              leads={data?.items.filter((l) => l.status === status) ?? []}
            />
          ))}
        </div>
      </DndContext>
    </div>
  );
}
