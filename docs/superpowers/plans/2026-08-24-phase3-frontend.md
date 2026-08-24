# Mini CRM Phase 3: Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Next.js frontend on top of Phase 1's scaffolding and Phase 2's backend API: auth pages, a role-aware protected shell with sidebar, a leads table + Kanban board, a dashboard with charts and activity feed, and an admin-only user management page.

**Architecture:** Redux Toolkit + RTK Query for all server state (one base `apiSlice` with per-feature `injectEndpoints` files), a thin `authSlice` for the JWT + current user (persisted to `localStorage`, rehydrated on load), Next.js App Router with a `(app)` route group holding a client-side auth guard, and shadcn/ui components (installed via CLI onto Phase 1's already-configured `components.json`) for all UI primitives. Date-range filters use plain `<input type="date">` rather than a calendar picker component, and forms use controlled inputs rather than a form library — both deliberate simplifications given the project's scope.

**Tech Stack:** Next.js 15 (App Router), Redux Toolkit + RTK Query, shadcn/ui, Tailwind v4, Recharts, `@dnd-kit/core` + `@dnd-kit/sortable` for the Kanban board, `sonner` for toasts.

**Spec:** [docs/superpowers/specs/2026-08-24-mini-crm-design.md](../specs/2026-08-24-mini-crm-design.md) — this plan implements spec section 5 (frontend structure) against the REAL Phase 2 API (verified directly from the backend source, not assumed from the original spec text — see Global Constraints for the exact contract).

## Global Constraints

- API base URL: `process.env.NEXT_PUBLIC_API_URL` (set in `frontend/.env`, default `http://localhost:5000/api` per `.env.example`).
- Auth: `Authorization: Bearer <token>` header on every authenticated request.
- **Exact response shapes (verified against the real Phase 2 backend, not the original design doc):**
  - `POST /auth/register`, `POST /auth/login` → `201`/`200` `{ token: string, user: PublicUser }`
  - `GET /auth/me` → `{ user: PublicUser }`
  - `PublicUser = { id: string, name: string, email: string, role: "admin"|"team_leader"|"agent", teamLead: string | null }`
  - `GET /users` (admin only) → `{ users: PublicUser[] }`
  - `PATCH /users/:id` (admin only) → `{ user: PublicUser }`
  - `GET /leads?status&source&dateFrom&dateTo&search&page&limit` → `{ items: PublicLead[], total: number, page: number, limit: number }`
  - `PublicLead = { id, name, email, phone, source, status, assignedTo: string, notes?: string, createdAt: string, updatedAt: string }`
  - `POST /leads` → `201 { lead: PublicLead }`; `GET/PATCH /leads/:id` → `{ lead: PublicLead }`; `PATCH /leads/:id/reassign` → `{ lead: PublicLead }`; `DELETE /leads/:id` → `204` no body
  - `GET /dashboard/summary` → `{ summary: { total, won, lost, conversionRate } }`
  - `GET /dashboard/by-source` → `{ items: { source: string, count: number }[] }`
  - `GET /dashboard/trend` → `{ items: { month: string, count: number }[] }` (month is `"YYYY-MM"`)
  - `GET /dashboard/activity` → `{ items: ActivityItem[] }` where `ActivityItem = { _id, type, message, meta?, createdAt, user: { _id, name } | null, lead: { _id, name } | null }` — **note `lead` can be `null`** (deleted leads still show their activity, per Phase 2's Finding 7 fix) and this endpoint returns raw Mongoose shape (`_id`, not `id`) unlike every other endpoint.
  - Error shape (always): `{ error: { message: string, code: string, details?: unknown[] } }`
- `Lead.source` enum: `"Website" | "Referral" | "Cold Call" | "Social Media" | "Other"`. `Lead.status` enum: `"New" | "Contacted" | "Qualified" | "Proposal" | "Won" | "Lost"`.
- Role-based UI rules (mirrors backend enforcement — the backend is authoritative either way, this is just for UX): Admin sees a "Manage Users" nav link and can reassign/delete leads; Team Leader can reassign leads but not delete; Agent can neither reassign nor delete (buttons hidden, not just disabled, to avoid confusing 403s — though the backend still enforces this regardless of what the UI shows).
- TypeScript strict mode (already configured in Phase 1). No automated test suite — verification is via running the dev server and exercising the app in a real browser against the real backend + real MongoDB Atlas data (both already running from Phase 2).

---

### Task 1: Redux store + RTK Query base API slice + auth slice

**Files:**
- Create: `frontend/src/store/store.ts`
- Create: `frontend/src/store/hooks.ts`
- Create: `frontend/src/store/apiSlice.ts`
- Create: `frontend/src/features/auth/authSlice.ts`
- Create: `frontend/src/store/StoreProvider.tsx`
- Modify: `frontend/src/app/layout.tsx` (wrap children in `StoreProvider`)
- Modify: `frontend/package.json` (add `@reduxjs/toolkit`, `react-redux`)

**Interfaces:**
- Produces: `store` (default export type `RootState`, `AppDispatch`) from `store/store.ts`.
- Produces: `useAppDispatch`, `useAppSelector` typed hooks from `store/hooks.ts` — every later task uses these instead of the untyped `react-redux` hooks.
- Produces: `apiSlice` (RTK Query `createApi` instance) from `store/apiSlice.ts`, with `tagTypes: ["Lead", "User", "Activity"]` — every feature API file in later tasks calls `apiSlice.injectEndpoints(...)`.
- Produces: `authSlice` reducer, `setCredentials({token, user})` / `logout()` actions, and a `selectCurrentUser`/`selectToken` pair of selectors from `features/auth/authSlice.ts` — Tasks 3-9 all read auth state through these selectors.

- [ ] **Step 1: Add Redux dependencies to `frontend/package.json`**

Add to `"dependencies"`:
```json
    "@reduxjs/toolkit": "^2.3.0",
    "react-redux": "^9.1.2",
```

- [ ] **Step 2: Create `frontend/src/features/auth/authSlice.ts`**

```typescript
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type UserRole = "admin" | "team_leader" | "agent";

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  teamLead: string | null;
}

interface AuthState {
  token: string | null;
  user: PublicUser | null;
}

const initialState: AuthState = {
  token: null,
  user: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials(state, action: PayloadAction<{ token: string; user: PublicUser }>) {
      state.token = action.payload.token;
      state.user = action.payload.user;
    },
    logout(state) {
      state.token = null;
      state.user = null;
    },
  },
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;

export function selectCurrentUser(state: { auth: AuthState }): PublicUser | null {
  return state.auth.user;
}

export function selectToken(state: { auth: AuthState }): string | null {
  return state.auth.token;
}

const AUTH_STORAGE_KEY = "mini_crm_auth";

export function persistAuth(token: string, user: PublicUser): void {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token, user }));
}

export function clearPersistedAuth(): void {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

export function readPersistedAuth(): { token: string; user: PublicUser } | null {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as { token: string; user: PublicUser };
  } catch {
    return null;
  }
}
```

- [ ] **Step 3: Create `frontend/src/store/apiSlice.ts`**

```typescript
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { RootState } from "./store";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";

export const apiSlice = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({
    baseUrl: API_URL,
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token;
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ["Lead", "User", "Activity"],
  endpoints: () => ({}),
});
```

- [ ] **Step 4: Create `frontend/src/store/store.ts`**

```typescript
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../features/auth/authSlice";
import { apiSlice } from "./apiSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    [apiSlice.reducerPath]: apiSlice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(apiSlice.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

- [ ] **Step 5: Create `frontend/src/store/hooks.ts`**

```typescript
import { useDispatch, useSelector, type TypedUseSelectorHook } from "react-redux";
import type { RootState, AppDispatch } from "./store";

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
```

- [ ] **Step 6: Create `frontend/src/store/StoreProvider.tsx`**

```tsx
"use client";

import { Provider } from "react-redux";
import { store } from "./store";

export function StoreProvider({ children }: { children: React.ReactNode }) {
  return <Provider store={store}>{children}</Provider>;
}
```

- [ ] **Step 7: Modify `frontend/src/app/layout.tsx` to wrap children in `StoreProvider`**

Current content (from Phase 1):
```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mini CRM",
  description: "Open-source Mini CRM for lead management",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

Change to:
```tsx
import type { Metadata } from "next";
import "./globals.css";
import { StoreProvider } from "@/store/StoreProvider";

export const metadata: Metadata = {
  title: "Mini CRM",
  description: "Open-source Mini CRM for lead management",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 8: Install and verify**

Run:
```bash
cd frontend && npm install
npx tsc --noEmit
```
Expected: no errors.

Run (background, then check, then stop):
```bash
npm run dev
```
Wait ~3 seconds, then:
```bash
curl -s http://localhost:3000 | grep "Mini CRM"
```
Expected: page still renders fine (the store wiring shouldn't change the visible placeholder page's content, just wrap it). Check the terminal output / browser console has no Redux-related errors. Stop the dev server afterward.

- [ ] **Step 9: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/src/store frontend/src/features/auth/authSlice.ts frontend/src/app/layout.tsx
git commit -m "feat(frontend): add Redux store, RTK Query base API slice, and auth slice"
```

---

### Task 2: shadcn UI components + supporting dependencies

**Files:**
- Modify: `frontend/package.json` (add chart/dnd/toast dependencies)
- Create (via CLI, not hand-written — see Step 2): `frontend/src/components/ui/{button,input,label,card,table,dialog,select,badge,skeleton,sonner,dropdown-menu,avatar}.tsx`
- Modify: `frontend/src/app/layout.tsx` (add `<Toaster />`)

**Interfaces:**
- Produces: shadcn primitives importable from `@/components/ui/*` — every page task from here on uses these instead of raw HTML elements.

- [ ] **Step 1: Add non-shadcn dependencies to `frontend/package.json`**

Add to `"dependencies"`:
```json
    "@dnd-kit/core": "^6.1.0",
    "@dnd-kit/sortable": "^8.0.0",
    "@dnd-kit/utilities": "^3.2.2",
    "recharts": "^2.13.3",
```

- [ ] **Step 2: Install shadcn components via CLI**

Run from `frontend/`:
```bash
cd frontend && npm install
npx shadcn@latest add button input label card table dialog select badge skeleton sonner dropdown-menu avatar --yes
```
This uses the `components.json` already configured in Phase 1 (style `new-york`, base color `zinc`, CSS variables). If the CLI prompts for anything despite `--yes` (e.g. an "overwrite tailwind config?" question because no `tailwind.config.js` exists in this v4 project), answer/confirm in a way that does NOT create a `tailwind.config.js` or modify `globals.css`'s existing `@theme inline` block — Phase 1 already set up Tailwind v4 CSS-first theming correctly, and shadcn's CLI supports v4 projects without a JS config file. If the CLI truly cannot proceed non-interactively, report BLOCKED with the exact prompt text rather than guessing an answer.

**Verify the CLI actually worked:**
```bash
ls src/components/ui/
```
Expected: `button.tsx`, `input.tsx`, `label.tsx`, `card.tsx`, `table.tsx`, `dialog.tsx`, `select.tsx`, `badge.tsx`, `skeleton.tsx`, `sonner.tsx`, `dropdown-menu.tsx`, `avatar.tsx` all present. Also check `package.json` — the CLI will have added its own Radix UI dependencies (`@radix-ui/react-dialog`, etc.) automatically; that's expected and correct, not scope creep.

- [ ] **Step 3: Add `<Toaster />` to the root layout**

`frontend/src/app/layout.tsx` should now import and render the sonner `Toaster` (from `@/components/ui/sonner`, generated by the CLI) inside `<body>`, alongside the existing `StoreProvider`:
```tsx
import { Toaster } from "@/components/ui/sonner";
```
```tsx
      <body>
        <StoreProvider>{children}</StoreProvider>
        <Toaster />
      </body>
```

- [ ] **Step 4: Install and verify**

Run:
```bash
npx tsc --noEmit
```
Expected: no errors (this confirms the CLI-generated components compile cleanly with the project's strict TypeScript config).

Run (background, then check, then stop) `npm run dev`, confirm the page still loads:
```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000
```
Expected: `200`. Stop the dev server afterward.

- [ ] **Step 5: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/src/components/ui frontend/src/app/layout.tsx frontend/components.json
git commit -m "feat(frontend): install shadcn UI components and chart/dnd dependencies"
```

---

### Task 3: Auth API + login/register pages + auth persistence

**Files:**
- Create: `frontend/src/features/auth/authApi.ts`
- Create: `frontend/src/app/login/page.tsx`
- Create: `frontend/src/app/register/page.tsx`
- Create: `frontend/src/components/AuthInitializer.tsx`
- Modify: `frontend/src/app/layout.tsx` (render `AuthInitializer` once, inside `StoreProvider`)

**Interfaces:**
- Consumes: `apiSlice` (Task 1), `setCredentials`/`persistAuth`/`readPersistedAuth` (Task 1), shadcn `Button`/`Input`/`Label`/`Card` (Task 2).
- Produces: `useLoginMutation`, `useRegisterMutation` RTK Query hooks from `authApi.ts` — not consumed by other Phase 3 tasks directly, but establishes the `injectEndpoints` pattern Tasks 5/6/9 follow.
- Produces: `AuthInitializer` — rendered once at the root; Task 4's protected layout relies on the auth state it hydrates being present before the guard checks it.

- [ ] **Step 1: Create `frontend/src/features/auth/authApi.ts`**

```typescript
import { apiSlice } from "@/store/apiSlice";
import type { PublicUser } from "./authSlice";

interface AuthResponse {
  token: string;
  user: PublicUser;
}

export const authApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    register: builder.mutation<AuthResponse, { name: string; email: string; password: string }>({
      query: (body) => ({ url: "/auth/register", method: "POST", body }),
    }),
    login: builder.mutation<AuthResponse, { email: string; password: string }>({
      query: (body) => ({ url: "/auth/login", method: "POST", body }),
    }),
  }),
});

