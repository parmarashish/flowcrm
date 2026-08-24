# Mini CRM Phase 1: Scaffolding — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the npm-workspaces monorepo skeleton (backend Express app + frontend Next.js app), Docker Compose, and README, with nothing but a health check and a placeholder page — no business logic yet.

**Architecture:** Root npm-workspaces monorepo with `backend/` (Express + TypeScript, ESM, `tsx` for dev) and `frontend/` (Next.js 15 App Router + TypeScript + Tailwind v4 + shadcn config). Each workspace is independently runnable; a root `dev` script runs both concurrently. MongoDB is external (Atlas) — the backend attempts a connection at startup but does not crash if it's unreachable, since no real credentials exist yet at this phase.

**Tech Stack:** Node.js 20+, TypeScript, Express 4, Mongoose 8, tsx, Next.js 15, React 19, Tailwind CSS v4, npm workspaces, Docker + Docker Compose.

**Spec:** [docs/superpowers/specs/2026-08-24-mini-crm-design.md](../specs/2026-08-24-mini-crm-design.md)

## Global Constraints

- npm workspaces monorepo: `backend/` and `frontend/` as workspaces (per spec §1).
- MongoDB is Atlas (cloud) — no `mongo` service in docker-compose (per spec, "Decisions carried from brainstorming").
- No formal test suite in this project's scope — verification is via manual run/curl checks, not automated unit tests (per spec, "Decisions carried from brainstorming").
- TypeScript throughout, `strict: true`.
- Folder structure must match spec §1 exactly (`backend/src/{config,models,controllers,routes,middleware,services,utils}`, `frontend/src/{app,components,features,lib,store}`).

---

### Task 1: Backend skeleton (Express + health check)

**Files:**
- Create: `backend/package.json`
- Create: `backend/tsconfig.json`
- Create: `backend/.env.example`
- Create: `backend/.gitignore`
- Create: `backend/src/config/env.ts`
- Create: `backend/src/config/db.ts`
- Create: `backend/src/server.ts`
- Create: `backend/src/models/.gitkeep`
- Create: `backend/src/controllers/.gitkeep`
- Create: `backend/src/routes/.gitkeep`
- Create: `backend/src/middleware/.gitkeep`
- Create: `backend/src/services/.gitkeep`
- Create: `backend/src/utils/.gitkeep`

**Interfaces:**
- Produces: `connectDB(): Promise<void>` from `backend/src/config/db.ts` — later tasks (Phase 2) call this from `server.ts` startup; it never throws (logs and resolves on failure).
- Produces: `env` object from `backend/src/config/env.ts` with shape `{ PORT: number, MONGODB_URI: string, JWT_SECRET: string, JWT_EXPIRES_IN: string, CORS_ORIGIN: string }` — Phase 2 auth/middleware code reads `JWT_SECRET`/`JWT_EXPIRES_IN` from here.
- Produces: Express app listens on `env.PORT`, exposes `GET /health`.

- [ ] **Step 1: Create `backend/package.json`**

```json
{
  "name": "backend",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "main": "dist/server.js",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.21.1",
    "mongoose": "^8.8.3"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/node": "^22.10.1",
    "tsx": "^4.19.2",
    "typescript": "^5.7.2"
  }
}
```

- [ ] **Step 2: Create `backend/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create `backend/.env.example`**

```
PORT=5000
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/mini_crm?retryWrites=true&w=majority
JWT_SECRET=change-this-to-a-long-random-string
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:3000
```

- [ ] **Step 4: Create `backend/.gitignore`**

```
node_modules/
dist/
.env
*.log
```

- [ ] **Step 5: Create `backend/src/config/env.ts`**

```typescript
import "dotenv/config";

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  PORT: Number(process.env.PORT ?? 5000),
  MONGODB_URI: required("MONGODB_URI", ""),
  JWT_SECRET: required("JWT_SECRET", "dev-secret-change-me"),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? "7d",
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? "http://localhost:3000",
};
```

- [ ] **Step 6: Create `backend/src/config/db.ts`**

```typescript
import mongoose from "mongoose";
import { env } from "./env.js";

