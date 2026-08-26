"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Search,
  Plus,
  MoreVertical,
  Edit2,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  AlertTriangle,
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
import { useGetTasksQuery, useDeleteTaskMutation, type Task, type TaskStatus } from "@/features/tasks/tasksApi";
import { useAppSelector } from "@/store/hooks";
import { selectCurrentUser } from "@/features/auth/authSlice";
import { PriorityBadge } from "@/components/PriorityBadge";
import { TaskStatusBadge } from "@/components/TaskStatusBadge";
import { TaskFormDialog } from "@/components/TaskFormDialog";
import { cn } from "@/lib/utils";

type StatusTab = "all" | TaskStatus | "overdue";

const STATUS_TABS: { key: StatusTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "Todo", label: "Todo" },
  { key: "In Progress", label: "In Progress" },
  { key: "Done", label: "Done" },
  { key: "overdue", label: "Overdue" },
];

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

function isOverdue(task: Task): boolean {
  if (task.status === "Done") return false;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  return new Date(task.dueDate) < startOfToday;
}

export default function TasksPage() {
  return (
    <Suspense fallback={null}>
      <TasksPageContent />
    </Suspense>
  );
}

function TasksPageContent() {
  const searchParams = useSearchParams();
  const initialStatusParam = searchParams.get("status");

  const [statusTab, setStatusTab] = useState<StatusTab>(
    initialStatusParam === "overdue" ? "overdue" : "all"
  );
  const [dueTodayFilter, setDueTodayFilter] = useState(initialStatusParam === "today");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);

  const currentUser = useAppSelector(selectCurrentUser);

  const todayIso = new Date().toISOString().slice(0, 10);
  // The backend's dateTo filter is an inclusive exact-instant "$lte" comparison, not an
  // end-of-day boundary, so a same-day dateFrom/dateTo pair would silently exclude any
  // task whose dueDate isn't stored at exactly midnight. Use tomorrow as the upper bound
  // instead, so the whole calendar day of "today" is covered regardless of time-of-day.
  const tomorrowIso = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const { data, isLoading, isFetching, isError, refetch } = useGetTasksQuery({
    search: search || undefined,
    status: statusTab !== "all" && statusTab !== "overdue" ? statusTab : undefined,
    overdue: statusTab === "overdue" ? true : undefined,
    dateFrom: dueTodayFilter ? todayIso : undefined,
    dateTo: dueTodayFilter ? tomorrowIso : undefined,
    page,
    limit,
  });

  const [deleteTask] = useDeleteTaskMutation();

  const total = data?.total ?? 0;
  const totalPages = data ? Math.max(1, Math.ceil(total / limit)) : 1;
  const startCount = total === 0 ? 0 : (page - 1) * limit + 1;
  const endCount = Math.min(page * limit, total);

  function openAddDialog() {
    setEditingTask(undefined);
    setFormOpen(true);
  }

  function openEditDialog(task: Task) {
    setEditingTask(task);
    setFormOpen(true);
  }

  function handleTabChange(tab: StatusTab) {
    setStatusTab(tab);
    setDueTodayFilter(false);
    setPage(1);
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Delete task "${title}"? This action cannot be undone.`)) return;
    try {
      await deleteTask(id).unwrap();
      toast.success("Task deleted successfully");
    } catch {
      toast.error("Failed to delete task");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Resource Table Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#d5d9d9] pb-3">
        <div className="flex items-center gap-2">
          <h1 className="text-base font-semibold text-[#0f1923]">Tasks</h1>
          <span className="text-xs font-normal text-[#545b64]">({total})</span>
          {isFetching && <RefreshCw className="size-3 animate-spin text-[#0066cc]" />}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-60">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-[#545b64]" />
            <Input
              placeholder="Filter by task title..."
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

          <Button variant="outline" size="sm" onClick={() => refetch()} title="Refresh list">
            <RefreshCw className="size-3.5" />
          </Button>

          <Button size="sm" className="gap-1.5" onClick={openAddDialog}>
            <Plus className="size-3.5" />
            Add Task
          </Button>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-1 border-b border-[#d5d9d9]">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            className={cn(
              "px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors border-b-2 -mb-px",
              statusTab === tab.key
                ? "border-[#0066cc] text-[#0066cc]"
                : "border-transparent text-[#545b64] hover:text-[#0f1923]"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Ad-hoc "Due Today" filter chip (from dashboard widget link) */}
      {dueTodayFilter && (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-[2px] border border-[#d5d9d9] bg-[#f1f6fd] px-2 py-1 text-xs font-medium text-[#0066cc]">
            Filtered: Due Today
            <button
              onClick={() => setDueTodayFilter(false)}
              className="text-[#0066cc] hover:text-[#0f1923] cursor-pointer"
            >
              <X className="size-3" />
            </button>
          </span>
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
            Failed to load tasks from server.
          </div>
        ) : (
          <table className="w-full text-left text-[13px] border-collapse">
            <thead className="bg-[#f1f3f4] border-b border-[#d5d9d9] select-none">
              <tr>
                <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[#545b64]">
                  Title
                </th>
                <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[#545b64]">
                  Type
                </th>
                <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[#545b64]">
                  Priority
                </th>
                <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[#545b64]">
                  Status
                </th>
                <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[#545b64]">
                  Due Date
                </th>
                <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[#545b64]">
                  Assigned To
                </th>
                <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[#545b64]">
                  Related Lead
                </th>
                <th className="w-12 px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-[#545b64]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#d5d9d9]">
              {data?.items.map((task) => {
                const overdue = isOverdue(task);
                return (
                  <tr
                    key={task.id}
                    className={cn(
                      "h-10 transition-colors",
                      overdue ? "bg-[#fdf6f5] hover:bg-[#fceeed]" : "hover:bg-[#f8f9fa]"
                    )}
                  >
                    <td className="px-3 py-2 font-medium text-[#0f1923]">
                      <span className="flex items-center gap-1.5">
                        {overdue && (
                          <AlertTriangle className="size-3 text-[#d13212] shrink-0" />
                        )}
                        {task.title}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-[#545b64]">{task.type}</td>
                    <td className="px-3 py-2">
                      <PriorityBadge priority={task.priority} />
                    </td>
                    <td className="px-3 py-2">
                      <TaskStatusBadge status={task.status} />
                    </td>
                    <td
                      className={cn(
                        "px-3 py-2 text-[12px]",
                        overdue ? "text-[#d13212] font-medium" : "text-[#879596]"
                      )}
                    >
                      {formatDate(task.dueDate)}
                    </td>
                    <td className="px-3 py-2 text-[#545b64]">{task.assignedTo?.name ?? "—"}</td>
                    <td className="px-3 py-2 text-[#545b64]">
                      {task.relatedLead?.name ? (
                        <Link href={`/leads/${task.relatedLead.id}`} className="hover:underline">
                          {task.relatedLead.name}
                        </Link>
                      ) : (
                        "—"
                      )}
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
                            onClick={() => openEditDialog(task)}
                            className="cursor-pointer"
                          >
                            <Edit2 className="size-3.5 mr-2" />
                            <span>Edit Task</span>
                          </DropdownMenuItem>
                          {currentUser?.role === "admin" && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDelete(task.id, task.title)}
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
                      <p className="text-sm font-semibold text-[#0f1923]">No tasks found</p>
                      <p className="text-xs text-[#545b64]">
                        Try adjusting your search query or filters, or add your first task.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {/* Pagination Footer */}
        <div className="flex flex-wrap items-center justify-between border-t border-[#d5d9d9] bg-[#f8f9fa] px-3 py-2 text-xs text-[#545b64]">
          <div className="flex items-center gap-3">
            <span>
              Showing <span className="font-semibold text-[#0f1923]">{startCount}</span> to{" "}
              <span className="font-semibold text-[#0f1923]">{endCount}</span> of{" "}
              <span className="font-semibold text-[#0f1923]">{total}</span> tasks
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

      <TaskFormDialog open={formOpen} onOpenChange={setFormOpen} task={editingTask} />
    </div>
  );
}