export const { useRegisterMutation, useLoginMutation } = authApi;
```

- [ ] **Step 2: Create `frontend/src/components/AuthInitializer.tsx`**

```tsx
"use client";

import { useEffect } from "react";
import { useAppDispatch } from "@/store/hooks";
import { setCredentials, readPersistedAuth } from "@/features/auth/authSlice";

export function AuthInitializer() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const persisted = readPersistedAuth();
    if (persisted) {
      dispatch(setCredentials(persisted));
    }
  }, [dispatch]);

  return null;
}
```

- [ ] **Step 3: Render `AuthInitializer` in `frontend/src/app/layout.tsx`**

```tsx
import { AuthInitializer } from "@/components/AuthInitializer";
```
```tsx
      <body>
        <StoreProvider>
          <AuthInitializer />
          {children}
        </StoreProvider>
        <Toaster />
      </body>
```

- [ ] **Step 4: Create `frontend/src/app/login/page.tsx`**

```tsx
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLoginMutation } from "@/features/auth/authApi";
import { useAppDispatch } from "@/store/hooks";
import { setCredentials, persistAuth } from "@/features/auth/authSlice";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [login, { isLoading }] = useLoginMutation();
  const dispatch = useAppDispatch();
  const router = useRouter();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      const result = await login({ email, password }).unwrap();
      dispatch(setCredentials(result));
      persistAuth(result.token, result.user);
      router.push("/dashboard");
    } catch {
      toast.error("Invalid email or password");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Log in to Mini CRM</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Logging in..." : "Log in"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              No account?{" "}
              <a href="/register" className="underline">
                Register
              </a>
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
```

- [ ] **Step 5: Create `frontend/src/app/register/page.tsx`**

```tsx
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRegisterMutation } from "@/features/auth/authApi";
import { useAppDispatch } from "@/store/hooks";
import { setCredentials, persistAuth } from "@/features/auth/authSlice";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [register, { isLoading }] = useRegisterMutation();
  const dispatch = useAppDispatch();
  const router = useRouter();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      const result = await register({ name, email, password }).unwrap();
      dispatch(setCredentials(result));
      persistAuth(result.token, result.user);
      router.push("/dashboard");
    } catch (err) {
      const message =
        (err as { data?: { error?: { message?: string } } })?.data?.error?.message ??
        "Registration failed";
      toast.error(message);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Create your Mini CRM account</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating account..." : "Register"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <a href="/login" className="underline">
                Log in
              </a>
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
```

- [ ] **Step 6: Install and verify**

Run:
```bash
cd frontend && npx tsc --noEmit
```
Expected: no errors.

Run (background, then check, then stop) `npm run dev`, and separately confirm the backend is running (`cd backend && npm run dev` in another background process) since login/register need the real API:
```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/login
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/register
```
Expected: both `200`.

Open the app in a real browser (or use the browser tooling available to you) at `http://localhost:3000/register`, register a brand-new test user (e.g. `phase3test@example.com`), and confirm: the request succeeds, you're redirected to `/dashboard` (it's fine if `/dashboard` itself 404s or is blank right now — that page doesn't exist until Task 4/8; what matters is the redirect happens and no error toast appears), and `localStorage` (check via browser devtools or the browser tool's JS evaluation) now has a `mini_crm_auth` key containing a token and user object. Then reload the page and confirm the auth state survives (still logged in per Redux devtools or by checking `localStorage` persists).

Stop both dev servers afterward.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/features/auth/authApi.ts frontend/src/app/login frontend/src/app/register frontend/src/components/AuthInitializer.tsx frontend/src/app/layout.tsx
git commit -m "feat(frontend): add login/register pages and auth persistence"
```

---

### Task 4: Protected app shell — role-aware sidebar, auth guard, root redirect

**Files:**
- Create: `frontend/src/app/(app)/layout.tsx`
- Create: `frontend/src/components/Sidebar.tsx`
- Modify: `frontend/src/app/page.tsx` (redirect to `/dashboard`)

**Interfaces:**
- Consumes: `selectCurrentUser`, `logout`, `clearPersistedAuth` (Task 1).
- Produces: the `(app)` route group layout that Tasks 5, 7, 8, 9's pages all live inside (`app/(app)/dashboard/page.tsx`, `app/(app)/leads/page.tsx`, etc.) — those tasks assume this layout already redirects unauthenticated users and renders the sidebar around their content.

- [ ] **Step 1: Create `frontend/src/components/Sidebar.tsx`**

```tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectCurrentUser, logout, clearPersistedAuth } from "@/features/auth/authSlice";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/leads", label: "Leads" },
  { href: "/leads/kanban", label: "Kanban" },
];

