import { describe, it, expect, vi, beforeEach } from "vitest";
import { eq, sql } from "drizzle-orm";
import { processCommunication } from "../src/handlers/communication.js";
import { getDb, postes, candidatures, communications } from "@rh/db";

vi.mock("../src/services/email.js", () => ({
  sendEmail: vi.fn(async () => ({ message_id: "msg_x" })),
}));

const db = getDb();
beforeEach(async () => { await db.delete(postes).where(sql`titre LIKE 'TEST_COMM_%'`); });

async function fixture(commType: "invitation" | "refus" | "relance" | "accuse_reception", contenu: string, withLink = true) {
  const [p] = await db.insert(postes).values({
    titre: `TEST_COMM_${commType}`, description: "x", criteres_scoring: {},
    lien_reservation_url: withLink ? "https://cal.com/test/entretien" : null,
  }).returning();
  const [c] = await db.insert(candidatures).values({
    poste_id: p!.id, nom: "TEST_COMM_n", email: "z@y", reponses_formulaire: {},
  }).returning();
  const [comm] = await db.insert(communications).values({
    candidature_id: c!.id, type: commType, sujet: "S", contenu, statut: "valide",
  }).returning();
  return { poste: p!, cand: c!, comm: comm! };
}

describe("processCommunication", () => {
  it("invitation: injects reservation link, sends email, sets statut envoye and candidature=entretien", async () => {
    const { cand, comm } = await fixture("invitation", "Bienvenue [LIEN_CALENDLY]!");
    const out = await processCommunication({ communication_id: comm.id });
    expect(out.message_id).toBe("msg_x");
    const [c] = await db.select().from(communications).where(eq(communications.id, comm.id));
    expect(c!.statut).toBe("envoye");
    expect(c!.calendly_link).toContain("cal.com/test/entretien");
    const [cd] = await db.select().from(candidatures).where(eq(candidatures.id, cand.id));
    expect(cd!.statut).toBe("entretien");
  });

  it("refus: no link call, candidature → refuse", async () => {
    const { cand, comm } = await fixture("refus", "Désolé.", false);
    await processCommunication({ communication_id: comm.id });
    const [cd] = await db.select().from(candidatures).where(eq(candidatures.id, cand.id));
    expect(cd!.statut).toBe("refuse");
  });

  it("relance: candidature → en_cours", async () => {
    const { cand, comm } = await fixture("relance", "Bonjour [LIEN_CALENDLY]");
    await processCommunication({ communication_id: comm.id });
    const [cd] = await db.select().from(candidatures).where(eq(candidatures.id, cand.id));
    expect(cd!.statut).toBe("en_cours");
  });

  it("invitation but [LIEN_CALENDLY] missing in body: aborts before send and sets statut=erreur", async () => {
    const { comm } = await fixture("invitation", "Bienvenue (sans placeholder)");
    await expect(processCommunication({ communication_id: comm.id })).rejects.toThrow(/LIEN_CALENDLY/);
    const [c] = await db.select().from(communications).where(eq(communications.id, comm.id));
    expect(c!.statut).toBe("erreur");
  });
});
