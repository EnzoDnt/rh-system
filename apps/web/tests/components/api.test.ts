import { describe, it, expect, vi, beforeEach } from "vitest";
import { ApiError, api } from "../../src/lib/api.js";

vi.mock("../../src/lib/supabase.js", () => ({
  supabase: { auth: { getSession: vi.fn(async () => ({ data: { session: { access_token: "tok" } } })) } },
}));

describe("api()", () => {
  beforeEach(() => { (globalThis.fetch as any) = vi.fn(); });

  it("attaches Authorization header from supabase session", async () => {
    (fetch as any).mockResolvedValueOnce({ ok: true, headers: new Headers({ "content-type": "application/json" }), json: async () => ({ ok: true }) });
    await api("/api/health");
    const call = (fetch as any).mock.calls[0]!;
    expect(call[1].headers.Authorization).toBe("Bearer tok");
  });

  it("throws ApiError with code on HTTP 4xx JSON", async () => {
    (fetch as any).mockResolvedValueOnce({ ok: false, status: 404, headers: new Headers({ "content-type": "application/json" }), json: async () => ({ error: "x", code: "RESOURCE_NOT_FOUND" }) });
    await expect(api("/api/postes/zzz")).rejects.toMatchObject({ status: 404, code: "RESOURCE_NOT_FOUND" });
  });

  it("returns text on text/html responses", async () => {
    (fetch as any).mockResolvedValueOnce({ ok: true, headers: new Headers({ "content-type": "text/html" }), text: async () => "<html>" });
    const out = await api<string>("/fiches/x");
    expect(out).toBe("<html>");
  });
});
