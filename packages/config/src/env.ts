import { z } from "zod";

const EnvSchema = z.object({
  // Always required
  DATABASE_URL: z.string().url().or(z.string().startsWith("postgres://")),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  ANTHROPIC_API_KEY: z.string().min(1),

  // Optional per-service (validated lazily where used)
  // Empty strings are coerced to undefined so Zod's optional() works correctly
  // when .env has blank values (e.g. NTFY_TOPIC_URL=)
  RESEND_API_KEY: z.preprocess((v) => v === "" ? undefined : v, z.string().optional()),
  CALENDLY_TOKEN: z.preprocess((v) => v === "" ? undefined : v, z.string().optional()),
  APIFY_API_KEY: z.preprocess((v) => v === "" ? undefined : v, z.string().optional()),
  FORMBRICKS_API_KEY: z.preprocess((v) => v === "" ? undefined : v, z.string().optional()),
  FORMBRICKS_BASE_URL: z.preprocess((v) => v === "" ? undefined : v, z.string().url().optional()),
  FORMBRICKS_ENVIRONMENT_ID: z.preprocess((v) => v === "" ? undefined : v, z.string().optional()),
  FORMBRICKS_WEBHOOK_SECRET: z.preprocess((v) => v === "" ? undefined : v, z.string().min(16).optional()),
  NTFY_TOPIC_URL: z.preprocess((v) => v === "" ? undefined : v, z.string().url().optional()),

  // Public URLs
  PUBLIC_API_URL: z.string().url().default("http://localhost:3000"),
  PUBLIC_WEB_URL: z.string().url().default("http://localhost:5173"),
  PUBLIC_FICHES_URL: z.string().url().default("http://localhost:3000/fiches"),
});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = EnvSchema.safeParse(source);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment:\n${issues}`);
  }
  return result.data;
}
