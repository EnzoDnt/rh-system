import { describe, it, expect, beforeEach } from "vitest";
import { buildTestApp } from "./helpers/app-fixture.js";
import { resetFixtures, makePoste, makeCandidature, makeScore } from "./helpers/seed-fixture.js";

const app = buildTestApp();
beforeEach(resetFixtures);

describe("GET /api/analytics", () => {
  it("returns overview, par_poste and distribution", async () => {
    const p = await makePoste({ titre: "TEST_Analytics", statut: "ouvert" });
    const c1 = await makeCandidature(p.id, { nom: "TEST_a1", email: "a1@local" });
    const c2 = await makeCandidature(p.id, { nom: "TEST_a2", email: "a2@local" });
    await makeScore(c1.id, { score_global: 88 });
    await makeScore(c2.id, { score_global: 45 });
    const res = await app.request("/api/analytics");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.overview.postes_ouverts).toBeGreaterThanOrEqual(1);
    expect(body.overview.total_candidatures).toBeGreaterThanOrEqual(2);
    expect(body.distribution).toHaveProperty("excellent");
    expect(Array.isArray(body.par_poste)).toBe(true);
  });
});
