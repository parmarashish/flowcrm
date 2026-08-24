"use client";

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/dashboard/StatCard";
import {
  useGetSummaryQuery,
  useGetBySourceQuery,
  useGetTrendQuery,
  useGetActivityQuery,
} from "@/features/dashboard/dashboardApi";

export default function DashboardPage() {
  const {
    data: summaryData,
    isLoading: summaryLoading,
    isError: summaryError,
  } = useGetSummaryQuery();
  const {
    data: bySourceData,
    isLoading: bySourceLoading,
    isError: bySourceError,
  } = useGetBySourceQuery();
  const { data: trendData, isLoading: trendLoading, isError: trendError } = useGetTrendQuery();
  const {
    data: activityData,
    isLoading: activityLoading,
    isError: activityError,
  } = useGetActivityQuery();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {summaryLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)
        ) : summaryError ? (
          <p className="text-sm text-destructive">Failed to load.</p>
        ) : (
          <>
            <StatCard label="Total Leads" value={summaryData?.summary.total ?? 0} />
            <StatCard label="Won" value={summaryData?.summary.won ?? 0} />
            <StatCard label="Lost" value={summaryData?.summary.lost ?? 0} />
            <StatCard
              label="Conversion Rate"
              value={`${summaryData?.summary.conversionRate ?? 0}%`}
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-2 text-lg font-semibold">Leads by Source</h2>
          {bySourceLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : bySourceError ? (
            <p className="text-sm text-destructive">Failed to load.</p>
          ) : (
            <ResponsiveContainer width="100%" height={256}>
              <BarChart data={bySourceData?.items ?? []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="source" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#6366f1" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div>
          <h2 className="mb-2 text-lg font-semibold">Monthly Trend</h2>
          {trendLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : trendError ? (
            <p className="text-sm text-destructive">Failed to load.</p>
          ) : (
            <ResponsiveContainer width="100%" height={256}>
              <LineChart data={trendData?.items ?? []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#6366f1" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-lg font-semibold">Recent Activity</h2>
        {activityLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : activityError ? (
          <p className="text-sm text-destructive">Failed to load.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {activityData?.items.map((item) => (
              <li key={item._id} className="rounded border p-2 text-sm">
                <span className="font-medium">{item.user?.name ?? "Someone"}</span>{" "}
                <span>{item.message}</span>{" "}
                <span className="text-muted-foreground">
                  ({item.lead?.name ?? "deleted lead"})
                </span>
              </li>
            ))}
            {activityData?.items.length === 0 && (
              <p className="text-sm text-muted-foreground">No activity yet.</p>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
