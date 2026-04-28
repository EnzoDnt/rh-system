import { describe, it, expect, beforeEach, vi } from "vitest";
import { buildTestApp } from "./helpers/app-fixture.js";
import { resetFixtures, makePoste, makeCandidature } from "./helpers/seed-fixture.js";
import { getDb, communications } from "@rh/db";

vi.mock("../src/services/queue-client.js", () => ({
  enqueueScoring: vi.fn(async () => ({ id: "test-job" })),
  enqueueCommunication: vi.fn(async () => ({ id: "test-job" })),
  enqueueIntake: vi.fn(async () => ({ id: "test-job" })),
}));

const db = getDb();
const app = buildTestApp();
beforeEach(resetFixtures);

describe("POST /api/communications", () => {
  it("creates a brouillon", async () => {
    const p = await makePoste({ titre: "TEST_Comm" });
    const c = await makeCandidature(p.id);
    const res = await app.request("/api/communications", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ candidature_id: c.id, type: "invitation", sujet: "test", contenu: "hello" }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.statut).toBe("brouillon");
  });
});

describe("PATCH /api/communications/:id", () => {
  it("rejects edits when statut is not brouillon (409)", async () => {
    const p = await makePoste({ titre: "TEST_C2" });
    const c = await makeCandidature(p.id);
    const [comm] = await db.insert(communications).values({
      candidature_id: c.id, type: "refus", sujet: "x", contenu: "y", statut: "envoye",
    }).returning();
    const res = await app.request(`/api/communications/${comm!.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sujet: "updated" }),
    });
    expect(res.status).toBe(409);
  });
});

describe("POST /api/communications/:id/send", () => {
  it("flips statut to valide and triggers the job", async () => {
    const p = await makePoste({ titre: "TEST_C3" });
    const c = await makeCandidature(p.id);
    const [comm] = await db.insert(communications).values({
      candidature_id: c.id, type: "invitation", sujet: "x", contenu: "y", statut: "brouillon",
    }).returning();
    const res = await app.request(`/api/communications/${comm!.id}/send`, { method: "POST" });
    expect(res.status).toBe(202);
    const body = await res.json();
    expect(body.statut).toBe("valide");
    expect(body.job_id).toBe("test-job");
  });

  it("404 if not in brouillon", async () => {
    const p = await makePoste({ titre: "TEST_C4" });
    const c = await makeCandidature(p.id);
    const [comm] = await db.insert(communications).values({
      candidature_id: c.id, type: "invitation", sujet: "x", contenu: "y", statut: "envoye",
    }).returning();
    const res = await app.request(`/api/communications/${comm!.id}/send`, { method: "POST" });
    expect(res.status).toBe(404);
  });
});
