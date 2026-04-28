import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildTestApp } from "./helpers/app-fixture.js";
import { resetFixtures } from "./helpers/seed-fixture.js";

vi.mock("../src/services/queue-client.js", () => ({
  enqueueScoring: vi.fn(async () => ({ id: "j" })),
  enqueueCommunication: vi.fn(async () => ({ id: "j" })),
  enqueueIntake: vi.fn(async () => ({ id: "j" })),
}));

const app = buildTestApp();
beforeEach(resetFixtures);

describe("smoke: poste → candidature (manual) → score (manual) → comm → send", () => {
  it("walks the happy path through the API surface", async () => {
    // 1. create poste
    const r1 = await app.request("/api/postes", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({
        titre: "TEST_Smoke",
        description: "Senior backend engineer",
        criteres_scoring: { competences: { poids: 100, description: "TS" } },
      }),
    });
    expect(r1.status).toBe(201);
    const poste = await r1.json();

    // 2. create a candidature directly via DB (intake usually does this)
    const { getDb, candidatures, scores, communications } = await import("@rh/db");
    const db = getDb();
    const [c] = await db.insert(candidatures).values({
      poste_id: poste.id, nom: "TEST_Smoke", email: "smoke@local", reponses_formulaire: {},
    }).returning();
    expect(c).toBeDefined();

    // 3. flip to en_analyse via API
    const r3 = await app.request(`/api/candidatures/${c!.id}/statut`, {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({ statut: "en_analyse" }),
    });
    expect(r3.status).toBe(200);

    // 4. insert a score (scoring task does this) then patch via API
    await db.insert(scores).values({
      candidature_id: c!.id, score_global: 70, scores_details: { competences: 70 },
      rapport_ia: "ok", recommandation: "retenir", model_version: "claude-sonnet-4-6",
    });
    const r4 = await app.request(`/api/candidatures/${c!.id}/score`, {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({ score_global: 85 }),
    });
    expect(r4.status).toBe(200);

    // 5. create a brouillon communication
    const r5 = await app.request("/api/communications", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ candidature_id: c!.id, type: "invitation", sujet: "x", contenu: "y" }),
    });
    expect(r5.status).toBe(201);
    const comm = await r5.json();

    // 6. send it
    const r6 = await app.request(`/api/communications/${comm.id}/send`, { method: "POST" });
    expect(r6.status).toBe(202);
    const sendBody = await r6.json();
    expect(sendBody.statut).toBe("valide");

    // 7. analytics returns
    const r7 = await app.request("/api/analytics");
    expect(r7.status).toBe(200);
  });
});