export function Sidebar() {
  const user = useAppSelector(selectCurrentUser);
  const dispatch = useAppDispatch();
  const router = useRouter();
  const pathname = usePathname();

  function handleLogout() {
    dispatch(logout());
    clearPersistedAuth();
    router.push("/login");
  }

  return (
    <aside className="flex h-screen w-56 flex-col border-r p-4">
      <div className="mb-6 text-lg font-bold">Mini CRM</div>
      <nav className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded px-3 py-2 text-sm hover:bg-muted",
              pathname === item.href && "bg-muted font-medium"
            )}
          >
            {item.label}
          </Link>
        ))}
        {user?.role === "admin" && (
          <Link
            href="/users"
            className={cn(
              "rounded px-3 py-2 text-sm hover:bg-muted",
              pathname === "/users" && "bg-muted font-medium"
            )}
          >
            Manage Users
          </Link>
        )}
      </nav>
      <div className="border-t pt-4">
        <p className="mb-2 text-sm text-muted-foreground">
          {user?.name} ({user?.role})
        </p>
        <Button variant="outline" size="sm" onClick={handleLogout} className="w-full">
          Log out
        </Button>
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Create `frontend/src/app/(app)/layout.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/store/hooks";
import { selectToken } from "@/features/auth/authSlice";
import { Sidebar } from "@/components/Sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const token = useAppSelector(selectToken);
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (token === null) {
      router.replace("/login");
    } else {
      setChecked(true);
    }
  }, [token, router]);

  if (!checked) {
    return null;
  }

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
```

