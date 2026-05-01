import { Hono } from "hono";
import { zv } from "../lib/zv.js";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { getDb, postes, candidatures, scores } from "@rh/db";
import { CriteresScoringSchema, PosteStatutSchema, QuestionsArraySchema, STANDARD_QUESTIONS } from "@rh/types";
import { Errors } from "../lib/http.js";
import { runFormulairePrompt } from "../services/claude.js";

const db = getDb();

const CreateBody = z.object({
  titre: z.string().min(1),
  description: z.string().min(1),
  criteres_scoring: CriteresScoringSchema,
  lien_reservation_url: z.string().nullable().optional(),
  fiche_brief: z.string().nullable().optional(),
});

const PatchBody = z.object({
  titre: z.string().min(1).optional(),
  description: z.string().optional(),
  criteres_scoring: CriteresScoringSchema.optional(),
  statut: PosteStatutSchema.optional(),
  lien_reservation_url: z.string().nullable().optional(),
  fiche_html: z.string().optional(),
  fiche_brief: z.string().optional(),
  questions_json: QuestionsArraySchema.optional(),
});

export const postesRouter = new Hono()

  // GET /api/postes
  .get("/", async (c) => {
    const rows = await db.execute<any>(sql`
      SELECT p.id, p.titre, p.description, p.criteres_scoring,
             p.slug, p.statut, p.lien_reservation_url,
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
  .post("/", zv("json", CreateBody), async (c) => {
    const body = c.req.valid("json");
    const [row] = await db.insert(postes).values({
      titre: body.titre,
      description: body.description,
      criteres_scoring: body.criteres_scoring,
      lien_reservation_url: body.lien_reservation_url ?? null,
      fiche_brief: body.fiche_brief ?? null,
    }).returning();
    return c.json(row, 201);
  })

  // PATCH /api/postes/:id
  .patch("/:id", zv("json", PatchBody), async (c) => {
    const id = c.req.param("id");
    const body = c.req.valid("json");
    const [updated] = await db.update(postes).set(body).where(eq(postes.id, id)).returning();
    if (!updated) throw Errors.notFound("Poste");
    return c.json(updated);
  })

  // POST /api/postes/:id/generate-questions
  // Génère les questions via IA et les persiste dans postes.questions_json.
  // Les standards (nom, email, tel, linkedin, cv) sont ajoutés automatiquement en tête.
  .post("/:id/generate-questions", async (c) => {
    const id = c.req.param("id");
    const [poste] = await db.select().from(postes).where(eq(postes.id, id));
    if (!poste) throw Errors.notFound("Poste");
    if (!poste.description) return c.json({ error: "Le poste n'a pas de description" }, 400);
    const criteres = (poste.criteres_scoring ?? {}) as Record<string, { poids: number; description: string }>;
    const customQuestions = await runFormulairePrompt({
      poste_titre: poste.titre,
      poste_description: poste.description,
      criteres,
    });
    const allQuestions = [...STANDARD_QUESTIONS, ...customQuestions];
    const [updated] = await db.update(postes).set({ questions_json: allQuestions }).where(eq(postes.id, id))
      .returning({ id: postes.id, titre: postes.titre, questions_json: postes.questions_json });
    return c.json({ questions: allQuestions, poste: updated }, 200);
  });
