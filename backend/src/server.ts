import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import { env } from "./config/env.js";
import { connectDB, isDbConnected } from "./config/db.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { AppError } from "./utils/AppError.js";
import { openapiSpec } from "./config/openapi.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import leadRoutes from "./routes/leadRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";

const app = express();

app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", db: isDbConnected() ? "connected" : "disconnected" });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/leads", leadRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openapiSpec));

app.use((_req, _res, next) => {
  next(new AppError("Not found", 404, "NOT_FOUND"));
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
