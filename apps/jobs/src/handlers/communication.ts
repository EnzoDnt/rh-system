import type PgBoss from "pg-boss";
import { eq, sql } from "drizzle-orm";
import { db } from "../services/shared.js";
import { postes, candidatures, communications } from "@rh/db";
import { sendEmail } from "../services/email.js";
import { notifyJobFailure } from "./../services/notifier.js";

const NEXT_STATUT: Record<string, string | null> = {
  invitation: "entretien",
  refus: "refuse",
  relance: "en_cours",
  accuse_reception: null,
};

export async function processCommunication(input: { communication_id: string }): Promise<{ message_id: string }> {
  const id = input.communication_id;

  const [row] = await db
    .select({
      comm: communications,
      cand: { id: candidatures.id, nom: candidatures.nom, email: candidatures.email },
      poste_lien: postes.lien_reservation_url,
    })
    .from(communications)
    .innerJoin(candidatures, eq(candidatures.id, communications.candidature_id))
    .innerJoin(postes, eq(postes.id, candidatures.poste_id))
    .where(eq(communications.id, id));
  if (!row) throw new Error(`Communication ${id} introuvable`);
  if (row.comm.statut !== "valide") throw new Error(`Communication ${id} pas en statut 'valide'`);

  let body = row.comm.contenu;
  let reservation_link: string | null = null;

  if (row.comm.type === "invitation" || row.comm.type === "relance") {
    if (row.poste_lien) {
      // Use the URL directly — append name/email prefill params (works with Calendly, Cal.com, and others)
      const url = `${row.poste_lien}?name=${encodeURIComponent(row.cand.nom)}&email=${encodeURIComponent(row.cand.email)}`;
      reservation_link = url;
      body = body.replace(/\[LIEN_CALENDLY\]/g, url);
    }
  }

  // For invitation/relance: the placeholder must have been present AND replaced.
  // Abort if: placeholder still in body (reservation URL missing), or placeholder was never there.
  const needsLink = row.comm.type === "invitation" || row.comm.type === "relance";
  const hadPlaceholder = row.comm.contenu.includes("[LIEN_CALENDLY]");
  if (body.includes("[LIEN_CALENDLY]") || (needsLink && !hadPlaceholder && reservation_link === null) || (needsLink && !hadPlaceholder && row.poste_lien !== null)) {
    await db.update(communications).set({ statut: "erreur" }).where(eq(communications.id, id));
    throw new Error("Email refusé : placeholder [LIEN_CALENDLY] non remplacé (lien_reservation_url manquant sur le poste ?)");
  }

  let message_id: string;
  try {
    const out = await sendEmail({ to: row.cand.email, subject: row.comm.sujet, body });
    message_id = out.message_id;
  } catch (e) {
    await db.update(communications).set({ statut: "erreur" }).where(eq(communications.id, id));
    throw e;
  }

  await db.update(communications).set({
    statut: "envoye",
    envoye_at: sql`NOW()`,
    calendly_link: reservation_link,
  }).where(eq(communications.id, id));

  const next = NEXT_STATUT[row.comm.type];
  if (next) {
    await db.update(candidatures).set({ statut: next }).where(eq(candidatures.id, row.cand.id));
  }

  return { message_id };
}

export async function registerCommunication(boss: PgBoss) {
  await boss.createQueue("communication");
  await boss.work<{ communication_id: string }>("communication", { batchSize: 3, includeMetadata: true } as any, async (jobs: any[]) => {
    for (const job of jobs) {
      try {
        await processCommunication(job.data);
      } catch (e: any) {
        const isFinalAttempt = (job.retryCount ?? 0) >= (job.retryLimit ?? 0);
        if (isFinalAttempt) {
          await notifyJobFailure({ queue: "communication", job_id: job.id, error: e?.message ?? String(e) }).catch(() => {});
        }
        throw e;
      }
    }
  });
}
