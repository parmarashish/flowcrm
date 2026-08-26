"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LeadForm, type LeadFormValues } from "@/components/LeadForm";
import { useCreateLeadMutation } from "@/features/leads/leadsApi";

export default function NewLeadPage() {
  const [createLead, { isLoading }] = useCreateLeadMutation();
  const router = useRouter();

  async function handleSubmit(values: LeadFormValues) {
    try {
      await createLead(values).unwrap();
      toast.success("Lead created successfully");
      router.push("/leads");
    } catch {
      toast.error("Failed to create lead");
    }
  }

  return (
    <div className="mx-auto max-w-2xl flex flex-col gap-4">
      {/* Top Header / Back Link */}
      <div className="flex items-center gap-2 border-b border-[#d5d9d9] pb-3">
        <Link href="/leads">
          <Button variant="outline" size="sm" className="h-7 px-2">
            <ArrowLeft className="size-3.5 mr-1" /> Leads
          </Button>
        </Link>
        <div className="border-l border-[#d5d9d9] pl-2">
          <h1 className="text-base font-semibold text-[#0f1923]">Create Lead</h1>
          <p className="text-xs text-[#545b64]">Register a new prospect into the CRM pipeline.</p>
        </div>
      </div>

      {/* AWS Form Panel */}
      <div className="rounded-[2px] border border-[#d5d9d9] bg-white">
        <div className="flex items-center gap-2 border-b border-[#d5d9d9] px-4 py-3 bg-[#f8f9fa]">
          <UserPlus className="size-4 text-[#0066cc]" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#0f1923]">
            Lead Details & Configuration
          </h2>
        </div>

        <div className="p-4">
          <LeadForm
            onSubmit={handleSubmit}
            submitLabel="Create Lead"
            isSubmitting={isLoading}
            cancelHref="/leads"
          />
        </div>
      </div>
    </div>
  );
}