export async function connectDB(): Promise<void> {
  if (!env.MONGODB_URI) {
    console.warn("[db] MONGODB_URI not set — skipping database connection.");
    return;
  }
  try {
    await mongoose.connect(env.MONGODB_URI);
    console.log("[db] connected to MongoDB");
  } catch (err) {
    console.error("[db] failed to connect to MongoDB:", (err as Error).message);
  }
}

export function isDbConnected(): boolean {
  return mongoose.connection.readyState === 1;
}
```

- [ ] **Step 7: Create `backend/src/server.ts`**

```typescript
import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import { connectDB, isDbConnected } from "./config/db.js";

const app = express();

app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", db: isDbConnected() ? "connected" : "disconnected" });
});

async function start() {
  await connectDB();
  app.listen(env.PORT, () => {
    console.log(`[server] listening on http://localhost:${env.PORT}`);
  });
}

start();
```

- [ ] **Step 8: Create empty-directory placeholders**

Run:
```bash
mkdir -p backend/src/models backend/src/controllers backend/src/routes backend/src/middleware backend/src/services backend/src/utils
touch backend/src/models/.gitkeep backend/src/controllers/.gitkeep backend/src/routes/.gitkeep backend/src/middleware/.gitkeep backend/src/services/.gitkeep backend/src/utils/.gitkeep
```

- [ ] **Step 9: Install and verify**

Run:
```bash
cd backend && npm install
```
Expected: installs cleanly, creates `backend/node_modules` and `backend/package-lock.json`.

Run (background, then check, then stop):
```bash
npm run dev
```
Wait ~2 seconds, then in another shell:
```bash
curl -s http://localhost:5000/health
```
Expected: `{"status":"ok","db":"disconnected"}` (disconnected is correct — no real `MONGODB_URI` is configured yet). Stop the dev server afterward.

- [ ] **Step 10: Commit**

```bash
git add backend/
git commit -m "feat(backend): scaffold Express app with health check"
```

---

### Task 2: Frontend skeleton (Next.js 15 + Tailwind v4 + shadcn config)

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/tsconfig.json`
- Create: `frontend/next.config.ts`
- Create: `frontend/postcss.config.mjs`
- Create: `frontend/components.json`
- Create: `frontend/.env.example`
- Create: `frontend/.gitignore`
- Create: `frontend/src/app/layout.tsx`
- Create: `frontend/src/app/page.tsx`
- Create: `frontend/src/app/globals.css`
- Create: `frontend/src/lib/utils.ts`
- Create: `frontend/src/components/.gitkeep`
- Create: `frontend/src/features/.gitkeep`
- Create: `frontend/src/store/.gitkeep`

**Interfaces:**
- Produces: `cn(...)` helper from `frontend/src/lib/utils.ts` — every shadcn component added in Phase 3 imports this.
- Produces: `components.json` shadcn config — Phase 3 runs `npx shadcn@latest add <component>` against this, no re-init needed.
- Produces: root layout importing `globals.css`, so Phase 3 pages just need to add content, not re-wire Tailwind.

- [ ] **Step 1: Create `frontend/package.json`**

```json
{
  "name": "frontend",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "lucide-react": "^0.462.0",
    "next": "^15.0.3",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "tailwind-merge": "^2.5.5",
    "tailwindcss-animate": "^1.0.7"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4.0.0",
    "@types/node": "^22.10.1",
    "@types/react": "^19.0.1",
    "@types/react-dom": "^19.0.2",
    "postcss": "^8.4.49",
    "tailwindcss": "^4.0.0",
    "typescript": "^5.7.2"
  }
}
```

- [ ] **Step 2: Create `frontend/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "moduleResolution": "bundler",
    "module": "esnext",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "paths": {
      "@/*": ["./src/*"]
    },
    "plugins": [{ "name": "next" }]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create `frontend/next.config.ts`**

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {};

export default nextConfig;
```

- [ ] **Step 4: Create `frontend/postcss.config.mjs`**

```javascript
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
```

- [ ] **Step 5: Create `frontend/src/app/globals.css`**

```css
@import "tailwindcss";

:root {
  --background: 0 0% 100%;
  --foreground: 240 10% 3.9%;
  --primary: 240 5.9% 10%;
  --primary-foreground: 0 0% 98%;
  --border: 240 5.9% 90%;
  --radius: 0.5rem;
}

.dark {
  --background: 240 10% 3.9%;
  --foreground: 0 0% 98%;
  --primary: 0 0% 98%;
  --primary-foreground: 240 5.9% 10%;
  --border: 240 3.7% 15.9%;
}

body {
  background-color: hsl(var(--background));
  color: hsl(var(--foreground));
}
```

