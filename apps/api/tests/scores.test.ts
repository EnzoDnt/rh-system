import { describe, it, expect, beforeEach } from "vitest";
import { buildTestApp } from "./helpers/app-fixture.js";
import { resetFixtures, makePoste, makeCandidature, makeScore } from "./helpers/seed-fixture.js";

const app = buildTestApp();
beforeEach(resetFixtures);

describe("PATCH /api/candidatures/:id/score", () => {
  it("updates score_global and recommandation", async () => {
    const p = await makePoste({ titre: "TEST_Score" });
    const c = await makeCandidature(p.id);
    await makeScore(c.id);
    const res = await app.request(`/api/candidatures/${c.id}/score`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ score_global: 92, recommandation: "retenir" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.score_global).toBe(92);
    expect(body.recommandation).toBe("retenir");
  });

  it("returns 422 if no score exists yet", async () => {
    const p = await makePoste({ titre: "TEST_NoScore" });
    const c = await makeCandidature(p.id);
    const res = await app.request(`/api/candidatures/${c.id}/score`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ score_global: 50 }),
    });
    expect(res.status).toBe(422);
  });
});
