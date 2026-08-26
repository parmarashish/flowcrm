import { apiSlice } from "@/store/apiSlice";
import type { PublicUser, UserRole } from "@/features/auth/authSlice";

export type UserStatus = "active" | "inactive";

export type PermissionModule = "leads" | "contacts" | "companies" | "deals" | "tasks" | "reports";

export interface ModulePermission {
  read: boolean;
  write: boolean;
  delete: boolean;
}

export type UserPermissions = Record<PermissionModule, ModulePermission>;

export const PERMISSION_MODULES: PermissionModule[] = [
  "leads",
  "contacts",
  "companies",
  "deals",
  "tasks",
  "reports",
];

export interface AdminUser extends PublicUser {
  status: UserStatus;
  lastLogin: string | null;
  permissions: UserPermissions;
  createdAt: string;
  updatedAt: string;
}

export interface UserActivityItem {
  id: string;
  type: string;
  message: string;
  lead: { id: string; name: string } | null;
  createdAt: string;
}

export interface CreateUserBody {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface UpdateUserBody {
  name?: string;
  email?: string;
  password?: string;
  role?: UserRole;
  teamLead?: string | null;
}

export const usersApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getUsers: builder.query<{ users: AdminUser[] }, void>({
      query: () => "/users",
      providesTags: (result) =>
        result
          ? [
              ...result.users.map((u) => ({ type: "User" as const, id: u.id })),
              { type: "User" as const, id: "LIST" },
            ]
          : [{ type: "User" as const, id: "LIST" }],
    }),
    getUser: builder.query<{ user: AdminUser }, string>({
      query: (id) => `/users/${id}`,
      providesTags: (_result, _error, id) => [{ type: "User", id }],
    }),
    getUserActivity: builder.query<{ items: UserActivityItem[] }, string>({
      query: (id) => `/users/${id}/activity`,
      providesTags: (_result, _error, id) => [{ type: "Activity", id: `user-${id}` }],
    }),
    createUser: builder.mutation<{ user: AdminUser }, CreateUserBody>({
      query: (body) => ({ url: "/users", method: "POST", body }),
      invalidatesTags: [{ type: "User", id: "LIST" }],
    }),
    updateUser: builder.mutation<{ user: AdminUser }, { id: string; body: UpdateUserBody }>({
      query: ({ id, body }) => ({ url: `/users/${id}`, method: "PATCH", body }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "User", id },
        { type: "User", id: "LIST" },
      ],
    }),
    updateUserStatus: builder.mutation<{ user: AdminUser }, { id: string; status: UserStatus }>({
      query: ({ id, status }) => ({ url: `/users/${id}/status`, method: "PATCH", body: { status } }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "User", id },
        { type: "User", id: "LIST" },
      ],
    }),
    updateUserPermissions: builder.mutation<
      { user: AdminUser },
      { id: string; permissions: UserPermissions }
    >({
      query: ({ id, permissions }) => ({
        url: `/users/${id}/permissions`,
        method: "PATCH",
        body: { permissions },
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "User", id },
        { type: "User", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useGetUsersQuery,
  useGetUserQuery,
  useGetUserActivityQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useUpdateUserStatusMutation,
  useUpdateUserPermissionsMutation,
} = usersApi;
