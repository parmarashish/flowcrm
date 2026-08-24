# Mini CRM Phase 2: Backend API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full backend REST API on top of Phase 1's Express skeleton: JWT auth with a 3-role hierarchy (admin/team_leader/agent), scoped lead management, activity logging, dashboard aggregation, Swagger docs, and a demo-data seed script.

**Architecture:** MVC-ish layering inside `backend/src/`: `models/` (Mongoose schemas), `controllers/` (request handlers, thin), `services/` (business logic: lead visibility scoping, activity logging, dashboard aggregation), `routes/` (Express routers), `middleware/` (auth, error handling). Request validation via `zod`. A single `AppError` + central `errorHandler` produce the `{error:{message,code}}` shape everywhere. Server-side authorization is enforced by a shared visibility-scope helper used by every lead route — never by client-side filtering.

**Tech Stack:** Express 4, Mongoose 8, zod, jsonwebtoken, bcryptjs, swagger-ui-express (static OpenAPI document, no jsdoc scanning).

**Spec:** [docs/superpowers/specs/2026-08-24-mini-crm-design.md](../specs/2026-08-24-mini-crm-design.md) — this plan implements spec sections 2 (data models), 3 (auth & roles), 4 (API surface), and the seed script from section 6.

## Global Constraints

- No formal test suite in this project's scope — verification is via manual run/curl checks against a real MongoDB connection (already configured in `backend/.env`), not automated unit tests.
- TypeScript `strict: true`, ESM (`"type": "module"`, `NodeNext` resolution, explicit `.js` import specifiers) — matches Phase 1's backend setup exactly.
- All request bodies validated with `zod`; all errors flow through the central `errorHandler` as `{error:{message,code}}`.
- Roles are exactly `"admin" | "team_leader" | "agent"`. Visibility rule (spec §3): Admin sees/manages all leads; Team Leader sees/manages their own leads plus any Agent's leads where that Agent's `teamLead` is them; Agent sees/manages only their own leads. Enforced server-side via a shared scope helper, not per-controller ad hoc logic.
- Lead `source` enum: `"Website" | "Referral" | "Cold Call" | "Social Media" | "Other"`. Lead `status` enum: `"New" | "Contacted" | "Qualified" | "Proposal" | "Won" | "Lost"`.
- Every lead create/update/status-change/reassign/delete writes an `Activity` record server-side — there is no client-facing "log activity" endpoint.

---

### Task 1: Validation & error-handling foundation, zod-based env config

**Files:**
- Create: `backend/src/utils/AppError.ts`
- Create: `backend/src/utils/asyncHandler.ts`
- Create: `backend/src/middleware/errorHandler.ts`
- Modify: `backend/src/config/env.ts` (replace ad hoc `required()` helper with zod schema validation — also fixes two known Phase 1 gaps: `PORT` had no NaN guard, and `JWT_SECRET`'s dev fallback logic was hand-rolled)
- Modify: `backend/src/server.ts` (wire in `errorHandler` as the last middleware)
- Modify: `backend/package.json` (add `zod` dependency)

**Interfaces:**
- Produces: `class AppError extends Error { statusCode: number; code: string }` from `AppError.ts` — every later controller throws this for expected error conditions (404, 401, 403, 409, etc.).
- Produces: `asyncHandler(fn: (req, res, next) => Promise<unknown>) => RequestHandler` from `asyncHandler.ts` — every later async controller function is wrapped in this.
- Produces: `errorHandler(err, req, res, next)` Express error middleware from `errorHandler.ts` — registered once in `server.ts`, never imported elsewhere.
- Produces: same `env` object shape as before (`PORT`, `MONGODB_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CORS_ORIGIN`), now zod-validated. All later tasks import `{ env }` from `../config/env.js` exactly as Phase 1 did — no signature change, only stricter validation internally.

- [ ] **Step 1: Add `zod` to `backend/package.json`**

Open `backend/package.json` and add `"zod": "^3.23.8"` to `"dependencies"` (alphabetical order among the existing `cors`, `dotenv`, `express`, `mongoose`, `zod` entries):

```json
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.21.1",
    "mongoose": "^8.8.3",
    "zod": "^3.23.8"
  },
```

- [ ] **Step 2: Create `backend/src/utils/AppError.ts`**

```typescript
export class AppError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode = 400, code = "BAD_REQUEST") {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
  }
}
```

- [ ] **Step 3: Create `backend/src/utils/asyncHandler.ts`**

```typescript
import type { NextFunction, Request, Response } from "express";

type AsyncRouteHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<unknown>;

export function asyncHandler(fn: AsyncRouteHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}
```

- [ ] **Step 4: Create `backend/src/middleware/errorHandler.ts`**

```typescript
import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../utils/AppError.js";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        message: "Validation failed",
        code: "VALIDATION_ERROR",
        details: err.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: { message: err.message, code: err.code },
    });
    return;
  }

  console.error("[error]", err);
  res.status(500).json({
    error: { message: "Internal server error", code: "INTERNAL_ERROR" },
  });
}
```

- [ ] **Step 5: Replace `backend/src/config/env.ts` with a zod-validated version**

Replace the entire file content with:

```typescript
import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(5000),
  MONGODB_URI: z.string().default(""),
  JWT_SECRET: z.string().min(1).optional(),
  JWT_EXPIRES_IN: z.string().default("7d"),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  NODE_ENV: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  throw new Error(`Invalid environment variables: ${parsed.error.message}`);
}

const raw = parsed.data;

if (!raw.JWT_SECRET && raw.NODE_ENV === "production") {
  throw new Error("JWT_SECRET must be set in production");
}

export const env = {
  PORT: raw.PORT,
  MONGODB_URI: raw.MONGODB_URI,
  JWT_SECRET: raw.JWT_SECRET ?? "dev-secret-change-me",
  JWT_EXPIRES_IN: raw.JWT_EXPIRES_IN,
  CORS_ORIGIN: raw.CORS_ORIGIN,
};
```

- [ ] **Step 6: Wire `errorHandler` into `backend/src/server.ts`**

Current file content (from Phase 1):

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
  const httpServer = app.listen(env.PORT, () => {
    console.log(`[server] listening on http://localhost:${env.PORT}`);
  });
  httpServer.on("error", (err) => {
    console.error("[server] listen error:", err);
    process.exit(1);
  });
}

start().catch((err) => {
  console.error("[server] failed to start:", err);
  process.exit(1);
});
```

Add one import and one line, so the file becomes:

```typescript
import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import { connectDB, isDbConnected } from "./config/db.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();

app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", db: isDbConnected() ? "connected" : "disconnected" });
});

app.use(errorHandler);