Note: `token === null` on first render (before `AuthInitializer`'s effect runs) will briefly redirect to `/login` even for an already-logged-in user whose token is only in `localStorage`, not yet in Redux state. This is an accepted timing simplification for this project's scope — `AuthInitializer`'s effect and this layout's effect both run on mount, and React batches effects such that in practice the redirect only fires if `localStorage` truly has no token. If you observe a real flicker-to-login bug during Step 4's verification (not just a theoretical race), report it as a concern rather than silently accepting it.

- [ ] **Step 3: Modify `frontend/src/app/page.tsx`**

Current content (from Phase 1):
```tsx
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-2">
      <h1 className="text-3xl font-bold">Mini CRM</h1>
      <p className="text-sm text-muted-foreground">
        Scaffolding complete — Phase 2 (backend API) and Phase 3 (frontend
        features) build on top of this.
      </p>
    </main>
  );
}
```

Replace entirely with:
```tsx
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/dashboard");
}
```

- [ ] **Step 4: Install and verify**

Run:
```bash
cd frontend && npx tsc --noEmit
```
Expected: no errors.

With both dev servers running (backend + frontend), open `http://localhost:3000/` in a browser. Expected: redirected to `/login` if not logged in (no `mini_crm_auth` in localStorage), or to `/dashboard` → sidebar renders (even though `/dashboard`'s own page content doesn't exist until Task 8 — Next.js will 404 on the page content but the `(app)` layout itself, including the sidebar, should still attempt to render around it; if this produces a broken page rather than "sidebar + a 404 body," that's expected and fine at this point in the plan). Log in with the test user from Task 3's verification, confirm you land on `/dashboard` (whatever it currently shows) with the sidebar visible, showing your name/role and a working "Log out" button that clears the session and returns you to `/login`.

Confirm the admin-only "Manage Users" link is hidden for a non-admin test user (register a second test user — it'll default to `agent` role since the DB already has an admin from Phase 2's seed) and appears for the admin (log in as the seeded `admin@example.com` / `password123` from Phase 2's seed script, if you're relying on that data — otherwise use whatever admin account exists in the current database).

Stop both dev servers afterward.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/Sidebar.tsx "frontend/src/app/(app)" frontend/src/app/page.tsx
git commit -m "feat(frontend): add protected app shell with role-aware sidebar and auth guard"
```

---

### Task 5: Leads API + leads table page (filters, search, pagination)

**Files:**
- Create: `frontend/src/features/leads/leadsApi.ts`
- Create: `frontend/src/app/(app)/leads/page.tsx`
- Create: `frontend/src/components/StatusBadge.tsx`

**Interfaces:**
- Consumes: `apiSlice` (Task 1), shadcn `Table`/`Select`/`Input`/`Badge`/`Skeleton` (Task 2), `Sidebar`/`(app)` layout (Task 4).
- Produces: `useGetLeadsQuery`, `useCreateLeadMutation`, `useUpdateLeadMutation`, `useReassignLeadMutation`, `useDeleteLeadMutation` from `leadsApi.ts` — Task 6 (modal) and Task 7 (Kanban) both import these.
- Produces: `StatusBadge` component — Task 7's Kanban cards reuse it.

- [ ] **Step 1: Create `frontend/src/features/leads/leadsApi.ts`**

```typescript
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
```

- [ ] **Step 2: Create `frontend/src/components/StatusBadge.tsx`**

```tsx
import { Badge } from "@/components/ui/badge";
import type { LeadStatus } from "@/features/leads/leadsApi";

const STATUS_VARIANT: Record<LeadStatus, string> = {
  New: "bg-blue-100 text-blue-800",
  Contacted: "bg-amber-100 text-amber-800",
  Qualified: "bg-purple-100 text-purple-800",
  Proposal: "bg-indigo-100 text-indigo-800",
  Won: "bg-green-100 text-green-800",
  Lost: "bg-red-100 text-red-800",
};

export function StatusBadge({ status }: { status: LeadStatus }) {
  return <Badge className={STATUS_VARIANT[status]}>{status}</Badge>;
}
```

- [ ] **Step 3: Create `frontend/src/app/(app)/leads/page.tsx`**

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGetLeadsQuery, type LeadSource, type LeadStatus } from "@/features/leads/leadsApi";
import { StatusBadge } from "@/components/StatusBadge";

const STATUSES: LeadStatus[] = ["New", "Contacted", "Qualified", "Proposal", "Won", "Lost"];
const SOURCES: LeadSource[] = ["Website", "Referral", "Cold Call", "Social Media", "Other"];

export default function LeadsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<LeadStatus | "all">("all");
  const [source, setSource] = useState<LeadSource | "all">("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, isFetching } = useGetLeadsQuery({
    search: search || undefined,
    status: status === "all" ? undefined : status,
    source: source === "all" ? undefined : source,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    page,
    limit: 20,
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Leads</h1>
        <Link href="/leads/new">
          <Button>Add Lead</Button>
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="Search name or email..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="max-w-xs"
        />
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v as LeadStatus | "all");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={source}
          onValueChange={(v) => {
            setSource(v as LeadSource | "all");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sources</SelectItem>
            {SOURCES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => {
            setDateFrom(e.target.value);
            setPage(1);
          }}
          className="w-40"
        />
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => {
            setDateTo(e.target.value);
            setPage(1);
          }}
          className="w-40"
        />
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.items.map((lead) => (
              <TableRow key={lead.id}>
                <TableCell>
                  <Link href={`/leads/${lead.id}`} className="underline">
                    {lead.name}
                  </Link>
                </TableCell>
                <TableCell>{lead.email}</TableCell>
                <TableCell>{lead.phone}</TableCell>
                <TableCell>{lead.source}</TableCell>
                <TableCell>
                  <StatusBadge status={lead.status} />
                </TableCell>
              </TableRow>
            ))}
            {data?.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No leads found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}

      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          Page {data?.page ?? 1} of {totalPages} ({data?.total ?? 0} total)
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || isFetching}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages || isFetching}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
```

Note: this page links to `/leads/new` and `/leads/:id` which don't exist until Task 6 — that's expected at this point in the plan.

- [ ] **Step 4: Install and verify**

Run:
```bash
cd frontend && npx tsc --noEmit
```
Expected: no errors.

With both dev servers running, log in (via the UI, using the seeded admin or a test user from earlier tasks) and navigate to `/leads`. Confirm the table renders real leads from the database (Phase 2's seed data or whatever exists), the search box filters results as you type (after a brief debounce-free refetch — that's fine, no debouncing is implemented and isn't required by this task), the status/source selects filter correctly, and pagination buttons work if there are more than 20 leads (the seed script creates 25, so this should be exercisable).

Stop both dev servers afterward.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/leads/leadsApi.ts "frontend/src/app/(app)/leads/page.tsx" frontend/src/components/StatusBadge.tsx
git commit -m "feat(frontend): add leads API slice and leads table page with filters"
```

---

### Task 6: Add/Edit Lead pages + delete + reassign

**Files:**
- Create: `frontend/src/app/(app)/leads/new/page.tsx`
- Create: `frontend/src/app/(app)/leads/[id]/page.tsx`
- Create: `frontend/src/components/LeadForm.tsx`

**Interfaces:**
- Consumes: `useCreateLeadMutation`, `useUpdateLeadMutation`, `useReassignLeadMutation`, `useDeleteLeadMutation`, `useGetLeadQuery` (Task 5), `selectCurrentUser` (Task 1).
- Produces: `LeadForm` — a controlled form component reused by both the "new" and "edit" pages (takes `initialValues` + `onSubmit`).

- [ ] **Step 1: Create `frontend/src/components/LeadForm.tsx`**

```tsx
"use client";

import { useState, type FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { LeadSource, LeadStatus } from "@/features/leads/leadsApi";

const SOURCES: LeadSource[] = ["Website", "Referral", "Cold Call", "Social Media", "Other"];
const STATUSES: LeadStatus[] = ["New", "Contacted", "Qualified", "Proposal", "Won", "Lost"];

export interface LeadFormValues {
  name: string;
  email: string;
  phone: string;
  source: LeadSource;
  status: LeadStatus;
  notes: string;
}

interface LeadFormProps {
  initialValues?: Partial<LeadFormValues>;
  onSubmit: (values: LeadFormValues) => void | Promise<void>;
  submitLabel: string;
  isSubmitting?: boolean;
}

export function LeadForm({ initialValues, onSubmit, submitLabel, isSubmitting }: LeadFormProps) {
  const [values, setValues] = useState<LeadFormValues>({
    name: initialValues?.name ?? "",
    email: initialValues?.email ?? "",
    phone: initialValues?.phone ?? "",
    source: initialValues?.source ?? "Website",
    status: initialValues?.status ?? "New",
    notes: initialValues?.notes ?? "",
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit(values);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          required
          value={values.name}
          onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          required
          value={values.email}
          onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="phone">Phone</Label>
        <Input
          id="phone"
          required
          value={values.phone}
          onChange={(e) => setValues((v) => ({ ...v, phone: e.target.value }))}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label>Source</Label>
        <Select
          value={values.source}
          onValueChange={(v) => setValues((val) => ({ ...val, source: v as LeadSource }))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SOURCES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <Label>Status</Label>
        <Select
          value={values.status}
          onValueChange={(v) => setValues((val) => ({ ...val, status: v as LeadStatus }))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="notes">Notes</Label>
        <Input
          id="notes"
          value={values.notes}
          onChange={(e) => setValues((v) => ({ ...v, notes: e.target.value }))}
        />
      </div>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : submitLabel}
      </Button>
    </form>
  );
}
```

- [ ] **Step 2: Create `frontend/src/app/(app)/leads/new/page.tsx`**

```tsx
"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LeadForm, type LeadFormValues } from "@/components/LeadForm";
import { useCreateLeadMutation } from "@/features/leads/leadsApi";

export default function NewLeadPage() {
  const [createLead, { isLoading }] = useCreateLeadMutation();
  const router = useRouter();

  async function handleSubmit(values: LeadFormValues) {
    try {
      await createLead(values).unwrap();
      toast.success("Lead created");
      router.push("/leads");
    } catch {
      toast.error("Failed to create lead");
    }
  }

  return (
    <div className="max-w-lg">
      <h1 className="mb-4 text-2xl font-bold">Add Lead</h1>
      <LeadForm onSubmit={handleSubmit} submitLabel="Create Lead" isSubmitting={isLoading} />
    </div>
  );
}
```

- [ ] **Step 3: Create `frontend/src/app/(app)/leads/[id]/page.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LeadForm, type LeadFormValues } from "@/components/LeadForm";
import {
  useGetLeadQuery,
  useUpdateLeadMutation,
  useReassignLeadMutation,
  useDeleteLeadMutation,
} from "@/features/leads/leadsApi";
import { useAppSelector } from "@/store/hooks";
import { selectCurrentUser } from "@/features/auth/authSlice";

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const currentUser = useAppSelector(selectCurrentUser);
  const { data, isLoading } = useGetLeadQuery(id);
  const [updateLead, { isLoading: isUpdating }] = useUpdateLeadMutation();
  const [reassignLead] = useReassignLeadMutation();
  const [deleteLead] = useDeleteLeadMutation();
  const [reassignTo, setReassignTo] = useState("");

  const canReassign = currentUser?.role === "admin" || currentUser?.role === "team_leader";
  const canDelete = currentUser?.role === "admin";

  async function handleSubmit(values: LeadFormValues) {
    try {
      await updateLead({ id, body: values }).unwrap();
      toast.success("Lead updated");
    } catch {
      toast.error("Failed to update lead");
    }
  }

  async function handleReassign() {
    if (!reassignTo.trim()) return;
    try {
      await reassignLead({ id, assignedTo: reassignTo.trim() }).unwrap();
      toast.success("Lead reassigned");
      setReassignTo("");
    } catch {
      toast.error("Failed to reassign lead — check the user id is valid and within your team");
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this lead? This cannot be undone.")) return;
    try {
      await deleteLead(id).unwrap();
      toast.success("Lead deleted");
      router.push("/leads");
    } catch {
      toast.error("Failed to delete lead");
    }
  }

  if (isLoading) return <p>Loading...</p>;
  if (!data) return <p>Lead not found.</p>;

  return (
    <div className="max-w-lg">
      <h1 className="mb-4 text-2xl font-bold">Edit Lead</h1>
      <LeadForm
        initialValues={data.lead}
        onSubmit={handleSubmit}
        submitLabel="Save Changes"
        isSubmitting={isUpdating}
      />

      {canReassign && (
        <div className="mt-6 flex flex-col gap-2 border-t pt-4">
          <label className="text-sm font-medium">Reassign to (user id)</label>
          <div className="flex gap-2">
            <Input
              value={reassignTo}
              onChange={(e) => setReassignTo(e.target.value)}
              placeholder="Target user id"
            />
            <Button onClick={handleReassign}>Reassign</Button>
          </div>
        </div>
      )}

      {canDelete && (
        <div className="mt-6 border-t pt-4">
          <Button variant="destructive" onClick={handleDelete}>
            Delete Lead
          </Button>
        </div>
      )}
    </div>
  );
}
```

Note: reassign uses a raw user-id text input rather than a user picker dropdown — a user picker would need the `/users` endpoint, which is admin-only per Phase 2 (a team_leader can reassign but can't call `GET /users`). This is a deliberate scope simplification; noting it rather than silently building something fancier.

- [ ] **Step 4: Install and verify**

Run:
```bash
cd frontend && npx tsc --noEmit
```
Expected: no errors.

With both dev servers running, log in and:
1. Go to `/leads/new`, create a test lead, confirm redirect to `/leads` and the new lead appears in the table.
2. Click into that lead from the table, confirm the edit form is pre-filled with its data, change the status, save, confirm the toast and that the status change persisted (reload `/leads` and check).
3. If logged in as admin: use the reassign box with a real user id (copy one from the database or from the Phase 2 seed data), confirm it succeeds. Then delete the lead, confirm it's removed from the table.
4. If logged in as a plain agent: confirm the reassign and delete sections are not rendered at all on the lead detail page.

Stop both dev servers afterward.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/LeadForm.tsx "frontend/src/app/(app)/leads/new" "frontend/src/app/(app)/leads/[id]"
git commit -m "feat(frontend): add lead create/edit pages with reassign and delete"
```

---

### Task 7: Leads Kanban board

**Files:**
- Create: `frontend/src/app/(app)/leads/kanban/page.tsx`
- Create: `frontend/src/components/kanban/KanbanColumn.tsx`
- Create: `frontend/src/components/kanban/KanbanCard.tsx`

**Interfaces:**
- Consumes: `useGetLeadsQuery`, `useUpdateLeadMutation` (Task 5), `StatusBadge` (Task 5).
- Produces: nothing consumed by later tasks (leaf feature).

- [ ] **Step 1: Create `frontend/src/components/kanban/KanbanCard.tsx`**

```tsx
"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { Lead } from "@/features/leads/leadsApi";

export function KanbanCard({ lead }: { lead: Lead }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="cursor-grab rounded border bg-card p-3 text-sm shadow-sm"
    >
      <p className="font-medium">{lead.name}</p>
      <p className="text-muted-foreground">{lead.email}</p>
    </div>
  );
}
```

- [ ] **Step 2: Create `frontend/src/components/kanban/KanbanColumn.tsx`**

```tsx
"use client";

import { useDroppable } from "@dnd-kit/core";
import type { Lead, LeadStatus } from "@/features/leads/leadsApi";
import { KanbanCard } from "./KanbanCard";

export function KanbanColumn({ status, leads }: { status: LeadStatus; leads: Lead[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={`flex w-64 flex-shrink-0 flex-col gap-2 rounded border p-2 ${
        isOver ? "bg-muted" : ""
      }`}
    >
      <h3 className="mb-1 text-sm font-semibold">
        {status} ({leads.length})
      </h3>
      <div className="flex flex-col gap-2">
        {leads.map((lead) => (
          <KanbanCard key={lead.id} lead={lead} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create `frontend/src/app/(app)/leads/kanban/page.tsx`**

```tsx
"use client";

import { DndContext, type DragEndEvent } from "@dnd-kit/core";
import { toast } from "sonner";
import { useGetLeadsQuery, useUpdateLeadMutation, type LeadStatus } from "@/features/leads/leadsApi";
import { KanbanColumn } from "@/components/kanban/KanbanColumn";

const STATUSES: LeadStatus[] = ["New", "Contacted", "Qualified", "Proposal", "Won", "Lost"];

export default function KanbanPage() {
  const { data, isLoading } = useGetLeadsQuery({ limit: 100 });
  const [updateLead] = useUpdateLeadMutation();

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const newStatus = over.id as LeadStatus;
    const leadId = active.id as string;
    const lead = data?.items.find((l) => l.id === leadId);
    if (!lead || lead.status === newStatus) return;

    try {
      await updateLead({ id: leadId, body: { status: newStatus } }).unwrap();
      toast.success(`Moved to ${newStatus}`);
    } catch {
      toast.error("Failed to update lead status");
    }
  }

  if (isLoading) return <p>Loading...</p>;

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Kanban Board</h1>
      <DndContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STATUSES.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              leads={data?.items.filter((l) => l.status === status) ?? []}
            />
          ))}
        </div>
      </DndContext>
    </div>
  );
}
```

Note: `useGetLeadsQuery({ limit: 100 })` loads up to 100 leads onto the board at once with no further pagination — acceptable for this project's scale (the seed data has 25 leads); a production system with thousands of leads would need a different approach, out of scope here.

- [ ] **Step 4: Install and verify**

Run:
```bash
cd frontend && npx tsc --noEmit
```
Expected: no errors.

With both dev servers running, log in and go to `/leads/kanban`. Confirm all 6 status columns render with the correct leads grouped under each. Using the browser (a real drag interaction, or the browser automation tooling available to you), drag a card from one column to another and confirm: a success toast appears, the card visually moves to the new column, and re-fetching `/leads` (e.g. by navigating to `/leads` and back) shows the status change persisted.

Stop both dev servers afterward.

- [ ] **Step 5: Commit**

```bash
git add "frontend/src/app/(app)/leads/kanban" frontend/src/components/kanban
git commit -m "feat(frontend): add drag-and-drop leads Kanban board"
```

---

### Task 8: Dashboard page — charts + activity feed

**Files:**
- Create: `frontend/src/features/dashboard/dashboardApi.ts`
- Create: `frontend/src/app/(app)/dashboard/page.tsx`
- Create: `frontend/src/components/dashboard/StatCard.tsx`

**Interfaces:**
- Consumes: `apiSlice` (Task 1), Recharts `BarChart`/`LineChart` (Task 2's dependency install), shadcn `Card`/`Skeleton` (Task 2).
- Produces: nothing consumed by later tasks (leaf feature).

- [ ] **Step 1: Create `frontend/src/features/dashboard/dashboardApi.ts`**

```typescript
import { apiSlice } from "@/store/apiSlice";

