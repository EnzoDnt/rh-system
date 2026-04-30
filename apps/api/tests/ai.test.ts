import { describe, it, expect, vi } from "vitest";
import { buildTestApp } from "./helpers/app-fixture.js";

vi.mock("../src/services/claude.js", () => ({
  runCriteresPrompt: vi.fn(async () => ({ competences_techniques: { poids: 60, description: "TS" } })),
  runEmailPrompt: vi.fn(async () => ({ sujet: "subj", contenu: "body" })),
  runFichePostePrompt: vi.fn(async () => "<!DOCTYPE html><html><body>x</body></html>"),
  runFormulairePrompt: vi.fn(async () => [{ id: "experience_poste", type: "long_text", label: "Décris ton expérience", required: true }]),
}));

const app = buildTestApp();

describe("POST /api/ai/generate-criteres", () => {
  it("returns the generated criteres object", async () => {
    const res = await app.request("/api/ai/generate-criteres", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ titre: "Backend", description: "Senior" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("competences_techniques");
  });
});

describe("POST /api/ai/generate-email", () => {
  it("returns sujet+contenu", async () => {
    const res = await app.request("/api/ai/generate-email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        candidat_nom: "X", poste_titre: "Y",
        score_global: 80, recommandation: "retenir", type_email: "invitation",
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("sujet");
    expect(body).toHaveProperty("contenu");
  });
});

describe("POST /api/ai/generate-fiche-poste", () => {
  it("returns raw HTML string", async () => {
    const res = await app.request("/api/ai/generate-fiche-poste", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ titre: "T", description: "D" }),
    });
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text.startsWith("<!DOCTYPE html>")).toBe(true);
  });
});
