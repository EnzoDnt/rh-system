import { eq, sql } from "drizzle-orm";
import { getDb, postes, candidatures, scores, communications } from "@rh/db";

const db = getDb();

export async function resetFixtures() {
  await db.delete(postes).where(sql`titre LIKE 'TEST_%'`);
}

export async function makePoste(overrides: Partial<typeof postes.$inferInsert> = {}) {
  const [row] = await db.insert(postes).values({
    titre: "TEST_Poste",
    description: "test desc",
    criteres_scoring: { competences: { poids: 50, description: "test" } },
    ...overrides,
  }).returning();
  return row!;
}

export async function makeCandidature(poste_id: string, overrides: Partial<typeof candidatures.$inferInsert> = {}) {
  const [row] = await db.insert(candidatures).values({
    poste_id,
    nom: "TEST Candidat",
    email: `test+${Date.now()}@local`,
    reponses_formulaire: {},
    ...overrides,
  }).returning();
  return row!;
}

export async function makeScore(candidature_id: string, overrides: Partial<typeof scores.$inferInsert> = {}) {
  const [row] = await db.insert(scores).values({
    candidature_id,
    score_global: 75,
    scores_details: { competences: 75 },
    rapport_ia: "ok",
    recommandation: "retenir",
    model_version: "claude-sonnet-4-6",
    ...overrides,
  }).returning();
  return row!;
}
