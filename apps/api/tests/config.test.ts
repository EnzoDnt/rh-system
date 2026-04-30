import { describe, it, expect, afterEach } from "vitest";
import { buildTestApp } from "./helpers/app-fixture.js";

describe("GET /config", () => {
  const original = process.env.RESEND_API_KEY;
  afterEach(() => {
    if (original === undefined) {
      delete process.env.RESEND_API_KEY;
    } else {
      process.env.RESEND_API_KEY = original;
    }
  });

  it("returns resend_enabled=true when RESEND_API_KEY is set", async () => {
    process.env.RESEND_API_KEY = "re_test";
    const app = buildTestApp();
    const res = await app.request("/config");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.resend_enabled).toBe(true);
  });

  it("returns resend_enabled=false when RESEND_API_KEY is empty", async () => {
    delete process.env.RESEND_API_KEY;
    const app = buildTestApp();
    const res = await app.request("/config");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.resend_enabled).toBe(false);
  });
});
