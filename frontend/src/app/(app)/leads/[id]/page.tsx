"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LeadForm, type LeadFormValues } from "@/components/LeadForm";
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
  const { data, isLoading } = useGetLeadQuery(id);
  const [updateLead, { isLoading: isUpdating }] = useUpdateLeadMutation();
  const [reassignLead] = useReassignLeadMutation();
  const [deleteLead] = useDeleteLeadMutation();
  const [reassignTo, setReassignTo] = useState("");

  const canReassign = currentUser?.role === "admin" || currentUser?.role === "team_leader";
  const canDelete = currentUser?.role === "admin";

  async function handleSubmit(values: LeadFormValues) {
    try {
      await updateLead({ id, body: values }).unwrap();
      toast.success("Lead updated");
    } catch {
      toast.error("Failed to update lead");
    }
  }

  async function handleReassign() {
    if (!reassignTo.trim()) return;
    try {
      await reassignLead({ id, assignedTo: reassignTo.trim() }).unwrap();
      toast.success("Lead reassigned");
      setReassignTo("");
    } catch {
      toast.error("Failed to reassign lead — check the user id is valid and within your team");
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this lead? This cannot be undone.")) return;
    try {
      await deleteLead(id).unwrap();
      toast.success("Lead deleted");
      router.push("/leads");
    } catch {
      toast.error("Failed to delete lead");
    }
  }

  if (isLoading) return <p>Loading...</p>;
  if (!data) return <p>Lead not found.</p>;

  return (
    <div className="max-w-lg">
      <h1 className="mb-4 text-2xl font-bold">Edit Lead</h1>
      <LeadForm
        initialValues={data.lead}
        onSubmit={handleSubmit}
        submitLabel="Save Changes"
        isSubmitting={isUpdating}
      />

      {canReassign && (
        <div className="mt-6 flex flex-col gap-2 border-t pt-4">
          <label className="text-sm font-medium">Reassign to (user id)</label>
          <div className="flex gap-2">
            <Input
              value={reassignTo}
              onChange={(e) => setReassignTo(e.target.value)}
              placeholder="Target user id"
            />
            <Button onClick={handleReassign}>Reassign</Button>
          </div>
        </div>
      )}

      {canDelete && (
        <div className="mt-6 border-t pt-4">
          <Button variant="destructive" onClick={handleDelete}>
            Delete Lead
          </Button>
        </div>
      )}
    </div>
  );
}
