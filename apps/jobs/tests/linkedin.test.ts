import { describe, it, expect, vi, beforeEach } from "vitest";
import { scrapeLinkedin } from "../src/services/linkedin.js";

const FAKE = [{
  fullName: "Jean Dupont", headline: "Senior Dev", summary: "x",
  addressWithCountry: "Paris, France",
  experiences: [{ title: "Dev", company: "Acme" }],
  educations: [{ school: "MIT" }],
  skills: ["TS", "React"], languages: [], certifications: [],
  linkedinUrl: "https://linkedin.com/in/jeandupont",
  profilePic: "https://x", connections: 500,
}];

beforeEach(() => { process.env.APIFY_API_KEY = "k"; });

describe("scrapeLinkedin", () => {
  it("rejects non-linkedin URLs early", async () => {
    expect(await scrapeLinkedin("https://twitter.com/x")).toBeNull();
  });

  it("normalizes the Apify response", async () => {
    (globalThis.fetch as any) = vi.fn(async () => ({ ok: true, json: async () => FAKE }));
    const out = await scrapeLinkedin("https://linkedin.com/in/jeandupont");
    expect(out?.data.name).toBe("Jean Dupont");
    expect(out?.data.location).toBe("Paris, France");
    expect(out?.data.skills).toEqual(["TS", "React"]);
    expect(out?.data.connectionCount).toBe(500);
  });

  it("returns null on Apify error", async () => {
    (globalThis.fetch as any) = vi.fn(async () => ({ ok: false, status: 500, text: async () => "boom" }));
    expect(await scrapeLinkedin("https://linkedin.com/in/x")).toBeNull();
  });
});
