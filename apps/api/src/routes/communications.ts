import { Hono } from "hono";
import { zv } from "../lib/zv.js";
import { z } from "zod";
import { eq, and, sql } from "drizzle-orm";
import { getDb, communications, candidatures } from "@rh/db";
import { CommunicationTypeSchema, CommunicationStatutSchema } from "@rh/types";
import { Errors } from "../lib/http.js";
import { enqueueCommunication } from "../services/queue-client.js";

const db = getDb();

const ListQuery = z.object({ statut: CommunicationStatutSchema.optional() });
const CreateBody = z.object({
  candidature_id: z.string().uuid(),
  type: CommunicationTypeSchema,
  sujet: z.string().min(1),
  contenu: z.string().min(1),
});
const PatchBody = z.object({
  sujet: z.string().min(1).optional(),
  contenu: z.string().min(1).optional(),
});

export const communicationsRouter = new Hono()

  .get("/", zv("query", ListQuery), async (c) => {
    const { statut } = c.req.valid("query");
    const rows = await db.execute<any>(sql`
      SELECT co.id, co.candidature_id, ca.nom AS candidat_nom, ca.email AS candidat_email,
             p.id AS poste_id, p.titre AS poste_titre,
             co.type, co.sujet, co.contenu, co.statut, co.calendly_link, co.envoye_at, co.created_at
        FROM communications co
        JOIN candidatures ca ON ca.id = co.candidature_id
        JOIN postes p ON p.id = ca.poste_id
       ${statut ? sql`WHERE co.statut = ${statut}` : sql``}
       ORDER BY co.created_at DESC
    `);
    return c.json(Array.from(rows));
  })

  .post("/", zv("json", CreateBody), async (c) => {
    const body = c.req.valid("json");
    const [exists] = await db.select({ id: candidatures.id }).from(candidatures).where(eq(candidatures.id, body.candidature_id));
    if (!exists) throw Errors.notFound("Candidature");
    const [row] = await db.insert(communications).values({ ...body, statut: "brouillon" }).returning();
    return c.json(row, 201);
  })

  .patch("/:id", zv("json", PatchBody), async (c) => {
    const id = c.req.param("id");
    const [comm] = await db.select().from(communications).where(eq(communications.id, id));
    if (!comm) throw Errors.notFound("Communication");
    if (comm.statut !== "brouillon") throw Errors.conflict("Communication déjà validée/envoyée");
    const body = c.req.valid("json");
    const [updated] = await db.update(communications).set(body).where(eq(communications.id, id)).returning();
    return c.json(updated);
  })

  .post("/:id/send", async (c) => {
    const id = c.req.param("id");
    const [updated] = await db.update(communications)
      .set({ statut: "valide" })
      .where(and(eq(communications.id, id), eq(communications.statut, "brouillon")))
      .returning({ id: communications.id, statut: communications.statut });
    if (!updated) throw Errors.notFound("Communication en brouillon");
    const job = await enqueueCommunication(id);
    return c.json({ communication_id: id, statut: updated.statut, job_id: job.id }, 202);
  })

  .post("/:id/mark-sent", async (c) => {
    const id = c.req.param("id");
    const [updated] = await db.update(communications)
      .set({ statut: "marque_envoye", marque_envoye_at: new Date().toISOString() })
      .where(and(eq(communications.id, id), eq(communications.statut, "brouillon")))
      .returning();
    if (!updated) throw Errors.conflict("Communication n'est pas en brouillon");
    return c.json(updated);
  });
