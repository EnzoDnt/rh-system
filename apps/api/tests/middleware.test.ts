import { describe, it, expect } from "vitest";
import { buildApp } from "../src/app.js";
import { ApiError } from "../src/lib/http.js";

const app = buildApp();
// Add a route that throws ApiError and a route that throws raw Error to test error middleware
app.get("/test/api-error", () => {
  throw new ApiError(404, "Poste introuvable", "RESOURCE_NOT_FOUND");
});
app.get("/test/raw-error", () => {
  throw new Error("oops");
});

describe("error middleware", () => {
  it("turns ApiError into a JSON response with code", async () => {
    const res = await app.request("/test/api-error");
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toEqual({ error: "Poste introuvable", code: "RESOURCE_NOT_FOUND" });
  });

  it("turns raw Error into 500 INTERNAL_ERROR", async () => {
    const res = await app.request("/test/raw-error");
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.code).toBe("INTERNAL_ERROR");
  });
});

describe("health", () => {
  it("returns ok", async () => {
    const res = await app.request("/api/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});
