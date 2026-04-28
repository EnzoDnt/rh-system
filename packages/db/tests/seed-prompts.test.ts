import { describe, it, expect } from "vitest";
import { getDb, prompts } from "../src/index.js";

describe("seed-prompts (run after `pnpm db:seed`)", () => {
  it("inserted exactly the 6 expected prompt types", async () => {
    const db = getDb();
    const rows = await db.select({ type: prompts.type, model: prompts.model }).from(prompts);
    const types = rows.map((r) => r.type).sort();
    expect(types).toEqual([
      "generation_criteres",
      "generation_email",
      "generation_fiche_poste",
      "generation_formulaire",
      "guardrails",
      "scoring_candidat",
    ]);
  });

  it("system_prompt is non-empty for every prompt", async () => {
    const db = getDb();
    const rows = await db.select().from(prompts);
    for (const r of rows) {
      expect(r.system_prompt.length).toBeGreaterThan(50);
    }
  });
});
