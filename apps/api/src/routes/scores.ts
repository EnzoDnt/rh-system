import { Hono } from "hono";
import { zv } from "../lib/zv.js";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb, scores } from "@rh/db";
import { RecommandationSchema, ScoresDetailsSchema } from "@rh/types";
import { Errors } from "../lib/http.js";

const db = getDb();

const PatchBody = z.object({
  score_global: z.number().min(0).max(100).optional(),
  scores_details: ScoresDetailsSchema.optional(),
  recommandation: RecommandationSchema.optional(),
  rapport_ia: z.string().optional(),
});

export const scoresRouter = new Hono()
  .patch("/:candidature_id/score", zv("json", PatchBody), async (c) => {
    const candidature_id = c.req.param("candidature_id");
    const body = c.req.valid("json");
    const [existing] = await db.select({ id: scores.id }).from(scores).where(eq(scores.candidature_id, candidature_id));
    if (!existing) throw Errors.unprocessable(`Score pour candidature ${candidature_id} introuvable`);
    const [updated] = await db.update(scores).set(body).where(eq(scores.candidature_id, candidature_id)).returning();
    return c.json(updated);
  });
