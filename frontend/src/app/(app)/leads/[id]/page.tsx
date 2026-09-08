"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Trash2,
  UserCheck,
  ShieldAlert,
  Info,
  Calendar,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { LeadForm, type LeadFormValues } from "@/components/LeadForm";
import { StatusBadge } from "@/components/StatusBadge";
import {
  useGetLeadQuery,
  useUpdateLeadMutation,
  useReassignLeadMutation,
  useDeleteLeadMutation,
} from "@/features/leads/leadsApi";
import { useAppSelector } from "@/store/hooks";
import { selectCurrentUser } from "@/features/auth/authSlice";

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const currentUser = useAppSelector(selectCurrentUser);
  const { data, isLoading, isError } = useGetLeadQuery(id);
  const [updateLead, { isLoading: isUpdating }] = useUpdateLeadMutation();
  const [reassignLead, { isLoading: isReassigning }] = useReassignLeadMutation();
  const [deleteLead, { isLoading: isDeleting }] = useDeleteLeadMutation();
  const [reassignTo, setReassignTo] = useState("");
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const canReassign = currentUser?.role === "admin" || currentUser?.role === "team_leader";
  const canDelete = currentUser?.role === "admin";

  async function handleSubmit(values: LeadFormValues) {
    try {
      await updateLead({ id, body: values }).unwrap();
      toast.success("Lead details updated");
    } catch {
      toast.error("Failed to update lead");
    }
  }

  async function handleReassign() {
    if (!reassignTo.trim()) return;
    try {
      await reassignLead({ id, assignedTo: reassignTo.trim() }).unwrap();
      toast.success("Lead successfully reassigned");
      setReassignTo("");
    } catch {
      toast.error("Failed to reassign lead — ensure valid user ID within team");
    }
  }

  async function handleDelete() {
    try {
      await deleteLead(id).unwrap();
      toast.success("Lead deleted");
      router.push("/leads");
    } catch {
      toast.error("Failed to delete lead");
    } finally {
      setConfirmDeleteOpen(false);
    }
  }

  const formatTimestamp = (dateStr?: string) => {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !data?.lead) {
    return (
      <div className="mx-auto max-w-2xl rounded-[2px] border border-[#d13212] bg-[#fdf3f2] p-4 text-xs text-[#d13212]">
        <p className="font-semibold">Lead Not Found</p>
        <p className="mt-1">The requested lead could not be loaded or may have been deleted.</p>
        <Link href="/leads" className="mt-3 inline-block font-medium text-[#0066cc] underline">
          Return to Leads
        </Link>
      </div>
    );
  }

  const lead = data.lead;

  return (
    <div className="mx-auto max-w-3xl flex flex-col gap-4">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#d5d9d9] pb-3">
        <div className="flex items-center gap-2">
          <Link href="/leads">
            <Button variant="outline" size="sm" className="h-7 px-2">
              <ArrowLeft className="size-3.5 mr-1" /> Leads
            </Button>
          </Link>
          <div className="border-l border-[#d5d9d9] pl-2">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold text-[#0f1923]">{lead.name}</h1>
              <StatusBadge status={lead.status} />
            </div>
            <p className="text-[11px] text-[#545b64] font-mono">Lead ID: {lead.id}</p>
          </div>
        </div>

        {canDelete && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setConfirmDeleteOpen(true)}
            disabled={isDeleting}
            className="gap-1.5"
          >
            <Trash2 className="size-3.5" />
            Delete Lead
          </Button>
        )}
      </div>

      {/* Metadata Overview Panel */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-[2px] border border-[#d5d9d9] bg-white p-3 text-xs">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#879596] block">
            Acquisition Source
          </span>
          <span className="font-medium text-[#0f1923] mt-0.5 block">{lead.source}</span>
        </div>
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#879596] block">
            Assigned User ID
          </span>
          <span className="font-mono text-[11px] text-[#0f1923] mt-0.5 block truncate">
            {lead.assignedTo || "Unassigned"}
          </span>
        </div>
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#879596] block">
            Created Date
          </span>
          <span className="text-[#0f1923] mt-0.5 block text-[11px]">
            {formatTimestamp(lead.createdAt)}
          </span>
        </div>
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#879596] block">
            Last Updated
          </span>
          <span className="text-[#0f1923] mt-0.5 block text-[11px]">
            {formatTimestamp(lead.updatedAt)}
          </span>
        </div>
      </div>

      {/* Main Edit Form Panel */}
      <div className="rounded-[2px] border border-[#d5d9d9] bg-white">
        <div className="border-b border-[#d5d9d9] px-4 py-2.5 bg-[#f8f9fa]">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#0f1923]">
            Edit Lead Properties
          </h2>
        </div>
        <div className="p-4">
          <LeadForm
            key={lead.id}
            initialValues={lead}
            onSubmit={handleSubmit}
            submitLabel="Save Changes"
            isSubmitting={isUpdating}
            cancelHref="/leads"
          />
        </div>
      </div>

      {/* Reassignment Panel (Admin / Team Leader) */}
      {canReassign && (
        <div className="rounded-[2px] border border-[#d5d9d9] bg-white">
          <div className="border-b border-[#d5d9d9] px-4 py-2.5 bg-[#f8f9fa] flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#0f1923]">
              Reassign Lead Ownership
            </h2>
            <span className="text-[11px] text-[#879596]">Privileged Action</span>
          </div>
          <div className="p-4 flex flex-col gap-2">
            <label className="text-xs font-semibold text-[#545b64]">
              Target Agent / User ID
            </label>
            <div className="flex gap-2 max-w-md">
              <Input
                value={reassignTo}
                onChange={(e) => setReassignTo(e.target.value)}
                placeholder="Enter User UUID / MongoDB ID"
                className="h-8 text-xs"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={handleReassign}
                disabled={isReassigning || !reassignTo.trim()}
              >
                <UserCheck className="size-3.5 mr-1.5" />
                {isReassigning ? "Reassigning..." : "Reassign"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title="Delete Lead"
        description="Are you sure you want to delete this lead? This action is irreversible."
        onConfirm={handleDelete}
      />
    </div>
  );
}
