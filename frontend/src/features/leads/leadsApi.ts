import { apiSlice } from "@/store/apiSlice";

export type LeadSource = "Website" | "Referral" | "Cold Call" | "Social Media" | "Other";
export type LeadStatus = "New" | "Contacted" | "Qualified" | "Proposal" | "Won" | "Lost";

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  source: LeadSource;
  status: LeadStatus;
  assignedTo: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeadsQueryParams {
  status?: LeadStatus;
  source?: LeadSource;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  limit?: number;
}

interface LeadsResponse {
  items: Lead[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateLeadBody {
  name: string;
  email: string;
  phone: string;
  source: LeadSource;
  status?: LeadStatus;
  notes?: string;
  assignedTo?: string;
}

export type UpdateLeadBody = Partial<
  Pick<Lead, "name" | "email" | "phone" | "source" | "status" | "notes">
>;

export const leadsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getLeads: builder.query<LeadsResponse, LeadsQueryParams | void>({
      query: (params) => ({ url: "/leads", params: params ?? undefined }),
      providesTags: (result) =>
        result
          ? [
              ...result.items.map((lead) => ({ type: "Lead" as const, id: lead.id })),
              { type: "Lead" as const, id: "LIST" },
            ]
          : [{ type: "Lead" as const, id: "LIST" }],
    }),
    getLead: builder.query<{ lead: Lead }, string>({
      query: (id) => `/leads/${id}`,
      providesTags: (_result, _error, id) => [{ type: "Lead", id }],
    }),
    createLead: builder.mutation<{ lead: Lead }, CreateLeadBody>({
      query: (body) => ({ url: "/leads", method: "POST", body }),
      invalidatesTags: [{ type: "Lead", id: "LIST" }],
    }),
    updateLead: builder.mutation<{ lead: Lead }, { id: string; body: UpdateLeadBody }>({
      query: ({ id, body }) => ({ url: `/leads/${id}`, method: "PATCH", body }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Lead", id },
        { type: "Lead", id: "LIST" },
      ],
    }),
    reassignLead: builder.mutation<{ lead: Lead }, { id: string; assignedTo: string }>({
      query: ({ id, assignedTo }) => ({
        url: `/leads/${id}/reassign`,
        method: "PATCH",
        body: { assignedTo },
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Lead", id },
        { type: "Lead", id: "LIST" },
      ],
    }),
    deleteLead: builder.mutation<void, string>({
      query: (id) => ({ url: `/leads/${id}`, method: "DELETE" }),
      invalidatesTags: [{ type: "Lead", id: "LIST" }],
    }),
  }),
});

export const {
  useGetLeadsQuery,
  useGetLeadQuery,
  useCreateLeadMutation,
  useUpdateLeadMutation,
  useReassignLeadMutation,
  useDeleteLeadMutation,
} = leadsApi;
