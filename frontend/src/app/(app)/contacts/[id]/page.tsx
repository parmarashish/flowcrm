"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Building2, Edit2, Mail, Phone, Briefcase, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/StatusBadge";
import { ContactFormDialog } from "@/components/ContactFormDialog";
import { useGetContactQuery } from "@/features/contacts/contactsApi";
import { useAppSelector } from "@/store/hooks";
import { selectCurrentUser } from "@/features/auth/authSlice";
import type { LeadStatus } from "@/features/leads/leadsApi";

const ACTIVITY_LABEL: Record<string, string> = {
  created: "Created",
  status_changed: "Status changed",
  assigned: "Reassigned",
  updated: "Updated",
  deleted: "Deleted",
};

export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const currentUser = useAppSelector(selectCurrentUser);
  const { data, isLoading, isError } = useGetContactQuery(id);
  const [editOpen, setEditOpen] = useState(false);

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

  if (isError || !data?.contact) {
    return (
      <div className="mx-auto max-w-2xl rounded-[2px] border border-[#d13212] bg-[#fdf3f2] p-4 text-xs text-[#d13212]">
        <p className="font-semibold">Contact Not Found</p>
        <p className="mt-1">The requested contact could not be loaded or may have been deleted.</p>
        <Link href="/contacts" className="mt-3 inline-block font-medium text-[#0066cc] underline">
          Return to Contacts
        </Link>
      </div>
    );
  }

  const { contact, linkedLeads, activity } = data;

  return (
    <div className="mx-auto max-w-3xl flex flex-col gap-4">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#d5d9d9] pb-3">
        <div className="flex items-center gap-2">
          <Link href="/contacts">
            <Button variant="outline" size="sm" className="h-7 px-2">
              <ArrowLeft className="size-3.5 mr-1" /> Contacts
            </Button>
          </Link>
          <div className="border-l border-[#d5d9d9] pl-2">
            <h1 className="text-base font-semibold text-[#0f1923]">{contact.name}</h1>
            <p className="text-[11px] text-[#545b64] font-mono">Contact ID: {contact.id}</p>
          </div>
        </div>

        <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)} className="gap-1.5">
          <Edit2 className="size-3.5" />
          Edit Contact
        </Button>
      </div>

      {/* Info Panel */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-[2px] border border-[#d5d9d9] bg-white p-3 text-xs">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#879596] block">
            <Mail className="size-3 inline mr-1 -mt-0.5" />
            Email
          </span>
          <span className="font-medium text-[#0f1923] mt-0.5 block truncate">{contact.email}</span>
        </div>
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#879596] block">
            <Phone className="size-3 inline mr-1 -mt-0.5" />
            Phone
          </span>
          <span className="font-medium text-[#0f1923] mt-0.5 block">{contact.phone || "—"}</span>
        </div>
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#879596] block">
            <Building2 className="size-3 inline mr-1 -mt-0.5" />
            Company
          </span>
          {contact.company?.name ? (
            <Link
              href={`/companies/${contact.company.id}`}
              className="font-medium text-[#0066cc] hover:underline mt-0.5 block truncate"
            >
              {contact.company.name}
            </Link>
          ) : (
            <span className="font-medium text-[#0f1923] mt-0.5 block">—</span>
          )}
        </div>
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#879596] block">
            <Briefcase className="size-3 inline mr-1 -mt-0.5" />
            Designation
          </span>
          <span className="font-medium text-[#0f1923] mt-0.5 block">{contact.designation || "—"}</span>
        </div>
      </div>

      {/* Linked Leads Panel */}
      <div className="rounded-[2px] border border-[#d5d9d9] bg-white">
        <div className="border-b border-[#d5d9d9] px-4 py-2.5 bg-[#f8f9fa] flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#0f1923]">
            Linked Leads
          </h2>
          <span className="text-[11px] text-[#879596]">{linkedLeads.length} linked</span>
        </div>
        <div className="divide-y divide-[#d5d9d9]">
          {linkedLeads.length === 0 && (
            <p className="p-4 text-xs text-[#879596]">No leads linked to this contact yet.</p>
          )}
          {linkedLeads.map((lead) => (
            <Link
              key={lead.id}
              href={`/leads/${lead.id}`}
              className="flex items-center justify-between px-4 py-2.5 hover:bg-[#f8f9fa] transition-colors"
            >
              <div className="flex flex-col">
                <span className="text-xs font-medium text-[#0066cc]">{lead.name}</span>
                <span className="text-[11px] text-[#879596]">{lead.source}</span>
              </div>
              <StatusBadge status={lead.status as LeadStatus} />
            </Link>
          ))}
        </div>
      </div>

      {/* Activity Timeline Panel */}
      <div className="rounded-[2px] border border-[#d5d9d9] bg-white">
        <div className="border-b border-[#d5d9d9] px-4 py-2.5 bg-[#f8f9fa]">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#0f1923]">
            Activity Timeline
          </h2>
        </div>
        <div className="divide-y divide-[#d5d9d9]">
          {activity.length === 0 && (
            <p className="p-4 text-xs text-[#879596]">
              No recorded activity on this contact&apos;s linked leads yet.
            </p>
          )}
          {activity.map((entry) => (
            <div key={entry.id} className="flex items-start gap-2.5 px-4 py-2.5">
              <Clock className="size-3.5 text-[#879596] mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[#0f1923]">
                  <span className="font-semibold">{ACTIVITY_LABEL[entry.type] ?? entry.type}</span>
                  {" — "}
                  {entry.message}
                </p>
                <p className="text-[11px] text-[#879596] mt-0.5">
                  {entry.user} · {formatTimestamp(entry.createdAt)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {currentUser && (
        <ContactFormDialog open={editOpen} onOpenChange={setEditOpen} contact={contact} />
      )}
    </div>
  );
}
