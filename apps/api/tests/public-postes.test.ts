import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildTestApp } from "./helpers/app-fixture.js";
import { resetFixtures, makePoste } from "./helpers/seed-fixture.js";

const app = buildTestApp();
beforeEach(resetFixtures);

const SAMPLE_QUESTIONS = [
  { id: "nom", type: "text", label: "Nom complet", required: true },
  { id: "email", type: "email", label: "Email", required: true },
  { id: "experience", type: "long_text", label: "Expérience", required: false },
];

describe("GET /api/public/postes/:slug", () => {
  it("returns 200 with poste + questions when slug exists and poste is open", async () => {
    const poste = await makePoste({
      titre: "TEST_Backend Senior",
      statut: "ouvert",
      slug: "backend-senior-test",
      questions_json: SAMPLE_QUESTIONS,
    });
    const res = await app.request("/api/public/postes/backend-senior-test");
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.titre).toBe(poste.titre);
    expect(body.slug).toBe("backend-senior-test");
    expect(Array.isArray(body.questions)).toBe(true);
    expect(body.questions).toHaveLength(3);
  });

  it("returns 404 when slug does not exist", async () => {
    const res = await app.request("/api/public/postes/slug-inexistant-xyz");
    expect(res.status).toBe(404);
  });

  it("returns 404 when poste is not 'ouvert'", async () => {
    await makePoste({
      titre: "TEST_Poste Fermé",
      statut: "ferme",
      slug: "poste-ferme-test",
      questions_json: SAMPLE_QUESTIONS,
    });
    const res = await app.request("/api/public/postes/poste-ferme-test");
    expect(res.status).toBe(404);
  });

  it("returns questions as empty array when questions_json is null", async () => {
    await makePoste({
      titre: "TEST_Sans Questions",
      statut: "ouvert",
      slug: "sans-questions-test",
      questions_json: null,
    });
    const res = await app.request("/api/public/postes/sans-questions-test");
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.questions).toEqual([]);
  });
});