- [ ] **Step 6: Create `frontend/src/lib/utils.ts`**

```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 7: Create `frontend/components.json`**

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/app/globals.css",
    "baseColor": "zinc",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

- [ ] **Step 8: Create `frontend/src/app/layout.tsx`**

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

- [ ] **Step 9: Create `frontend/src/app/page.tsx`**

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

- [ ] **Step 10: Create `frontend/.env.example`**

```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

- [ ] **Step 11: Create `frontend/.gitignore`**

```
node_modules/
.next/
.env
*.log
```

- [ ] **Step 12: Create empty-directory placeholders**

Run:
```bash
mkdir -p frontend/src/components frontend/src/features frontend/src/store
touch frontend/src/components/.gitkeep frontend/src/features/.gitkeep frontend/src/store/.gitkeep
```

- [ ] **Step 13: Install and verify**

Run:
```bash
cd frontend && npm install
```
Expected: installs cleanly, creates `frontend/node_modules` and `frontend/package-lock.json`.

Run (background, then check, then stop):
```bash
npm run dev
```
Wait ~3 seconds, then:
```bash
curl -s http://localhost:3000 | grep "Mini CRM"
```
Expected: match found (the page renders the heading). Stop the dev server afterward.

- [ ] **Step 14: Commit**

```bash
git add frontend/
git commit -m "feat(frontend): scaffold Next.js 15 app with Tailwind v4 and shadcn config"
```

---

### Task 3: Root workspace wiring

**Files:**
- Create: `package.json` (root)
- Create: `.gitignore` (root)

**Interfaces:**
- Consumes: `backend` and `frontend` workspaces from Tasks 1–2 (must already have their own `package.json` with a `dev` script).
- Produces: root `npm run dev` — runs both workspaces concurrently; Phase 2/3 executors use this to smoke-test the full stack.

- [ ] **Step 1: Create root `package.json`**

```json
{
  "name": "mini-crm",
  "private": true,
  "workspaces": ["backend", "frontend"],
  "scripts": {
    "dev": "concurrently -n backend,frontend -c blue,green \"npm run dev --workspace=backend\" \"npm run dev --workspace=frontend\""
  },
  "devDependencies": {
    "concurrently": "^9.1.0"
  }
}
```

- [ ] **Step 2: Create root `.gitignore`**

```
node_modules/
dist/
.next/
.env
*.log
```

- [ ] **Step 3: Install and verify workspaces resolve**

Run from repo root:
```bash
npm install
```
Expected: a single root `node_modules` (npm hoists workspace deps), root `package-lock.json` lists both `backend` and `frontend` as workspaces, no errors.

- [ ] **Step 4: Verify combined dev run**

Run (background):
```bash
npm run dev
```
Wait ~3 seconds, then:
```bash
curl -s http://localhost:5000/health
curl -s http://localhost:3000 | grep "Mini CRM"
```
Expected: both succeed as in Tasks 1 and 3's individual checks. Stop the process afterward.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json .gitignore
git commit -m "feat: wire npm workspaces and combined dev script"
```

---

### Task 4: Docker Compose + Dockerfiles

**Files:**
- Create: `backend/Dockerfile`
- Create: `frontend/Dockerfile`
- Create: `docker-compose.yml`
- Create: `backend/.dockerignore`
- Create: `frontend/.dockerignore`

**Interfaces:**
- Consumes: `backend`/`frontend` `package.json` `build`/`start` scripts from Tasks 1–2.
- Produces: `docker-compose.yml` at repo root with services `backend` (port 5000) and `frontend` (port 3000) — no `mongo` service, per Global Constraints.

- [ ] **Step 1: Create `backend/Dockerfile`**

```dockerfile
FROM node:20-alpine AS base
WORKDIR /app

COPY package.json package-lock.json* ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
RUN npm install

COPY backend ./backend
WORKDIR /app/backend
RUN npm run build

EXPOSE 5000
CMD ["node", "dist/server.js"]
```

- [ ] **Step 2: Create `frontend/Dockerfile`**

```dockerfile
FROM node:20-alpine AS base
WORKDIR /app

