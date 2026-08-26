"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { LeadSource, LeadStatus } from "@/features/leads/leadsApi";

const SOURCES: LeadSource[] = ["Website", "Referral", "Cold Call", "Social Media", "Other"];
const STATUSES: LeadStatus[] = ["New", "Contacted", "Qualified", "Proposal", "Won", "Lost"];

export interface LeadFormValues {
  name: string;
  email: string;
  phone: string;
  source: LeadSource;
  status: LeadStatus;
  notes: string;
}

interface LeadFormProps {
  initialValues?: Partial<LeadFormValues>;
  onSubmit: (values: LeadFormValues) => void | Promise<void>;
  submitLabel: string;
  isSubmitting?: boolean;
  cancelHref?: string;
  onCancel?: () => void;
}

export function LeadForm({
  initialValues,
  onSubmit,
  submitLabel,
  isSubmitting,
  cancelHref = "/leads",
  onCancel,
}: LeadFormProps) {
  const [values, setValues] = useState<LeadFormValues>({
    name: initialValues?.name ?? "",
    email: initialValues?.email ?? "",
    phone: initialValues?.phone ?? "",
    source: initialValues?.source ?? "Website",
    status: initialValues?.status ?? "New",
    notes: initialValues?.notes ?? "",
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit(values);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* 2-Column Grid for Primary Fields */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* Name */}
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="name" className="text-xs font-semibold text-[#545b64]">
            Full Name <span className="text-[#d13212]">*</span>
          </Label>
          <Input
            id="name"
            required
            placeholder="e.g. John Doe"
            value={values.name}
            onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
            className="h-8 text-xs"
          />
        </div>

        {/* Email */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email" className="text-xs font-semibold text-[#545b64]">
            Email Address <span className="text-[#d13212]">*</span>
          </Label>
          <Input
            id="email"
            type="email"
            required
            placeholder="name@company.com"
            value={values.email}
            onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
            className="h-8 text-xs"
          />
        </div>

        {/* Phone */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="phone" className="text-xs font-semibold text-[#545b64]">
            Phone Number <span className="text-[#d13212]">*</span>
          </Label>
          <Input
            id="phone"
            required
            placeholder="+1 (555) 000-0000"
            value={values.phone}
            onChange={(e) => setValues((v) => ({ ...v, phone: e.target.value }))}
            className="h-8 text-xs"
          />
        </div>

        {/* Source */}
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-semibold text-[#545b64]">
            Acquisition Source <span className="text-[#d13212]">*</span>
          </Label>
          <Select
            value={values.source}
            onValueChange={(v) => setValues((val) => ({ ...val, source: v as LeadSource }))}
          >
            <SelectTrigger className="h-8 w-full text-xs">
              <SelectValue placeholder="Select Source" />
            </SelectTrigger>
            <SelectContent>
              {SOURCES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Status */}
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-semibold text-[#545b64]">
            Pipeline Status <span className="text-[#d13212]">*</span>
          </Label>
          <Select
            value={values.status}
            onValueChange={(v) => setValues((val) => ({ ...val, status: v as LeadStatus }))}
          >
            <SelectTrigger className="h-8 w-full text-xs">
              <SelectValue placeholder="Select Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Notes (Full width textarea/input) */}
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="notes" className="text-xs font-semibold text-[#545b64]">
            Notes & Context
          </Label>
          <textarea
            id="notes"
            rows={3}
            placeholder="Add relevant notes, conversation highlights, next steps..."
            value={values.notes}
            onChange={(e) => setValues((v) => ({ ...v, notes: e.target.value }))}
            className="w-full rounded-[2px] border border-[#aab7b8] bg-white p-2 text-xs text-[#0f1923] placeholder:text-[#879596] outline-none transition-colors focus-visible:border-[#0066cc] focus-visible:ring-1 focus-visible:ring-[#0066cc]"
          />
        </div>
      </div>

      {/* Form Action Buttons (Cancel + Submit) */}
      <div className="flex items-center justify-end gap-2 border-t border-[#d5d9d9] pt-3">
        {onCancel ? (
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        ) : (
          <Link href={cancelHref}>
            <Button type="button" variant="outline" size="sm">
              Cancel
            </Button>
          </Link>
        )}
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {isSubmitting ? "Saving changes..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
