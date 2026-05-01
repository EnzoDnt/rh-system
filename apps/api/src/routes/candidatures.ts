import { Hono } from "hono";
import { zv } from "../lib/zv.js";
import { z } from "zod";
import { eq, and, sql, desc } from "drizzle-orm";
import { getDb, candidatures, scores, communications } from "@rh/db";
import { CandidatureStatutSchema } from "@rh/types";
import { Errors } from "../lib/http.js";
import { enqueueScoring } from "../services/queue-client.js";

const db = getDb();

const ListQuery = z.object({
  poste_id: z.string().uuid().optional(),
  statut: CandidatureStatutSchema.optional(),
});

const PatchBody = z.object({
  nom: z.string().min(1).optional(),
  email: z.string().email().optional(),
  telephone: z.string().nullable().optional(),
  cv_url: z.string().url().nullable().optional(),
  linkedin_url: z.string().url().nullable().optional(),
  reponses_formulaire: z.record(z.string(), z.unknown()).optional(),
  flagged: z.boolean().optional(),
  flag_motif: z.string().nullable().optional(),
});

const StatutBody = z.object({ statut: CandidatureStatutSchema });
const NotesBody = z.object({ notes_rh: z.string() });

export const candidaturesRouter = new Hono()

  .get("/", zv("query", ListQuery), async (c) => {
    const { poste_id, statut } = c.req.valid("query");
    const rows = await db.execute<any>(sql`
      SELECT c.id, c.poste_id, p.titre AS poste_titre, c.nom, c.email, c.telephone,
             c.cv_url, c.linkedin_url, c.flagged, c.flag_motif, c.notes_rh, c.statut, c.created_at,
             s.score_global, s.recommandation, s.action_proposee
        FROM candidatures c
        JOIN postes p ON p.id = c.poste_id
        LEFT JOIN scores s ON s.candidature_id = c.id
       WHERE 1=1
         ${poste_id ? sql`AND c.poste_id = ${poste_id}` : sql``}
         ${statut   ? sql`AND c.statut = ${statut}`   : sql``}
       ORDER BY s.score_global DESC NULLS LAST, c.created_at DESC
    `);
    return c.json(Array.from(rows));
  })

  .get("/:id", async (c) => {
    const id = c.req.param("id");
    const [cand] = await db.execute<any>(sql`
      SELECT c.*,
             p.titre AS poste_titre, p.criteres_scoring AS poste_criteres,
             s.id AS score_id, s.score_global, s.scores_details, s.rapport_ia,
             s.recommandation, s.action_proposee, s.model_version,
             s.created_at AS score_created_at
        FROM candidatures c
        JOIN postes p ON p.id = c.poste_id
        LEFT JOIN scores s ON s.candidature_id = c.id
       WHERE c.id = ${id}
    `);
    if (!cand) throw Errors.notFound("Candidature");
    const comms = await db.select().from(communications)
      .where(eq(communications.candidature_id, id))
      .orderBy(desc(communications.created_at));
    return c.json({ ...cand, communications: comms });
  })

  .patch("/:id", zv("json", PatchBody), async (c) => {
    const id = c.req.param("id");
    const body = c.req.valid("json");
    const [updated] = await db.update(candidatures).set(body).where(eq(candidatures.id, id)).returning();
    if (!updated) throw Errors.notFound("Candidature");
    return c.json(updated);
  })

  .patch("/:id/statut", zv("json", StatutBody), async (c) => {
    const id = c.req.param("id");
    const { statut } = c.req.valid("json");
    const [updated] = await db.update(candidatures).set({ statut }).where(eq(candidatures.id, id))
      .returning({ id: candidatures.id, statut: candidatures.statut });
    if (!updated) throw Errors.notFound("Candidature");
    return c.json(updated);
  })

  .patch("/:id/notes", zv("json", NotesBody), async (c) => {
    const id = c.req.param("id");
    const { notes_rh } = c.req.valid("json");
    const [updated] = await db.update(candidatures).set({ notes_rh }).where(eq(candidatures.id, id))
      .returning({ id: candidatures.id, notes_rh: candidatures.notes_rh });
    if (!updated) throw Errors.notFound("Candidature");
    return c.json(updated);
  })

  .post("/:id/rescore", async (c) => {
    const id = c.req.param("id");
    const [exists] = await db.select({ id: candidatures.id }).from(candidatures).where(eq(candidatures.id, id));
    if (!exists) throw Errors.notFound("Candidature");
    const job = await enqueueScoring(id);
    return c.json({ candidature_id: id, job_id: job.id, message: "Re-scoring lancé" }, 202);
  });
