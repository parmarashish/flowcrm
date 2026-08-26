import { apiSlice } from "@/store/apiSlice";

export type TaskType = "Call" | "Email" | "Meeting" | "Follow-up";
export type TaskPriority = "Low" | "Medium" | "High";
export type TaskStatus = "Todo" | "In Progress" | "Done";

export interface TaskRef {
  id: string;
  name: string | null;
}

export interface TaskLeadRef extends TaskRef {
  status?: string;
  source?: string;
}

export interface TaskContactRef extends TaskRef {
  email?: string;
  phone?: string;
  designation?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  type: TaskType;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string;
  assignedTo: TaskRef | null;
  relatedLead: TaskLeadRef | null;
  relatedContact: TaskContactRef | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface TasksQueryParams {
  status?: TaskStatus;
  priority?: TaskPriority;
  assignedTo?: string;
  dateFrom?: string;
  dateTo?: string;
  overdue?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

interface TasksResponse {
  items: Task[];
  total: number;
  page: number;
  limit: number;
}

export interface TaskSummary {
  overdueCount: number;
  dueTodayCount: number;
}

export interface TaskFormBody {
  title: string;
  description?: string;
  type: TaskType;
  priority?: TaskPriority;
  status?: TaskStatus;
  dueDate: string;
  relatedLead?: string | null;
  relatedContact?: string | null;
  assignedTo?: string;
}

export const tasksApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getTasks: builder.query<TasksResponse, TasksQueryParams | void>({
      query: (params) => ({ url: "/tasks", params: params ?? undefined }),
      providesTags: (result) =>
        result
          ? [
              ...result.items.map((task) => ({ type: "Task" as const, id: task.id })),
              { type: "Task" as const, id: "LIST" },
            ]
          : [{ type: "Task" as const, id: "LIST" }],
    }),
    getTask: builder.query<{ task: Task }, string>({
      query: (id) => `/tasks/${id}`,
      providesTags: (_result, _error, id) => [{ type: "Task", id }],
    }),
    getTaskSummary: builder.query<TaskSummary, void>({
      query: () => "/tasks/summary",
      providesTags: [{ type: "Task", id: "SUMMARY" }],
    }),
    createTask: builder.mutation<{ task: Task }, TaskFormBody>({
      query: (body) => ({ url: "/tasks", method: "POST", body }),
      invalidatesTags: [
        { type: "Task", id: "LIST" },
        { type: "Task", id: "SUMMARY" },
      ],
    }),
    updateTask: builder.mutation<{ task: Task }, { id: string; body: Partial<TaskFormBody> }>({
      query: ({ id, body }) => ({ url: `/tasks/${id}`, method: "PATCH", body }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Task", id },
        { type: "Task", id: "LIST" },
        { type: "Task", id: "SUMMARY" },
      ],
    }),
    reassignTask: builder.mutation<{ task: Task }, { id: string; assignedTo: string }>({
      query: ({ id, assignedTo }) => ({
        url: `/tasks/${id}/reassign`,
        method: "PATCH",
        body: { assignedTo },
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Task", id },
        { type: "Task", id: "LIST" },
        { type: "Task", id: "SUMMARY" },
      ],
    }),
    deleteTask: builder.mutation<void, string>({
      query: (id) => ({ url: `/tasks/${id}`, method: "DELETE" }),
      invalidatesTags: [
        { type: "Task", id: "LIST" },
        { type: "Task", id: "SUMMARY" },
      ],
    }),
  }),
});

export const {
  useGetTasksQuery,
  useGetTaskQuery,
  useGetTaskSummaryQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useReassignTaskMutation,
  useDeleteTaskMutation,
} = tasksApi;
