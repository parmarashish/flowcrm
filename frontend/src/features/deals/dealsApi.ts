import { apiSlice } from "@/store/apiSlice";

export type DealStage = "Negotiation" | "Proposal" | "Contract Sent" | "Won" | "Lost";

export interface DealRef {
  id: string;
  name: string | null;
}

export interface DealLeadRef extends DealRef {
  status?: string;
  source?: string;
}

export interface DealContactRef extends DealRef {
  email?: string;
  phone?: string;
  designation?: string;
}

export interface DealNote {
  id: string;
  text: string;
  author: DealRef | null;
  createdAt: string;
}

export interface Deal {
  id: string;
  title: string;
  lead: DealLeadRef | null;
  contact: DealContactRef | null;
  value: number;
  currency: string;
  stage: DealStage;
  closingDate?: string;
  assignedTo: DealRef | null;
  notes: DealNote[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface DealsQueryParams {
  stage?: DealStage;
  assignedTo?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  limit?: number;
}

interface DealsResponse {
  items: Deal[];
  total: number;
  page: number;
  limit: number;
}

export interface DealSummary {
  totalCount: number;
  totalValue: number;
  activeValue: number;
  byStage: Record<string, { count: number; value: number }>;
}

export interface DealFormBody {
  title: string;
  lead?: string | null;
  contact?: string | null;
  value: number;
  currency?: string;
  stage?: DealStage;
  closingDate?: string | null;
  assignedTo?: string;
}

export const dealsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getDeals: builder.query<DealsResponse, DealsQueryParams | void>({
      query: (params) => ({ url: "/deals", params: params ?? undefined }),
      providesTags: (result) =>
        result
          ? [
              ...result.items.map((deal) => ({ type: "Deal" as const, id: deal.id })),
              { type: "Deal" as const, id: "LIST" },
            ]
          : [{ type: "Deal" as const, id: "LIST" }],
    }),
    getDeal: builder.query<{ deal: Deal }, string>({
      query: (id) => `/deals/${id}`,
      providesTags: (_result, _error, id) => [{ type: "Deal", id }],
    }),
    getDealSummary: builder.query<DealSummary, void>({
      query: () => "/deals/summary",
      providesTags: [{ type: "Deal", id: "SUMMARY" }],
    }),
    createDeal: builder.mutation<{ deal: Deal }, DealFormBody>({
      query: (body) => ({ url: "/deals", method: "POST", body }),
      invalidatesTags: [
        { type: "Deal", id: "LIST" },
        { type: "Deal", id: "SUMMARY" },
      ],
    }),
    updateDeal: builder.mutation<{ deal: Deal }, { id: string; body: Partial<DealFormBody> }>({
      query: ({ id, body }) => ({ url: `/deals/${id}`, method: "PATCH", body }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Deal", id },
        { type: "Deal", id: "LIST" },
        { type: "Deal", id: "SUMMARY" },
      ],
    }),
    reassignDeal: builder.mutation<{ deal: Deal }, { id: string; assignedTo: string }>({
      query: ({ id, assignedTo }) => ({
        url: `/deals/${id}/reassign`,
        method: "PATCH",
        body: { assignedTo },
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Deal", id },
        { type: "Deal", id: "LIST" },
        { type: "Deal", id: "SUMMARY" },
      ],
    }),
    addDealNote: builder.mutation<{ deal: Deal }, { id: string; text: string }>({
      query: ({ id, text }) => ({ url: `/deals/${id}/notes`, method: "POST", body: { text } }),
      invalidatesTags: (_result, _error, { id }) => [{ type: "Deal", id }],
    }),
    deleteDeal: builder.mutation<void, string>({
      query: (id) => ({ url: `/deals/${id}`, method: "DELETE" }),
      invalidatesTags: [
        { type: "Deal", id: "LIST" },
        { type: "Deal", id: "SUMMARY" },
      ],
    }),
  }),
});

export const {
  useGetDealsQuery,
  useGetDealQuery,
  useGetDealSummaryQuery,
  useCreateDealMutation,
  useUpdateDealMutation,
  useReassignDealMutation,
  useAddDealNoteMutation,
  useDeleteDealMutation,
} = dealsApi;
