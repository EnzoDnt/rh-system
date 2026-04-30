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

describe("POST /api/communications/:id/mark-sent", () => {
  it("transitions brouillon → marque_envoye and sets marque_envoye_at", async () => {
    const p = await makePoste({ titre: "TEST_MarkSent1" });
    const c = await makeCandidature(p.id);
    const [comm] = await db.insert(communications).values({
      candidature_id: c.id, type: "invitation", sujet: "test", contenu: "hello", statut: "brouillon",
    }).returning();
    const res = await app.request(`/api/communications/${comm!.id}/mark-sent`, { method: "POST" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.statut).toBe("marque_envoye");
    expect(body.marque_envoye_at).toBeTruthy();
  });

  it("returns 409 if statut is not brouillon", async () => {
    const p = await makePoste({ titre: "TEST_MarkSent2" });
    const c = await makeCandidature(p.id);
    const [comm] = await db.insert(communications).values({
      candidature_id: c.id, type: "invitation", sujet: "test", contenu: "hello", statut: "envoye",
    }).returning();
    const res = await app.request(`/api/communications/${comm!.id}/mark-sent`, { method: "POST" });
    expect(res.status).toBe(409);
  });
});
