import { describe, it, expect, beforeEach } from "vitest";
import { sql } from "drizzle-orm";
import { buildTestApp } from "./helpers/app-fixture.js";
import { getDb, notifications } from "@rh/db";

const app = buildTestApp();
const db = getDb();

beforeEach(async () => {
  await db.delete(notifications).where(sql`titre LIKE 'TEST_NOTIF%'`);
});

async function seedNotif(overrides: Partial<typeof notifications.$inferInsert> = {}) {
  const [row] = await db.insert(notifications).values({
    type: "job_failure",
    severity: "error",
    titre: "TEST_NOTIF échec",
    message: "Job xyz échoué",
    ...overrides,
  }).returning();
  return row!;
}

describe("GET /api/notifications", () => {
  it("returns notifications newest first", async () => {
    await seedNotif({ titre: "TEST_NOTIF premier", created_at: "2026-01-01 10:00:00" } as any);
    await seedNotif({ titre: "TEST_NOTIF deuxième", created_at: "2026-01-01 11:00:00" } as any);
    const res = await app.request("/api/notifications");
    expect(res.status).toBe(200);
    const body = await res.json() as any[];
    const testRows = body.filter((r: any) => r.titre.startsWith("TEST_NOTIF"));
    expect(testRows.length).toBeGreaterThanOrEqual(2);
    // Newest first: deuxième should appear before premier
    const idxPremier = testRows.findIndex((r: any) => r.titre === "TEST_NOTIF premier");
    const idxDeuxieme = testRows.findIndex((r: any) => r.titre === "TEST_NOTIF deuxième");
    expect(idxDeuxieme).toBeLessThan(idxPremier);
  });

  it("?unread=true filters to unread only", async () => {
    const read = await seedNotif({ titre: "TEST_NOTIF lue" });
    await seedNotif({ titre: "TEST_NOTIF non-lue" });
    // Mark one as read
    await db.execute(sql`UPDATE notifications SET lue_at = now() WHERE id = ${read.id}`);

    const res = await app.request("/api/notifications?unread=true");
    expect(res.status).toBe(200);
    const body = await res.json() as any[];
    const testRows = body.filter((r: any) => r.titre.startsWith("TEST_NOTIF"));
    expect(testRows.every((r: any) => r.lue_at === null)).toBe(true);
    expect(testRows.some((r: any) => r.titre === "TEST_NOTIF non-lue")).toBe(true);
    expect(testRows.some((r: any) => r.titre === "TEST_NOTIF lue")).toBe(false);
  });
});

describe("POST /api/notifications/:id/mark-read", () => {
  it("sets lue_at on the notification", async () => {
    const n = await seedNotif({ titre: "TEST_NOTIF to-mark" });
    expect(n.lue_at).toBeNull();
    const res = await app.request(`/api/notifications/${n.id}/mark-read`, { method: "POST" });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.lue_at).not.toBeNull();
  });

  it("returns 404 for unknown id", async () => {
    const res = await app.request("/api/notifications/00000000-0000-0000-0000-000000000000/mark-read", { method: "POST" });
    expect(res.status).toBe(404);
  });
});

describe("POST /api/notifications/mark-all-read", () => {
  it("marks all unread notifications as read", async () => {
    await seedNotif({ titre: "TEST_NOTIF a" });
    await seedNotif({ titre: "TEST_NOTIF b" });
    const res = await app.request("/api/notifications/mark-all-read", { method: "POST" });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(typeof body.updated).toBe("number");

    const unread = await db.execute(
      sql`SELECT count(*)::int AS n FROM notifications WHERE lue_at IS NULL AND titre LIKE 'TEST_NOTIF%'`
    );
    expect(Number((unread as any)[0]?.n ?? 0)).toBe(0);
  });
});
