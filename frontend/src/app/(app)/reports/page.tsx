"use client";

import { useMemo, useState } from "react";
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
  LineChart,
  Line,
} from "recharts";
import { DollarSign, Percent, TrendingUp, CheckCircle2, Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/dashboard/StatCard";
import {
  useGetLeadReportQuery,
  useGetDealReportQuery,
  useGetTaskReportQuery,
  useGetAgentPerformanceQuery,
} from "@/features/reports/reportsApi";
import { exportToCsv } from "@/lib/csv";
import { cn } from "@/lib/utils";

type DatePreset = "7d" | "30d" | "90d" | "custom";

const LEAD_STATUSES = ["New", "Contacted", "Qualified", "Proposal", "Won", "Lost"];
const DEAL_STAGES = ["Negotiation", "Proposal", "Contract Sent", "Won", "Lost"];

const SOURCE_COLORS: Record<string, string> = {
  Website: "#0066cc",
  Referral: "#1d8102",
  "Cold Call": "#e07b00",
  "Social Media": "#7b2cbf",
  Other: "#545b64",
};

const STATUS_COLORS: Record<string, string> = {
  New: "#0066cc",
  Contacted: "#e07b00",
  Qualified: "#7b2cbf",
  Proposal: "#3f51b5",
  Won: "#1d8102",
  Lost: "#d13212",
};

const STAGE_COLORS: Record<string, string> = {
  Negotiation: "#0066cc",
  Proposal: "#3f51b5",
  "Contract Sent": "#7b2cbf",
  Won: "#1d8102",
  Lost: "#d13212",
};

const TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: "#0f1923",
    border: "none",
    borderRadius: "2px",
    color: "#ffffff",
    fontSize: "12px",
    padding: "6px 10px",
  },
  itemStyle: { color: "#ffffff" },
  cursor: { fill: "rgba(0, 102, 204, 0.06)" },
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function getPresetRange(
  preset: DatePreset,
  customFrom: string,
  customTo: string
): { dateFrom?: string; dateTo?: string } {
  if (preset === "custom") {
    return { dateFrom: customFrom || undefined, dateTo: customTo || undefined };
  }
  const days = preset === "7d" ? 7 : preset === "30d" ? 30 : 90;
  const to = new Date();
  const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return { dateFrom: from.toISOString().slice(0, 10), dateTo: to.toISOString().slice(0, 10) };
}

