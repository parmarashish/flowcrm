# Mini CRM — Design Spec

Date: 2026-08-24

## Overview

A full-stack, open-source Mini CRM for managing leads through a sales pipeline, with
role-based access (Admin / Team Leader / Agent), a Kanban + table view of leads, and
a dashboard with charts and an activity feed.

Stack: Next.js 15 (TypeScript, App Router), Tailwind CSS + Shadcn UI, Redux Toolkit
(RTK Query) on the frontend; Node.js + Express + Mongoose (MongoDB Atlas) + JWT + bcrypt
on the backend. REST API documented with Swagger. Docker Compose for
frontend + backend (Mongo is external, on Atlas).

## Decisions carried from brainstorming

- **Registration:** open self-registration. The first user ever created becomes `admin`
  automatically; every subsequent registration defaults to `agent`.
- **Seed data:** a seed script populates one demo admin, one team leader, a few agents
  (linked to the team leader), and ~25 sample leads spread across statuses/sources/dates.
- **MongoDB:** MongoDB Atlas (cloud), connected via `MONGODB_URI`. No `mongo` service in
  docker-compose.
- **Tooling:** npm workspaces monorepo (`backend/`, `frontend/` as workspaces).
- **Testing:** no formal test suite in initial scope (not requested); focus effort on
  input validation, server-side authorization, and UI loading/error states instead.

## 1. High-level architecture / folder structure

```
mini_crm/
├── package.json          # root workspace config + shared scripts (dev, seed, docker)
├── docker-compose.yml     # frontend + backend services (Mongo is Atlas, external)
├── backend/               # Express API (MVC)
│   ├── src/
│   │   ├── config/        # db connection, env validation, swagger setup
│   │   ├── models/        # Mongoose schemas: User, Lead, Activity
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── middleware/     # auth (JWT verify), role-check, error handler
│   │   ├── services/       # business logic (e.g. lead visibility scoping, dashboard aggregation)
│   │   ├── utils/
│   │   └── server.ts
│   ├── seed/               # demo data seed script
│   ├── .env.example
│   └── package.json
└── frontend/               # Next.js 15 app
    ├── src/
    │   ├── app/             # App Router pages: login, register, dashboard, leads, leads/kanban, users
    │   ├── components/      # shared UI (shadcn) + feature components
    │   ├── features/        # feature-based slices: auth/, leads/, dashboard/, users/ (RTK Query API slices + local UI state)
    │   ├── lib/              # api client, utils
    │   └── store/            # Redux store setup
    ├── .env.example
    └── package.json
```

Backend and frontend are independently runnable via workspace scripts; root scripts wrap
both for convenience (`npm run dev`, `npm run seed`, etc).

## 2. Data models (Mongoose)

**User**
- `name: string`
- `email: string` (unique)
- `passwordHash: string`
- `role: "admin" | "team_leader" | "agent"`
- `teamLead: ObjectId (ref: User, optional)` — only meaningful for agents; points to the
  Team Leader they report to. Set by Admin via the Manage Users page.
- timestamps

**Lead**
- `name: string`, `email: string`, `phone: string`
- `source: "Website" | "Referral" | "Cold Call" | "Social Media" | "Other"`
- `status: "New" | "Contacted" | "Qualified" | "Proposal" | "Won" | "Lost"`
- `assignedTo: ObjectId (ref: User)`
- `notes?: string`
- timestamps (`createdAt` drives the monthly trend chart; `source`/`status` drive the
  other dashboard charts)

**Activity**
- `lead: ObjectId (ref: Lead)`
- `user: ObjectId (ref: User)` — who performed the action
- `type: "created" | "status_changed" | "assigned" | "updated" | "deleted"`
- `message: string` — human-readable, e.g. "moved to Qualified"
- `meta?: object` — e.g. `{ from: "New", to: "Contacted" }`
- timestamps

Activities are written server-side as a side effect of lead create/update/status-change/
reassign/delete — there is no client-facing "log activity" endpoint.

## 3. Auth & roles

- JWT-based auth. `POST /auth/register` and `POST /auth/login` both return a JWT
  (single long-lived access token, e.g. 7 days — no refresh-token flow).
- Passwords hashed with bcrypt.
- `authMiddleware` verifies the JWT and attaches `req.user`. `requireRole(...)`
  middleware guards role-restricted routes.
