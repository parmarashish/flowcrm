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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCreateContactMutation,
  useUpdateContactMutation,
  type Contact,
} from "@/features/contacts/contactsApi";
import { useGetCompaniesQuery } from "@/features/companies/companiesApi";
import { useGetLeadsQuery } from "@/features/leads/leadsApi";

interface ContactFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact?: Contact;
}

export function ContactFormDialog({ open, onOpenChange, contact }: ContactFormDialogProps) {
  const isEdit = Boolean(contact);
  const [name, setName] = useState(contact?.name ?? "");
  const [email, setEmail] = useState(contact?.email ?? "");
  const [phone, setPhone] = useState(contact?.phone ?? "");
  const [companyId, setCompanyId] = useState<string>(contact?.company?.id ?? "none");
  const [designation, setDesignation] = useState(contact?.designation ?? "");
  const [linkedLeads, setLinkedLeads] = useState<string[]>(contact?.linkedLeads ?? []);

  const { data: companiesData } = useGetCompaniesQuery({ limit: 100 });
  const { data: leadsData } = useGetLeadsQuery({ limit: 100 });

  const [createContact, { isLoading: isCreating }] = useCreateContactMutation();
  const [updateContact, { isLoading: isUpdating }] = useUpdateContactMutation();
  const isSubmitting = isCreating || isUpdating;

  // Radix's onOpenChange only fires for its own internally-initiated close/open
  // events (Escape, overlay click) — not when the parent flips `open` externally,
  // which is how "Add Contact"/"Edit Contact" actually open this dialog. Sync the
  // form fields via effect instead, keyed on `open` and the target contact's id.
  useEffect(() => {
    if (open) {
      setName(contact?.name ?? "");
      setEmail(contact?.email ?? "");
      setPhone(contact?.phone ?? "");
      setCompanyId(contact?.company?.id ?? "none");
      setDesignation(contact?.designation ?? "");
      setLinkedLeads(contact?.linkedLeads ?? []);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, contact?.id]);

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
  }

  function toggleLead(id: string) {
    setLinkedLeads((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const body = {
      name,
      email,
      phone,
      company: companyId === "none" ? null : companyId,
      designation: designation || undefined,
      linkedLeads,
    };
    try {
      if (isEdit && contact) {
        await updateContact({ id: contact.id, body }).unwrap();
        toast.success("Contact updated");
      } else {
        await createContact(body).unwrap();
        toast.success("Contact created");
      }
      onOpenChange(false);
    } catch {
      toast.error(isEdit ? "Failed to update contact" : "Failed to create contact");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit Contact" : "Add Contact"}</DialogTitle>
            <DialogDescription>
              {isEdit ? "Update contact details." : "Add a new contact to your directory."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 p-4 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="contact-name" className="text-xs font-semibold text-[#545b64]">
                  Full Name <span className="text-[#d13212]">*</span>
                </Label>
                <Input
                  id="contact-name"
                  required
                  placeholder="e.g. Jane Smith"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="contact-email" className="text-xs font-semibold text-[#545b64]">
                  Email Address <span className="text-[#d13212]">*</span>
                </Label>
                <Input
                  id="contact-email"
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="contact-phone" className="text-xs font-semibold text-[#545b64]">
                  Phone Number <span className="text-[#d13212]">*</span>
                </Label>
                <Input
                  id="contact-phone"
                  required
                  placeholder="+1 (555) 000-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold text-[#545b64]">Company</Label>
                <Select value={companyId} onValueChange={setCompanyId}>
                  <SelectTrigger className="h-8 w-full text-xs">
                    <SelectValue placeholder="No company" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No company</SelectItem>
                    {companiesData?.items.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="contact-designation" className="text-xs font-semibold text-[#545b64]">
                  Designation
                </Label>
                <Input
                  id="contact-designation"
                  placeholder="e.g. VP of Sales"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold text-[#545b64]">Linked Leads</Label>
              <div className="max-h-32 overflow-y-auto rounded-[2px] border border-[#aab7b8] bg-white p-2">
                {leadsData?.items.length ? (
                  leadsData.items.map((lead) => (
                    <label
                      key={lead.id}
                      className="flex items-center gap-2 py-1 text-xs text-[#0f1923] cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={linkedLeads.includes(lead.id)}
                        onChange={() => toggleLead(lead.id)}
                        className="rounded-[2px] border-[#aab7b8] text-[#0066cc] focus:ring-[#0066cc] cursor-pointer"
                      />
                      <span>{lead.name}</span>
                      <span className="text-[#879596]">({lead.status})</span>
                    </label>
                  ))
                ) : (
                  <p className="text-xs text-[#879596]">No leads available.</p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : isEdit ? "Save Changes" : "Add Contact"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
