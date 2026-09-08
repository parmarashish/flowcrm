"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DndContext, type DragEndEvent } from "@dnd-kit/core";
import { toast } from "sonner";
import {
  Plus,
  RefreshCw,
  KanbanSquare,
  Rows3,
  Search,
  Filter,
  X,
  ArrowUpDown,
  MoreVertical,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  useGetDealsQuery,
  useUpdateDealMutation,
  useDeleteDealMutation,
  useGetDealSummaryQuery,
  type Deal,
  type DealStage,
} from "@/features/deals/dealsApi";
import { DealKanbanColumn } from "@/components/deals-kanban/DealKanbanColumn";
import { DealFormDialog } from "@/components/DealFormDialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { DealStageBadge } from "@/components/DealStageBadge";
import { useAppSelector } from "@/store/hooks";
import { selectCurrentUser } from "@/features/auth/authSlice";

const STAGES: DealStage[] = ["Negotiation", "Proposal", "Contract Sent", "Won", "Lost"];

type SortKey = "title" | "contact" | "lead" | "value" | "stage" | "closingDate" | "assignedTo";
type SortDir = "asc" | "desc";

function formatCurrency(value: number, currency = "USD") {
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
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function sortAccessor(deal: Deal, key: SortKey): string | number {
  switch (key) {
    case "title":
      return deal.title.toLowerCase();
    case "contact":
      return deal.contact?.name?.toLowerCase() ?? "";
    case "lead":
      return deal.lead?.name?.toLowerCase() ?? "";
    case "value":
      return deal.value;
    case "stage":
      return STAGES.indexOf(deal.stage);
    case "closingDate":
      return deal.closingDate ? new Date(deal.closingDate).getTime() : 0;
    case "assignedTo":
      return deal.assignedTo?.name?.toLowerCase() ?? "";
  }
}

export default function DealsPage() {
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState<DealStage | "all">("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [sortKey, setSortKey] = useState<SortKey>("closingDate");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const [formOpen, setFormOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | undefined>(undefined);
  const [defaultStage, setDefaultStage] = useState<DealStage>("Negotiation");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);

  const currentUser = useAppSelector(selectCurrentUser);
  const router = useRouter();

  const sharedFilters = {
    search: search || undefined,
    stage: stage === "all" ? undefined : stage,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  };

  const kanbanQuery = useGetDealsQuery(
    { ...sharedFilters, limit: 100 },
    { skip: view !== "kanban" }
  );
  const listQuery = useGetDealsQuery(
    { ...sharedFilters, page, limit },
    { skip: view !== "list" }
  );

  const activeQuery = view === "kanban" ? kanbanQuery : listQuery;
  const { data, isLoading, isFetching, isError, refetch } = activeQuery;

  const { data: summary } = useGetDealSummaryQuery();
  const [updateDeal] = useUpdateDealMutation();
  const [deleteDeal] = useDeleteDealMutation();

  const total = data?.total ?? 0;
  const totalPages = data ? Math.max(1, Math.ceil(total / limit)) : 1;
  const startCount = total === 0 ? 0 : (page - 1) * limit + 1;
  const endCount = Math.min(page * limit, total);

  const activeFilterCount =
    (stage !== "all" ? 1 : 0) + (dateFrom ? 1 : 0) + (dateTo ? 1 : 0);

  function resetFilters() {
    setStage("all");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }

  function openAddDialog(forStage: DealStage) {
    setEditingDeal(undefined);
    setDefaultStage(forStage);
    setFormOpen(true);
  }

  function openEditDialog(deal: Deal) {
    setEditingDeal(deal);
    setFormOpen(true);
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const sortedItems = useMemo(() => {
    const items = listQuery.data?.items ?? [];
    const sorted = [...items].sort((a, b) => {
      const av = sortAccessor(a, sortKey);
      const bv = sortAccessor(b, sortKey);
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [listQuery.data, sortKey, sortDir]);

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const newStage = over.id as DealStage;
    const dealId = active.id as string;
    const deal = kanbanQuery.data?.items.find((d) => d.id === dealId);
    if (!deal || deal.stage === newStage) return;

    try {
      await updateDeal({ id: dealId, body: { stage: newStage } }).unwrap();
      toast.success(`Moved ${deal.title} to ${newStage}`);
    } catch {
      toast.error("Failed to update deal stage");
    }
  }

  function handleDelete(id: string, title: string) {
    setDeleteTarget({ id, title });
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await deleteDeal(deleteTarget.id).unwrap();
      toast.success("Deal deleted successfully");
    } catch {
      toast.error("Failed to delete deal");
    } finally {
      setDeleteTarget(null);
    }
  }

  function SortHeader({ label, sortableKey }: { label: string; sortableKey: SortKey }) {
    return (
      <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[#545b64]">
        <button
          onClick={() => handleSort(sortableKey)}
          className="flex items-center gap-1 cursor-pointer hover:text-[#0f1923]"
        >
          {label}
          <ArrowUpDown
            className={`size-3 ${sortKey === sortableKey ? "text-[#0066cc]" : "text-[#879596]"}`}
          />
        </button>
      </th>
    );
  }

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#d5d9d9] pb-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <h1 className="text-base font-semibold text-[#0f1923]">Deals</h1>
          <span className="text-xs font-normal text-[#545b64]">({total} deals)</span>
          {isFetching && <RefreshCw className="size-3 animate-spin text-[#0066cc]" />}
          {summary && (
            <span className="ml-2 rounded-[2px] border border-[#d5d9d9] bg-[#f1f6fd] px-2 py-0.5 text-xs font-semibold text-[#0066cc]">
              Pipeline value: {formatCurrency(summary.activeValue)}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Search */}
          <div className="relative w-60">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-[#545b64]" />
            <Input
              placeholder="Filter by deal title..."
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

          {view === "list" && (
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
          )}

          {/* View Toggle */}
          <div className="flex items-center rounded-[2px] border border-[#d5d9d9] overflow-hidden">
            <button
              onClick={() => setView("kanban")}
              title="Kanban view"
              className={`flex h-8 items-center gap-1.5 px-2.5 text-xs font-medium cursor-pointer transition-colors ${
                view === "kanban"
                  ? "bg-[#0066cc] text-white"
                  : "bg-white text-[#545b64] hover:bg-[#f2f3f3]"
              }`}
            >
              <KanbanSquare className="size-3.5" />
              Kanban
            </button>
            <button
              onClick={() => setView("list")}
              title="List view"
              className={`flex h-8 items-center gap-1.5 px-2.5 text-xs font-medium cursor-pointer transition-colors border-l border-[#d5d9d9] ${
                view === "list"
                  ? "bg-[#0066cc] text-white"
                  : "bg-white text-[#545b64] hover:bg-[#f2f3f3]"
              }`}
            >
              <Rows3 className="size-3.5" />
              List
            </button>
          </div>

          <Button variant="outline" size="sm" onClick={() => refetch()} title="Refresh">
            <RefreshCw className="size-3.5" />
          </Button>

          <Button size="sm" className="gap-1.5" onClick={() => openAddDialog("Negotiation")}>
            <Plus className="size-3.5" />
            Add Deal
          </Button>
        </div>
      </div>

      {/* Collapsible Filter Bar (list view only) */}
      {view === "list" && showFilters && (
        <div className="flex flex-wrap items-center gap-2 rounded-[2px] border border-[#d5d9d9] bg-white p-2.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#545b64] mr-1">
            Filter:
          </span>

          <Select
            value={stage}
            onValueChange={(v) => {
              setStage(v as DealStage | "all");
              setPage(1);
            }}
          >
            <SelectTrigger className="h-8 w-40 text-xs">
              <SelectValue placeholder="Stage: All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Stage: All</SelectItem>
              {STAGES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1">
            <span className="text-[11px] text-[#879596]">Closing From:</span>
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

      {/* Board / Table Content */}
      {isLoading ? (
        view === "kanban" ? (
          <div className="flex gap-3 overflow-x-auto pb-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="w-[280px] shrink-0 space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-28 w-full" />
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-[2px] border border-[#d5d9d9] bg-white p-3 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        )
      ) : isError ? (
        <div className="rounded-[2px] border border-[#d13212] bg-[#fdf3f2] p-4 text-xs text-[#d13212]">
          Failed to load deals from server.
        </div>
      ) : view === "kanban" ? (
        <DndContext onDragEnd={handleDragEnd}>
          <div className="flex gap-3 overflow-x-auto pb-4 items-start flex-1">
            {STAGES.map((s) => (
              <DealKanbanColumn
                key={s}
                stage={s}
                deals={kanbanQuery.data?.items.filter((d) => d.stage === s) ?? []}
                onAddDeal={openAddDialog}
              />
            ))}
          </div>
        </DndContext>
      ) : (
        <div className="relative w-full overflow-x-auto rounded-[2px] border border-[#d5d9d9] bg-white">
          <table className="w-full text-left text-[13px] border-collapse">
            <thead className="bg-[#f1f3f4] border-b border-[#d5d9d9] select-none">
              <tr>
                <SortHeader label="Title" sortableKey="title" />
                <SortHeader label="Contact" sortableKey="contact" />
                <SortHeader label="Linked Lead" sortableKey="lead" />
                <SortHeader label="Value" sortableKey="value" />
                <SortHeader label="Stage" sortableKey="stage" />
                <SortHeader label="Closing Date" sortableKey="closingDate" />
                <SortHeader label="Assigned To" sortableKey="assignedTo" />
                <th className="w-12 px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-[#545b64]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#d5d9d9]">
              {sortedItems.map((deal) => (
                <tr key={deal.id} className="h-10 transition-colors hover:bg-[#f8f9fa]">
                  <td className="px-3 py-2 font-medium">
                    <Link
                      href={`/deals/${deal.id}`}
                      className="text-[#0066cc] hover:underline"
                    >
                      {deal.title}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-[#545b64]">
                    {deal.contact?.name ? (
                      <Link href={`/contacts/${deal.contact.id}`} className="hover:underline">
                        {deal.contact.name}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-2 text-[#545b64]">
                    {deal.lead?.name ? (
                      <Link href={`/leads/${deal.lead.id}`} className="hover:underline">
                        {deal.lead.name}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-2 font-semibold text-[#0f1923]">
                    {formatCurrency(deal.value, deal.currency)}
                  </td>
                  <td className="px-3 py-2">
                    <DealStageBadge stage={deal.stage} />
                  </td>
                  <td className="px-3 py-2 text-[12px] text-[#879596]">
                    {formatDate(deal.closingDate)}
                  </td>
                  <td className="px-3 py-2 text-[#545b64]">{deal.assignedTo?.name ?? "—"}</td>
                  <td className="px-3 py-2 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="flex size-7 items-center justify-center rounded-[2px] text-[#545b64] hover:bg-[#eaeded] hover:text-[#0f1923] transition-colors ml-auto cursor-pointer">
                          <MoreVertical className="size-3.5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-36">
                        <DropdownMenuItem
                          onClick={() => router.push(`/deals/${deal.id}`)}
                          className="cursor-pointer"
                        >
                          <Search className="size-3.5 mr-2" />
                          <span>View Deal</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => openEditDialog(deal)}
                          className="cursor-pointer"
                        >
                          <Edit2 className="size-3.5 mr-2" />
                          <span>Edit Deal</span>
                        </DropdownMenuItem>
                        {currentUser?.role === "admin" && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDelete(deal.id, deal.title)}
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
              ))}

              {sortedItems.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#879596]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Search className="size-8 text-[#d5d9d9]" />
                      <p className="text-sm font-semibold text-[#0f1923]">No deals found</p>
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

          {/* Pagination Footer */}
          <div className="flex flex-wrap items-center justify-between border-t border-[#d5d9d9] bg-[#f8f9fa] px-3 py-2 text-xs text-[#545b64]">
            <div className="flex items-center gap-3">
              <span>
                Showing <span className="font-semibold text-[#0f1923]">{startCount}</span> to{" "}
                <span className="font-semibold text-[#0f1923]">{endCount}</span> of{" "}
                <span className="font-semibold text-[#0f1923]">{total}</span> deals
              </span>

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
      )}

      <DealFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        deal={editingDeal}
        defaultStage={defaultStage}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Deal"
        description={`Delete deal "${deleteTarget?.title}"? This action cannot be undone.`}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
