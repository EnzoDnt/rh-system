import type PgBoss from "pg-boss";
import { eq, sql } from "drizzle-orm";
import { db } from "../services/shared.js";
import { postes, candidatures, scores, communications } from "@rh/db";
import { runGuardrails } from "../services/guardrails.js";
import { runScoringPrompt, runEmailPrompt, determineEmailType } from "../lib/claude-from-api.js";
import { notifyJobFailure } from "../services/notifier.js";

export async function processScoring(input: { candidature_id: string }): Promise<{ success: true }> {
  const id = input.candidature_id;

  await db.update(candidatures).set({ statut: "en_analyse" }).where(eq(candidatures.id, id));
  const [row] = await db
    .select({
      cand: candidatures, poste_titre: postes.titre, poste_desc: postes.description,
      criteres: postes.criteres_scoring,
    })
    .from(candidatures).innerJoin(postes, eq(candidatures.poste_id, postes.id))
    .where(eq(candidatures.id, id));
  if (!row) throw new Error(`Candidature ${id} introuvable`);

  const cv = row.cand.cv_texte_extrait ?? "";
  const reponses = (row.cand.reponses_formulaire ?? {}) as Record<string, unknown>;
  const guard = await runGuardrails(cv, reponses);

  if (guard.flagged) {
    await db.update(candidatures)
      .set({ flagged: true, flag_motif: guard.flag_motif })
      .where(eq(candidatures.id, id));
  }

  const score = await runScoringPrompt({
    poste_description: row.poste_desc ?? row.poste_titre,
    criteres: row.criteres as Record<string, { poids: number; description: string }>,
    cv_text: guard.cleaned_cv,
    reponses: guard.cleaned_reponses,
    linkedin_data: row.cand.linkedin_data,
  });

  await db.insert(scores).values({
    candidature_id: id,
    score_global: score.score_global,
    scores_details: score.scores_details,
    rapport_ia: score.rapport_ia,
    recommandation: score.recommandation,
    model_version: "claude-sonnet-4-6",
  }).onConflictDoUpdate({
    target: scores.candidature_id,
    set: {
      score_global: score.score_global,
      scores_details: score.scores_details,
      rapport_ia: score.rapport_ia,
      recommandation: score.recommandation,
      model_version: "claude-sonnet-4-6",
      updated_at: sql`NOW()`,
    },
  });
  await db.update(candidatures).set({ statut: "score" }).where(eq(candidatures.id, id));

  const emailType = determineEmailType(score.recommandation);
  const email = await runEmailPrompt({
    candidat_nom: row.cand.nom,
    candidat_email: row.cand.email,
    poste_titre: row.poste_titre,
    score_global: score.score_global,
    recommandation: score.recommandation,
    rapport_ia: score.rapport_ia,
    emailType,
  });

  await db.insert(communications).values({
    candidature_id: id,
    type: emailType,
    sujet: email.sujet,
    contenu: email.contenu,
    statut: "brouillon",
  });

  return { success: true };
}

export async function registerScoring(boss: PgBoss) {
  await boss.createQueue("scoring");
  await boss.work<{ candidature_id: string }>("scoring", { batchSize: 5, includeMetadata: true } as any, async (jobs: any[]) => {
    for (const job of jobs) {
      try {
        await processScoring(job.data);
      } catch (e: any) {
        const isFinalAttempt = (job.retryCount ?? 0) >= (job.retryLimit ?? 0);
        if (isFinalAttempt) {
          await notifyJobFailure({ queue: "scoring", job_id: job.id, error: e?.message ?? String(e) }).catch(() => {});
        }
        throw e;
      }
    }
  });
}
