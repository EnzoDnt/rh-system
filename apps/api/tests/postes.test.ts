import { describe, it, expect, beforeEach } from "vitest";
import { buildTestApp } from "./helpers/app-fixture.js";
import { resetFixtures, makePoste, makeCandidature } from "./helpers/seed-fixture.js";

const app = buildTestApp();
beforeEach(resetFixtures);

describe("POST /api/postes", () => {
  it("creates a poste with default statut=ouvert", async () => {
    const res = await app.request("/api/postes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        titre: "TEST_Backend Dev",
        description: "Senior backend",
        criteres_scoring: { competences_techniques: { poids: 60, description: "TS" } },
      }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.statut).toBe("ouvert");
    expect(body.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("returns 400 on missing titre", async () => {
    const res = await app.request("/api/postes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ description: "x", criteres_scoring: {} }),
    });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/postes", () => {
  it("returns the list with nb_candidatures count", async () => {
    const p = await makePoste({ titre: "TEST_Liste" });
    await makeCandidature(p.id);
    await makeCandidature(p.id);
    const res = await app.request("/api/postes");
    expect(res.status).toBe(200);
    const body = await res.json() as Array<{ id: string; nb_candidatures: number }>;
    const found = body.find((p2) => p2.id === p.id);
    expect(found?.nb_candidatures).toBe(2);
  });
});

describe("GET /api/postes/:id", () => {
  it("returns 404 for unknown id", async () => {
    const res = await app.request("/api/postes/00000000-0000-0000-0000-000000000000");
    expect(res.status).toBe(404);
  });

  it("returns the poste with stats", async () => {
    const p = await makePoste({ titre: "TEST_Stats" });
    await makeCandidature(p.id, { nom: "TEST_S1", email: "s1@local" });
    const res = await app.request(`/api/postes/${p.id}`);
    const body = await res.json();
    expect(body.id).toBe(p.id);
    expect(body.stats.total_candidatures).toBe(1);
  });
});

describe("PATCH /api/postes/:id", () => {
  it("updates only the supplied fields (titre stays unchanged when omitted)", async () => {
    const p = await makePoste({ titre: "TEST_Original", statut: "ouvert" });
    const res = await app.request(`/api/postes/${p.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ statut: "ferme" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.titre).toBe("TEST_Original");
    expect(body.statut).toBe("ferme");
  });

  it("persists questions_json when provided as a valid array", async () => {
    const p = await makePoste({ titre: "TEST_Patch_Questions" });
    const newQuestions = [
      { id: "nom", type: "text", label: "Nom", required: true },
      { id: "experience", type: "long_text", label: "Décris ton expérience", required: true, help_text: "Détaille tes années" },
      { id: "stack", type: "select", label: "Stack favorite", required: true, options: ["React", "Vue", "Svelte"] },
    ];
    const res = await app.request(`/api/postes/${p.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ questions_json: newQuestions }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.questions_json).toEqual(newQuestions);
  });

  it("rejects malformed questions_json (empty id) with 400 + Zod issues", async () => {
    const p = await makePoste({ titre: "TEST_Patch_Invalid" });
    const res = await app.request(`/api/postes/${p.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ questions_json: [{ id: "", type: "text", label: "X", required: true }] }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    // canonical error shape via zv helper + errorMiddleware
    expect(body.error).toBeTruthy();
    expect(body.code).toBe("BAD_REQUEST");
    expect(Array.isArray(body.issues)).toBe(true);
  });
});
