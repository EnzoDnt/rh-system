import { describe, it, expect, vi, beforeEach } from "vitest";
import { eq, sql } from "drizzle-orm";
import { processScoring } from "../src/handlers/scoring.js";
import { getDb, postes, candidatures, scores, communications } from "@rh/db";

vi.mock("../src/services/guardrails.js", () => ({
  runGuardrails: vi.fn(async (cv: string, r: any) => ({
    flagged: false, flag_motif: null, cleaned_cv: cv, cleaned_reponses: r,
  })),
}));

vi.mock("../src/lib/claude-from-api.js", () => ({
  runScoringPrompt: vi.fn(async () => ({
    score_global: 78, scores_details: { competences: 80 },
    rapport_ia: "ok", recommandation: "retenir",
  })),
  runEmailPrompt: vi.fn(async () => ({ sujet: "Bienvenue", contenu: "Hello [LIEN_CALENDLY]" })),
  runGuardrailsPrompt: vi.fn(),
  runCriteresPrompt: vi.fn(),
  runFichePostePrompt: vi.fn(),
  runFormulairePrompt: vi.fn(),
  determineEmailType: (r: string) => r === "retenir" ? "invitation" : r === "refuser" ? "refus" : "relance",
}));

const db = getDb();
beforeEach(async () => {
  await db.delete(postes).where(sql`titre LIKE 'TEST_SCORING_%'`);
});

describe("processScoring", () => {
  it("creates a score, sets statut=score, drafts an email", async () => {
    const [p] = await db.insert(postes).values({
      titre: "TEST_SCORING_p", description: "x",
      criteres_scoring: { competences: { poids: 100, description: "TS" } },
    }).returning();
    const [c] = await db.insert(candidatures).values({
      poste_id: p!.id, nom: "TEST_SCORING_c", email: "x@y", reponses_formulaire: {},
    }).returning();

    const out = await processScoring({ candidature_id: c!.id });
    expect(out.success).toBe(true);

    const [s] = await db.select().from(scores).where(eq(scores.candidature_id, c!.id));
    expect(s!.score_global).toBe(78);
    expect(s!.recommandation).toBe("retenir");

    const [reloaded] = await db.select().from(candidatures).where(eq(candidatures.id, c!.id));
    expect(reloaded!.statut).toBe("score");

    const drafts = await db.select().from(communications).where(eq(communications.candidature_id, c!.id));
    expect(drafts).toHaveLength(1);
    expect(drafts[0]!.type).toBe("invitation");
    expect(drafts[0]!.statut).toBe("brouillon");
    expect(drafts[0]!.contenu).toContain("[LIEN_CALENDLY]");
  });

  it("ON CONFLICT updates the existing score (re-scoring is idempotent)", async () => {
    const [p] = await db.insert(postes).values({
      titre: "TEST_SCORING_re", description: "x", criteres_scoring: {},
    }).returning();
    const [c] = await db.insert(candidatures).values({
      poste_id: p!.id, nom: "TEST_SCORING_re", email: "z@y", reponses_formulaire: {},
    }).returning();
    await db.insert(scores).values({
      candidature_id: c!.id, score_global: 30, scores_details: {},
      rapport_ia: "old", recommandation: "refuser", model_version: "claude-sonnet-4-6",
    });
    await processScoring({ candidature_id: c!.id });
    const [s] = await db.select().from(scores).where(eq(scores.candidature_id, c!.id));
    expect(s!.score_global).toBe(78);
  });
});
