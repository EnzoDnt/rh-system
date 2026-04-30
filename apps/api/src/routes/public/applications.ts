import { Hono } from "hono";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, postes, candidatures } from "@rh/db";
import { QuestionsArraySchema } from "@rh/types";
import { enqueueScoring } from "../../services/queue-client.js";

const db = getDb();

// In-memory rate limiter: max 5 requests per 15 minutes per IP.
// Sufficient for low-volume public form; replace with Redis/Upstash for high-volume.
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 min
const RATE_LIMIT_MAX = 5;
const rateLimitStore = new Map<string, number[]>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const timestamps = (rateLimitStore.get(ip) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (timestamps.length >= RATE_LIMIT_MAX) return false;
  timestamps.push(now);
  rateLimitStore.set(ip, timestamps);
  return true;
}

const ApplicationPayloadSchema = z.object({
  // Honeypot anti-bot: hidden field, should always be empty for real users
  website_url: z.string().optional(),
  // reponses: map of question.id → value
  reponses: z.record(z.string(), z.union([z.string(), z.number(), z.null()])),
});

export const publicApplicationsRouter = new Hono()

  // POST /api/public/applications/:slug
  // Receives application form submission, validates, inserts candidature, enqueues scoring.
  .post("/:slug", async (c) => {
    // Rate limiting by IP
    const forwarded = c.req.header("x-forwarded-for");
    const ip =
      (forwarded ? forwarded.split(",")[0]?.trim() : undefined) ??
      c.req.header("x-real-ip") ??
      "unknown";
    if (!checkRateLimit(ip)) {
      return c.json({ error: "Trop de requêtes, réessaie dans quelques minutes" }, 429);
    }

    const slug = c.req.param("slug");

    // Parse body
    let rawBody: unknown;
    try {
      rawBody = await c.req.json();
    } catch {
      return c.json({ error: "Corps de la requête invalide (JSON attendu)" }, 400);
    }

    const parsed = ApplicationPayloadSchema.safeParse(rawBody);
    if (!parsed.success) {
      return c.json({ error: parsed.error.errors[0]?.message ?? "Payload invalide" }, 400 as const);
    }
    const { website_url, reponses } = parsed.data;

    // Honeypot: silently return ok=false (don't tell the bot it was detected)
    if (website_url && website_url.trim().length > 0) {
      return c.json({ ok: false }, 200);
    }

    // Lookup poste
    const [poste] = await db
      .select()
      .from(postes)
      .where(and(eq(postes.slug, slug), eq(postes.statut, "ouvert")));
    if (!poste) {
      return c.json({ error: "Poste introuvable ou fermé" }, 404);
    }

    // Validate required fields against questions definition
    const questions = QuestionsArraySchema.parse(poste.questions_json ?? []);
    for (const q of questions) {
      const val = reponses[q.id];
      if (q.required && (val === undefined || val === null || val === "")) {
        return c.json({ error: `Champ requis manquant: ${q.label}` }, 400);
      }
      // Type-specific validation for non-empty values
      if (val !== undefined && val !== null && val !== "") {
        const strVal = String(val);
        if (q.type === "email") {
          if (!z.string().email().safeParse(strVal).success) {
            return c.json({ error: `Email invalide pour "${q.label}"` }, 400);
          }
        }
        if (q.type === "url") {
          if (!z.string().url().safeParse(strVal).success) {
            return c.json({ error: `URL invalide pour "${q.label}"` }, 400);
          }
        }
      }
    }

    // Extract standard fields
    const nom = String(reponses.nom ?? "");
    const email = String(reponses.email ?? "");
    const cv_url = reponses.cv_pdf != null ? String(reponses.cv_pdf) : null;
    const telephone = reponses.telephone != null ? String(reponses.telephone) : null;
    const linkedin_url = reponses.linkedin_url != null ? String(reponses.linkedin_url) : null;

    // Insert candidature
    const [candidature] = await db
      .insert(candidatures)
      .values({
        poste_id: poste.id,
        nom,
        email,
        telephone,
        linkedin_url,
        cv_url,
        reponses_formulaire: reponses,
        statut: "nouveau",
      })
      .returning();

    // Enqueue scoring job
    await enqueueScoring(candidature!.id);

    return c.json({ ok: true, candidature_id: candidature!.id }, 201);
  });
