import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildTestApp } from "./helpers/app-fixture.js";
import { resetFixtures, makePoste } from "./helpers/seed-fixture.js";

vi.mock("../src/services/formbricks.js", () => ({
  createSurvey: vi.fn(async () => ({ survey_id: "s1", survey_url: "https://fb/s1" })),
  setupWebhook: vi.fn(async () => ({ status: "created", webhook_id: "w1", survey_id: "s1" })),
}));

const app = buildTestApp();
beforeEach(resetFixtures);

describe("POST /api/postes/:id/setup-survey", () => {
  it("creates survey + webhook + persists survey_id", async () => {
    const p = await makePoste({ titre: "TEST_Setup" });
    const res = await app.request(`/api/postes/${p.id}/setup-survey`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ generatedQuestions: [{ id: "q1", type: "openText", headline: "x" }] }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.survey_id).toBe("s1");
    expect(body.webhook.status).toBe("created");
  });
});

describe("POST /api/postes/:id/link-survey", () => {
  it("updates formbricks_survey_id", async () => {
    const p = await makePoste({ titre: "TEST_Link" });
    const res = await app.request(`/api/postes/${p.id}/link-survey`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ formbricks_survey_id: "fb-xyz" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.formbricks_survey_id).toBe("fb-xyz");
  });
});