async function start() {
  await connectDB();
  const httpServer = app.listen(env.PORT, () => {
    console.log(`[server] listening on http://localhost:${env.PORT}`);
  });
  httpServer.on("error", (err) => {
    console.error("[server] listen error:", err);
    process.exit(1);
  });
}

start().catch((err) => {
  console.error("[server] failed to start:", err);
  process.exit(1);
});
```

(Later tasks insert their route mounts between `app.get("/health", ...)` and `app.use(errorHandler)` — `errorHandler` must always remain the last `app.use`.)

- [ ] **Step 7: Install and verify**

Run:
```bash
cd backend && npm install
```
Expected: `zod` installed, no errors.

Run:
```bash
npx tsc --noEmit
```
Expected: no type errors.

Run (background, then check, then stop):
```bash
npm run dev
```
Wait ~2 seconds, then:
```bash
curl -s http://localhost:5000/health
```
Expected: `{"status":"ok","db":"connected"}` — `"connected"` (not `"disconnected"`) because `backend/.env` now has a real `MONGODB_URI` configured. Stop the dev server afterward.

To confirm the zod validation actually works, temporarily run with a bad PORT to confirm it fails loudly instead of silently producing `NaN`:
```bash
PORT=notanumber npx tsx src/server.ts
```
Expected: process exits immediately with an `Invalid environment variables` error mentioning `PORT` — not a silent `NaN` port bind. (On Windows without a `PORT=x cmd` shell prefix available, use: `cross-env` is not installed — instead run via bash if available, or skip this specific check and note in your report that it wasn't run, with the reasoning.)

- [ ] **Step 8: Commit**

```bash
git add backend/package.json backend/package-lock.json backend/src/utils/AppError.ts backend/src/utils/asyncHandler.ts backend/src/middleware/errorHandler.ts backend/src/config/env.ts backend/src/server.ts
git commit -m "feat(backend): add error-handling foundation and zod-validated env config"
```

---

### Task 2: User model, JWT/bcrypt auth, auth routes

**Files:**
- Create: `backend/src/models/User.ts`
- Create: `backend/src/types/express.d.ts`
- Create: `backend/src/utils/jwt.ts`
- Create: `backend/src/middleware/auth.ts`
- Create: `backend/src/controllers/authController.ts`
- Create: `backend/src/routes/authRoutes.ts`
- Modify: `backend/src/server.ts` (mount `/api/auth`)
- Modify: `backend/package.json` (add `jsonwebtoken`, `bcryptjs` + their `@types` packages)

**Interfaces:**
- Consumes: `AppError`, `asyncHandler` from Task 1.
- Produces: `User` Mongoose model and `UserRole = "admin" | "team_leader" | "agent"` type from `models/User.ts` — every later task (Task 3, 4, 5, 6, 7, 8) imports these exact names.
- Produces: `authMiddleware(req, res, next)` and `requireRole(...roles: UserRole[])` from `middleware/auth.ts` — Tasks 3 and 4 use both; Task 6 uses `authMiddleware` only.
- Produces: `req.user: { id: string; role: UserRole } | undefined` (via Express type augmentation) — every controller after `authMiddleware` reads `req.user!.id` / `req.user!.role`.
- Produces: `signToken({ sub, role }): string` / `verifyToken(token): { sub, role }` from `utils/jwt.ts`.

- [ ] **Step 1: Add auth dependencies to `backend/package.json`**

Add to `"dependencies"`:
```json
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
```
Add to `"devDependencies"`:
```json
    "@types/bcryptjs": "^2.4.6",
    "@types/jsonwebtoken": "^9.0.7",
```

- [ ] **Step 2: Create `backend/src/models/User.ts`**

```typescript
import { Schema, model, type Document, type Types } from "mongoose";

export type UserRole = "admin" | "team_leader" | "agent";

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  teamLead: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ["admin", "team_leader", "agent"],
      default: "agent",
    },
    teamLead: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

export const User = model<IUser>("User", userSchema);
```

- [ ] **Step 3: Create `backend/src/types/express.d.ts`**

```typescript
import type { UserRole } from "../models/User.js";

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; role: UserRole };
    }
  }
}

export {};
```

- [ ] **Step 4: Create `backend/src/utils/jwt.ts`**

```typescript
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import type { UserRole } from "../models/User.js";

export interface JwtPayload {
  sub: string;
  role: UserRole;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  } as jwt.SignOptions);
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
}
```

- [ ] **Step 5: Create `backend/src/middleware/auth.ts`**

```typescript
import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError.js";
import { verifyToken } from "../utils/jwt.js";
import type { UserRole } from "../models/User.js";

export function authMiddleware(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    throw new AppError("Missing or invalid Authorization header", 401, "UNAUTHORIZED");
  }
  const token = header.slice("Bearer ".length);
  try {
    const payload = verifyToken(token);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    throw new AppError("Invalid or expired token", 401, "UNAUTHORIZED");
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new AppError("Forbidden", 403, "FORBIDDEN");
    }
    next();
  };
}
```

- [ ] **Step 6: Create `backend/src/controllers/authController.ts`**

```typescript
import type { Request, Response } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { User, type IUser } from "../models/User.js";
import { signToken } from "../utils/jwt.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function toPublicUser(user: IUser) {
  return {
    id: user.id as string,
    name: user.name,
    email: user.email,
    role: user.role,
    teamLead: user.teamLead ? user.teamLead.toString() : null,
  };
}

export const register = asyncHandler(async (req: Request, res: Response) => {
  const body = registerSchema.parse(req.body);

  const existing = await User.findOne({ email: body.email });
  if (existing) {
    throw new AppError("Email already registered", 409, "EMAIL_TAKEN");
  }

  const passwordHash = await bcrypt.hash(body.password, 10);
  const userCount = await User.countDocuments();
  const role = userCount === 0 ? "admin" : "agent";

  const user = await User.create({
    name: body.name,
    email: body.email,
    passwordHash,
    role,
  });

  const token = signToken({ sub: user.id, role: user.role });
  res.status(201).json({ token, user: toPublicUser(user) });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const body = loginSchema.parse(req.body);

  const user = await User.findOne({ email: body.email });
  if (!user) {
    throw new AppError("Invalid email or password", 401, "INVALID_CREDENTIALS");
  }

  const valid = await bcrypt.compare(body.password, user.passwordHash);
  if (!valid) {
    throw new AppError("Invalid email or password", 401, "INVALID_CREDENTIALS");
  }

  const token = signToken({ sub: user.id, role: user.role });
  res.json({ token, user: toPublicUser(user) });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user!.id);
  if (!user) {
    throw new AppError("User not found", 404, "NOT_FOUND");
  }
  res.json({ user: toPublicUser(user) });
});
```

- [ ] **Step 7: Create `backend/src/routes/authRoutes.ts`**

```typescript
import { Router } from "express";
import { register, login, me } from "../controllers/authController.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", authMiddleware, me);

