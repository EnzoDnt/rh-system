import { describe, it, expect, vi } from "vitest";
import { runScoringPrompt } from "../src/services/claude.js";

vi.mock("@anthropic-ai/sdk", () => {
  return {
    default: class FakeAnthropic {
      messages = {
        create: vi.fn(async () => ({
          content: [{
            type: "tool_use",
            name: "submit_score",
            input: {
              score_global: 78,
              scores_details: { competences_techniques: 82 },
              rapport_ia: "Profil solide.",
              recommandation: "retenir",
            },
          }],
        })),
      };
    },
  };
});

describe("runScoringPrompt (tool use)", () => {
  it("parses the tool_use block into a typed ScoringResponse", async () => {
    const out = await runScoringPrompt({
      systemPrompt: "stub",
      model: "claude-sonnet-4-6",
      poste_description: "Senior backend",
      criteres: { competences_techniques: { poids: 60, description: "TS" } },
      cv_text: "10 ans d'expérience",
      reponses: { q1: "react" },
      linkedin_data: null,
    });
    expect(out.score_global).toBe(78);
    expect(out.recommandation).toBe("retenir");
  });
});
