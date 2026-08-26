import { apiSlice } from "@/store/apiSlice";

export interface ContactCompanyRef {
  id: string;
  name: string | null;
}

export interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: ContactCompanyRef | null;
  designation?: string;
  linkedLeads: string[];
  leadsCount: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContactLinkedLead {
  id: string;
  name: string;
  status: string;
  source: string;
}

export interface ContactActivityEntry {
  id: string;
  type: string;
  message: string;
  user: string;
  createdAt: string;
}

export interface ContactsQueryParams {
  search?: string;
  company?: string;
  page?: number;
  limit?: number;
}

interface ContactsResponse {
  items: Contact[];
  total: number;
  page: number;
  limit: number;
}

export interface ContactDetailResponse {
  contact: Contact;
  linkedLeads: ContactLinkedLead[];
  activity: ContactActivityEntry[];
}

export interface ContactFormBody {
  name: string;
  email: string;
  phone: string;
  company?: string | null;
  designation?: string;
  linkedLeads?: string[];
}

export const contactsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getContacts: builder.query<ContactsResponse, ContactsQueryParams | void>({
      query: (params) => ({ url: "/contacts", params: params ?? undefined }),
      providesTags: (result) =>
        result
          ? [
              ...result.items.map((contact) => ({ type: "Contact" as const, id: contact.id })),
              { type: "Contact" as const, id: "LIST" },
            ]
          : [{ type: "Contact" as const, id: "LIST" }],
    }),
    getContact: builder.query<ContactDetailResponse, string>({
      query: (id) => `/contacts/${id}`,
      providesTags: (_result, _error, id) => [{ type: "Contact", id }],
    }),
    createContact: builder.mutation<{ contact: Contact }, ContactFormBody>({
      query: (body) => ({ url: "/contacts", method: "POST", body }),
      invalidatesTags: [{ type: "Contact", id: "LIST" }, { type: "Company", id: "LIST" }],
    }),
    updateContact: builder.mutation<{ contact: Contact }, { id: string; body: Partial<ContactFormBody> }>({
      query: ({ id, body }) => ({ url: `/contacts/${id}`, method: "PATCH", body }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Contact", id },
        { type: "Contact", id: "LIST" },
        { type: "Company", id: "LIST" },
      ],
    }),
    deleteContact: builder.mutation<void, string>({
      query: (id) => ({ url: `/contacts/${id}`, method: "DELETE" }),
      invalidatesTags: [{ type: "Contact", id: "LIST" }, { type: "Company", id: "LIST" }],
    }),
  }),
});

export const {
  useGetContactsQuery,
  useGetContactQuery,
  useCreateContactMutation,
  useUpdateContactMutation,
  useDeleteContactMutation,
} = contactsApi;