export default router;
```

- [ ] **Step 8: Mount auth routes in `backend/src/server.ts`**

Add the import alongside the others, and mount the router between the health check and `errorHandler`:

```typescript
import authRoutes from "./routes/authRoutes.js";
```

```typescript
app.get("/health", (_req, res) => {
  res.json({ status: "ok", db: isDbConnected() ? "connected" : "disconnected" });
});

app.use("/api/auth", authRoutes);

app.use(errorHandler);
```

- [ ] **Step 9: Install and verify**

Run:
```bash
cd backend && npm install
npx tsc --noEmit
```
Expected: dependencies installed, no type errors.

Run (background, then check, then stop):
```bash
npm run dev
```

Register the first user (becomes admin) — use a real email you can reuse later, e.g. `admin@example.com`:
```bash
curl -s -X POST http://localhost:5000/api/auth/register -H "Content-Type: application/json" -d '{"name":"Admin User","email":"admin@example.com","password":"password123"}'
```
Expected: `201` with `{"token":"...","user":{"id":"...","name":"Admin User","email":"admin@example.com","role":"admin","teamLead":null}}` — note `role` is `"admin"` because this is the first user ever created in the database.

Register a second user:
```bash
curl -s -X POST http://localhost:5000/api/auth/register -H "Content-Type: application/json" -d '{"name":"Agent User","email":"agent@example.com","password":"password123"}'
```
Expected: `201` with `"role":"agent"`.

Log in as the admin:
```bash
curl -s -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@example.com","password":"password123"}'
```
Expected: `200` with a token. Save it, then:
```bash
curl -s http://localhost:5000/api/auth/me -H "Authorization: Bearer <token-from-above>"
```
Expected: `200` with the admin's own profile.

Confirm validation and auth failures behave correctly:
```bash
curl -s -X POST http://localhost:5000/api/auth/register -H "Content-Type: application/json" -d '{"name":"","email":"not-an-email","password":"short"}'
```
Expected: `400` with `{"error":{"message":"Validation failed","code":"VALIDATION_ERROR","details":[...]}}`.
```bash
curl -s http://localhost:5000/api/auth/me
```
Expected: `401` with `{"error":{"message":"Missing or invalid Authorization header","code":"UNAUTHORIZED"}}`.

Stop the dev server afterward. **Do not delete the two users you just created** — Task 3 and later tasks reuse them.

- [ ] **Step 10: Commit**

```bash
git add backend/package.json backend/package-lock.json backend/src/models/User.ts backend/src/types/express.d.ts backend/src/utils/jwt.ts backend/src/middleware/auth.ts backend/src/controllers/authController.ts backend/src/routes/authRoutes.ts backend/src/server.ts
git commit -m "feat(backend): add User model, JWT/bcrypt auth, and auth routes"
```

---

### Task 3: Admin-only user management routes

**Files:**
- Create: `backend/src/controllers/userController.ts`
- Create: `backend/src/routes/userRoutes.ts`
- Modify: `backend/src/server.ts` (mount `/api/users`)

**Interfaces:**
- Consumes: `User`, `UserRole` from `models/User.ts` (Task 2); `authMiddleware`, `requireRole` from `middleware/auth.ts` (Task 2); `AppError`, `asyncHandler` from Task 1.
- Produces: nothing new consumed by later tasks (this is a leaf feature) — but establishes the pattern (list + patch) that Task 4's lead routes will mirror.

- [ ] **Step 1: Create `backend/src/controllers/userController.ts`**

```typescript
import type { Request, Response } from "express";
import { z } from "zod";
import { Types } from "mongoose";
import { User } from "../models/User.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

function toPublicUser(user: InstanceType<typeof User>) {
  return {
    id: user.id as string,
    name: user.name,
    email: user.email,
    role: user.role,
    teamLead: user.teamLead ? user.teamLead.toString() : null,
  };
}

export const listUsers = asyncHandler(async (_req: Request, res: Response) => {
  const users = await User.find().sort({ createdAt: 1 });
  res.json({ users: users.map(toPublicUser) });
});

const updateUserSchema = z
  .object({
    role: z.enum(["admin", "team_leader", "agent"]).optional(),
    teamLead: z.string().nullable().optional(),
  })
  .refine((body) => body.role !== undefined || body.teamLead !== undefined, {
    message: "At least one of role or teamLead must be provided",
  });

