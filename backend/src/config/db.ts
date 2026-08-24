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