export interface DashboardSummary {
  total: number;
  won: number;
  lost: number;
  conversionRate: number;
}

export interface BySourceItem {
  source: string;
  count: number;
}

export interface TrendItem {
  month: string;
  count: number;
}

export interface ActivityItem {
  _id: string;
  type: "created" | "status_changed" | "assigned" | "updated" | "deleted";
  message: string;
  meta?: Record<string, unknown>;
  createdAt: string;
  user: { _id: string; name: string } | null;
  lead: { _id: string; name: string } | null;
}

export const dashboardApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getSummary: builder.query<{ summary: DashboardSummary }, void>({
      query: () => "/dashboard/summary",
    }),
    getBySource: builder.query<{ items: BySourceItem[] }, void>({
      query: () => "/dashboard/by-source",
    }),
    getTrend: builder.query<{ items: TrendItem[] }, void>({
      query: () => "/dashboard/trend",
    }),
    getActivity: builder.query<{ items: ActivityItem[] }, void>({
      query: () => "/dashboard/activity",
      providesTags: [{ type: "Activity", id: "LIST" }],
    }),
  }),
});

export const { useGetSummaryQuery, useGetBySourceQuery, useGetTrendQuery, useGetActivityQuery } =
  dashboardApi;
```

- [ ] **Step 2: Create `frontend/src/components/dashboard/StatCard.tsx`**

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Create `frontend/src/app/(app)/dashboard/page.tsx`**

```tsx
"use client";

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/dashboard/StatCard";
import {
  useGetSummaryQuery,
  useGetBySourceQuery,
  useGetTrendQuery,
  useGetActivityQuery,
} from "@/features/dashboard/dashboardApi";