function ChartPanel({
  title,
  subtitle,
  onExport,
  exportDisabled,
  children,
}: {
  title: string;
  subtitle: string;
  onExport: () => void;
  exportDisabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[2px] border border-[#d5d9d9] bg-white flex flex-col justify-between">
      <div className="flex items-center justify-between border-b border-[#d5d9d9] px-3.5 py-2.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#545b64]">
          {title}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[#879596]">{subtitle}</span>
          <button
            onClick={onExport}
            disabled={exportDisabled}
            title="Export to CSV"
            className="text-[#879596] hover:text-[#0066cc] disabled:opacity-40 disabled:hover:text-[#879596] transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            <Download className="size-3.5" />
          </button>
        </div>
      </div>
      <div className="p-3.5">{children}</div>
    </div>
  );
}

function EmptyChartState() {
  return (
    <div className="h-[220px] flex items-center justify-center text-xs text-[#879596]">
      No data for selected period
    </div>
  );
}

export default function ReportsPage() {
  const [preset, setPreset] = useState<DatePreset>("30d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const { dateFrom, dateTo } = getPresetRange(preset, customFrom, customTo);
  const params = { dateFrom, dateTo };

  const leadReport = useGetLeadReportQuery(params);
  const dealReport = useGetDealReportQuery(params);
  const taskReport = useGetTaskReportQuery(params);
  const agentPerf = useGetAgentPerformanceQuery(params);

  const isLoading =
    leadReport.isLoading || dealReport.isLoading || taskReport.isLoading || agentPerf.isLoading;

  function handleRefreshAll() {
    leadReport.refetch();
    dealReport.refetch();
    taskReport.refetch();
    agentPerf.refetch();
  }

  const byStatusFilled = useMemo(() => {
    const map = new Map((leadReport.data?.byStatus ?? []).map((r) => [r.status, r.count]));
    return LEAD_STATUSES.map((status) => ({ status, count: map.get(status) ?? 0 }));
  }, [leadReport.data]);

  const byStageFilled = useMemo(() => {
    const map = new Map((dealReport.data?.byStage ?? []).map((r) => [r.stage, r]));
    return DEAL_STAGES.map((stage) => ({
      stage,
      count: map.get(stage)?.count ?? 0,
      value: map.get(stage)?.value ?? 0,
    }));
  }, [dealReport.data]);

  const sortedAgents = useMemo(() => {
    const items = agentPerf.data?.items ?? [];
    return [...items].sort((a, b) => b.revenue - a.revenue);
  }, [agentPerf.data]);

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#d5d9d9] pb-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-[#0f1923]">
            Reports & Analytics
          </h1>
          <p className="text-xs text-[#545b64]">
            Pipeline performance, revenue trends, and agent productivity.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefreshAll}>
          <RefreshCw className="size-3.5 mr-1.5" />
          Refresh Data
        </Button>
      </div>

      {/* Date Range Presets */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#545b64] mr-1">
          Date Range:
        </span>
        {(
          [
            { key: "7d", label: "Last 7 days" },
            { key: "30d", label: "Last 30 days" },
            { key: "90d", label: "Last 90 days" },
            { key: "custom", label: "Custom" },
          ] as { key: DatePreset; label: string }[]
        ).map((opt) => (
          <button
            key={opt.key}
            onClick={() => setPreset(opt.key)}
            className={cn(
              "h-7 px-2.5 rounded-[2px] border text-xs font-medium cursor-pointer transition-colors",
              preset === opt.key
                ? "bg-[#0066cc] border-[#0066cc] text-white"
                : "bg-white border-[#d5d9d9] text-[#545b64] hover:bg-[#f2f3f3]"
            )}
          >
            {opt.label}
          </button>
        ))}
        {preset === "custom" && (
          <div className="flex items-center gap-2 ml-1">
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-[#879596]">From:</span>
              <Input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="h-7 w-36 text-xs"
              />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-[#879596]">To:</span>
              <Input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="h-7 w-36 text-xs"
              />
            </div>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[92px] w-full" />)
        ) : (
          <>
            <StatCard
              label="Total Revenue"
              value={formatCurrency(dealReport.data?.totalRevenue ?? 0)}
              subtitle="won deals in period"
              icon={DollarSign}
            />
            <StatCard
              label="Win Rate"
              value={formatPercent(dealReport.data?.winRate ?? 0)}
              subtitle="won vs lost"
              icon={Percent}
            />
            <StatCard
              label="Avg Deal Value"
              value={formatCurrency(dealReport.data?.avgDealValue ?? 0)}
              subtitle="per won deal"
              icon={TrendingUp}
            />
            <StatCard
              label="Task Completion Rate"
              value={formatPercent(taskReport.data?.completionRate ?? 0)}
              subtitle="tasks done"
              icon={CheckCircle2}
            />
          </>
        )}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <ChartPanel
          title="Leads by Source"
          subtitle="Acquisition Channels"
          exportDisabled={!leadReport.data?.bySource.length}
          onExport={() =>
            exportToCsv("leads-by-source", leadReport.data?.bySource ?? [], [
              { key: "source", label: "Source" },
              { key: "count", label: "Count" },
            ])
          }
        >
          {leadReport.isLoading ? (
            <Skeleton className="h-[220px] w-full" />
          ) : !leadReport.data?.bySource.length ? (
            <EmptyChartState />
          ) : (
            <div className="flex flex-col items-center">
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={leadReport.data.bySource}
                      dataKey="count"
                      nameKey="source"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                    >
                      {leadReport.data.bySource.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={SOURCE_COLORS[entry.source] || "#0066cc"} />
                      ))}
                    </Pie>
                    <Tooltip {...TOOLTIP_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[11px] text-[#545b64]">
                {leadReport.data.bySource.map((item) => (
                  <div key={item.source} className="flex items-center gap-1.5">
                    <span
                      className="size-2 rounded-[1px]"
                      style={{ backgroundColor: SOURCE_COLORS[item.source] || "#0066cc" }}
                    />
                    <span>
                      {item.source} ({item.count})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ChartPanel>

        <ChartPanel
          title="Leads by Status"
          subtitle="Pipeline Breakdown"
          exportDisabled={!leadReport.data?.total}
          onExport={() =>
            exportToCsv("leads-by-status", byStatusFilled, [
              { key: "status", label: "Status" },
              { key: "count", label: "Count" },
            ])
          }
        >
          {leadReport.isLoading ? (
            <Skeleton className="h-[220px] w-full" />
          ) : !leadReport.data?.total ? (
            <EmptyChartState />
          ) : (
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byStatusFilled} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="#eaeded" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="status"
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
                  <Tooltip {...TOOLTIP_STYLE} />
                  <Bar dataKey="count" radius={[2, 2, 0, 0]} maxBarSize={40}>
                    {byStatusFilled.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status] || "#0066cc"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartPanel>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <ChartPanel
          title="Monthly Revenue Trend"
          subtitle="Won Deals"
          exportDisabled={!dealReport.data?.revenueByMonth.length}
          onExport={() =>
            exportToCsv("monthly-revenue-trend", dealReport.data?.revenueByMonth ?? [], [
              { key: "month", label: "Month" },
              { key: "revenue", label: "Revenue" },
            ])
          }
        >
          {dealReport.isLoading ? (
            <Skeleton className="h-[220px] w-full" />
          ) : !dealReport.data?.revenueByMonth.length ? (
            <EmptyChartState />
          ) : (
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={dealReport.data.revenueByMonth}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
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
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    {...TOOLTIP_STYLE}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#0066cc"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "#0066cc" }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartPanel>

        <ChartPanel
          title="Deal Stage Funnel"
          subtitle="Pipeline Snapshot"
          exportDisabled={!byStageFilled.some((s) => s.count > 0)}
          onExport={() =>
            exportToCsv("deal-stage-funnel", byStageFilled, [
              { key: "stage", label: "Stage" },
              { key: "count", label: "Count" },
              { key: "value", label: "Value" },
            ])
          }
        >
          {dealReport.isLoading ? (
            <Skeleton className="h-[220px] w-full" />
          ) : !byStageFilled.some((s) => s.count > 0) ? (
            <EmptyChartState />
          ) : (
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={byStageFilled}
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
                    dataKey="stage"
                    type="category"
                    tick={{ fontSize: 11, fill: "#545b64" }}
                    axisLine={{ stroke: "#d5d9d9" }}
                    tickLine={false}
                    width={90}
                  />
                  <Tooltip {...TOOLTIP_STYLE} />
                  <Bar dataKey="count" radius={[0, 2, 2, 0]} maxBarSize={16}>
                    {byStageFilled.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={STAGE_COLORS[entry.stage] || "#0066cc"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartPanel>
      </div>

      {/* Agent Performance Table */}
      <div className="rounded-[2px] border border-[#d5d9d9] bg-white">
        <div className="flex items-center justify-between border-b border-[#d5d9d9] px-3.5 py-2.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#545b64]">
            Agent Performance
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[#879596]">Sorted by revenue</span>
            <button
              onClick={() =>
                exportToCsv("agent-performance", sortedAgents, [
                  { key: "agentName", label: "Agent" },
                  { key: "leadsCount", label: "Leads" },
                  { key: "dealsWon", label: "Deals Won" },
                  { key: "revenue", label: "Revenue" },
                  { key: "tasksDone", label: "Tasks Done" },
                  { key: "winRate", label: "Win Rate (%)" },
                ])
              }
              disabled={!sortedAgents.length}
              title="Export to CSV"
              className="text-[#879596] hover:text-[#0066cc] disabled:opacity-40 disabled:hover:text-[#879596] transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              <Download className="size-3.5" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {agentPerf.isLoading ? (
            <div className="p-3 space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          ) : (
            <table className="w-full text-left text-[13px] border-collapse">
              <thead className="bg-[#f1f3f4] border-b border-[#d5d9d9] select-none">
                <tr>
                  <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[#545b64]">
                    Agent
                  </th>
                  <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[#545b64]">
                    Leads
                  </th>
                  <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[#545b64]">
                    Deals Won
                  </th>
                  <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[#545b64]">
                    Revenue
                  </th>
                  <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[#545b64]">
                    Tasks Done
                  </th>
                  <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[#545b64]">
                    Win Rate
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#d5d9d9]">
                {sortedAgents.map((agent) => (
                  <tr key={agent.agentId} className="h-10 transition-colors hover:bg-[#f8f9fa]">
                    <td className="px-3 py-2 font-medium text-[#0f1923]">{agent.agentName}</td>
                    <td className="px-3 py-2 text-[#545b64]">{agent.leadsCount}</td>
                    <td className="px-3 py-2 text-[#545b64]">{agent.dealsWon}</td>
                    <td className="px-3 py-2 font-semibold text-[#0f1923]">
                      {formatCurrency(agent.revenue)}
                    </td>
                    <td className="px-3 py-2 text-[#545b64]">{agent.tasksDone}</td>
                    <td className="px-3 py-2 text-[#545b64]">{formatPercent(agent.winRate)}</td>
                  </tr>
                ))}

                {sortedAgents.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-[#879596]">
                      No agent activity for the selected period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
