import { describe, it, expect, vi, beforeEach } from "vitest";
import { eq, sql } from "drizzle-orm";
import { processIntakePayload } from "../src/handlers/intake.js";
import { getDb, postes, candidatures } from "@rh/db";

vi.mock("../src/services/pdf.js", () => ({
  extractPdfText: vi.fn(async () => ({ text: "CV text" })),
}));
vi.mock("../src/services/linkedin.js", () => ({
  scrapeLinkedin: vi.fn(async () => ({ data: {
    name: "X", headline: "Y", summary: "", location: "", experience: [],
    education: [], skills: [], languages: [], certifications: [],
    profileUrl: "u", profilePicture: "", connectionCount: null,
  } })),
}));

const db = getDb();
beforeEach(async () => {
  await db.delete(postes).where(sql`titre LIKE 'TEST_INTAKE_%'`);
  // Enable Apify mock for tests (intake.ts guards on APIFY_API_KEY presence)
  process.env.APIFY_API_KEY = "test-key";
});

describe("processIntakePayload", () => {
  it("inserts a candidature linked to a poste matched by formbricks_survey_id", async () => {
    const [poste] = await db.insert(postes).values({
      titre: "TEST_INTAKE_match", description: "x",
      criteres_scoring: {}, formbricks_survey_id: "fb-survey-123",
    }).returning();

    const out = await processIntakePayload({
      event: "responseFinished",
      data: {
        surveyId: "fb-survey-123",
        response: { data: {
          nom: "Jean Test", email: "jean@test", telephone: "+33 6 12 34 56 78",
          cv_upload: "https://drive.example.com/cv.pdf",
          linkedin_url: "https://linkedin.com/in/jean",
          q1: "5 ans",
        }},
      },
    });
    expect(out.candidature_id).toMatch(/^[0-9a-f-]{36}$/);
    const [row] = await db.select().from(candidatures).where(eq(candidatures.id, out.candidature_id));
    expect(row.poste_id).toBe(poste!.id);
    expect(row.cv_texte_extrait).toBe("CV text");
    expect(row.linkedin_data).toMatchObject({ name: "X" });
  });

  it("throws when no poste matches the surveyId", async () => {
    await expect(processIntakePayload({
      event: "responseFinished",
      data: { surveyId: "unknown", response: { data: { nom: "X", email: "x@y" } } },
    })).rejects.toThrow(/poste/i);
  });

  it("throws when nom or email is missing", async () => {
    await expect(processIntakePayload({
      event: "responseFinished",
      data: { surveyId: "any", response: { data: { telephone: "x" } } },
    })).rejects.toThrow(/nom|email/i);
  });
});
