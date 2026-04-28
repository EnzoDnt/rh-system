import type { MiddlewareHandler } from "hono";
import { buildApp } from "../../src/app.js";
import { mountRoutes } from "../../src/routes/index.js";

const passThroughAuth: MiddlewareHandler = async (c, next) => {
  c.set("userId", "test-user");
  c.set("userEmail", "test@local");
  await next();
};

export function buildTestApp() {
  const app = buildApp();
  mountRoutes(app, { authMiddleware: passThroughAuth });
  return app;
}
