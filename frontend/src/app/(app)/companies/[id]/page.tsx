"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Edit2, Globe, MapPin, Factory, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CompanyFormDialog } from "@/components/CompanyFormDialog";
import { useGetCompanyQuery } from "@/features/companies/companiesApi";

export default function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError } = useGetCompanyQuery(id);
  const [editOpen, setEditOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !data?.company) {
    return (
      <div className="mx-auto max-w-2xl rounded-[2px] border border-[#d13212] bg-[#fdf3f2] p-4 text-xs text-[#d13212]">
        <p className="font-semibold">Company Not Found</p>
        <p className="mt-1">The requested company could not be loaded or may have been deleted.</p>
        <Link href="/companies" className="mt-3 inline-block font-medium text-[#0066cc] underline">
          Return to Companies
        </Link>
      </div>
    );
  }

  const { company, contacts } = data;

  return (
    <div className="mx-auto max-w-3xl flex flex-col gap-4">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#d5d9d9] pb-3">
        <div className="flex items-center gap-2">
          <Link href="/companies">
            <Button variant="outline" size="sm" className="h-7 px-2">
              <ArrowLeft className="size-3.5 mr-1" /> Companies
            </Button>
          </Link>
          <div className="border-l border-[#d5d9d9] pl-2">
            <h1 className="text-base font-semibold text-[#0f1923]">{company.name}</h1>
            <p className="text-[11px] text-[#545b64] font-mono">Company ID: {company.id}</p>
          </div>
        </div>

        <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)} className="gap-1.5">
          <Edit2 className="size-3.5" />
          Edit Company
        </Button>
      </div>

      {/* Info Panel */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 rounded-[2px] border border-[#d5d9d9] bg-white p-3 text-xs">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#879596] block">
            <Factory className="size-3 inline mr-1 -mt-0.5" />
            Industry
          </span>
          <span className="font-medium text-[#0f1923] mt-0.5 block">{company.industry || "—"}</span>
        </div>
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#879596] block">
            <Globe className="size-3 inline mr-1 -mt-0.5" />
            Website
          </span>
          {company.website ? (
            <a
              href={company.website}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-[#0066cc] hover:underline mt-0.5 block truncate"
            >
              {company.website.replace(/^https?:\/\//, "")}
            </a>
          ) : (
            <span className="font-medium text-[#0f1923] mt-0.5 block">—</span>
          )}
        </div>
        <div className="sm:col-span-1 col-span-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#879596] block">
            <MapPin className="size-3 inline mr-1 -mt-0.5" />
            Address
          </span>
          <span className="font-medium text-[#0f1923] mt-0.5 block">{company.address || "—"}</span>
        </div>
      </div>

      {/* Contacts Panel */}
      <div className="rounded-[2px] border border-[#d5d9d9] bg-white">
        <div className="border-b border-[#d5d9d9] px-4 py-2.5 bg-[#f8f9fa] flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#0f1923]">Contacts</h2>
          <span className="text-[11px] text-[#879596]">{contacts.length} at this company</span>
        </div>
        <div className="divide-y divide-[#d5d9d9]">
          {contacts.length === 0 && (
            <p className="p-4 text-xs text-[#879596]">No contacts linked to this company yet.</p>
          )}
          {contacts.map((contact) => (
            <Link
              key={contact.id}
              href={`/contacts/${contact.id}`}
              className="flex items-center justify-between px-4 py-2.5 hover:bg-[#f8f9fa] transition-colors"
            >
              <div className="flex flex-col">
                <span className="text-xs font-medium text-[#0066cc]">{contact.name}</span>
                <span className="text-[11px] text-[#879596]">{contact.designation || "—"}</span>
              </div>
              <div className="flex flex-col items-end text-[11px] text-[#545b64]">
                <span className="inline-flex items-center gap-1">
                  <Mail className="size-3 text-[#879596]" />
                  {contact.email}
                </span>
                <span className="inline-flex items-center gap-1 mt-0.5">
                  <Phone className="size-3 text-[#879596]" />
                  {contact.phone}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <CompanyFormDialog open={editOpen} onOpenChange={setEditOpen} company={company} />
    </div>
  );
}
