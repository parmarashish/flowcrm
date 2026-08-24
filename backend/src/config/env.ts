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

const isExplicitlyNonProd = raw.NODE_ENV === "development" || raw.NODE_ENV === "test";
if (!raw.JWT_SECRET && !isExplicitlyNonProd) {
  throw new Error(
    "JWT_SECRET must be set (only omit it when NODE_ENV is 'development' or 'test')"
  );
}

export const env = {
  PORT: raw.PORT,
  MONGODB_URI: raw.MONGODB_URI,
  JWT_SECRET: raw.JWT_SECRET ?? "dev-secret-change-me",
  JWT_EXPIRES_IN: raw.JWT_EXPIRES_IN,
  CORS_ORIGIN: raw.CORS_ORIGIN,
};
