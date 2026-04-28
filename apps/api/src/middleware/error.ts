import type { ErrorHandler } from "hono";
import { ZodError } from "zod";
import { ApiError } from "../lib/http.js";

export const errorMiddleware: ErrorHandler = (err, c) => {
  if (err instanceof ApiError) {
    return c.json({ error: err.message, code: err.code }, err.status);
  }
  if (err instanceof ZodError) {
    return c.json(
      { error: "Validation échouée", code: "BAD_REQUEST", issues: err.issues },
      400,
    );
  }
  console.error("Unhandled error:", err);
  return c.json({ error: "Erreur interne", code: "INTERNAL_ERROR" }, 500);
};
