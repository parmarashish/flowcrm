[![Live Demo](https://img.shields.io/badge/Live%20Demo-flowcrm1.vercel.app-0066cc?style=for-the-badge)](https://flowcrm1.vercel.app)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)]()
[![Next.js](https://img.shields.io/badge/Next.js_15-000000?style=for-the-badge&logo=next.js&logoColor=white)]()
[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)]()
[![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)]()

# FlowCRM
> Pipeline · People · Performance

## 🚀 Live Demo
**URL:** https://flowcrm1.vercel.app

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@flowcrm.com | password123 |
| Manager | manager@flowcrm.com | password123 |
| Agent | agent@flowcrm.com | password123 |

A production-grade CRM built with Next.js 15, TypeScript, Node.js, Express.js, MongoDB, and Tailwind CSS + Shadcn UI.

## Features
- Multi-role auth (Admin / Manager / Agent) with JWT + session invalidation on deactivation
- Lead Management with Kanban board (drag & drop) and pipeline view
- Contacts & Companies with relational linking
- Deals & Transactions with 5-stage Kanban, notes timeline, and pipeline value tracking
- Tasks & Follow-ups with priority/type/status and overdue detection
- Reports & Analytics with date-range filtering, 4 charts across 3 visualization types, and CSV export
- User & Role Management with per-module permission grid
- Activity Log across all 6 modules with full audit trail

## Security Highlights
- Role-scoped data access (agent/manager/admin visibility rules) across all modules
- assignedTo filter guard prevents agents querying other users data
- Server-enforced permission locks (admin all-on, agent delete-off) regardless of API payload
- Live session invalidation — deactivated accounts blocked immediately on next request, not just future logins
- Self-deactivation guard prevents admin lockout

## Bugs Caught & Fixed During Development
- assignedTo filter override vulnerability (Deals) — agents could view other users deals by passing their ID
- $lte midnight UTC boundary bug (Tasks) — due-today filter silently excluded tasks not stored at exactly midnight
- Modulo determinism bug (Seed) — stage cycling formula made fallback dead code on every run
- Form pre-fill bug across 4 dialogs — Radix onOpenChange not firing for externally-controlled open prop
- Deleted record broken links (Activity Log) — fixed by treating type=deleted as non-navigable
- Dashboard activity feed scoped to leads only — fixed to scope by user across all modules

## Tech Stack
- Frontend: Next.js 15, TypeScript, Tailwind CSS, Shadcn UI, Redux Toolkit, RTK Query, Recharts, dnd-kit
- Backend: Node.js, Express.js, MongoDB, Mongoose, Zod, JWT
- DevOps: Docker, docker-compose

## Quick Start
```bash
npm install
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```
Fill in `backend/.env` with a MongoDB connection string (`MONGODB_URI`) and a random `JWT_SECRET`.

```bash
npm run seed
npm run dev
```
- Backend: http://localhost:5000 (health check at `/health`)
- Frontend: http://localhost:3000

### Running with Docker
```bash
docker compose up --build
```

## Seed Credentials
- Admin: admin@flowcrm.com / password123
- Manager: manager@flowcrm.com / password123
- Agent: agent@flowcrm.com / password123
