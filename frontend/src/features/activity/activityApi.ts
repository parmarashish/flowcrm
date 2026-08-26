import { apiSlice } from "@/store/apiSlice";

export type ActivityModule = "leads" | "contacts" | "companies" | "deals" | "tasks" | "users";
export type ActivityActionType = "created" | "status_changed" | "assigned" | "updated" | "deleted";

export const ACTIVITY_MODULES: ActivityModule[] = [
  "leads",
  "contacts",
  "companies",
  "deals",
  "tasks",
  "users",
];

export interface ActivityLogItem {
  id: string;
  type: ActivityActionType;
  message: string;
  module: ActivityModule;
  recordId: string | null;
  recordTitle: string | null;
  ipAddress: string | null;
  user: { id: string; name: string };
  createdAt: string;
}

export interface ActivityQueryParams {
  module?: ActivityModule;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  limit?: number;
}

interface ActivityResponse {
  items: ActivityLogItem[];
  total: number;
  page: number;
  limit: number;
}

export const activityApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getActivityLog: builder.query<ActivityResponse, ActivityQueryParams | void>({
      query: (params) => ({ url: "/activity", params: params ?? undefined }),
    }),
  }),
});

export const { useGetActivityLogQuery } = activityApi;
