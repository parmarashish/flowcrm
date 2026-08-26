"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, X, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
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
  useGetActivityLogQuery,
  ACTIVITY_MODULES,
  type ActivityModule,
} from "@/features/activity/activityApi";
import { useGetUsersQuery } from "@/features/users/usersApi";
import { useAppSelector } from "@/store/hooks";
import { selectCurrentUser } from "@/features/auth/authSlice";
import { ActivityActionBadge } from "@/components/ActivityActionBadge";
import { ActivityModuleBadge } from "@/components/ActivityModuleBadge";
import { cn, formatFullDateTime } from "@/lib/utils";

const MODULE_LABELS: Record<ActivityModule, string> = {
  leads: "Leads",
  contacts: "Contacts",
  companies: "Companies",
  deals: "Deals",
  tasks: "Tasks",
  users: "Users",
};

function getRecordHref(module: ActivityModule, recordId: string): string {
  switch (module) {
    case "leads":
      return `/leads/${recordId}`;
    case "contacts":
      return `/contacts/${recordId}`;
    case "companies":
      return `/companies/${recordId}`;
    case "deals":
      return `/deals/${recordId}`;
    case "tasks":
      return "/tasks";
    case "users":
      return "/users";
  }
}

function formatIp(ip: string | null): string {
  if (!ip) return "—";
  return ip === "::1" ? "localhost" : ip;
}

export default function ActivityLogPage() {
  const currentUser = useAppSelector(selectCurrentUser);
  const isAdmin = currentUser?.role === "admin";

  const [module, setModule] = useState<ActivityModule | "all">("all");
  const [userId, setUserId] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);

  const { data, isLoading, isFetching, isError, refetch } = useGetActivityLogQuery({
    module: module === "all" ? undefined : module,
    userId: isAdmin && userId !== "all" ? userId : undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    search: search || undefined,
    page,
    limit,
  });

  const { data: usersData } = useGetUsersQuery(undefined, { skip: !isAdmin });

  const total = data?.total ?? 0;
  const totalPages = data ? Math.max(1, Math.ceil(total / limit)) : 1;
  const startCount = total === 0 ? 0 : (page - 1) * limit + 1;
  const endCount = Math.min(page * limit, total);

  const activeFilterCount =
    (module !== "all" ? 1 : 0) +
    (userId !== "all" ? 1 : 0) +
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0) +
    (search ? 1 : 0);

  function resetFilters() {
    setModule("all");
    setUserId("all");
    setDateFrom("");
    setDateTo("");
    setSearch("");
    setPage(1);
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#d5d9d9] pb-3">
        <div className="flex items-center gap-2">
          <h1 className="text-base font-semibold text-[#0f1923]">Activity Log</h1>
          <span className="text-xs font-normal text-[#545b64]">({total})</span>
          {isFetching && <RefreshCw className="size-3 animate-spin text-[#0066cc]" />}
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} title="Refresh list">
          <RefreshCw className="size-3.5" />
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-[2px] border border-[#d5d9d9] bg-white p-2.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#545b64] mr-1">
          Filter:
        </span>

        {/* Module Filter */}
        <Select
          value={module}
          onValueChange={(v) => {
            setModule(v as ActivityModule | "all");
            setPage(1);
          }}
        >
          <SelectTrigger className="h-8 w-40 text-xs">
            <SelectValue placeholder="All Modules" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Modules</SelectItem>
            {ACTIVITY_MODULES.map((m) => (
              <SelectItem key={m} value={m}>
                {MODULE_LABELS[m]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* User Filter (admin only) */}
        {isAdmin && (
          <Select
            value={userId}
            onValueChange={(v) => {
              setUserId(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-8 w-40 text-xs">
              <SelectValue placeholder="All Users" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              {usersData?.users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Search */}
        <div className="relative w-56">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-[#545b64]" />
          <Input
            placeholder="Search by record title..."
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

      {/* DATA TABLE — full width, no card wrapping */}
      <div className="relative w-full overflow-x-auto border-y border-[#d5d9d9]">
        {isLoading ? (
          <div className="p-3 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : isError ? (
          <div className="p-8 text-center text-xs text-[#d13212]">
            Failed to load activity log from server.
          </div>
        ) : (
          <table className="w-full text-left text-[13px] border-collapse">
            <thead className="bg-[#f1f3f4] border-b border-[#d5d9d9] select-none">
              <tr>
                <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[#545b64]">
                  Timestamp
                </th>
                <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[#545b64]">
                  User
                </th>
                <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[#545b64]">
                  Action
                </th>
                <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[#545b64]">
                  Module
                </th>
                <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[#545b64]">
                  Record
                </th>
                <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[#545b64]">
                  IP Address
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#d5d9d9]">
              {data?.items.map((item) => (
                <tr key={item.id} className="h-10 transition-colors hover:bg-[#f8f9fa]">
                  <td className="px-3 py-2 text-[#545b64] whitespace-nowrap">
                    {formatFullDateTime(item.createdAt)}
                  </td>
                  <td className="px-3 py-2 font-medium text-[#0f1923]">{item.user?.name ?? "—"}</td>
                  <td className="px-3 py-2">
                    <ActivityActionBadge type={item.type} />
                  </td>
                  <td className="px-3 py-2">
                    <ActivityModuleBadge module={item.module} />
                  </td>
                  <td className="px-3 py-2">
                    {!item.recordId ? (
                      <span className="text-[#879596]">—</span>
                    ) : item.type === "deleted" ? (
                      <span className="text-[#879596]" title="Record no longer exists">
                        {item.recordTitle ?? "—"}
                      </span>
                    ) : (
                      <Link
                        href={getRecordHref(item.module, item.recordId)}
                        className="text-[#0066cc] hover:underline"
                      >
                        {item.recordTitle ?? "View record"}
                      </Link>
                    )}
                  </td>
                  <td className="px-3 py-2 font-mono text-[12px] text-[#879596]">
                    {formatIp(item.ipAddress)}
                  </td>
                </tr>
              ))}

              {data?.items.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#879596]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Search className="size-8 text-[#d5d9d9]" />
                      <p className="text-sm font-semibold text-[#0f1923]">No activity found</p>
                      <p className="text-xs text-[#545b64]">
                        Try adjusting your search query or filters.
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
              Showing <span className="font-semibold text-[#0f1923]">{startCount}</span>-
              <span className="font-semibold text-[#0f1923]">{endCount}</span> of{" "}
              <span className="font-semibold text-[#0f1923]">{total}</span> entries
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
                  <SelectItem value="25">25</SelectItem>
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
            <div className={cn("flex items-center gap-1")}>
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
