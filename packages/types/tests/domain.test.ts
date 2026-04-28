import { describe, it, expect } from "vitest";
import {
  PosteSchema,
  CandidatureStatutSchema,
  CommunicationTypeSchema,
  RecommandationSchema,
  ScoringResponseSchema,
} from "../src/domain";

describe("domain schemas", () => {
  it("accepts the 9 candidature statuts", () => {
    const valid = ["nouveau", "en_analyse", "score", "en_cours", "entretien", "offre", "accepte", "refuse", "archive"];
    for (const v of valid) expect(CandidatureStatutSchema.safeParse(v).success).toBe(true);
    expect(CandidatureStatutSchema.safeParse("inconnu").success).toBe(false);
  });

  it("accepts the 4 communication types", () => {
    for (const t of ["invitation", "refus", "relance", "accuse_reception"]) {
      expect(CommunicationTypeSchema.safeParse(t).success).toBe(true);
    }
  });

  it("validates the 3 recommandations", () => {
    expect(RecommandationSchema.safeParse("retenir").success).toBe(true);
    expect(RecommandationSchema.safeParse("a_voir").success).toBe(true);
    expect(RecommandationSchema.safeParse("refuser").success).toBe(true);
    expect(RecommandationSchema.safeParse("accepter").success).toBe(false);
  });

  it("rejects a Poste with empty titre", () => {
    expect(PosteSchema.safeParse({ titre: "", description: "x", criteres_scoring: {} }).success).toBe(false);
  });

  it("validates a complete scoring response", () => {
    const ok = ScoringResponseSchema.safeParse({
      score_global: 78,
      scores_details: { competences_techniques: 80, experience: 75 },
      rapport_ia: "Profil solide.",
      recommandation: "retenir",
    });
    expect(ok.success).toBe(true);
  });

  it("rejects a scoring response with score_global > 100", () => {
    const ko = ScoringResponseSchema.safeParse({
      score_global: 150,
      scores_details: {},
      rapport_ia: "x",
      recommandation: "retenir",
    });
    expect(ko.success).toBe(false);
  });
});
