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
  useCreateDealMutation,
  useUpdateDealMutation,
  type Deal,
  type DealStage,
} from "@/features/deals/dealsApi";
import { useGetLeadsQuery } from "@/features/leads/leadsApi";
import { useGetContactsQuery } from "@/features/contacts/contactsApi";

const STAGES: DealStage[] = ["Negotiation", "Proposal", "Contract Sent", "Won", "Lost"];
const CURRENCIES = ["USD", "EUR", "GBP", "INR"];

interface DealFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deal?: Deal;
  defaultStage?: DealStage;
}

export function DealFormDialog({ open, onOpenChange, deal, defaultStage }: DealFormDialogProps) {
  const isEdit = Boolean(deal);
  const [title, setTitle] = useState(deal?.title ?? "");
  const [value, setValue] = useState(deal ? String(deal.value) : "");
  const [currency, setCurrency] = useState(deal?.currency ?? "USD");
  const [stage, setStage] = useState<DealStage>(deal?.stage ?? defaultStage ?? "Negotiation");
  const [closingDate, setClosingDate] = useState(deal?.closingDate?.slice(0, 10) ?? "");
  const [leadId, setLeadId] = useState<string>(deal?.lead?.id ?? "none");
  const [contactId, setContactId] = useState<string>(deal?.contact?.id ?? "none");

  const { data: leadsData } = useGetLeadsQuery({ limit: 100 });
  const { data: contactsData } = useGetContactsQuery({ limit: 100 });

  const [createDeal, { isLoading: isCreating }] = useCreateDealMutation();
  const [updateDeal, { isLoading: isUpdating }] = useUpdateDealMutation();
  const isSubmitting = isCreating || isUpdating;

  // Radix's onOpenChange only fires for its own internally-initiated close/open
  // events (Escape, overlay click) — not when the parent flips `open` externally,
  // which is how "Add Deal"/"Edit Deal" actually open this dialog. Sync the form
  // fields via effect instead, keyed on `open`, the target deal's id, and
  // `defaultStage` (so re-opening "Add Deal" from a different Kanban column
  // re-seeds the stage even though `deal` stays undefined both times).
  useEffect(() => {
    if (open) {
      setTitle(deal?.title ?? "");
      setValue(deal ? String(deal.value) : "");
      setCurrency(deal?.currency ?? "USD");
      setStage(deal?.stage ?? defaultStage ?? "Negotiation");
      setClosingDate(deal?.closingDate?.slice(0, 10) ?? "");
      setLeadId(deal?.lead?.id ?? "none");
      setContactId(deal?.contact?.id ?? "none");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, deal?.id, defaultStage]);

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const body = {
      title,
      value: Number(value),
      currency,
      stage,
      closingDate: closingDate || null,
      lead: leadId === "none" ? null : leadId,
      contact: contactId === "none" ? null : contactId,
    };
    try {
      if (isEdit && deal) {
        await updateDeal({ id: deal.id, body }).unwrap();
        toast.success("Deal updated");
      } else {
        await createDeal(body).unwrap();
        toast.success("Deal created");
      }
      onOpenChange(false);
    } catch {
      toast.error(isEdit ? "Failed to update deal" : "Failed to create deal");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit Deal" : "Add Deal"}</DialogTitle>
            <DialogDescription>
              {isEdit ? "Update deal details." : "Add a new deal to the pipeline."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 p-4 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="deal-title" className="text-xs font-semibold text-[#545b64]">
                  Deal Title <span className="text-[#d13212]">*</span>
                </Label>
                <Input
                  id="deal-title"
                  required
                  placeholder="e.g. Acme Corp — Annual Contract"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="deal-value" className="text-xs font-semibold text-[#545b64]">
                  Deal Value <span className="text-[#d13212]">*</span>
                </Label>
                <Input
                  id="deal-value"
                  type="number"
                  min={0}
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold text-[#545b64]">Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger className="h-8 w-full text-xs">
                    <SelectValue placeholder="Currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold text-[#545b64]">
                  Stage <span className="text-[#d13212]">*</span>
                </Label>
                <Select value={stage} onValueChange={(v) => setStage(v as DealStage)}>
                  <SelectTrigger className="h-8 w-full text-xs">
                    <SelectValue placeholder="Select Stage" />
                  </SelectTrigger>
                  <SelectContent>
                    {STAGES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="deal-closing-date" className="text-xs font-semibold text-[#545b64]">
                  Expected Closing Date
                </Label>
                <Input
                  id="deal-closing-date"
                  type="date"
                  value={closingDate}
                  onChange={(e) => setClosingDate(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold text-[#545b64]">Linked Lead</Label>
                <Select value={leadId} onValueChange={setLeadId}>
                  <SelectTrigger className="h-8 w-full text-xs">
                    <SelectValue placeholder="No lead" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No lead</SelectItem>
                    {leadsData?.items.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label className="text-xs font-semibold text-[#545b64]">Linked Contact</Label>
                <Select value={contactId} onValueChange={setContactId}>
                  <SelectTrigger className="h-8 w-full text-xs">
                    <SelectValue placeholder="No contact" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No contact</SelectItem>
                    {contactsData?.items.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : isEdit ? "Save Changes" : "Add Deal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
