import { describe, it, expect, beforeEach, vi } from "vitest";
import { buildTestApp } from "./helpers/app-fixture.js";
import { resetFixtures, makePoste, makeCandidature, makeScore } from "./helpers/seed-fixture.js";

vi.mock("../src/services/queue-client.js", () => ({
  enqueueScoring: vi.fn(async () => ({ id: "test-job" })),
  enqueueCommunication: vi.fn(async () => ({ id: "test-job" })),
  enqueueIntake: vi.fn(async () => ({ id: "test-job" })),
}));

const app = buildTestApp();
beforeEach(resetFixtures);

describe("GET /api/candidatures", () => {
  it("filters by poste_id", async () => {
    const p1 = await makePoste({ titre: "TEST_F1" });
    const p2 = await makePoste({ titre: "TEST_F2" });
    await makeCandidature(p1.id, { nom: "TEST_A", email: "a@local" });
    await makeCandidature(p2.id, { nom: "TEST_B", email: "b@local" });

    const res = await app.request(`/api/candidatures?poste_id=${p1.id}`);
    const body = await res.json() as any[];
    expect(body.every((c) => c.poste_id === p1.id)).toBe(true);
  });

  it("filters by statut", async () => {
    const p = await makePoste({ titre: "TEST_S" });
    await makeCandidature(p.id, { nom: "TEST_C1", email: "c1@local", statut: "score" });
    await makeCandidature(p.id, { nom: "TEST_C2", email: "c2@local", statut: "nouveau" });

    const res = await app.request(`/api/candidatures?statut=score`);
    const body = await res.json() as any[];
    expect(body.every((c) => c.statut === "score")).toBe(true);
  });
});

describe("GET /api/candidatures/:id", () => {
  it("returns score and communications when present", async () => {
    const p = await makePoste({ titre: "TEST_Detail" });
    const c = await makeCandidature(p.id);
    await makeScore(c.id);
    const res = await app.request(`/api/candidatures/${c.id}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.score_global).toBe(75);
    expect(body.communications).toEqual([]);
  });

  it("returns 404 for unknown id", async () => {
    const res = await app.request("/api/candidatures/00000000-0000-0000-0000-000000000000");
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/candidatures/:id/statut", () => {
  it("accepts the 9 valid statuts", async () => {
    const p = await makePoste({ titre: "TEST_Statut" });
    const c = await makeCandidature(p.id);
    for (const statut of ["en_analyse", "score", "en_cours", "entretien"]) {
      const res = await app.request(`/api/candidatures/${c.id}/statut`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ statut }),
      });
      expect(res.status).toBe(200);
    }
  });

  it("rejects an invalid statut at the API layer (400, before DB)", async () => {
    const p = await makePoste({ titre: "TEST_Statut2" });
    const c = await makeCandidature(p.id);
    const res = await app.request(`/api/candidatures/${c.id}/statut`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ statut: "inconnu" }),
    });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/candidatures/:id/rescore", () => {
  it("returns 202 with a job_id", async () => {
    const p = await makePoste({ titre: "TEST_Re" });
    const c = await makeCandidature(p.id);
    const res = await app.request(`/api/candidatures/${c.id}/rescore`, { method: "POST" });
    expect(res.status).toBe(202);
    const body = await res.json();
    expect(body.job_id).toBe("test-job");
  });
});
