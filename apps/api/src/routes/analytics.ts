import { Hono } from "hono";
import { sql } from "drizzle-orm";
import { getDb } from "@rh/db";

const db = getDb();

export const analyticsRouter = new Hono()
  .get("/", async (c) => {
    const [overview] = await db.execute<any>(sql`
      SELECT
        (SELECT COUNT(*)::int FROM postes WHERE statut = 'ouvert')             AS postes_ouverts,
        (SELECT COUNT(*)::int FROM candidatures)                                AS total_candidatures,
        (SELECT AVG(score_global)::float FROM scores)                           AS score_moyen,
        (SELECT COUNT(*)::int FROM communications WHERE statut = 'envoye')      AS emails_envoyes,
        (SELECT COUNT(*)::int FROM candidatures WHERE flagged = true)           AS flagged,
        (SELECT COALESCE(SUM(cost_eur), 0)::float FROM ai_calls
           WHERE created_at >= date_trunc('day', now()))                        AS cout_ia_today_eur,
        (SELECT COALESCE(SUM(cost_eur), 0)::float FROM ai_calls
           WHERE created_at >= date_trunc('month', now()))                      AS cout_ia_month_eur
    `);

    const par_poste = await db.execute<any>(sql`
      SELECT p.id, p.titre, p.statut,
             COUNT(c.id)::int                                AS nb_candidatures,
             COUNT(s.id)::int                                AS nb_scored,
             AVG(s.score_global)::float                       AS avg_score,
             COUNT(CASE WHEN c.flagged THEN 1 END)::int      AS nb_flagged
        FROM postes p
        LEFT JOIN candidatures c ON c.poste_id = p.id
        LEFT JOIN scores s ON s.candidature_id = c.id
       GROUP BY p.id, p.titre, p.statut
       ORDER BY p.created_at DESC
    `);

    const [distribution] = await db.execute<any>(sql`
      SELECT
        COUNT(CASE WHEN score_global >= 80 THEN 1 END)::int                                  AS excellent,
        COUNT(CASE WHEN score_global >= 60 AND score_global < 80 THEN 1 END)::int            AS bon,
        COUNT(CASE WHEN score_global >= 40 AND score_global < 60 THEN 1 END)::int            AS moyen,
        COUNT(CASE WHEN score_global <  40 THEN 1 END)::int                                  AS faible
        FROM scores
    `);

    return c.json({ overview, par_poste: Array.from(par_poste), distribution });
  });
