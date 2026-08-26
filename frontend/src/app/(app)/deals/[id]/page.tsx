"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Edit2,
  Trash2,
  Calendar,
  User as UserIcon,
  Clock,
  Building2,
  Mail,
  Phone,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import { DealStageBadge } from "@/components/DealStageBadge";
import { DealFormDialog } from "@/components/DealFormDialog";
import {
  useGetDealQuery,
  useUpdateDealMutation,
  useAddDealNoteMutation,
  useDeleteDealMutation,
  type DealStage,
} from "@/features/deals/dealsApi";
import type { LeadStatus } from "@/features/leads/leadsApi";
import { useAppSelector } from "@/store/hooks";
import { selectCurrentUser } from "@/features/auth/authSlice";

const STAGES: DealStage[] = ["Negotiation", "Proposal", "Contract Sent", "Won", "Lost"];

function formatCurrency(value: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${currency} ${value.toLocaleString()}`;
  }
}

function formatDate(dateStr?: string) {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatTimestamp(dateStr?: string) {
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
}

export default function DealDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const currentUser = useAppSelector(selectCurrentUser);
  const { data, isLoading, isError } = useGetDealQuery(id);
  const [updateDeal, { isLoading: isChangingStage }] = useUpdateDealMutation();
  const [addNote, { isLoading: isAddingNote }] = useAddDealNoteMutation();
  const [deleteDeal, { isLoading: isDeleting }] = useDeleteDealMutation();
  const [editOpen, setEditOpen] = useState(false);
  const [noteText, setNoteText] = useState("");

  const canDelete = currentUser?.role === "admin";

  async function handleStageChange(newStage: DealStage) {
    if (!data?.deal || newStage === data.deal.stage) return;
    try {
      await updateDeal({ id, body: { stage: newStage } }).unwrap();
      toast.success(`Deal moved to ${newStage}`);
    } catch {
      toast.error("Failed to update deal stage");
    }
  }

  async function handleAddNote(e: FormEvent) {
    e.preventDefault();
    if (!noteText.trim()) return;
    try {
      await addNote({ id, text: noteText.trim() }).unwrap();
      setNoteText("");
      toast.success("Note added");
    } catch {
      toast.error("Failed to add note");
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this deal? This action is irreversible.")) return;
    try {
      await deleteDeal(id).unwrap();
      toast.success("Deal deleted");
      router.push("/deals");
    } catch {
      toast.error("Failed to delete deal");
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !data?.deal) {
    return (
      <div className="mx-auto max-w-2xl rounded-[2px] border border-[#d13212] bg-[#fdf3f2] p-4 text-xs text-[#d13212]">
        <p className="font-semibold">Deal Not Found</p>
        <p className="mt-1">The requested deal could not be loaded or may have been deleted.</p>
        <Link href="/deals" className="mt-3 inline-block font-medium text-[#0066cc] underline">
          Return to Deals
        </Link>
      </div>
    );
  }

  const deal = data.deal;
  const notesNewestFirst = [...deal.notes].reverse();

  return (
    <div className="mx-auto max-w-3xl flex flex-col gap-4">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#d5d9d9] pb-3">
        <div className="flex items-center gap-2">
          <Link href="/deals">
            <Button variant="outline" size="sm" className="h-7 px-2">
              <ArrowLeft className="size-3.5 mr-1" /> Deals
            </Button>
          </Link>
          <div className="border-l border-[#d5d9d9] pl-2">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold text-[#0f1923]">{deal.title}</h1>
              <DealStageBadge stage={deal.stage} />
            </div>
            <p className="text-[11px] text-[#545b64] font-mono">Deal ID: {deal.id}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={deal.stage}
            onValueChange={(v) => handleStageChange(v as DealStage)}
            disabled={isChangingStage}
          >
            <SelectTrigger className="h-8 w-40 text-xs">
              <SelectValue placeholder="Change stage" />
            </SelectTrigger>
            <SelectContent>
              {STAGES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)} className="gap-1.5">
            <Edit2 className="size-3.5" />
            Edit Deal
          </Button>

          {canDelete && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
              className="gap-1.5"
            >
              <Trash2 className="size-3.5" />
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* Deal Info Panel */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-[2px] border border-[#d5d9d9] bg-white p-3 text-xs">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#879596] block">
            Deal Value
          </span>
          <span className="font-semibold text-[15px] text-[#0f1923] mt-0.5 block">
            {formatCurrency(deal.value, deal.currency)}
          </span>
        </div>
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#879596] block">
            <Calendar className="size-3 inline mr-1 -mt-0.5" />
            Closing Date
          </span>
          <span className="font-medium text-[#0f1923] mt-0.5 block">
            {formatDate(deal.closingDate)}
          </span>
        </div>
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#879596] block">
            <UserIcon className="size-3 inline mr-1 -mt-0.5" />
            Assigned To
          </span>
          <span className="font-medium text-[#0f1923] mt-0.5 block truncate">
            {deal.assignedTo?.name ?? "Unassigned"}
          </span>
        </div>
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#879596] block">
            <Clock className="size-3 inline mr-1 -mt-0.5" />
            Last Updated
          </span>
          <span className="text-[#0f1923] mt-0.5 block text-[11px]">
            {formatTimestamp(deal.updatedAt)}
          </span>
        </div>
      </div>

      {/* Linked Lead + Linked Contact */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Linked Lead Panel */}
        <div className="rounded-[2px] border border-[#d5d9d9] bg-white">
          <div className="border-b border-[#d5d9d9] px-4 py-2.5 bg-[#f8f9fa]">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#0f1923]">
              Linked Lead
            </h2>
          </div>
          {deal.lead ? (
            <Link
              href={`/leads/${deal.lead.id}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-[#f8f9fa] transition-colors"
            >
              <div className="flex flex-col">
                <span className="text-xs font-medium text-[#0066cc]">{deal.lead.name}</span>
                <span className="text-[11px] text-[#879596]">{deal.lead.source}</span>
              </div>
              {deal.lead.status && <StatusBadge status={deal.lead.status as LeadStatus} />}
            </Link>
          ) : (
            <p className="p-4 text-xs text-[#879596]">No lead linked to this deal.</p>
          )}
        </div>

        {/* Linked Contact Panel */}
        <div className="rounded-[2px] border border-[#d5d9d9] bg-white">
          <div className="border-b border-[#d5d9d9] px-4 py-2.5 bg-[#f8f9fa]">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#0f1923]">
              Linked Contact
            </h2>
          </div>
          {deal.contact ? (
            <Link
              href={`/contacts/${deal.contact.id}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-[#f8f9fa] transition-colors"
            >
              <div className="flex flex-col">
                <span className="text-xs font-medium text-[#0066cc] inline-flex items-center gap-1">
                  <Building2 className="size-3 text-[#879596]" />
                  {deal.contact.name}
                </span>
                <span className="text-[11px] text-[#879596]">{deal.contact.designation || "—"}</span>
              </div>
              <div className="flex flex-col items-end text-[11px] text-[#545b64]">
                {deal.contact.email && (
                  <span className="inline-flex items-center gap-1">
                    <Mail className="size-3 text-[#879596]" />
                    {deal.contact.email}
                  </span>
                )}
                {deal.contact.phone && (
                  <span className="inline-flex items-center gap-1 mt-0.5">
                    <Phone className="size-3 text-[#879596]" />
                    {deal.contact.phone}
                  </span>
                )}
              </div>
            </Link>
          ) : (
            <p className="p-4 text-xs text-[#879596]">No contact linked to this deal.</p>
          )}
        </div>
      </div>

      {/* Notes Timeline Panel */}
      <div className="rounded-[2px] border border-[#d5d9d9] bg-white">
        <div className="border-b border-[#d5d9d9] px-4 py-2.5 bg-[#f8f9fa] flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#0f1923]">
            Notes Timeline
          </h2>
          <span className="text-[11px] text-[#879596]">{deal.notes.length} notes</span>
        </div>

        <form onSubmit={handleAddNote} className="flex flex-col gap-2 border-b border-[#d5d9d9] p-4">
          <textarea
            rows={2}
            placeholder="Add a note about this deal..."
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            className="w-full rounded-[2px] border border-[#aab7b8] bg-white p-2 text-xs text-[#0f1923] placeholder:text-[#879596] outline-none transition-colors focus-visible:border-[#0066cc] focus-visible:ring-1 focus-visible:ring-[#0066cc]"
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              size="sm"
              disabled={isAddingNote || !noteText.trim()}
              className="gap-1.5"
            >
              <Send className="size-3.5" />
              {isAddingNote ? "Adding..." : "Add Note"}
            </Button>
          </div>
        </form>

        <div className="divide-y divide-[#d5d9d9]">
          {notesNewestFirst.length === 0 && (
            <p className="p-4 text-xs text-[#879596]">No notes yet — add the first one above.</p>
          )}
          {notesNewestFirst.map((note) => (
            <div key={note.id} className="px-4 py-3">
              <p className="text-xs text-[#0f1923] whitespace-pre-wrap">{note.text}</p>
              <p className="text-[11px] text-[#879596] mt-1">
                {note.author?.name ?? "Unknown"} · {formatTimestamp(note.createdAt)}
              </p>
            </div>
          ))}
        </div>
      </div>

      <DealFormDialog open={editOpen} onOpenChange={setEditOpen} deal={deal} />
    </div>
  );
}
