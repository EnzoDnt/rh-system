import { Hono } from "hono";
import { and, eq } from "drizzle-orm";
import { getDb, postes } from "@rh/db";

const db = getDb();

export const publicPostesRouter = new Hono()

  // GET /api/public/postes/:slug
  // Returns poste + questions for rendering the public application form.
  // Only returns postes with statut='ouvert'.
  .get("/:slug", async (c) => {
    const slug = c.req.param("slug");
    const [poste] = await db.select({
      id: postes.id,
      titre: postes.titre,
      description: postes.description,
      fiche_html: postes.fiche_html,
      questions: postes.questions_json,
      slug: postes.slug,
    }).from(postes).where(and(eq(postes.slug, slug), eq(postes.statut, "ouvert")));

    if (!poste) return c.json({ error: "Poste introuvable ou fermé" }, 404);

    return c.json({
      ...poste,
      questions: (poste.questions as unknown[]) ?? [],
    });
  });
