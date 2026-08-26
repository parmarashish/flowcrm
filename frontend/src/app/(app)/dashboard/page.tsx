"use client";

import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import {
  Users2,
  Trophy,
  XCircle,
  Percent,
  RefreshCw,
  ArrowRight,
  Clock,
  Activity as ActivityIcon,
  ExternalLink,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/dashboard/StatCard";
import { MyTasksTodayWidget } from "@/components/dashboard/MyTasksTodayWidget";
import { StatusBadge } from "@/components/StatusBadge";
import {
  useGetSummaryQuery,
  useGetBySourceQuery,
  useGetTrendQuery,
  useGetActivityQuery,
} from "@/features/dashboard/dashboardApi";
import { useGetLeadsQuery } from "@/features/leads/leadsApi";

const SOURCE_COLORS: Record<string, string> = {
  Website: "#0066cc",
  Referral: "#1d8102",
  "Cold Call": "#e07b00",
  "Social Media": "#7b2cbf",
  Other: "#545b64",
};

export default function DashboardPage() {
  const {
    data: summaryData,
    isLoading: summaryLoading,
    isError: summaryError,
    refetch: refetchSummary,
  } = useGetSummaryQuery();

  const {
    data: bySourceData,
    isLoading: bySourceLoading,
    isError: bySourceError,
    refetch: refetchBySource,
  } = useGetBySourceQuery();

  const {
    data: trendData,
    isLoading: trendLoading,
    isError: trendError,
    refetch: refetchTrend,
  } = useGetTrendQuery();

  const {
    data: activityData,
    isLoading: activityLoading,
    isError: activityError,
    refetch: refetchActivity,
  } = useGetActivityQuery();

  const {
    data: recentLeadsData,
    isLoading: recentLeadsLoading,
  } = useGetLeadsQuery({ page: 1, limit: 5 });

  function handleRefreshAll() {
    refetchSummary();
    refetchBySource();
    refetchTrend();
    refetchActivity();
  }

  const formatTimestamp = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Top Banner / Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#d5d9d9] pb-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-[#0f1923]">
            Operational Overview
          </h1>
          <p className="text-xs text-[#545b64]">
            Real-time pipeline metrics, lead acquisition trends, and audit activity.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefreshAll}>
            <RefreshCw className="size-3.5 mr-1.5" />
            Refresh Data
          </Button>
          <Link href="/leads/new">
            <Button size="sm">
              <Plus className="size-3.5 mr-1.5" />
              Add Lead
            </Button>
          </Link>
        </div>
      </div>

      {/* ROW 1: 4 Stat Cards + My Tasks Today, in AWS CloudWatch Metric Style */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {summaryLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[92px] w-full" />
          ))
        ) : summaryError ? (
          <div className="col-span-4 rounded-[2px] border border-[#d13212] bg-[#fdf3f2] p-3 text-xs text-[#d13212]">
            Failed to load metrics summary.
          </div>
        ) : (
          <>
            <StatCard
              label="Total Leads"
              value={summaryData?.summary.total ?? 0}
              trend={{ value: "+12.5%", isPositive: true }}
              subtitle="vs last month"
              icon={Users2}
            />
            <StatCard
              label="Conversion Rate"
              value={`${summaryData?.summary.conversionRate ?? 0}%`}
              trend={{ value: "+3.2%", isPositive: true }}
              subtitle="vs avg"
              icon={Percent}
            />
            <StatCard
              label="Won Deals"
              value={summaryData?.summary.won ?? 0}
              trend={{ value: "+8%", isPositive: true }}
              subtitle="this quarter"
              icon={Trophy}
            />
            <StatCard
              label="Lost Leads"
              value={summaryData?.summary.lost ?? 0}
              trend={{ value: "-4.1%", isNeutral: true }}
              subtitle="unqualified"
              icon={XCircle}
            />
          </>
        )}
        <MyTasksTodayWidget />
      </div>

      {/* ROW 2: 2 Charts Side-by-Side (60% / 40%) */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
        {/* Left Chart: Monthly Trend (7 cols ~ 60%) */}
        <div className="rounded-[2px] border border-[#d5d9d9] bg-white lg:col-span-7 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-[#d5d9d9] px-3.5 py-2.5">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#545b64]">
                Leads by Month (Trend)
              </span>
            </div>
            <span className="text-[11px] text-[#879596]">Monthly Volume</span>
          </div>

          <div className="p-3.5">
            {trendLoading ? (
              <Skeleton className="h-[220px] w-full" />
            ) : trendError ? (
              <p className="text-xs text-[#d13212]">Failed to load trend data.</p>
            ) : (
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={trendData?.items ?? []}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid stroke="#eaeded" strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11, fill: "#545b64" }}
                      axisLine={{ stroke: "#d5d9d9" }}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11, fill: "#545b64" }}
                      axisLine={{ stroke: "#d5d9d9" }}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0f1923",
                        border: "none",
                        borderRadius: "2px",
                        color: "#ffffff",
                        fontSize: "12px",
                        padding: "6px 10px",
                      }}
                      itemStyle={{ color: "#ffffff" }}
                      cursor={{ fill: "rgba(0, 102, 204, 0.06)" }}
                    />
                    <Bar
                      dataKey="count"
                      fill="#0066cc"
                      radius={[2, 2, 0, 0]}
                      maxBarSize={40}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Right Chart: Leads by Source (5 cols ~ 40%) */}
        <div className="rounded-[2px] border border-[#d5d9d9] bg-white lg:col-span-5 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-[#d5d9d9] px-3.5 py-2.5">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#545b64]">
                Leads by Source
              </span>
            </div>
            <span className="text-[11px] text-[#879596]">Acquisition Channels</span>
          </div>

          <div className="p-3.5">
            {bySourceLoading ? (
              <Skeleton className="h-[220px] w-full" />
            ) : bySourceError ? (
              <p className="text-xs text-[#d13212]">Failed to load source breakdown.</p>
            ) : (
              <div className="flex flex-col items-center">
                <div className="h-[160px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={bySourceData?.items ?? []}
                      margin={{ top: 0, right: 20, left: 10, bottom: 0 }}
                    >
                      <CartesianGrid stroke="#eaeded" strokeDasharray="3 3" horizontal={false} />
                      <XAxis
                        type="number"
                        allowDecimals={false}
                        tick={{ fontSize: 10, fill: "#545b64" }}
                        axisLine={{ stroke: "#d5d9d9" }}
                        tickLine={false}
                      />
                      <YAxis
                        dataKey="source"
                        type="category"
                        tick={{ fontSize: 11, fill: "#545b64" }}
                        axisLine={{ stroke: "#d5d9d9" }}
                        tickLine={false}
                        width={80}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0f1923",
                          border: "none",
                          borderRadius: "2px",
                          color: "#ffffff",
                          fontSize: "12px",
                          padding: "6px 10px",
                        }}
                      />
                      <Bar dataKey="count" radius={[0, 2, 2, 0]} maxBarSize={16}>
                        {bySourceData?.items.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={SOURCE_COLORS[entry.source] || "#0066cc"}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                {/* Source Legend */}
                <div className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[11px] text-[#545b64]">
                  {bySourceData?.items.map((item) => (
                    <div key={item.source} className="flex items-center gap-1.5">
                      <span
                        className="size-2 rounded-[1px]"
                        style={{
                          backgroundColor: SOURCE_COLORS[item.source] || "#0066cc",
                        }}
                      />
                      <span>
                        {item.source} ({item.count})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ROW 3: 2 Panels (Recent Leads Table & Activity Timeline) */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
        {/* Left: Recent Leads Panel (7 cols) */}
        <div className="rounded-[2px] border border-[#d5d9d9] bg-white lg:col-span-7 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-[#d5d9d9] px-3.5 py-2.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#545b64]">
              Recent Leads
            </span>
            <Link
              href="/leads"
              className="inline-flex items-center text-xs font-medium text-[#0066cc] hover:underline"
            >
              View all leads <ArrowRight className="size-3 ml-1" />
            </Link>
          </div>

          <div className="p-0 flex-1 overflow-x-auto">
            {recentLeadsLoading ? (
              <div className="p-3 space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-7 w-full" />
                ))}
              </div>
            ) : (
              <table className="w-full text-[12px] text-left border-collapse">
                <thead className="bg-[#f1f3f4] border-b border-[#d5d9d9] text-[10px] uppercase font-semibold text-[#545b64]">
                  <tr>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">Source</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#d5d9d9]">
                  {recentLeadsData?.items.slice(0, 5).map((lead) => (
                    <tr key={lead.id} className="hover:bg-[#f8f9fa] transition-colors">
                      <td className="px-3 py-2 font-medium">
                        <Link
                          href={`/leads/${lead.id}`}
                          className="text-[#0066cc] hover:underline"
                        >
                          {lead.name}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-[#545b64]">{lead.email}</td>
                      <td className="px-3 py-2 text-[#545b64]">{lead.source}</td>
                      <td className="px-3 py-2">
                        <StatusBadge status={lead.status} />
                      </td>
                    </tr>
                  ))}
                  {(!recentLeadsData || recentLeadsData.items.length === 0) && (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-xs text-[#879596]">
                        No recent leads found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right: Activity Timeline Panel (5 cols) */}
        <div className="rounded-[2px] border border-[#d5d9d9] bg-white lg:col-span-5 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-[#d5d9d9] px-3.5 py-2.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#545b64]">
              Audit & Activity Feed
            </span>
            <span className="text-[11px] text-[#879596]">Latest Events</span>
          </div>

          <div className="p-3.5 flex-1 max-h-[260px] overflow-y-auto">
            {activityLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : activityError ? (
              <p className="text-xs text-[#d13212]">Failed to load activity feed.</p>
            ) : (
              <div className="space-y-3">
                {activityData?.items.map((item) => (
                  <div
                    key={item._id}
                    className="flex items-start gap-2.5 border-l-2 border-[#d5d9d9] pl-3 text-xs"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-semibold text-[#0f1923] truncate">
                          {item.user?.name ?? "System User"}
                        </span>
                        <span className="text-[10px] text-[#879596] whitespace-nowrap">
                          {formatTimestamp(item.createdAt)}
                        </span>
                      </div>
                      <p className="text-[#545b64] text-[12px] mt-0.5 leading-snug">
                        {item.message}{" "}
                        {item.lead && (
                          <span className="font-medium text-[#0066cc]">
                            ({item.lead.name})
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                ))}
                {(!activityData || activityData.items.length === 0) && (
                  <p className="py-6 text-center text-xs text-[#879596]">
                    No activity recorded yet.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
