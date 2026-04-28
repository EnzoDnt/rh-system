import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createHmac } from "node:crypto";
import { buildTestApp } from "./helpers/app-fixture.js";

vi.mock("../src/services/queue-client.js", () => ({
  enqueueScoring: vi.fn(),
  enqueueCommunication: vi.fn(),
  enqueueIntake: vi.fn(async () => ({ id: "test-job" })),
}));

const VALID_BODY = JSON.stringify({
  data: { surveyId: "s1", response: { data: { nom: "x", email: "x@x.com" } } },
});
const SECRET = "test-secret-1234567890abcdef";

function sign(body: string, secret: string, ts: number): string {
  const hmac = createHmac("sha256", secret).update(`${ts}.${body}`).digest("hex");
  return `t=${ts},v1=${hmac}`;
}

describe("POST /webhooks/formbricks signature verification", () => {
  let prev: string | undefined;
  beforeEach(() => { prev = process.env.FORMBRICKS_WEBHOOK_SECRET; process.env.FORMBRICKS_WEBHOOK_SECRET = SECRET; });
  afterEach(() => { if (prev === undefined) delete process.env.FORMBRICKS_WEBHOOK_SECRET; else process.env.FORMBRICKS_WEBHOOK_SECRET = prev; });

  it("accepts request with valid signature", async () => {
    const app = buildTestApp();
    const ts = Math.floor(Date.now() / 1000);
    const sig = sign(VALID_BODY, SECRET, ts);
    const res = await app.request("/webhooks/formbricks", {
      method: "POST",
      headers: { "content-type": "application/json", "formbricks-signature": sig },
      body: VALID_BODY,
    });
    expect(res.status).toBe(202);
  });

  it("rejects request signed with wrong secret", async () => {
    const app = buildTestApp();
    const ts = Math.floor(Date.now() / 1000);
    const sig = sign(VALID_BODY, "wrong-secret", ts);
    const res = await app.request("/webhooks/formbricks", {
      method: "POST",
      headers: { "content-type": "application/json", "formbricks-signature": sig },
      body: VALID_BODY,
    });
    expect(res.status).toBe(401);
  });

  it("rejects request with missing signature header", async () => {
    const app = buildTestApp();
    const res = await app.request("/webhooks/formbricks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: VALID_BODY,
    });
    expect(res.status).toBe(401);
  });

  it("rejects request with stale timestamp (>5 minutes)", async () => {
    const app = buildTestApp();
    const ts = Math.floor(Date.now() / 1000) - 10 * 60;
    const sig = sign(VALID_BODY, SECRET, ts);
    const res = await app.request("/webhooks/formbricks", {
      method: "POST",
      headers: { "content-type": "application/json", "formbricks-signature": sig },
      body: VALID_BODY,
    });
    expect(res.status).toBe(401);
  });

  it("rejects malformed signature header", async () => {
    const app = buildTestApp();
    const res = await app.request("/webhooks/formbricks", {
      method: "POST",
      headers: { "content-type": "application/json", "formbricks-signature": "garbage" },
      body: VALID_BODY,
    });
    expect(res.status).toBe(401);
  });

  it("skips verification when secret env var is missing (graceful for local dev)", async () => {
    delete process.env.FORMBRICKS_WEBHOOK_SECRET;
    const app = buildTestApp();
    const res = await app.request("/webhooks/formbricks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: VALID_BODY,
    });
    expect(res.status).toBe(202);
  });

  it("accepts request when ?token= query param matches the secret", async () => {
    const app = buildTestApp();
    const res = await app.request(`/webhooks/formbricks?token=${encodeURIComponent(SECRET)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: VALID_BODY,
    });
    expect(res.status).toBe(202);
  });

  it("rejects request when ?token= query param is wrong", async () => {
    const app = buildTestApp();
    const res = await app.request(`/webhooks/formbricks?token=wrong-token-1234567890`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: VALID_BODY,
    });
    expect(res.status).toBe(401);
  });
});
