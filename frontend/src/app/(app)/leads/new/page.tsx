"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LeadForm, type LeadFormValues } from "@/components/LeadForm";
import { useCreateLeadMutation } from "@/features/leads/leadsApi";

export default function NewLeadPage() {
  const [createLead, { isLoading }] = useCreateLeadMutation();
  const router = useRouter();

  async function handleSubmit(values: LeadFormValues) {
    try {
      await createLead(values).unwrap();
      toast.success("Lead created");
      router.push("/leads");
    } catch {
      toast.error("Failed to create lead");
    }
  }

  return (
    <div className="max-w-lg">
      <h1 className="mb-4 text-2xl font-bold">Add Lead</h1>
      <LeadForm onSubmit={handleSubmit} submitLabel="Create Lead" isSubmitting={isLoading} />
    </div>
  );
}
