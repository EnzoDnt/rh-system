import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { getDb, postes } from "@rh/db";

const db = getDb();

const errorPage = (titre: string, msg: string) => `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"><title>${titre}</title>
<style>body{font-family:Inter,system-ui,sans-serif;max-width:560px;margin:80px auto;color:#1a1a1a}h1{color:#2c1810}</style>
</head><body><h1>${titre}</h1><p>${msg}</p></body></html>`;

export const fichesRouter = new Hono()
  .get("/:id", async (c) => {
    const id = c.req.param("id");
    if (!/^[0-9a-f-]{36}$/i.test(id)) {
      return c.html(errorPage("Fiche introuvable", "Identifiant invalide."), 404);
    }
    const [row] = await db.select({ fiche_html: postes.fiche_html, titre: postes.titre })
      .from(postes).where(eq(postes.id, id));
    if (!row || !row.fiche_html) {
      return c.html(errorPage("Fiche introuvable", "La fiche de poste demandée n'existe pas ou n'a pas encore été générée."), 404);
    }
    return c.html(row.fiche_html, 200);
  });
