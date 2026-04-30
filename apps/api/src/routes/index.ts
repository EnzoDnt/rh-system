import type { Hono, MiddlewareHandler } from "hono";
import { requireAuth } from "../middleware/auth.js";
import { postesRouter } from "./postes.js";
import { candidaturesRouter } from "./candidatures.js";
import { scoresRouter } from "./scores.js";
import { communicationsRouter } from "./communications.js";
import { analyticsRouter } from "./analytics.js";
import { promptsRouter } from "./prompts.js";
import { aiRouter } from "./ai.js";
import { notificationsRouter } from "./notifications.js";
import { fichesRouter } from "./public/fiches.js";
import { configRouter } from "./config.js";
import { publicPostesRouter } from "./public/postes.js";
import { publicApplicationsRouter } from "./public/applications.js";
import { publicUploadUrlRouter } from "./public/upload-url.js";

export interface MountOptions {
  authMiddleware?: MiddlewareHandler;
}

export function mountRoutes(app: Hono, opts: MountOptions = {}) {
  const auth = opts.authMiddleware ?? requireAuth;
  // Public routes — must be mounted BEFORE the auth middleware
  app.route("/config", configRouter);
  app.route("/api/public/postes", publicPostesRouter);
  app.route("/api/public/applications", publicApplicationsRouter);
  app.route("/api/public/upload-url", publicUploadUrlRouter);
  app.use("/api/*", auth);
  app.route("/api/postes", postesRouter);
  app.route("/api/candidatures", candidaturesRouter);
  app.route("/api/candidatures", scoresRouter);
  app.route("/api/communications", communicationsRouter);
  app.route("/api/analytics", analyticsRouter);
  app.route("/api/prompts", promptsRouter);
  app.route("/api/ai", aiRouter);
  app.route("/api/notifications", notificationsRouter);
  app.route("/fiches", fichesRouter);
}
