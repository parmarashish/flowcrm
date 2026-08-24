import { Badge } from "@/components/ui/badge";
import type { LeadStatus } from "@/features/leads/leadsApi";

const STATUS_VARIANT: Record<LeadStatus, string> = {
  New: "bg-blue-100 text-blue-800",
  Contacted: "bg-amber-100 text-amber-800",
  Qualified: "bg-purple-100 text-purple-800",
  Proposal: "bg-indigo-100 text-indigo-800",
  Won: "bg-green-100 text-green-800",
  Lost: "bg-red-100 text-red-800",
};

export function StatusBadge({ status }: { status: LeadStatus }) {
  return <Badge className={STATUS_VARIANT[status]}>{status}</Badge>;
}
