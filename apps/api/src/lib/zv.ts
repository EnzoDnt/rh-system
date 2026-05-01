import { zValidator } from "@hono/zod-validator";
import type { ValidationTargets } from "hono";
import type { ZodSchema } from "zod";

/**
 * Wrapper around `@hono/zod-validator` that **throws** Zod errors instead of
 * returning the validator's default `{ success: false, error: {...} }` body.
 *
 * Why: Hono's `onError` middleware (`errorMiddleware`) already formats
 * `ZodError` into the canonical `{ error: string, code: string, issues: [] }`
 * shape consumed by the frontend. The default zValidator response bypasses
 * the error middleware, so the frontend sees an opaque object and the user
 * gets a `[object Object]` toast.
 *
 * Use everywhere instead of `zValidator(...)`.
 */
export const zv = <T extends keyof ValidationTargets, S extends ZodSchema>(
  target: T,
  schema: S,
) =>
  zValidator(target, schema, (result) => {
    if (!result.success) throw result.error;
  });
