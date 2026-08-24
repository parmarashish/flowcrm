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
