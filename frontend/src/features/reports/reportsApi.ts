import { apiSlice } from "@/store/apiSlice";

export interface ReportsQueryParams {
  dateFrom?: string;
  dateTo?: string;
}

export interface LeadReportBySource {
  source: string;
  count: number;
}

export interface LeadReportByStatus {
  status: string;
  count: number;
}

export interface LeadReportByAgent {
  agentId: string;
  agentName: string;
  count: number;
}

export interface LeadReport {
  bySource: LeadReportBySource[];
  byStatus: LeadReportByStatus[];
  byAgent: LeadReportByAgent[];
  total: number;
}

export interface DealRevenueByMonth {
  month: string;
  revenue: number;
}

export interface DealByStage {
  stage: string;
  count: number;
  value: number;
}

export interface DealReport {
  revenueByMonth: DealRevenueByMonth[];
  winRate: number;
  avgDealValue: number;
  totalRevenue: number;
  byStage: DealByStage[];
}

export interface TaskReportByAgent {
  agentId: string;
  agentName: string;
  total: number;
  done: number;
}

export interface TaskReport {
  total: number;
  completedCount: number;
  completionRate: number;
  overdueCount: number;
  overdueRate: number;
  byAgent: TaskReportByAgent[];
}

export interface AgentPerformanceItem {
  agentId: string;
  agentName: string;
  role: string;
  leadsCount: number;
  dealsWon: number;
  revenue: number;
  tasksDone: number;
  winRate: number;
}

interface AgentPerformanceResponse {
  items: AgentPerformanceItem[];
}

export const reportsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getLeadReport: builder.query<LeadReport, ReportsQueryParams | void>({
      query: (params) => ({ url: "/reports/leads", params: params ?? undefined }),
    }),
    getDealReport: builder.query<DealReport, ReportsQueryParams | void>({
      query: (params) => ({ url: "/reports/deals", params: params ?? undefined }),
    }),
    getTaskReport: builder.query<TaskReport, ReportsQueryParams | void>({
      query: (params) => ({ url: "/reports/tasks", params: params ?? undefined }),
    }),
    getAgentPerformance: builder.query<AgentPerformanceResponse, ReportsQueryParams | void>({
      query: (params) => ({ url: "/reports/agents", params: params ?? undefined }),
    }),
  }),
});

export const {
  useGetLeadReportQuery,
  useGetDealReportQuery,
  useGetTaskReportQuery,
  useGetAgentPerformanceQuery,
} = reportsApi;