export default function DashboardPage() {
  const { data: summaryData, isLoading: summaryLoading } = useGetSummaryQuery();
  const { data: bySourceData, isLoading: bySourceLoading } = useGetBySourceQuery();
  const { data: trendData, isLoading: trendLoading } = useGetTrendQuery();
  const { data: activityData, isLoading: activityLoading } = useGetActivityQuery();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {summaryLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)
        ) : (
          <>
            <StatCard label="Total Leads" value={summaryData?.summary.total ?? 0} />
            <StatCard label="Won" value={summaryData?.summary.won ?? 0} />
            <StatCard label="Lost" value={summaryData?.summary.lost ?? 0} />
            <StatCard
              label="Conversion Rate"
              value={`${summaryData?.summary.conversionRate ?? 0}%`}
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-2 text-lg font-semibold">Leads by Source</h2>
          {bySourceLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={256}>
              <BarChart data={bySourceData?.items ?? []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="source" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#6366f1" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div>
          <h2 className="mb-2 text-lg font-semibold">Monthly Trend</h2>
          {trendLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={256}>
              <LineChart data={trendData?.items ?? []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#6366f1" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-lg font-semibold">Recent Activity</h2>
        {activityLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <ul className="flex flex-col gap-2">
            {activityData?.items.map((item) => (
              <li key={item._id} className="rounded border p-2 text-sm">
                <span className="font-medium">{item.user?.name ?? "Someone"}</span>{" "}
                <span>{item.message}</span>{" "}
                <span className="text-muted-foreground">
                  ({item.lead?.name ?? "deleted lead"})
                </span>
              </li>
            ))}
            {activityData?.items.length === 0 && (
              <p className="text-sm text-muted-foreground">No activity yet.</p>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
```

Note: `item.lead?.name ?? "deleted lead"` and `item.user?.name ?? "Someone"` correctly handle the backend's documented possibility of a `null` populated `lead` (for activity on a since-deleted lead) — see this plan's Global Constraints.

- [ ] **Step 4: Install and verify**

Run:
```bash
cd frontend && npx tsc --noEmit
```
Expected: no errors.

With both dev servers running, log in and navigate to `/dashboard`. Confirm: the 4 stat cards show real numbers matching what you'd expect from the database (cross-check against `curl -s http://localhost:5000/api/dashboard/summary -H "Authorization: Bearer <token>"` if you want to verify precisely), the bar chart renders one bar per source actually present in the data, the line chart renders the monthly trend, and the activity feed lists real recent actions (including, if you deleted a lead in Task 6's verification, a "deleted" entry showing "(deleted lead)" rather than crashing).

Stop both dev servers afterward.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/dashboard "frontend/src/app/(app)/dashboard" frontend/src/components/dashboard
git commit -m "feat(frontend): add dashboard page with charts and activity feed"
```

---

### Task 9: Manage Users page (admin-only)

**Files:**
- Create: `frontend/src/features/users/usersApi.ts`
- Create: `frontend/src/app/(app)/users/page.tsx`

**Interfaces:**
- Consumes: `apiSlice` (Task 1), `selectCurrentUser` (Task 1), shadcn `Table`/`Select` (Task 2).
- Produces: nothing consumed by later tasks (final leaf feature of Phase 3).

- [ ] **Step 1: Create `frontend/src/features/users/usersApi.ts`**

```typescript
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
```

- [ ] **Step 2: Create `frontend/src/app/(app)/users/page.tsx`**

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGetUsersQuery, useUpdateUserRoleMutation } from "@/features/users/usersApi";
import { useAppSelector } from "@/store/hooks";
import { selectCurrentUser, type UserRole } from "@/features/auth/authSlice";

const ROLES: UserRole[] = ["admin", "team_leader", "agent"];

export default function UsersPage() {
  const currentUser = useAppSelector(selectCurrentUser);
  const router = useRouter();
  const { data, isLoading } = useGetUsersQuery(undefined, { skip: currentUser?.role !== "admin" });
  const [updateUserRole] = useUpdateUserRoleMutation();

  useEffect(() => {
    if (currentUser && currentUser.role !== "admin") {
      router.replace("/dashboard");
    }
  }, [currentUser, router]);

  if (!currentUser || currentUser.role !== "admin") {
    return null;
  }

  const teamLeaders = data?.users.filter((u) => u.role === "team_leader") ?? [];

  async function handleRoleChange(userId: string, role: UserRole) {
    try {
      await updateUserRole({ id: userId, role }).unwrap();
      toast.success("Role updated");
    } catch {
      toast.error("Failed to update role");
    }
  }

  async function handleTeamLeadChange(userId: string, teamLeadId: string) {
    try {
      await updateUserRole({ id: userId, teamLead: teamLeadId === "none" ? null : teamLeadId }).unwrap();
      toast.success("Team lead updated");
    } catch {
      toast.error("Failed to update team lead");
    }
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Manage Users</h1>
      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Team Lead</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Select
                    value={user.role}
                    onValueChange={(v) => handleRoleChange(user.id, v as UserRole)}
                  >
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Select
                    value={user.teamLead ?? "none"}
                    onValueChange={(v) => handleTeamLeadChange(user.id, v)}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {teamLeaders.map((tl) => (
                        <SelectItem key={tl.id} value={tl.id}>
                          {tl.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Install and verify**

Run:
```bash
cd frontend && npx tsc --noEmit
```
Expected: no errors.

With both dev servers running, log in as the seeded admin and navigate to `/users`. Confirm the table lists all users, changing a role via the dropdown persists (reload the page and confirm), and setting a user's Team Lead dropdown to one of the listed team leaders persists too. Then log in as a non-admin user and confirm navigating directly to `/users` redirects to `/dashboard` rather than showing the page or erroring.

Stop both dev servers afterward.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/users "frontend/src/app/(app)/users"
git commit -m "feat(frontend): add admin-only manage users page"
```

---

## Self-Review Notes

- **Spec coverage:** routing (login/register/dashboard/leads/leads-kanban/users, protected layout with sidebar) ✅ Tasks 3-4; Redux Toolkit + RTK Query for all server state ✅ Task 1 + per-feature API files in Tasks 3/5/8/9; shadcn UI ✅ Task 2; Kanban via `@dnd-kit` ✅ Task 7; Recharts bar+line charts ✅ Task 8; loading/error states via Skeleton + sonner toasts ✅ throughout. Two deliberate, disclosed simplifications versus the original spec's implication of richer components: date-range filters use native `<input type="date">` instead of a shadcn Calendar/Popover picker, and lead reassignment uses a raw user-id text input instead of a `GET /users`-backed picker (that endpoint is admin-only, so a team_leader reassigning leads couldn't use it anyway).
- **Placeholder scan:** no TBD/TODO. The two `<Sidebar>` nav-item lists and the `AppLayout`'s auth-check timing note are the only "explained tradeoff" comments, not stand-ins for unfinished work.
- **Type consistency:** `Lead`/`LeadSource`/`LeadStatus` types defined once in `leadsApi.ts` (Task 5) are imported by `StatusBadge`, `LeadForm`, the leads table, and the Kanban board — no redefinition drift. `PublicUser`/`UserRole` defined once in `authSlice.ts` (Task 1) are imported by `Sidebar`, `usersApi.ts`, and the Manage Users page. The dashboard's `ActivityItem` type's `lead: {...} | null` shape is threaded consistently from the API slice through to the JSX's optional-chaining fallback.
