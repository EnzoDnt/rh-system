import { describe, it, expect, beforeEach } from "vitest";
import { buildTestApp } from "./helpers/app-fixture.js";
import { resetFixtures, makePoste } from "./helpers/seed-fixture.js";

const app = buildTestApp();
beforeEach(resetFixtures);

describe("GET /fiches/:id (public)", () => {
  it("returns the stored HTML with correct content-type", async () => {
    const p = await makePoste({ titre: "TEST_Fiche", fiche_html: "<!DOCTYPE html><html><body>hi</body></html>" });
    const res = await app.request(`/fiches/${p.id}`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/text\/html/);
    const text = await res.text();
    expect(text).toContain("hi");
  });

  it("404 with HTML page when missing", async () => {
    const res = await app.request("/fiches/00000000-0000-0000-0000-000000000000");
    expect(res.status).toBe(404);
    expect(res.headers.get("content-type")).toMatch(/text\/html/);
  });
});
