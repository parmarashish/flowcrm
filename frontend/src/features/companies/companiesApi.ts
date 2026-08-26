import { apiSlice } from "@/store/apiSlice";

export interface Company {
  id: string;
  name: string;
  industry?: string;
  website?: string;
  address?: string;
  createdBy: string;
  contactsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyContact {
  id: string;
  name: string;
  email: string;
  phone: string;
  designation?: string;
}

export interface CompaniesQueryParams {
  search?: string;
  page?: number;
  limit?: number;
}

interface CompaniesResponse {
  items: Company[];
  total: number;
  page: number;
  limit: number;
}

export interface CompanyDetailResponse {
  company: Company;
  contacts: CompanyContact[];
}

export interface CompanyFormBody {
  name: string;
  industry?: string;
  website?: string;
  address?: string;
}

export const companiesApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getCompanies: builder.query<CompaniesResponse, CompaniesQueryParams | void>({
      query: (params) => ({ url: "/companies", params: params ?? undefined }),
      providesTags: (result) =>
        result
          ? [
              ...result.items.map((company) => ({ type: "Company" as const, id: company.id })),
              { type: "Company" as const, id: "LIST" },
            ]
          : [{ type: "Company" as const, id: "LIST" }],
    }),
    getCompany: builder.query<CompanyDetailResponse, string>({
      query: (id) => `/companies/${id}`,
      providesTags: (_result, _error, id) => [{ type: "Company", id }],
    }),
    createCompany: builder.mutation<{ company: Company }, CompanyFormBody>({
      query: (body) => ({ url: "/companies", method: "POST", body }),
      invalidatesTags: [{ type: "Company", id: "LIST" }],
    }),
    updateCompany: builder.mutation<{ company: Company }, { id: string; body: Partial<CompanyFormBody> }>({
      query: ({ id, body }) => ({ url: `/companies/${id}`, method: "PATCH", body }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Company", id },
        { type: "Company", id: "LIST" },
      ],
    }),
    deleteCompany: builder.mutation<void, string>({
      query: (id) => ({ url: `/companies/${id}`, method: "DELETE" }),
      invalidatesTags: [{ type: "Company", id: "LIST" }, { type: "Contact", id: "LIST" }],
    }),
  }),
});

export const {
  useGetCompaniesQuery,
  useGetCompanyQuery,
  useCreateCompanyMutation,
  useUpdateCompanyMutation,
  useDeleteCompanyMutation,
} = companiesApi;
