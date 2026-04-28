import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "./middleware/logger.js";
import { errorMiddleware } from "./middleware/error.js";

// Allowed web origins. Read from PUBLIC_WEB_URL (set per env in Coolify),
// plus permanent localhost entries for dev. Adding both http/https variants
// of the prod URL for tolerance.
function buildAllowedOrigins(): string[] {
  const fromEnv = process.env.PUBLIC_WEB_URL?.trim();
  const set = new Set<string>([
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://127.0.0.1:5173",
  ]);
  if (fromEnv) set.add(fromEnv.replace(/\/$/, ""));
  return Array.from(set);
}

export function buildApp() {
  const app = new Hono();
  app.use("*", logger());
  // CORS must run BEFORE auth so OPTIONS preflights aren't rejected with 401.
  const allowedOrigins = buildAllowedOrigins();
  app.use("*", cors({
    origin: (origin) => allowedOrigins.includes(origin) ? origin : null,
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Authorization", "Content-Type"],
    credentials: true,
    maxAge: 600,
  }));
  app.onError(errorMiddleware);
  app.get("/api/health", (c) => c.json({ ok: true }));
  return app;
}
