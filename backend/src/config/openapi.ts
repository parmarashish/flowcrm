export const openapiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Mini CRM API",
    version: "1.0.0",
    description: "REST API for the Mini CRM lead management application.",
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
    },
    "/users/{id}": {
      patch: {
        summary: "Update a user's role or teamLead (admin only)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Updated user" },
          "403": { description: "Forbidden" },
          "404": { description: "User not found" },
        },
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
  },
} as const;
