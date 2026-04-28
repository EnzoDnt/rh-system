import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { getDb, postes, candidatures, scores } from "@rh/db";
import { CriteresScoringSchema, PosteStatutSchema } from "@rh/types";
import { Errors } from "../lib/http.js";
import { setupWebhook, createSurvey } from "../services/formbricks.js";

const db = getDb();

const CreateBody = z.object({
  titre: z.string().min(1),
  description: z.string().min(1),
  criteres_scoring: CriteresScoringSchema,
  calendly_event_type: z.string().nullable().optional(),
  fiche_brief: z.string().nullable().optional(),
});

const PatchBody = z.object({
  titre: z.string().min(1).optional(),
  description: z.string().optional(),
  criteres_scoring: CriteresScoringSchema.optional(),
  statut: PosteStatutSchema.optional(),
  calendly_event_type: z.string().nullable().optional(),
  formbricks_survey_id: z.string().nullable().optional(),
  fiche_html: z.string().optional(),
  fiche_brief: z.string().optional(),
});

export const postesRouter = new Hono()

  // GET /api/postes
  .get("/", async (c) => {
    const rows = await db.execute<any>(sql`
      SELECT p.id, p.titre, p.description, p.criteres_scoring,
             p.formbricks_survey_id, p.statut, p.calendly_event_type,
             p.created_at, p.updated_at,
             COUNT(c.id)::int AS nb_candidatures
        FROM postes p
        LEFT JOIN candidatures c ON c.poste_id = p.id
       GROUP BY p.id
       ORDER BY p.created_at DESC
    `);
    return c.json(Array.from(rows));
  })

  // GET /api/postes/:id
  .get("/:id", async (c) => {
    const id = c.req.param("id");
    const [poste] = await db.select().from(postes).where(eq(postes.id, id));
    if (!poste) throw Errors.notFound("Poste");

    const [stats] = await db.execute<any>(sql`
      SELECT
        COUNT(c.id)::int                                AS total_candidatures,
        COUNT(s.id)::int                                AS total_scored,
        COUNT(CASE WHEN c.flagged THEN 1 END)::int      AS total_flagged,
        AVG(s.score_global)::float                       AS avg_score
        FROM candidatures c
        LEFT JOIN scores s ON s.candidature_id = c.id
       WHERE c.poste_id = ${id}
    `);
    return c.json({ ...poste, stats: stats ?? { total_candidatures: 0, total_scored: 0, total_flagged: 0, avg_score: null } });
  })

  // POST /api/postes
  .post("/", zValidator("json", CreateBody), async (c) => {
    const body = c.req.valid("json");
    const [row] = await db.insert(postes).values({
      titre: body.titre,
      description: body.description,
      criteres_scoring: body.criteres_scoring,
      calendly_event_type: body.calendly_event_type ?? null,
      fiche_brief: body.fiche_brief ?? null,
    }).returning();
    return c.json(row, 201);
  })

  // PATCH /api/postes/:id
  .patch("/:id", zValidator("json", PatchBody), async (c) => {
    const id = c.req.param("id");
    const body = c.req.valid("json");
    const [updated] = await db.update(postes).set(body).where(eq(postes.id, id)).returning();
    if (!updated) throw Errors.notFound("Poste");
    return c.json(updated);
  })

  .post("/:id/link-survey", zValidator("json", z.object({ formbricks_survey_id: z.string().min(1) })), async (c) => {
    const id = c.req.param("id");
    const { formbricks_survey_id } = c.req.valid("json");
    const [updated] = await db.update(postes).set({ formbricks_survey_id }).where(eq(postes.id, id))
      .returning({ id: postes.id, titre: postes.titre, formbricks_survey_id: postes.formbricks_survey_id });
    if (!updated) throw Errors.notFound("Poste");
    return c.json(updated);
  })

  .post("/:id/setup-survey", zValidator("json", z.object({ generatedQuestions: z.array(z.record(z.unknown())) })), async (c) => {
    const id = c.req.param("id");
    const { generatedQuestions } = c.req.valid("json");
    const [poste] = await db.select().from(postes).where(eq(postes.id, id));
    if (!poste) throw Errors.notFound("Poste");
    const survey = await createSurvey({ posteTitre: poste.titre, generatedQuestions });
    await db.update(postes).set({ formbricks_survey_id: survey.survey_id }).where(eq(postes.id, id));
    const publicApiUrl = process.env.PUBLIC_API_URL ?? "http://localhost:3000";
    const targetUrlObj = new URL("/webhooks/formbricks", publicApiUrl);
    // Bake the shared secret into the URL so Formbricks (which doesn't support custom headers
    // or HMAC signing) can authenticate. Server-side check matches in apps/api/src/routes/webhooks/formbricks.ts.
    if (process.env.FORMBRICKS_WEBHOOK_SECRET) {
      targetUrlObj.searchParams.set("token", process.env.FORMBRICKS_WEBHOOK_SECRET);
    }
    const targetUrl = targetUrlObj.toString();
    const webhook = await setupWebhook({ survey_id: survey.survey_id, targetUrl });
    return c.json({ ...survey, webhook });
  });
