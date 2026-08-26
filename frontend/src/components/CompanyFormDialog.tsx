"use client";

import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  useCreateCompanyMutation,
  useUpdateCompanyMutation,
  type Company,
} from "@/features/companies/companiesApi";

interface CompanyFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company?: Company;
}

export function CompanyFormDialog({ open, onOpenChange, company }: CompanyFormDialogProps) {
  const isEdit = Boolean(company);
  const [name, setName] = useState(company?.name ?? "");
  const [industry, setIndustry] = useState(company?.industry ?? "");
  const [website, setWebsite] = useState(company?.website ?? "");
  const [address, setAddress] = useState(company?.address ?? "");

  const [createCompany, { isLoading: isCreating }] = useCreateCompanyMutation();
  const [updateCompany, { isLoading: isUpdating }] = useUpdateCompanyMutation();
  const isSubmitting = isCreating || isUpdating;

  // Radix's onOpenChange only fires for its own internally-initiated close/open
  // events (Escape, overlay click) — not when the parent flips `open` externally,
  // which is how "Add Company"/"Edit Company" actually open this dialog. Sync the
  // form fields via effect instead, keyed on `open` and the target company's id.
  useEffect(() => {
    if (open) {
      setName(company?.name ?? "");
      setIndustry(company?.industry ?? "");
      setWebsite(company?.website ?? "");
      setAddress(company?.address ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, company?.id]);

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const body = {
      name,
      industry: industry || undefined,
      website: website || undefined,
      address: address || undefined,
    };
    try {
      if (isEdit && company) {
        await updateCompany({ id: company.id, body }).unwrap();
        toast.success("Company updated");
      } else {
        await createCompany(body).unwrap();
        toast.success("Company created");
      }
      onOpenChange(false);
    } catch {
      toast.error(isEdit ? "Failed to update company" : "Failed to create company");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit Company" : "Add Company"}</DialogTitle>
            <DialogDescription>
              {isEdit ? "Update company details." : "Add a new company to your directory."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 p-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="company-name" className="text-xs font-semibold text-[#545b64]">
                Company Name <span className="text-[#d13212]">*</span>
              </Label>
              <Input
                id="company-name"
                required
                placeholder="e.g. Acme Corp"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="company-industry" className="text-xs font-semibold text-[#545b64]">
                Industry
              </Label>
              <Input
                id="company-industry"
                placeholder="e.g. Software"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="company-website" className="text-xs font-semibold text-[#545b64]">
                Website
              </Label>
              <Input
                id="company-website"
                placeholder="https://example.com"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="company-address" className="text-xs font-semibold text-[#545b64]">
                Address
              </Label>
              <textarea
                id="company-address"
                rows={2}
                placeholder="Street, city, country"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full rounded-[2px] border border-[#aab7b8] bg-white p-2 text-xs text-[#0f1923] placeholder:text-[#879596] outline-none transition-colors focus-visible:border-[#0066cc] focus-visible:ring-1 focus-visible:ring-[#0066cc]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : isEdit ? "Save Changes" : "Add Company"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
