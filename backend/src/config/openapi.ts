export const openapiSpec = {
  openapi: "3.0.3",
  info: {
    title: "FlowCRM API",
    version: "1.0.0",
    description: "REST API for the FlowCRM lead management application.",
  },
  servers: [{ url: "/api" }],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
    schemas: {
      Error: {
        type: "object",
        properties: {
          error: {
            type: "object",
            properties: {
              message: { type: "string" },
              code: { type: "string" },
            },
          },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    "/auth/register": {
      post: {
        summary: "Register a new user",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "email", "password"],
                properties: {
                  name: { type: "string" },
                  email: { type: "string", format: "email" },
                  password: { type: "string", minLength: 8 },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "User created, returns token and user" },
          "400": { description: "Validation error" },
          "409": { description: "Email already registered" },
        },
      },
    },
    "/auth/login": {
      post: {
        summary: "Log in",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Returns token and user" },
          "401": { description: "Invalid credentials" },
        },
      },
    },
    "/auth/me": {
      get: {
        summary: "Get current user profile",
        responses: {
          "200": { description: "Current user" },
          "401": { description: "Missing or invalid token" },
        },
      },
    },
    "/users": {
      get: {
        summary: "List all users (admin only)",
        responses: {
          "200": { description: "List of users" },
          "403": { description: "Forbidden" },
        },
      },
      post: {
        summary: "Create a user with a temporary password (admin only)",
        responses: {
          "201": { description: "Created user" },
          "409": { description: "Email already registered" },
        },
      },
    },
    "/users/{id}": {
      get: {
        summary: "Get a user by id (admin only)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "User" }, "404": { description: "Not found" } },
      },
      patch: {
        summary: "Update a user's name/email/password/role/teamLead (admin only)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Updated user" },
          "403": { description: "Forbidden" },
          "404": { description: "User not found" },
        },
      },
    },
    "/users/{id}/status": {
      patch: {
        summary: "Activate or deactivate a user (admin only, cannot deactivate self)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Updated user" }, "400": { description: "Self-deactivation blocked" } },
      },
    },
    "/users/{id}/permissions": {
      patch: {
        summary: "Update a user's per-module permission grid (admin only; server enforces locked cells per role)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Updated user" } },
      },
    },
    "/users/{id}/activity": {
      get: {
        summary: "Last 5 activity entries performed by this user (admin only)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Recent activity" } },
      },
    },
    "/leads": {
      get: {
        summary: "List leads visible to the requester",
        parameters: [
          { name: "status", in: "query", schema: { type: "string" } },
          { name: "source", in: "query", schema: { type: "string" } },
          { name: "dateFrom", in: "query", schema: { type: "string", format: "date" } },
          { name: "dateTo", in: "query", schema: { type: "string", format: "date" } },
          { name: "search", in: "query", schema: { type: "string" } },
          { name: "page", in: "query", schema: { type: "integer" } },
          { name: "limit", in: "query", schema: { type: "integer" } },
        ],
        responses: { "200": { description: "Paginated list of leads" } },
      },
      post: {
        summary: "Create a lead",
        responses: {
          "201": { description: "Created lead" },
          "400": { description: "Validation error" },
        },
      },
    },
    "/leads/{id}": {
      get: {
        summary: "Get a lead by id",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Lead" }, "404": { description: "Not found" } },
      },
      patch: {
        summary: "Update a lead's fields or status",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Updated lead" }, "404": { description: "Not found" } },
      },
      delete: {
        summary: "Delete a lead (admin only)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "204": { description: "Deleted" }, "403": { description: "Forbidden" } },
      },
    },
    "/leads/{id}/reassign": {
      patch: {
        summary: "Reassign a lead (admin/team_leader only)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Updated lead" }, "403": { description: "Forbidden" } },
      },
    },
    "/dashboard/summary": {
      get: { summary: "Scoped totals + conversion rate", responses: { "200": { description: "Summary" } } },
    },
    "/dashboard/by-source": {
      get: { summary: "Scoped lead counts grouped by source", responses: { "200": { description: "Counts by source" } } },
    },
    "/dashboard/trend": {
      get: { summary: "Scoped monthly lead counts", responses: { "200": { description: "Monthly trend" } } },
    },
    "/dashboard/activity": {
      get: { summary: "Scoped recent activity feed", responses: { "200": { description: "Recent activity" } } },
    },
    "/contacts": {
      get: {
        summary: "List contacts",
        parameters: [
          { name: "search", in: "query", schema: { type: "string" } },
          { name: "company", in: "query", schema: { type: "string" } },
          { name: "page", in: "query", schema: { type: "integer" } },
          { name: "limit", in: "query", schema: { type: "integer" } },
        ],
        responses: { "200": { description: "Paginated list of contacts" } },
      },
      post: {
        summary: "Create a contact",
        responses: { "201": { description: "Created contact" }, "400": { description: "Validation error" } },
      },
    },
    "/contacts/{id}": {
      get: {
        summary: "Get a contact by id, with linked leads and recent activity",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Contact" }, "404": { description: "Not found" } },
      },
      patch: {
        summary: "Update a contact",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Updated contact" }, "404": { description: "Not found" } },
      },
      delete: {
        summary: "Delete a contact (admin only)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "204": { description: "Deleted" }, "403": { description: "Forbidden" } },
      },
    },
    "/companies": {
      get: {
        summary: "List companies",
        parameters: [
          { name: "search", in: "query", schema: { type: "string" } },
          { name: "page", in: "query", schema: { type: "integer" } },
          { name: "limit", in: "query", schema: { type: "integer" } },
        ],
        responses: { "200": { description: "Paginated list of companies" } },
      },
      post: {
        summary: "Create a company",
        responses: { "201": { description: "Created company" }, "400": { description: "Validation error" } },
      },
    },
    "/companies/{id}": {
      get: {
        summary: "Get a company by id, with its contacts",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Company" }, "404": { description: "Not found" } },
      },
      patch: {
        summary: "Update a company",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Updated company" }, "404": { description: "Not found" } },
      },
      delete: {
        summary: "Delete a company (admin only)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "204": { description: "Deleted" }, "403": { description: "Forbidden" } },
      },
    },
    "/deals": {
      get: {
        summary: "List deals visible to the requester",
        parameters: [
          { name: "stage", in: "query", schema: { type: "string" } },
          { name: "assignedTo", in: "query", schema: { type: "string" } },
          { name: "dateFrom", in: "query", schema: { type: "string", format: "date" } },
          { name: "dateTo", in: "query", schema: { type: "string", format: "date" } },
          { name: "search", in: "query", schema: { type: "string" } },
          { name: "page", in: "query", schema: { type: "integer" } },
          { name: "limit", in: "query", schema: { type: "integer" } },
        ],
        responses: { "200": { description: "Paginated list of deals" } },
      },
      post: {
        summary: "Create a deal",
        responses: { "201": { description: "Created deal" }, "400": { description: "Validation error" } },
      },
    },
    "/deals/summary": {
      get: {
        summary: "Scoped pipeline value aggregation, grouped by stage",
        responses: { "200": { description: "Pipeline summary" } },
      },
    },
    "/deals/{id}": {
      get: {
        summary: "Get a deal by id, with populated lead/contact/assignee/notes",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Deal" }, "404": { description: "Not found" } },
      },
      patch: {
        summary: "Update a deal's fields or stage",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Updated deal" }, "404": { description: "Not found" } },
      },
      delete: {
        summary: "Delete a deal (admin only)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "204": { description: "Deleted" }, "403": { description: "Forbidden" } },
      },
    },
    "/deals/{id}/reassign": {
      patch: {
        summary: "Reassign a deal (admin/team_leader only)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Updated deal" }, "403": { description: "Forbidden" } },
      },
    },
    "/deals/{id}/notes": {
      post: {
        summary: "Append a note to a deal's notes timeline",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "201": { description: "Updated deal" }, "404": { description: "Not found" } },
      },
    },
    "/tasks": {
      get: {
        summary: "List tasks visible to the requester",
        parameters: [
          { name: "status", in: "query", schema: { type: "string" } },
          { name: "priority", in: "query", schema: { type: "string" } },
          { name: "assignedTo", in: "query", schema: { type: "string" } },
          { name: "dateFrom", in: "query", schema: { type: "string", format: "date" } },
          { name: "dateTo", in: "query", schema: { type: "string", format: "date" } },
          { name: "overdue", in: "query", schema: { type: "boolean" } },
          { name: "search", in: "query", schema: { type: "string" } },
          { name: "page", in: "query", schema: { type: "integer" } },
          { name: "limit", in: "query", schema: { type: "integer" } },
        ],
        responses: { "200": { description: "Paginated list of tasks" } },
      },
      post: {
        summary: "Create a task",
        responses: { "201": { description: "Created task" }, "400": { description: "Validation error" } },
      },
    },
    "/tasks/summary": {
      get: {
        summary: "Overdue and due-today counts for the requester's own tasks",
        responses: { "200": { description: "Task summary" } },
      },
    },
    "/tasks/{id}": {
      get: {
        summary: "Get a task by id, with populated lead/contact/assignee",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Task" }, "404": { description: "Not found" } },
      },
      patch: {
        summary: "Update a task's fields or status",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Updated task" }, "404": { description: "Not found" } },
      },
      delete: {
        summary: "Delete a task (admin only)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "204": { description: "Deleted" }, "403": { description: "Forbidden" } },
      },
    },
    "/tasks/{id}/reassign": {
      patch: {
        summary: "Reassign a task (admin/team_leader only)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Updated task" }, "403": { description: "Forbidden" } },
      },
    },
    "/reports/leads": {
      get: {
        summary: "Scoped lead report: by source, by status, by agent",
        parameters: [
          { name: "dateFrom", in: "query", schema: { type: "string", format: "date" } },
          { name: "dateTo", in: "query", schema: { type: "string", format: "date" } },
        ],
        responses: { "200": { description: "Lead report" } },
      },
    },
    "/reports/deals": {
      get: {
        summary: "Scoped deal report: revenue by month, win rate, avg deal value, by stage",
        parameters: [
          { name: "dateFrom", in: "query", schema: { type: "string", format: "date" } },
          { name: "dateTo", in: "query", schema: { type: "string", format: "date" } },
        ],
        responses: { "200": { description: "Deal report" } },
      },
    },
    "/reports/tasks": {
      get: {
        summary: "Scoped task report: completion rate, overdue rate, by agent",
        parameters: [
          { name: "dateFrom", in: "query", schema: { type: "string", format: "date" } },
          { name: "dateTo", in: "query", schema: { type: "string", format: "date" } },
        ],
        responses: { "200": { description: "Task report" } },
      },
    },
    "/reports/agents": {
      get: {
        summary: "Scoped per-agent performance: leads, deals won, revenue, tasks done, win rate",
        parameters: [
          { name: "dateFrom", in: "query", schema: { type: "string", format: "date" } },
          { name: "dateTo", in: "query", schema: { type: "string", format: "date" } },
        ],
        responses: { "200": { description: "Agent performance" } },
      },
    },
    "/activity": {
      get: {
        summary: "Cross-module activity log (admin sees all, others see only their own)",
        parameters: [
          { name: "module", in: "query", schema: { type: "string" } },
          { name: "userId", in: "query", schema: { type: "string" } },
          { name: "dateFrom", in: "query", schema: { type: "string", format: "date" } },
          { name: "dateTo", in: "query", schema: { type: "string", format: "date" } },
          { name: "search", in: "query", schema: { type: "string" } },
          { name: "page", in: "query", schema: { type: "integer" } },
          { name: "limit", in: "query", schema: { type: "integer" } },
        ],
        responses: { "200": { description: "Paginated activity log" } },
      },
    },
  },
} as const;