COPY package.json package-lock.json* ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
RUN npm install

COPY frontend ./frontend
WORKDIR /app/frontend
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

- [ ] **Step 3: Create `backend/.dockerignore`**

```
node_modules
dist
.env
```

- [ ] **Step 4: Create `frontend/.dockerignore`**

```
node_modules
.next
.env
```

- [ ] **Step 5: Create `docker-compose.yml`**

```yaml
services:
  backend:
    build:
      context: .
      dockerfile: backend/Dockerfile
    ports:
      - "5000:5000"
    env_file:
      - backend/.env
    restart: unless-stopped

  frontend:
    build:
      context: .
      dockerfile: frontend/Dockerfile
    ports:
      - "3000:3000"
    env_file:
      - frontend/.env
    depends_on:
      - backend
    restart: unless-stopped
```

- [ ] **Step 6: Verify compose file is valid**

Run:
```bash
docker compose config
```
Expected: prints the resolved config with no errors. If Docker is not installed/running in this environment, skip execution and instead visually re-check the YAML indentation and service names against the block above — do not treat a missing Docker daemon as a plan failure.

- [ ] **Step 7: Commit**

```bash
git add backend/Dockerfile frontend/Dockerfile backend/.dockerignore frontend/.dockerignore docker-compose.yml
git commit -m "feat: add Dockerfiles and docker-compose for backend/frontend"
```

---

### Task 5: Root README

**Files:**
- Create: `README.md`

**Interfaces:**
- Consumes: env var names from Tasks 1–2 (`MONGODB_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `PORT`, `CORS_ORIGIN`, `NEXT_PUBLIC_API_URL`) and scripts from Task 3 (`npm run dev`).

- [ ] **Step 1: Create `README.md`**

```markdown
# Mini CRM

An open-source Mini CRM for managing leads through a sales pipeline, with
role-based access (Admin / Team Leader / Agent), a Kanban + table view of
leads, and a dashboard with charts and an activity feed.

![Next.js](https://img.shields.io/badge/Next.js-15-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Express](https://img.shields.io/badge/Express-4-black)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8)
![License](https://img.shields.io/badge/license-MIT-lightgrey)

## Tech Stack

- **Frontend:** Next.js 15, TypeScript, Tailwind CSS v4, shadcn/ui, Recharts, Redux Toolkit
- **Backend:** Node.js, Express, MongoDB (Atlas) via Mongoose, JWT, bcrypt
- **API docs:** Swagger
- **Deployment:** Docker + Docker Compose

## Project Structure

```
mini_crm/
├── backend/     # Express API
└── frontend/    # Next.js app
```

## Setup

1. Clone the repo and install dependencies from the root:
   ```bash
   npm install
   ```
2. Copy the env templates and fill in real values:
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```
   - `backend/.env` needs a MongoDB Atlas connection string in `MONGODB_URI` and a
     random string in `JWT_SECRET`.
   - `frontend/.env` needs `NEXT_PUBLIC_API_URL` pointing at the backend (default
     `http://localhost:5000/api`).
3. Run both apps together:
   ```bash
   npm run dev
   ```
   - Backend: http://localhost:5000 (health check at `/health`)
   - Frontend: http://localhost:3000

### Seeding demo data

Once the backend API is implemented (Phase 2), run:
```bash
npm run seed --workspace=backend
```
This creates a demo Admin, Team Leader, a few Agents, and sample leads.

### Running with Docker

```bash
docker compose up --build
```

## Screenshots

_Coming soon._

## License

MIT
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add project README with setup instructions"
```

---

## Self-Review Notes

- **Spec coverage:** folder structure (§1) ✅ Tasks 1–2; env vars (§6) ✅ Tasks 1–2; docker-compose with no `mongo` service (§6) ✅ Task 4; README with badges/setup/screenshots placeholder (§6) ✅ Task 5. Business logic (models, auth, routes, frontend features) is explicitly out of scope for this phase per the spec's build order — covered by Phase 2/3 plans.
- **Placeholder scan:** no TBD/TODO; the only `.gitkeep` files are legitimate empty-directory markers, not stand-ins for unfinished work.
- **Type consistency:** `env` object shape in `db.ts`/`server.ts` matches `env.ts`; `cn()` signature in `utils.ts` matches shadcn's expected usage for Phase 3.
