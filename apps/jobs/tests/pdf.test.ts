import { describe, it, expect, vi } from "vitest";
import { extractPdfText } from "../src/services/pdf.js";

vi.mock("unpdf", () => ({
  getDocumentProxy: vi.fn(async () => ({})),
  extractText: vi.fn(async () => ({ text: "Hello CV content", totalPages: 2 })),
}));

describe("extractPdfText", () => {
  it("returns text on a successful PDF fetch", async () => {
    (globalThis.fetch as any) = vi.fn(async () => ({
      ok: true,
      headers: new Headers({ "content-type": "application/pdf" }),
      arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
    }));
    const out = await extractPdfText("https://example.com/cv.pdf");
    expect(out?.text).toBe("Hello CV content");
  });

  it("returns null when fetch fails", async () => {
    (globalThis.fetch as any) = vi.fn(async () => ({ ok: false, status: 404, headers: new Headers() }));
    const out = await extractPdfText("https://example.com/missing.pdf");
    expect(out).toBeNull();
  });

  it("returns null when content-type is not pdf", async () => {
    (globalThis.fetch as any) = vi.fn(async () => ({
      ok: true, headers: new Headers({ "content-type": "text/html" }),
      arrayBuffer: async () => new ArrayBuffer(0),
    }));
    const out = await extractPdfText("https://example.com/cv.html");
    expect(out).toBeNull();
  });
});
