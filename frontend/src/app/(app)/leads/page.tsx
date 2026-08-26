"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Filter,
  Plus,
  ArrowUpDown,
  MoreVertical,
  Edit2,
  Trash2,
  ExternalLink,
  X,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useGetLeadsQuery,
  useDeleteLeadMutation,
  type LeadSource,
  type LeadStatus,
} from "@/features/leads/leadsApi";
import { useAppSelector } from "@/store/hooks";
import { selectCurrentUser } from "@/features/auth/authSlice";
import { StatusBadge } from "@/components/StatusBadge";

const STATUSES: LeadStatus[] = ["New", "Contacted", "Qualified", "Proposal", "Won", "Lost"];
const SOURCES: LeadSource[] = ["Website", "Referral", "Cold Call", "Social Media", "Other"];

export default function LeadsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<LeadStatus | "all">("all");
  const [source, setSource] = useState<LeadSource | "all">("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [showFilters, setShowFilters] = useState(true);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);

  const currentUser = useAppSelector(selectCurrentUser);
  const router = useRouter();

  const { data, isLoading, isFetching, isError, refetch } = useGetLeadsQuery({
    search: search || undefined,
    status: status === "all" ? undefined : status,
    source: source === "all" ? undefined : source,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    page,
    limit,
  });

  const [deleteLead] = useDeleteLeadMutation();

  const total = data?.total ?? 0;
  const totalPages = data ? Math.max(1, Math.ceil(total / limit)) : 1;
  const startCount = total === 0 ? 0 : (page - 1) * limit + 1;
  const endCount = Math.min(page * limit, total);

  const activeFilterCount =
    (status !== "all" ? 1 : 0) +
    (source !== "all" ? 1 : 0) +
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0);

  function resetFilters() {
    setStatus("all");
    setSource("all");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }

  function handleSelectAll() {
    if (!data?.items) return;
    if (selectedLeads.length === data.items.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(data.items.map((lead) => lead.id));
    }
  }

  function toggleSelectLead(id: string) {
    setSelectedLeads((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete lead "${name}"? This action cannot be undone.`)) return;
    try {
      await deleteLead(id).unwrap();
      toast.success("Lead deleted successfully");
      setSelectedLeads((prev) => prev.filter((i) => i !== id));
    } catch {
      toast.error("Failed to delete lead");
    }
  }

  const formatCreationDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Resource Table Action Bar (AWS EC2 Style) */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#d5d9d9] pb-3">
        <div className="flex items-center gap-2">
          <h1 className="text-base font-semibold text-[#0f1923]">Leads</h1>
          <span className="text-xs font-normal text-[#545b64]">({total})</span>
          {isFetching && <RefreshCw className="size-3 animate-spin text-[#0066cc]" />}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Search */}
          <div className="relative w-60">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-[#545b64]" />
            <Input
              placeholder="Filter by name or email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="h-8 pl-8 text-xs border-[#aab7b8]"
            />
            {search && (
              <button
                onClick={() => {
                  setSearch("");
                  setPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#879596] hover:text-[#0f1923]"
              >
                <X className="size-3" />
              </button>
            )}
          </div>

          {/* Filter Toggle */}
          <Button
            variant={activeFilterCount > 0 ? "secondary" : "outline"}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="gap-1.5"
          >
            <Filter className="size-3.5" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="flex size-4 items-center justify-center rounded-[2px] bg-[#0066cc] text-[10px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </Button>

          {/* Refresh Button */}
          <Button variant="outline" size="sm" onClick={() => refetch()} title="Refresh list">
            <RefreshCw className="size-3.5" />
          </Button>

          {/* Primary Add Lead Button */}
          <Link href="/leads/new">
            <Button size="sm" className="gap-1.5">
              <Plus className="size-3.5" />
              Add Lead
            </Button>
          </Link>
        </div>
      </div>

      {/* Collapsible Filter Bar */}
      {showFilters && (
        <div className="flex flex-wrap items-center gap-2 rounded-[2px] border border-[#d5d9d9] bg-white p-2.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#545b64] mr-1">
            Filter:
          </span>

          {/* Status Filter */}
          <Select
            value={status}
            onValueChange={(v) => {
              setStatus(v as LeadStatus | "all");
              setPage(1);
            }}
          >
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue placeholder="Status: All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Status: All</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Source Filter */}
          <Select
            value={source}
            onValueChange={(v) => {
              setSource(v as LeadSource | "all");
              setPage(1);
            }}
          >
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue placeholder="Source: All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Source: All</SelectItem>
              {SOURCES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Date From */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-[#879596]">From:</span>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              className="h-8 w-36 text-xs"
            />
          </div>

          {/* Date To */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-[#879596]">To:</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              className="h-8 w-36 text-xs"
            />
          </div>

          {/* Clear Filters */}
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="h-8 text-xs text-[#d13212] hover:text-[#d13212] hover:bg-[#fdf3f2]"
            >
              Clear filters ({activeFilterCount})
            </Button>
          )}
        </div>
      )}

      {/* DATA TABLE (AWS Console Grid) */}
      <div className="relative w-full overflow-x-auto rounded-[2px] border border-[#d5d9d9] bg-white">
        {isLoading ? (
          <div className="p-3 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : isError ? (
          <div className="p-8 text-center text-xs text-[#d13212]">
            Failed to load leads from server.
          </div>
        ) : (
          <table className="w-full text-left text-[13px] border-collapse">
            <thead className="bg-[#f1f3f4] border-b border-[#d5d9d9] select-none">
              <tr>
                <th className="w-8 px-3 py-2 text-center">
                  <input
                    type="checkbox"
                    className="rounded-[2px] border-[#aab7b8] text-[#0066cc] focus:ring-[#0066cc] cursor-pointer"
                    checked={
                      (data?.items.length ?? 0) > 0 &&
                      selectedLeads.length === (data?.items.length ?? 0)
                    }
                    onChange={handleSelectAll}
                  />
                </th>
                <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[#545b64]">
                  <div className="flex items-center gap-1 cursor-pointer hover:text-[#0f1923]">
                    Name <ArrowUpDown className="size-3 text-[#879596]" />
                  </div>
                </th>
                <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[#545b64]">
                  Email
                </th>
                <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[#545b64]">
                  Phone
                </th>
                <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[#545b64]">
                  Source
                </th>
                <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[#545b64]">
                  Status
                </th>
                <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[#545b64]">
                  Created
                </th>
                <th className="w-12 px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-[#545b64]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#d5d9d9]">
              {data?.items.map((lead) => {
                const isSelected = selectedLeads.includes(lead.id);

                return (
                  <tr
                    key={lead.id}
                    className={`h-10 transition-colors ${
                      isSelected ? "bg-[#eaf3fc]" : "hover:bg-[#f8f9fa]"
                    }`}
                  >
                    <td className="w-8 px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectLead(lead.id)}
                        className="rounded-[2px] border-[#aab7b8] text-[#0066cc] focus:ring-[#0066cc] cursor-pointer"
                      />
                    </td>
                    <td className="px-3 py-2 font-medium">
                      <Link
                        href={`/leads/${lead.id}`}
                        className="text-[#0066cc] hover:underline flex items-center gap-1.5"
                      >
                        {lead.name}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-[#545b64]">{lead.email}</td>
                    <td className="px-3 py-2 text-[#545b64]">{lead.phone || "—"}</td>
                    <td className="px-3 py-2 text-[#545b64]">{lead.source}</td>
                    <td className="px-3 py-2">
                      <StatusBadge status={lead.status} />
                    </td>
                    <td className="px-3 py-2 text-[12px] text-[#879596]">
                      {formatCreationDate(lead.createdAt)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="flex size-7 items-center justify-center rounded-[2px] text-[#545b64] hover:bg-[#eaeded] hover:text-[#0f1923] transition-colors ml-auto cursor-pointer">
                            <MoreVertical className="size-3.5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-36">
                          <DropdownMenuItem
                            onClick={() => router.push(`/leads/${lead.id}`)}
                            className="cursor-pointer"
                          >
                            <Edit2 className="size-3.5 mr-2" />
                            <span>Edit Lead</span>
                          </DropdownMenuItem>
                          {currentUser?.role === "admin" && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDelete(lead.id, lead.name)}
                                className="text-[#d13212] focus:text-[#d13212] cursor-pointer"
                              >
                                <Trash2 className="size-3.5 mr-2" />
                                <span>Delete</span>
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}

              {data?.items.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#879596]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Search className="size-8 text-[#d5d9d9]" />
                      <p className="text-sm font-semibold text-[#0f1923]">No leads found</p>
                      <p className="text-xs text-[#545b64]">
                        Try adjusting your search query or clear any active filters.
                      </p>
                      {activeFilterCount > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={resetFilters}
                          className="mt-2 text-xs"
                        >
                          Clear Filters
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {/* AWS Table Pagination Footer */}
        <div className="flex flex-wrap items-center justify-between border-t border-[#d5d9d9] bg-[#f8f9fa] px-3 py-2 text-xs text-[#545b64]">
          <div className="flex items-center gap-3">
            <span>
              Showing <span className="font-semibold text-[#0f1923]">{startCount}</span> to{" "}
              <span className="font-semibold text-[#0f1923]">{endCount}</span> of{" "}
              <span className="font-semibold text-[#0f1923]">{total}</span> leads
            </span>

            {/* Page Size Selector */}
            <div className="hidden sm:flex items-center gap-1.5 border-l border-[#d5d9d9] pl-3">
              <span className="text-[11px] text-[#879596]">Rows per page:</span>
              <Select
                value={String(limit)}
                onValueChange={(val) => {
                  setLimit(Number(val));
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-7 w-16 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-[#879596]">
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2"
                disabled={page <= 1 || isFetching}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="size-3.5 mr-1" /> Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2"
                disabled={page >= totalPages || isFetching}
                onClick={() => setPage((p) => p + 1)}
              >
                Next <ChevronRight className="size-3.5 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
