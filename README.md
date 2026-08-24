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
