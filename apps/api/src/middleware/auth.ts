import type { MiddlewareHandler } from "hono";
import { jwtVerify, createRemoteJWKSet } from "jose";
import { loadEnv } from "@rh/config";
import { Errors } from "../lib/http.js";

// Lazy-initialize to avoid crashing on import when env is incomplete (e.g. in tests).
let _jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
function getJwks() {
  if (!_jwks) {
    const env = loadEnv();
    _jwks = createRemoteJWKSet(new URL(`${env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`));
  }
  return _jwks;
}

export const requireAuth: MiddlewareHandler = async (c, next) => {
  const header = c.req.header("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) throw Errors.unauthorized();
  try {
    const { payload } = await jwtVerify(token, getJwks(), { algorithms: ["RS256", "ES256"] });
    c.set("userId", String(payload.sub));
    c.set("userEmail", String(payload.email ?? ""));
  } catch (err) {
    // Log the real reason so we can diagnose 401 mysteries from prod logs.
    console.error("[auth] jwtVerify failed:", (err as Error).name, "—", (err as Error).message);
    throw Errors.unauthorized();
  }
  await next();
};
