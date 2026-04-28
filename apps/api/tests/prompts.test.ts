import { describe, it, expect, beforeAll } from "vitest";
import { eq } from "drizzle-orm";
import { buildTestApp } from "./helpers/app-fixture.js";
import { getDb, prompts, promptsHistory } from "@rh/db";

const db = getDb();
const app = buildTestApp();

let promptId: string;

beforeAll(async () => {
  // assumes db:seed has been run; pick the scoring_candidat row
  const [p] = await db.select().from(prompts).where(eq(prompts.type, "scoring_candidat"));
  promptId = p!.id;
});

describe("GET /api/prompts", () => {
  it("returns the 6 seeded prompts", async () => {
    const res = await app.request("/api/prompts");
    const body = await res.json() as any[];
    expect(body.length).toBeGreaterThanOrEqual(6);
  });
});

describe("GET /api/prompts/:id", () => {
  it("returns the prompt with history array", async () => {
    const res = await app.request(`/api/prompts/${promptId}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.type).toBe("scoring_candidat");
    expect(Array.isArray(body.history)).toBe(true);
  });
});

describe("PATCH /api/prompts/:id", () => {
  it("creates a new version and archives the previous one", async () => {
    const before = await db.select().from(prompts).where(eq(prompts.id, promptId));
    const versionBefore = before[0]!.version;
    const res = await app.request(`/api/prompts/${promptId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ system_prompt: before[0]!.system_prompt + "\n\n# tweak", model: "claude-sonnet-4-6" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.version).toBe(versionBefore + 1);
    const hist = await db.select().from(promptsHistory).where(eq(promptsHistory.prompt_id, promptId));
    expect(hist.some((h) => h.version === versionBefore)).toBe(true);
  });
});

describe("POST /api/prompts/:id/restore", () => {
  it("creates yet another new version with the historical content", async () => {
    const hist = await db.select().from(promptsHistory).where(eq(promptsHistory.prompt_id, promptId));
    const target = hist[0]!;
    const res = await app.request(`/api/prompts/${promptId}/restore`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ history_id: target.id }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    const [latest] = await db.select().from(prompts).where(eq(prompts.id, promptId));
    expect(latest!.system_prompt).toBe(target.system_prompt);
  });
});
