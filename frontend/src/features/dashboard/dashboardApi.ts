import { apiSlice } from "@/store/apiSlice";

export interface DashboardSummary {
  total: number;
  won: number;
  lost: number;
  conversionRate: number;
}

export interface BySourceItem {
  source: string;
  count: number;
}

export interface TrendItem {
  month: string;
  count: number;
}

export interface ActivityItem {
  _id: string;
  type: "created" | "status_changed" | "assigned" | "updated" | "deleted";
  message: string;
  meta?: Record<string, unknown>;
  createdAt: string;
  user: { _id: string; name: string } | null;
  lead: { _id: string; name: string } | null;
}

export const dashboardApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getSummary: builder.query<{ summary: DashboardSummary }, void>({
      query: () => "/dashboard/summary",
      providesTags: [{ type: "Lead", id: "LIST" }],
    }),
    getBySource: builder.query<{ items: BySourceItem[] }, void>({
      query: () => "/dashboard/by-source",
      providesTags: [{ type: "Lead", id: "LIST" }],
    }),
    getTrend: builder.query<{ items: TrendItem[] }, void>({
      query: () => "/dashboard/trend",
      providesTags: [{ type: "Lead", id: "LIST" }],
    }),
    getActivity: builder.query<{ items: ActivityItem[] }, void>({
      query: () => "/dashboard/activity",
      providesTags: [{ type: "Activity", id: "LIST" }],
    }),
  }),
});

export const { useGetSummaryQuery, useGetBySourceQuery, useGetTrendQuery, useGetActivityQuery } =
  dashboardApi;
