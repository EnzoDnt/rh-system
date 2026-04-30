import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildTestApp } from "./helpers/app-fixture.js";
import { resetFixtures, makePoste } from "./helpers/seed-fixture.js";

const { enqueueScoring } = vi.hoisted(() => ({
  enqueueScoring: vi.fn(async () => ({ id: "test-scoring-job" })),
}));

vi.mock("../src/services/queue-client.js", () => ({
  enqueueScoring,
  enqueueCommunication: vi.fn(),
  enqueueIntake: vi.fn(),
}));

const app = buildTestApp();
beforeEach(() => {
  resetFixtures();
  enqueueScoring.mockClear();
});

const SAMPLE_QUESTIONS = [
  { id: "nom", type: "text", label: "Nom complet", required: true },
  { id: "email", type: "email", label: "Email", required: true },
  { id: "telephone", type: "tel", label: "Téléphone", required: false },
  { id: "cv_pdf", type: "file_pdf", label: "CV PDF", required: true },
  { id: "experience", type: "long_text", label: "Expérience", required: false },
];

const VALID_PAYLOAD = {
  reponses: {
    nom: "Jean Dupont",
    email: "jean@example.com",
    cv_pdf: "https://storage.supabase.co/cvs/test.pdf",
    telephone: "0612345678",
    experience: "5 ans de backend Node.js",
  },
};

describe("POST /api/public/applications/:slug", () => {
  it("creates a candidature and enqueues scoring on valid payload", async () => {
    await makePoste({
      titre: "TEST_Apply Valid",
      statut: "ouvert",
      slug: "apply-valid-test",
      questions_json: SAMPLE_QUESTIONS,
    });
    const res = await app.request("/api/public/applications/apply-valid-test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(VALID_PAYLOAD),
    });
    expect(res.status).toBe(201);
    const body = await res.json() as any;
    expect(body.ok).toBe(true);
    expect(body.candidature_id).toMatch(/^[0-9a-f-]{36}$/);
    expect(enqueueScoring).toHaveBeenCalledOnce();
  });

  it("returns 400 on missing required field (nom)", async () => {
    await makePoste({
      titre: "TEST_Apply Missing",
      statut: "ouvert",
      slug: "apply-missing-test",
      questions_json: SAMPLE_QUESTIONS,
    });
    const res = await app.request("/api/public/applications/apply-missing-test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        reponses: {
          // nom missing
          email: "jean@example.com",
          cv_pdf: "https://storage.supabase.co/cvs/test.pdf",
        },
      }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 on invalid email format", async () => {
    await makePoste({
      titre: "TEST_Apply BadEmail",
      statut: "ouvert",
      slug: "apply-bademail-test",
      questions_json: SAMPLE_QUESTIONS,
    });
    const res = await app.request("/api/public/applications/apply-bademail-test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        reponses: {
          nom: "Jean",
          email: "not-an-email",
          cv_pdf: "https://storage.supabase.co/cvs/test.pdf",
        },
      }),
    });
    expect(res.status).toBe(400);
  });

  it("silently rejects (returns 200 ok=false) if honeypot field is filled", async () => {
    await makePoste({
      titre: "TEST_Apply Honeypot",
      statut: "ouvert",
      slug: "apply-honeypot-test",
      questions_json: SAMPLE_QUESTIONS,
    });
    const res = await app.request("/api/public/applications/apply-honeypot-test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        website_url: "https://spam.com",
        reponses: VALID_PAYLOAD.reponses,
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.ok).toBe(false);
    expect(enqueueScoring).not.toHaveBeenCalled();
  });

  it("returns 404 if slug does not exist", async () => {
    const res = await app.request("/api/public/applications/slug-qui-nexiste-pas", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(VALID_PAYLOAD),
    });
    expect(res.status).toBe(404);
  });

  it("returns 429 after 5 requests in 15 min from same IP", async () => {
    await makePoste({
      titre: "TEST_Apply RateLimit",
      statut: "ouvert",
      slug: "apply-ratelimit-test",
      questions_json: SAMPLE_QUESTIONS,
    });
    // Make 5 valid requests (they may fail for DB reasons but rate limit counts them)
    for (let i = 0; i < 5; i++) {
      await app.request("/api/public/applications/apply-ratelimit-test", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": "10.0.0.99" },
        body: JSON.stringify(VALID_PAYLOAD),
      });
    }
    // 6th request should be rate-limited
    const res = await app.request("/api/public/applications/apply-ratelimit-test", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "10.0.0.99" },
      body: JSON.stringify(VALID_PAYLOAD),
    });
    expect(res.status).toBe(429);
  });
});
