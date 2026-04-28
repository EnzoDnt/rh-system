import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { getDb, postes, candidatures, scores, communications } from "../src/index.js";

const db = getDb();

let posteId: string;
let candId: string;

describe("schema round-trip", () => {
  beforeAll(async () => {
    // clean any prior test fixture
    await db.delete(postes).where(eq(postes.titre, "TEST_FIXTURE_POSTE"));
  });

  afterAll(async () => {
    await db.delete(postes).where(eq(postes.titre, "TEST_FIXTURE_POSTE"));
  });

  it("inserts a poste and retrieves it", async () => {
    const [row] = await db.insert(postes).values({
      titre: "TEST_FIXTURE_POSTE",
      description: "test",
      criteres_scoring: { competences: { poids: 50, description: "test" } },
    }).returning();
    expect(row!.id).toMatch(/^[0-9a-f-]{36}$/);
    posteId = row!.id;
  });

  it("inserts a candidature, score, and communication (FK respected)", async () => {
    const [c] = await db.insert(candidatures).values({
      poste_id: posteId,
      nom: "Jean Test",
      email: "jean@test.local",
      reponses_formulaire: { q1: "answer" },
    }).returning();
    candId = c!.id;

    await db.insert(scores).values({
      candidature_id: candId,
      score_global: 78,
      scores_details: { competences: 80 },
      rapport_ia: "ok",
      recommandation: "retenir",
      model_version: "claude-sonnet-4-6",
    });

    await db.insert(communications).values({
      candidature_id: candId,
      type: "invitation",
      sujet: "test",
      contenu: "test",
    });

    const fetched = await db.select().from(scores).where(eq(scores.candidature_id, candId));
    expect(fetched).toHaveLength(1);
    expect(fetched[0]!.recommandation).toBe("retenir");
  });

  it("updates a candidature and triggers updated_at", async () => {
    const before = await db.select().from(candidatures).where(eq(candidatures.id, candId));
    const t0 = before[0]!.updated_at;
    await new Promise((r) => setTimeout(r, 1100));
    await db.update(candidatures).set({ statut: "score" }).where(eq(candidatures.id, candId));
    const after = await db.select().from(candidatures).where(eq(candidatures.id, candId));
    expect(after[0]!.updated_at).not.toBe(t0);
  });

  it("rejects an invalid statut via CHECK constraint", async () => {
    await expect(
      db.update(candidatures).set({ statut: "inconnu" }).where(eq(candidatures.id, candId))
    ).rejects.toThrow();
  });
});
