import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}
export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  logLevel: process.env.LOG_LEVEL ?? "info",
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
  db_user: required("DB_USER"),
  db_password: process.env.DB_PASSWORD,
  db_host: required("DB_HOST"),
  db_port: Number(process.env.DB_PORT ?? 5432),
  db_name: required("DB_NAME"),
  csrf_secret: required("CSRF_SECRET"),
  access_secret: required("ACCESS_SECRET"),
  session_ttl_ms: Number(process.env.SESSION_TTL_MS ?? 7 * 24 * 60 * 60 * 1000),
};

if (!Number.isFinite(env.session_ttl_ms) || env.session_ttl_ms <= 0) {
  throw new Error("SESSION_TTL_MS must be a positive number");
}

export const isProd = env.nodeEnv === "production";
