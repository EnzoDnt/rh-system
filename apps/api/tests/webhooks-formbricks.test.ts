import { describe, it, expect, vi } from "vitest";
import { buildTestApp } from "./helpers/app-fixture.js";

const { enqueueIntake } = vi.hoisted(() => ({
  enqueueIntake: vi.fn(async () => ({ id: "test-job" })),
}));

vi.mock("../src/services/queue-client.js", () => ({
  enqueueScoring: vi.fn(), enqueueCommunication: vi.fn(),
  enqueueIntake,
}));

const app = buildTestApp();

describe("POST /webhooks/formbricks (public, no auth)", () => {
  it("accepts the payload and enqueues intake", async () => {
    const res = await app.request("/webhooks/formbricks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        event: "responseFinished",
        data: { surveyId: "s1", response: { data: { nom: "Jean", email: "j@x.com" } } },
      }),
    });
    expect(res.status).toBe(202);
    expect(enqueueIntake).toHaveBeenCalledOnce();
    const body = await res.json();
    expect(body.job_id).toBe("test-job");
  });
});