export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const body = updateUserSchema.parse(req.body);

  const user = await User.findById(req.params.id);
  if (!user) {
    throw new AppError("User not found", 404, "NOT_FOUND");
  }

  if (body.role !== undefined) {
    user.role = body.role;
  }

  if (body.teamLead !== undefined) {
    if (body.teamLead === null) {
      user.teamLead = null;
    } else {
      if (!Types.ObjectId.isValid(body.teamLead)) {
        throw new AppError("Invalid teamLead id", 400, "VALIDATION_ERROR");
      }
      const teamLeadUser = await User.findById(body.teamLead);
      if (!teamLeadUser || teamLeadUser.role !== "team_leader") {
        throw new AppError("teamLead must reference an existing team_leader user", 400, "VALIDATION_ERROR");
      }
      user.teamLead = teamLeadUser._id;
    }
  }

  await user.save();
  res.json({ user: toPublicUser(user) });
});
```

- [ ] **Step 2: Create `backend/src/routes/userRoutes.ts`**

```typescript
import { Router } from "express";
import { listUsers, updateUser } from "../controllers/userController.js";
import { authMiddleware, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(authMiddleware, requireRole("admin"));
router.get("/", listUsers);
router.patch("/:id", updateUser);

export default router;
```

- [ ] **Step 3: Mount user routes in `backend/src/server.ts`**

```typescript
import userRoutes from "./routes/userRoutes.js";
```

```typescript
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

app.use(errorHandler);
```

- [ ] **Step 4: Install and verify**

Run:
```bash
cd backend && npx tsc --noEmit
```
Expected: no type errors.

Run (background, then check, then stop) `npm run dev`, then using the admin token from Task 2 (log in again if needed — tokens expire in 7 days so the old one should still work):

```bash
curl -s http://localhost:5000/api/users -H "Authorization: Bearer <admin-token>"
```
Expected: `200` with both users from Task 2 (admin and agent), no `passwordHash` field present.

Confirm non-admins are blocked — log in as the agent user from Task 2 and retry:
```bash
curl -s -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d '{"email":"agent@example.com","password":"password123"}'
curl -s http://localhost:5000/api/users -H "Authorization: Bearer <agent-token>"
```
Expected: `403` with `{"error":{"message":"Forbidden","code":"FORBIDDEN"}}`.

Register a third user to act as a team leader, then promote them and link the agent to them:
```bash
curl -s -X POST http://localhost:5000/api/auth/register -H "Content-Type: application/json" -d '{"name":"Lead User","email":"lead@example.com","password":"password123"}'
```
Copy the returned `id` as `<lead-id>`, then:
```bash
curl -s -X PATCH http://localhost:5000/api/users/<lead-id> -H "Authorization: Bearer <admin-token>" -H "Content-Type: application/json" -d '{"role":"team_leader"}'
```
Expected: `200` with `"role":"team_leader"`. Then link the agent to them (use the agent's `id` from Task 2 as `<agent-id>`):
```bash
curl -s -X PATCH http://localhost:5000/api/users/<agent-id> -H "Authorization: Bearer <admin-token>" -H "Content-Type: application/json" -d '{"teamLead":"<lead-id>"}'
```
Expected: `200` with `"teamLead":"<lead-id>"`. **Keep this admin/team_leader/agent trio and their linkage** — Task 4's verification depends on this exact hierarchy.

Stop the dev server afterward.

- [ ] **Step 5: Commit**

```bash
git add backend/src/controllers/userController.ts backend/src/routes/userRoutes.ts backend/src/server.ts
git commit -m "feat(backend): add admin-only user management routes"
```

---

### Task 4: Lead model, visibility scoping, and Leads CRUD routes

**Files:**
- Create: `backend/src/models/Lead.ts`
- Create: `backend/src/services/leadScope.ts`
- Create: `backend/src/controllers/leadController.ts`
- Create: `backend/src/routes/leadRoutes.ts`
- Modify: `backend/src/server.ts` (mount `/api/leads`)

**Interfaces:**
- Consumes: `User`, `UserRole` (Task 2); `authMiddleware`, `requireRole` (Task 2); `AppError`, `asyncHandler` (Task 1).
- Produces: `Lead` model, `LeadSource`, `LeadStatus` types from `models/Lead.ts` — Task 5 (activity logging), Task 6 (dashboard), and Task 8 (seed) all import these.
- Produces: `buildLeadScopeFilter(requester: {id: string; role: UserRole}): Promise<Record<string, unknown>>` and `canAccessLead(requester, lead): Promise<boolean>` from `services/leadScope.ts` — Task 6's dashboard queries reuse `buildLeadScopeFilter` directly.
- **Note:** this task does NOT yet write Activity records (Activity model doesn't exist until Task 5) — leave clearly marked `// TODO(Task 5): log activity here` comments at the three mutation points (create, update, delete) so Task 5's brief can find them precisely. This is the one deliberate placeholder in this plan, and it is resolved in the very next task, not left open-ended.

- [ ] **Step 1: Create `backend/src/models/Lead.ts`**

```typescript
import { Schema, model, type Document, type Types } from "mongoose";

export type LeadSource = "Website" | "Referral" | "Cold Call" | "Social Media" | "Other";
export type LeadStatus = "New" | "Contacted" | "Qualified" | "Proposal" | "Won" | "Lost";

export interface ILead extends Document {
  name: string;
  email: string;
  phone: string;
  source: LeadSource;
  status: LeadStatus;
  assignedTo: Types.ObjectId;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const leadSchema = new Schema<ILead>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    source: {
      type: String,
      enum: ["Website", "Referral", "Cold Call", "Social Media", "Other"],
      required: true,
    },
    status: {
      type: String,
      enum: ["New", "Contacted", "Qualified", "Proposal", "Won", "Lost"],
      default: "New",
    },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User", required: true },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

export const Lead = model<ILead>("Lead", leadSchema);
```

- [ ] **Step 2: Create `backend/src/services/leadScope.ts`**

```typescript
import { User } from "../models/User.js";
import type { ILead } from "../models/Lead.js";
import type { UserRole } from "../models/User.js";

export interface Requester {
  id: string;
  role: UserRole;
}

async function getTeamAgentIds(teamLeadId: string): Promise<string[]> {
  const agents = await User.find({ teamLead: teamLeadId }).select("_id");
  return agents.map((agent) => agent.id as string);
}

export async function buildLeadScopeFilter(
  requester: Requester
): Promise<Record<string, unknown>> {
  if (requester.role === "admin") {
    return {};
  }
  if (requester.role === "team_leader") {
    const teamAgentIds = await getTeamAgentIds(requester.id);
    return { assignedTo: { $in: [requester.id, ...teamAgentIds] } };
  }
  return { assignedTo: requester.id };
}

export async function canAccessLead(requester: Requester, lead: ILead): Promise<boolean> {
  if (requester.role === "admin") {
    return true;
  }
  const assignedToId = lead.assignedTo.toString();
  if (requester.role === "agent") {
    return assignedToId === requester.id;
  }
  // team_leader
  if (assignedToId === requester.id) {
    return true;
  }
  const teamAgentIds = await getTeamAgentIds(requester.id);
  return teamAgentIds.includes(assignedToId);
}

export async function canAssignTo(requester: Requester, targetUserId: string): Promise<boolean> {
  if (requester.role === "admin") {
    return true;
  }
  if (requester.role === "team_leader") {
    if (targetUserId === requester.id) {
      return true;
    }
    const teamAgentIds = await getTeamAgentIds(requester.id);
    return teamAgentIds.includes(targetUserId);
  }
  return targetUserId === requester.id;
}
```

- [ ] **Step 3: Create `backend/src/controllers/leadController.ts`**

```typescript
import type { Request, Response } from "express";
import { z } from "zod";
import { Types } from "mongoose";
import { Lead } from "../models/Lead.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { buildLeadScopeFilter, canAccessLead, canAssignTo } from "../services/leadScope.js";

const LEAD_SOURCES = ["Website", "Referral", "Cold Call", "Social Media", "Other"] as const;
const LEAD_STATUSES = ["New", "Contacted", "Qualified", "Proposal", "Won", "Lost"] as const;

const listQuerySchema = z.object({
  status: z.enum(LEAD_STATUSES).optional(),
  source: z.enum(LEAD_SOURCES).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const listLeads = asyncHandler(async (req: Request, res: Response) => {
  const query = listQuerySchema.parse(req.query);
  const scopeFilter = await buildLeadScopeFilter(req.user!);

  const filter: Record<string, unknown> = { ...scopeFilter };
  if (query.status) filter.status = query.status;
  if (query.source) filter.source = query.source;
  if (query.dateFrom || query.dateTo) {
    const createdAt: Record<string, Date> = {};
    if (query.dateFrom) createdAt.$gte = new Date(query.dateFrom);
    if (query.dateTo) createdAt.$lte = new Date(query.dateTo);
    filter.createdAt = createdAt;
  }
  if (query.search) {
    filter.$or = [
      { name: { $regex: query.search, $options: "i" } },
      { email: { $regex: query.search, $options: "i" } },
    ];
  }

  const [items, total] = await Promise.all([
    Lead.find(filter)
      .sort({ createdAt: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit),
    Lead.countDocuments(filter),
  ]);

  res.json({ items, total, page: query.page, limit: query.limit });
});

const createLeadSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  source: z.enum(LEAD_SOURCES),
  status: z.enum(LEAD_STATUSES).optional(),
  notes: z.string().optional(),
  assignedTo: z.string().optional(),
});

export const createLead = asyncHandler(async (req: Request, res: Response) => {
  const body = createLeadSchema.parse(req.body);
  const assignedTo = body.assignedTo ?? req.user!.id;

  if (assignedTo !== req.user!.id) {
    const allowed = await canAssignTo(req.user!, assignedTo);
    if (!allowed) {
      throw new AppError("Cannot assign lead to that user", 403, "FORBIDDEN");
    }
  }

  const lead = await Lead.create({ ...body, assignedTo });
  // TODO(Task 5): log activity here (type: "created")
  res.status(201).json({ lead });
});

async function findAccessibleLead(req: Request) {
  if (!Types.ObjectId.isValid(req.params.id)) {
    throw new AppError("Invalid lead id", 400, "VALIDATION_ERROR");
  }
  const lead = await Lead.findById(req.params.id);
  if (!lead || !(await canAccessLead(req.user!, lead))) {
    throw new AppError("Lead not found", 404, "NOT_FOUND");
  }
  return lead;
}

export const getLead = asyncHandler(async (req: Request, res: Response) => {
  const lead = await findAccessibleLead(req);
  res.json({ lead });
});

const updateLeadSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(1).optional(),
  source: z.enum(LEAD_SOURCES).optional(),
  status: z.enum(LEAD_STATUSES).optional(),
  notes: z.string().optional(),
});

export const updateLead = asyncHandler(async (req: Request, res: Response) => {
  const body = updateLeadSchema.parse(req.body);
  const lead = await findAccessibleLead(req);

  const previousStatus = lead.status;
  Object.assign(lead, body);
  await lead.save();

  if (body.status && body.status !== previousStatus) {
    // TODO(Task 5): log activity here (type: "status_changed", meta: { from: previousStatus, to: body.status })
  } else {
    // TODO(Task 5): log activity here (type: "updated")
  }

  res.json({ lead });
});

const reassignSchema = z.object({
  assignedTo: z.string().min(1),
});

export const reassignLead = asyncHandler(async (req: Request, res: Response) => {
  const body = reassignSchema.parse(req.body);
  const lead = await findAccessibleLead(req);

  const allowed = await canAssignTo(req.user!, body.assignedTo);
  if (!allowed) {
    throw new AppError("Cannot assign lead to that user", 403, "FORBIDDEN");
  }

  lead.assignedTo = new Types.ObjectId(body.assignedTo);
  await lead.save();
  // TODO(Task 5): log activity here (type: "assigned")
  res.json({ lead });
});

export const deleteLead = asyncHandler(async (req: Request, res: Response) => {
  const lead = await Lead.findById(req.params.id);
  if (!lead) {
    throw new AppError("Lead not found", 404, "NOT_FOUND");
  }
  await lead.deleteOne();
  // TODO(Task 5): log activity here (type: "deleted")
  res.status(204).send();
});
```

- [ ] **Step 4: Create `backend/src/routes/leadRoutes.ts`**

```typescript
import { Router } from "express";
import {
  listLeads,
  createLead,
  getLead,
  updateLead,
  reassignLead,
  deleteLead,
} from "../controllers/leadController.js";
import { authMiddleware, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(authMiddleware);

router.get("/", listLeads);
router.post("/", createLead);
router.get("/:id", getLead);
router.patch("/:id", updateLead);
router.patch("/:id/reassign", requireRole("admin", "team_leader"), reassignLead);
router.delete("/:id", requireRole("admin"), deleteLead);

export default router;
```

- [ ] **Step 5: Mount lead routes in `backend/src/server.ts`**

```typescript
import leadRoutes from "./routes/leadRoutes.js";
```

```typescript
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/leads", leadRoutes);

app.use(errorHandler);
```

- [ ] **Step 6: Install and verify**

Run:
```bash
cd backend && npx tsc --noEmit
```
Expected: no type errors.

Run (background, then check, then stop) `npm run dev`. Using the agent token (agent@example.com) from Tasks 2-3, create a lead assigned to self:
```bash
curl -s -X POST http://localhost:5000/api/leads -H "Authorization: Bearer <agent-token>" -H "Content-Type: application/json" -d '{"name":"Jane Prospect","email":"jane@prospect.com","phone":"555-0100","source":"Website"}'
```
Expected: `201` with the created lead, `status:"New"`, `assignedTo` equal to the agent's own id. Copy the lead's `_id` as `<lead-id>`.

Confirm the agent can list/get it:
```bash
curl -s http://localhost:5000/api/leads -H "Authorization: Bearer <agent-token>"
curl -s http://localhost:5000/api/leads/<lead-id> -H "Authorization: Bearer <agent-token>"
```
Expected: both `200`, the lead appears.

Confirm the team leader (lead@example.com, from Task 3, who has this agent on their team) can also see it:
```bash
curl -s -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d '{"email":"lead@example.com","password":"password123"}'
curl -s http://localhost:5000/api/leads -H "Authorization: Bearer <team-leader-token>"
```
Expected: `200`, the lead appears in the team leader's list.

Confirm a second, unrelated agent CANNOT see it — register a fresh agent and try:
```bash
curl -s -X POST http://localhost:5000/api/auth/register -H "Content-Type: application/json" -d '{"name":"Outsider","email":"outsider@example.com","password":"password123"}'
curl -s -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d '{"email":"outsider@example.com","password":"password123"}'
curl -s http://localhost:5000/api/leads/<lead-id> -H "Authorization: Bearer <outsider-token>"
```
Expected: `404` (not `403` — a lead outside your scope should look like it doesn't exist, not reveal its existence).

Confirm status update logs a status change conceptually (activity logging itself lands in Task 5 — just confirm the status actually changes and the response reflects it):
```bash
curl -s -X PATCH http://localhost:5000/api/leads/<lead-id> -H "Authorization: Bearer <agent-token>" -H "Content-Type: application/json" -d '{"status":"Contacted"}'
```
Expected: `200`, `"status":"Contacted"`.

Confirm the agent CANNOT reassign (role-gated) but the team leader CAN:
```bash
curl -s -X PATCH http://localhost:5000/api/leads/<lead-id>/reassign -H "Authorization: Bearer <agent-token>" -H "Content-Type: application/json" -d '{"assignedTo":"<team-leader-user-id>"}'
```
Expected: `403`.
```bash
curl -s -X PATCH http://localhost:5000/api/leads/<lead-id>/reassign -H "Authorization: Bearer <team-leader-token>" -H "Content-Type: application/json" -d '{"assignedTo":"<team-leader-user-id>"}'
```
Expected: `200`, `assignedTo` now equals the team leader's own id.

Confirm only admin can delete:
```bash
curl -s -o /dev/null -w "%{http_code}" -X DELETE http://localhost:5000/api/leads/<lead-id> -H "Authorization: Bearer <team-leader-token>"
```
Expected: `403`.
```bash
curl -s -o /dev/null -w "%{http_code}" -X DELETE http://localhost:5000/api/leads/<lead-id> -H "Authorization: Bearer <admin-token>"
```
Expected: `204`.

Stop the dev server afterward.

- [ ] **Step 7: Commit**

```bash
git add backend/src/models/Lead.ts backend/src/services/leadScope.ts backend/src/controllers/leadController.ts backend/src/routes/leadRoutes.ts backend/src/server.ts
git commit -m "feat(backend): add Lead model, visibility scoping, and leads CRUD routes"
```

---

### Task 5: Activity model and activity logging

**Files:**
- Create: `backend/src/models/Activity.ts`
- Create: `backend/src/services/activityService.ts`
- Modify: `backend/src/controllers/leadController.ts` (replace the 5 `TODO(Task 5)` comments from Task 4 with real calls)

**Interfaces:**
- Consumes: `Lead`, `LeadStatus` (Task 4).
- Produces: `Activity` model, `ActivityType` type from `models/Activity.ts` — Task 6's dashboard activity feed imports these.
- Produces: `logActivity(params: { lead: string; user: string; type: ActivityType; message: string; meta?: Record<string, unknown> }): Promise<void>` from `services/activityService.ts` — used only by `leadController.ts` in this plan, but Task 6 queries the `Activity` collection directly (it doesn't call `logActivity`).

- [ ] **Step 1: Create `backend/src/models/Activity.ts`**

```typescript
import { Schema, model, type Document, type Types } from "mongoose";

export type ActivityType = "created" | "status_changed" | "assigned" | "updated" | "deleted";

export interface IActivity extends Document {
  lead: Types.ObjectId;
  user: Types.ObjectId;
  type: ActivityType;
  message: string;
  meta?: Record<string, unknown>;
  createdAt: Date;
}

const activitySchema = new Schema<IActivity>(
  {
    lead: { type: Schema.Types.ObjectId, ref: "Lead", required: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: ["created", "status_changed", "assigned", "updated", "deleted"],
      required: true,
    },
    message: { type: String, required: true },
    meta: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const Activity = model<IActivity>("Activity", activitySchema);
```

- [ ] **Step 2: Create `backend/src/services/activityService.ts`**

```typescript
import { Activity, type ActivityType } from "../models/Activity.js";

export interface LogActivityParams {
  lead: string;
  user: string;
  type: ActivityType;
  message: string;
  meta?: Record<string, unknown>;
}

export async function logActivity(params: LogActivityParams): Promise<void> {
  await Activity.create({
    lead: params.lead,
    user: params.user,
    type: params.type,
    message: params.message,
    meta: params.meta,
  });
}
```

- [ ] **Step 3: Wire activity logging into `backend/src/controllers/leadController.ts`**

Add the import:
```typescript
import { logActivity } from "../services/activityService.js";
```

Replace each `TODO(Task 5)` comment with a real call:

In `createLead`, replace `// TODO(Task 5): log activity here (type: "created")` with:
```typescript
  await logActivity({
    lead: lead.id,
    user: req.user!.id,
    type: "created",
    message: `${lead.name} created`,
  });
```

In `updateLead`, replace the two TODO branches with:
```typescript
  if (body.status && body.status !== previousStatus) {
    await logActivity({
      lead: lead.id,
      user: req.user!.id,
      type: "status_changed",
      message: `moved to ${body.status}`,
      meta: { from: previousStatus, to: body.status },
    });
  } else {
    await logActivity({
      lead: lead.id,
      user: req.user!.id,
      type: "updated",
      message: `${lead.name} updated`,
    });
  }
```

In `reassignLead`, replace `// TODO(Task 5): log activity here (type: "assigned")` with:
```typescript
  await logActivity({
    lead: lead.id,
    user: req.user!.id,
    type: "assigned",
    message: `reassigned`,
    meta: { assignedTo: body.assignedTo },
  });
```

In `deleteLead`, replace `// TODO(Task 5): log activity here (type: "deleted")` with (note: log BEFORE `deleteOne()` runs so the lead id still resolves meaningfully — move this line to just before `await lead.deleteOne();`):
```typescript
  await logActivity({
    lead: lead.id,
    user: req.user!.id,
    type: "deleted",
    message: `${lead.name} deleted`,
  });
```

- [ ] **Step 4: Install and verify**

Run:
```bash
cd backend && npx tsc --noEmit
```
Expected: no type errors, and confirm no `TODO(Task 5)` comments remain in `leadController.ts` (`grep -n "TODO(Task 5)" backend/src/controllers/leadController.ts` should output nothing).

Run (background, then check, then stop) `npm run dev`. Repeat a subset of Task 4's lead lifecycle using the agent token, then inspect activities directly via a one-off script (there's no activity-read endpoint until Task 6, so query Mongo directly for this verification):

```bash
curl -s -X POST http://localhost:5000/api/leads -H "Authorization: Bearer <agent-token>" -H "Content-Type: application/json" -d '{"name":"Bob Prospect","email":"bob@prospect.com","phone":"555-0200","source":"Referral"}'
```
Copy the new lead's `_id` as `<lead-id-2>`, then:
```bash
curl -s -X PATCH http://localhost:5000/api/leads/<lead-id-2> -H "Authorization: Bearer <agent-token>" -H "Content-Type: application/json" -d '{"status":"Contacted"}'
```

Then verify Activity documents were actually written:
```bash
cd backend && node -e "
import('dotenv/config').then(async () => {
  const mongoose = (await import('mongoose')).default;
  await mongoose.connect(process.env.MONGODB_URI);
  const docs = await mongoose.connection.collection('activities').find({}).sort({createdAt:-1}).limit(5).toArray();
  console.log(JSON.stringify(docs, null, 2));
  process.exit(0);
});
"
```
Expected: at least two documents — one `type:"created"` and one `type:"status_changed"` with `meta:{from:"New",to:"Contacted"}` — both referencing `<lead-id-2>`.

Stop the dev server afterward.

- [ ] **Step 5: Commit**

```bash
git add backend/src/models/Activity.ts backend/src/services/activityService.ts backend/src/controllers/leadController.ts
git commit -m "feat(backend): add Activity model and wire logging into lead mutations"
```

---

### Task 6: Dashboard aggregation routes

**Files:**
- Create: `backend/src/services/dashboardService.ts`
- Create: `backend/src/controllers/dashboardController.ts`
- Create: `backend/src/routes/dashboardRoutes.ts`
- Modify: `backend/src/server.ts` (mount `/api/dashboard`)

**Interfaces:**
- Consumes: `Lead` (Task 4), `Activity` (Task 5), `buildLeadScopeFilter` (Task 4), `authMiddleware` (Task 2).
- Produces: nothing consumed by later tasks in this plan (leaf feature). Phase 3's frontend dashboard will call these 4 endpoints directly.

- [ ] **Step 1: Create `backend/src/services/dashboardService.ts`**

```typescript
import { Lead } from "../models/Lead.js";
import { Activity } from "../models/Activity.js";
import { buildLeadScopeFilter, type Requester } from "./leadScope.js";

export async function getSummary(requester: Requester) {
  const scopeFilter = await buildLeadScopeFilter(requester);
  const [total, won, lost] = await Promise.all([
    Lead.countDocuments(scopeFilter),
    Lead.countDocuments({ ...scopeFilter, status: "Won" }),
    Lead.countDocuments({ ...scopeFilter, status: "Lost" }),
  ]);
  const conversionRate = total > 0 ? Math.round((won / total) * 1000) / 10 : 0;
  return { total, won, lost, conversionRate };
}

export async function getBySource(requester: Requester) {
  const scopeFilter = await buildLeadScopeFilter(requester);
  const rows = await Lead.aggregate([
    { $match: scopeFilter },
    { $group: { _id: "$source", count: { $sum: 1 } } },
    { $project: { _id: 0, source: "$_id", count: 1 } },
    { $sort: { source: 1 } },
  ]);
  return rows;
}

export async function getTrend(requester: Requester) {
  const scopeFilter = await buildLeadScopeFilter(requester);
  const rows = await Lead.aggregate([
    { $match: scopeFilter },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
        count: { $sum: 1 },
      },
    },
    { $project: { _id: 0, month: "$_id", count: 1 } },
    { $sort: { month: 1 } },
  ]);
  return rows;
}

export async function getRecentActivity(requester: Requester, limit = 20) {
  const scopeFilter = await buildLeadScopeFilter(requester);
  const leadIds = await Lead.find(scopeFilter).distinct("_id");
  const activities = await Activity.find({ lead: { $in: leadIds } })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("user", "name")
    .populate("lead", "name");
  return activities;
}
```

- [ ] **Step 2: Create `backend/src/controllers/dashboardController.ts`**

```typescript
import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getSummary, getBySource, getTrend, getRecentActivity } from "../services/dashboardService.js";

export const summary = asyncHandler(async (req: Request, res: Response) => {
  res.json(await getSummary(req.user!));
});

export const bySource = asyncHandler(async (req: Request, res: Response) => {
  res.json({ items: await getBySource(req.user!) });
});

export const trend = asyncHandler(async (req: Request, res: Response) => {
  res.json({ items: await getTrend(req.user!) });
});

export const activity = asyncHandler(async (req: Request, res: Response) => {
  res.json({ items: await getRecentActivity(req.user!) });
});
```

- [ ] **Step 3: Create `backend/src/routes/dashboardRoutes.ts`**

```typescript
import { Router } from "express";
import { summary, bySource, trend, activity } from "../controllers/dashboardController.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

router.use(authMiddleware);
router.get("/summary", summary);
router.get("/by-source", bySource);
router.get("/trend", trend);
router.get("/activity", activity);

export default router;
```

- [ ] **Step 4: Mount dashboard routes in `backend/src/server.ts`**

```typescript
import dashboardRoutes from "./routes/dashboardRoutes.js";
```

```typescript
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/leads", leadRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.use(errorHandler);
```

- [ ] **Step 5: Install and verify**

Run:
```bash
cd backend && npx tsc --noEmit
```
Expected: no type errors.

Run (background, then check, then stop) `npm run dev`. Using the agent token (who by now has created 2 leads across Tasks 4-5):
```bash
curl -s http://localhost:5000/api/dashboard/summary -H "Authorization: Bearer <agent-token>"
```
Expected: `200` with `{"total":<N>,"won":0,"lost":0,"conversionRate":0}` where `<N>` reflects however many leads remain assigned to this agent (recall Task 4 reassigned lead 1 away to the team leader — so this should show only lead 2, i.e. `total:1`, unless you created more).

```bash
curl -s http://localhost:5000/api/dashboard/by-source -H "Authorization: Bearer <agent-token>"
curl -s http://localhost:5000/api/dashboard/trend -H "Authorization: Bearer <agent-token>"
curl -s http://localhost:5000/api/dashboard/activity -H "Authorization: Bearer <agent-token>"
```
Expected: all `200`; `by-source` groups by the sources used so far; `trend` has one entry for the current month; `activity` lists the create/update activities from Task 5, each with `user.name` and `lead.name` populated (not just raw ids).

Confirm scoping — as the admin, `summary`'s `total` should be greater than or equal to the agent's (covers all leads across all users):
```bash
curl -s http://localhost:5000/api/dashboard/summary -H "Authorization: Bearer <admin-token>"
```
Expected: `200`, `total` at least as large as the agent's view.

Stop the dev server afterward.

- [ ] **Step 6: Commit**

```bash
git add backend/src/services/dashboardService.ts backend/src/controllers/dashboardController.ts backend/src/routes/dashboardRoutes.ts backend/src/server.ts
git commit -m "feat(backend): add scoped dashboard aggregation routes"
```

---

### Task 7: Swagger API documentation

**Files:**
- Create: `backend/src/config/openapi.ts`
- Modify: `backend/src/server.ts` (mount `/api-docs`)
- Modify: `backend/package.json` (add `swagger-ui-express` + its `@types` package)

**Interfaces:**
- Consumes: nothing (a static document — it does not import any route/controller code, so it can never drift into a type error, only a documentation-accuracy one).
- Produces: nothing consumed by later tasks.

This plan uses a hand-written static OpenAPI document rather than `swagger-jsdoc` comment-scanning, so earlier tasks' route files never needed touching for documentation purposes.

- [ ] **Step 1: Add `swagger-ui-express` to `backend/package.json`**

Add to `"dependencies"`:
```json
    "swagger-ui-express": "^5.0.1",
```
Add to `"devDependencies"`:
```json
    "@types/swagger-ui-express": "^4.1.6",
```

- [ ] **Step 2: Create `backend/src/config/openapi.ts`**

```typescript
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
```

- [ ] **Step 3: Mount Swagger UI in `backend/src/server.ts`**

```typescript
import swaggerUi from "swagger-ui-express";
import { openapiSpec } from "./config/openapi.js";
```

```typescript
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/leads", leadRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openapiSpec));

app.use(errorHandler);
```

- [ ] **Step 4: Install and verify**

Run:
```bash
cd backend && npm install
npx tsc --noEmit
```
Expected: dependency installed, no type errors.

Run (background, then check, then stop) `npm run dev`:
```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api-docs/
```
Expected: `200` (the Swagger UI HTML page). Stop the dev server afterward.

- [ ] **Step 5: Commit**

```bash
git add backend/package.json backend/package-lock.json backend/src/config/openapi.ts backend/src/server.ts
git commit -m "feat(backend): add static OpenAPI spec served via Swagger UI"
```

---

### Task 8: Seed script

**Files:**
- Create: `backend/seed/index.ts`
- Modify: `backend/package.json` (add `seed` script)

**Interfaces:**
- Consumes: `User` (Task 2), `Lead` (Task 4), `Activity` (Task 5), `connectDB` (Phase 1).
- Produces: nothing consumed by other tasks — this is the final leaf task of Phase 2.

- [ ] **Step 1: Add the `seed` script to `backend/package.json`**

Add to `"scripts"`:
```json
    "seed": "tsx seed/index.ts"
```

- [ ] **Step 2: Create `backend/seed/index.ts`**

```typescript
import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { connectDB } from "../src/config/db.js";
import { User } from "../src/models/User.js";
import { Lead, type LeadSource, type LeadStatus } from "../src/models/Lead.js";
import { Activity } from "../src/models/Activity.js";

const SOURCES: LeadSource[] = ["Website", "Referral", "Cold Call", "Social Media", "Other"];
const STATUSES: LeadStatus[] = ["New", "Contacted", "Qualified", "Proposal", "Won", "Lost"];

function randomFrom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function daysAgo(n: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - n);
  return date;
}

async function main() {
  await connectDB();

  console.log("[seed] clearing existing data...");
  await Promise.all([
    User.deleteMany({}),
    Lead.deleteMany({}),
    Activity.deleteMany({}),
  ]);

  const passwordHash = await bcrypt.hash("password123", 10);

  console.log("[seed] creating users...");
  const admin = await User.create({
    name: "Demo Admin",
    email: "admin@example.com",
    passwordHash,
    role: "admin",
  });

  const teamLead = await User.create({
    name: "Demo Team Leader",
    email: "leader@example.com",
    passwordHash,
    role: "team_leader",
  });

  const agentNames = ["Alice Agent", "Bob Agent", "Cara Agent"];
  const agents = await Promise.all(
    agentNames.map((name, i) =>
      User.create({
        name,
        email: `agent${i + 1}@example.com`,
        passwordHash,
        role: "agent",
        teamLead: teamLead._id,
      })
    )
  );

  const assignablePool = [admin, teamLead, ...agents];

  console.log("[seed] creating leads...");
  const leadCount = 25;
  const createdLeads = [];
  for (let i = 0; i < leadCount; i++) {
    const owner = randomFrom(assignablePool);
    const createdAt = daysAgo(Math.floor(Math.random() * 180));
    const lead = await Lead.create({
      name: `Prospect ${i + 1}`,
      email: `prospect${i + 1}@example.com`,
      phone: `555-01${String(i).padStart(2, "0")}`,
      source: randomFrom(SOURCES),
      status: randomFrom(STATUSES),
      assignedTo: owner._id,
      createdAt,
      updatedAt: createdAt,
    });
    createdLeads.push({ lead, owner });
  }

  console.log("[seed] creating activity records...");
  await Promise.all(
    createdLeads.map(({ lead, owner }) =>
      Activity.create({
        lead: lead._id,
        user: owner._id,
        type: "created",
        message: `${lead.name} created`,
        createdAt: lead.createdAt,
      })
    )
  );

  console.log("[seed] done.");
  console.log(`[seed] admin login: admin@example.com / password123`);
  console.log(`[seed] team leader login: leader@example.com / password123`);
  console.log(`[seed] agent logins: agent1@example.com, agent2@example.com, agent3@example.com / password123`);

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("[seed] failed:", err);
  process.exit(1);
});
```

- [ ] **Step 3: Install and verify**

Run:
```bash
cd backend && npx tsc --noEmit
```
Expected: no type errors.

Run:
```bash
npm run seed
```
Expected: console output showing users/leads/activities created, ending with the login hints, process exits cleanly (exit code 0).

Verify the data landed:
```bash
node -e "
import('dotenv/config').then(async () => {
  const mongoose = (await import('mongoose')).default;
  await mongoose.connect(process.env.MONGODB_URI);
  const counts = {
    users: await mongoose.connection.collection('users').countDocuments(),
    leads: await mongoose.connection.collection('leads').countDocuments(),
    activities: await mongoose.connection.collection('activities').countDocuments(),
  };
  console.log(counts);
  process.exit(0);
});
"
```
Expected: `{ users: 5, leads: 25, activities: 25 }`.

Confirm the seeded data actually works through the real API — start the server (background), log in as the seeded admin, and hit the dashboard:
```bash
npm run dev
```
```bash
curl -s -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@example.com","password":"password123"}'
curl -s http://localhost:5000/api/dashboard/summary -H "Authorization: Bearer <admin-token>"
```
Expected: `200`, `total:25`. Stop the dev server afterward.

**Note:** running `npm run seed` again wipes and regenerates all data (including the users and leads created manually in Tasks 2-6's verification steps) — this is expected and matches the spec's intent for `seed` to reset to a known demo state.

- [ ] **Step 4: Commit**

```bash
git add backend/package.json backend/seed/index.ts
git commit -m "feat(backend): add demo data seed script"
```

---

## Self-Review Notes

- **Spec coverage:** data models (§2) ✅ Tasks 2, 4, 5; auth & roles incl. Manage Users page's backend (§3) ✅ Tasks 2, 3; full API surface (§4) ✅ Tasks 2, 3, 4, 6; Swagger ✅ Task 7; seed script (§6) ✅ Task 8. Frontend consumption of these endpoints is explicitly Phase 3, not this plan.
- **Placeholder scan:** the only `TODO` comments are the deliberate, precisely-located Task 4→Task 5 handoff markers described in Task 4's Interfaces block and resolved by name in Task 5 Step 3 — not an open-ended placeholder.
- **Type consistency:** `Requester` (leadScope.ts) matches `req.user`'s shape (`{id, role}`) set by `authMiddleware`; `ActivityType` values used in `logActivity` calls match the enum in `Activity.ts` exactly; `LeadSource`/`LeadStatus` string literals used in the seed script match `Lead.ts`'s enums exactly; `buildLeadScopeFilter`'s return type (`Record<string, unknown>`) is spread consistently in `leadController.ts` and `dashboardService.ts`.