- **Manage Users page (Admin-only):** list all users; change a user's `role`; set an
  Agent's `teamLead`. Minimal table + inline selects, no separate create/delete-user
  flow (registration handles creation).
- **Visibility/permission rules** (enforced server-side, not just client-side filtering):
  - **Admin:** sees/manages all leads; can delete leads; can reassign any lead to anyone;
    can manage users.
  - **Team Leader:** sees/manages leads assigned to themself and to any Agent whose
    `teamLead` is them; can create/edit their own leads; can reassign leads within their
    team; cannot delete leads or touch other teams.
  - **Agent:** sees/manages only leads assigned to themself; can create leads (assigned
    to self by default) and edit/update-status on their own leads; cannot reassign,
    delete, or manage users.
  - Implemented as a shared `getVisibleLeadIds`-style scope helper used by every lead
    route (list, get, update, delete), not duplicated per-controller.
- **Dashboard scoping:** same aggregation endpoints for everyone; scoped server-side by
  the requester's role/team. Admin = global, Team Leader = self + team, Agent = self only.

## 4. Backend API surface

All routes under `/api`, JWT-protected except the two auth routes. Swagger UI served at
`/api-docs`. Errors follow a consistent shape `{ error: { message, code } }` via a
central error-handling middleware. Request bodies validated with `zod`.

**Auth**
- `POST /auth/register` — `{name, email, password}` → creates user (first user ever =
  admin, else agent), returns JWT
- `POST /auth/login` — `{email, password}` → JWT
- `GET /auth/me` — current user profile

**Users** (admin-only)
- `GET /users` — list all users
- `PATCH /users/:id` — update `role` and/or `teamLead`

**Leads** (scoped by role)
- `GET /leads` — query params: `status`, `source`, `dateFrom`, `dateTo`, `search`
  (name/email), `page`, `limit`
- `POST /leads` — create
- `GET /leads/:id`
- `PATCH /leads/:id` — edit fields and/or status (status change writes an Activity)
- `PATCH /leads/:id/reassign` — Admin/Team-Leader only, `{assignedTo}`
- `DELETE /leads/:id` — Admin-only

**Dashboard**
- `GET /dashboard/summary` — total leads, conversion rate, won/lost ratio (scoped)
- `GET /dashboard/by-source` — counts grouped by source (bar chart)
- `GET /dashboard/trend` — monthly counts (line chart)
- `GET /dashboard/activity` — recent Activity feed (scoped, last ~20)

## 5. Frontend structure

- **Routing (App Router):** `/login`, `/register`, `/dashboard` (post-login home),
  `/leads` (table view with filters + search), `/leads/kanban` (drag-and-drop board),
  `/users` (Admin-only). An authenticated layout wraps these with a role-aware sidebar
  and redirects unauthenticated users to `/login`.
- **State management:** Redux Toolkit `authSlice` (current user + token, persisted to
  localStorage, rehydrated on load) plus RTK Query for all server data (leads, users,
  dashboard) — gives caching, loading/error state, and auto-refetch after mutations.
  Feature folders: `features/auth`, `features/leads`, `features/dashboard`,
  `features/users`.
- **UI:** Shadcn components (Table, Dialog for add/edit lead modal, Select/DatePicker
  for filters, Badge for status/source, Sidebar, Skeleton for loading, `sonner` for
  toasts). Kanban board built with `@dnd-kit`; dropping a card triggers
  `PATCH /leads/:id` status update.
- **Charts:** Recharts `BarChart` (leads by source), `LineChart` (monthly trend).

## 6. Deployment & config

- `docker-compose.yml`: `backend` (port 5000) and `frontend` (port 3000) services only;
  Mongo is external (Atlas).
- `backend/.env.example`: `MONGODB_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `PORT`,
  `CORS_ORIGIN`
- `frontend/.env.example`: `NEXT_PUBLIC_API_URL`
- `npm run seed --workspace=backend`: demo admin, team leader, a few agents (linked to
  the team leader), ~25 sample leads.
- `README.md`: setup steps, tech stack badges, screenshot placeholders.

## Build order

1. Project scaffolding (folder structure, workspaces, configs, docker-compose, env
   examples, README skeleton)
2. Backend API (models, auth, middleware, lead/user/dashboard routes, Swagger, seed
   script)
3. Frontend (auth pages, layout/sidebar, leads table + filters, Kanban, dashboard,
   manage users page)

Each phase is implemented and checked in before moving to the next.
