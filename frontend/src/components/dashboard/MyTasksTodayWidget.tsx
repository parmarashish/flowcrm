"use client";

import Link from "next/link";
import { AlertTriangle, CalendarClock, ListChecks } from "lucide-react";
import { useGetTaskSummaryQuery } from "@/features/tasks/tasksApi";
import { Skeleton } from "@/components/ui/skeleton";

export function MyTasksTodayWidget() {
  const { data, isLoading, isError } = useGetTaskSummaryQuery();

  if (isLoading) {
    return <Skeleton className="h-[92px] w-full" />;
  }

  return (
    <div className="flex flex-col justify-between rounded-[2px] border border-[#d5d9d9] bg-white p-3 shadow-none transition-colors hover:border-[#aab7b8]">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#545b64]">
          My Tasks Today
        </span>
        <ListChecks className="size-3.5 text-[#879596]" />
      </div>

      {/* Two clickable stats */}
      {isError ? (
        <p className="my-1 text-xs text-[#d13212]">Failed to load task summary.</p>
      ) : (
        <div className="my-1 flex items-stretch">
          <Link
            href="/tasks?status=overdue"
            className="flex-1 flex flex-col items-start rounded-[2px] px-1.5 py-0.5 -mx-1.5 hover:bg-[#fdf3f2] transition-colors"
          >
            <span className="inline-flex items-center gap-1 text-2xl font-bold tracking-tight text-[#d13212]">
              <AlertTriangle className="size-4" />
              {data?.overdueCount ?? 0}
            </span>
            <span className="text-[10px] font-medium text-[#545b64]">Overdue</span>
          </Link>
          <div className="w-px bg-[#eaeded] my-1" />
          <Link
            href="/tasks?status=today"
            className="flex-1 flex flex-col items-start rounded-[2px] px-1.5 py-0.5 -mx-1.5 hover:bg-[#f1f6fd] transition-colors"
          >
            <span className="inline-flex items-center gap-1 text-2xl font-bold tracking-tight text-[#0066cc]">
              <CalendarClock className="size-4" />
              {data?.dueTodayCount ?? 0}
            </span>
            <span className="text-[10px] font-medium text-[#545b64]">Due Today</span>
          </Link>
        </div>
      )}

      {/* Subtitle */}
      <div className="flex items-center gap-1.5 text-[11px] text-[#879596]">
        <span>Assigned to you</span>
      </div>
    </div>
  );
}
