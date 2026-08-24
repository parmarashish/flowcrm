import "dotenv/config";

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const jwtSecretFromEnv = process.env.JWT_SECRET;
if (!jwtSecretFromEnv && process.env.NODE_ENV === "production") {
  throw new Error("JWT_SECRET must be set in production");
}

export const env = {
  PORT: Number(process.env.PORT ?? 5000),
  MONGODB_URI: required("MONGODB_URI", ""),
  JWT_SECRET: jwtSecretFromEnv ?? "dev-secret-change-me",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? "7d",
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? "http://localhost:3000",
};
