import { apiSlice } from "@/store/apiSlice";
import type { PublicUser, UserRole } from "@/features/auth/authSlice";

export const usersApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getUsers: builder.query<{ users: PublicUser[] }, void>({
      query: () => "/users",
      providesTags: (result) =>
        result
          ? [
              ...result.users.map((u) => ({ type: "User" as const, id: u.id })),
              { type: "User" as const, id: "LIST" },
            ]
          : [{ type: "User" as const, id: "LIST" }],
    }),
    updateUserRole: builder.mutation<
      { user: PublicUser },
      { id: string; role?: UserRole; teamLead?: string | null }
    >({
      query: ({ id, ...body }) => ({ url: `/users/${id}`, method: "PATCH", body }),
      invalidatesTags: [{ type: "User", id: "LIST" }],
    }),
  }),
});

export const { useGetUsersQuery, useUpdateUserRoleMutation } = usersApi;
