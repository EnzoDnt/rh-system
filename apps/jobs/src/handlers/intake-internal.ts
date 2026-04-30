// Internal intake handler: processes candidatures submitted via the native form API.
// Called after POST /api/public/applications/:slug inserts a candidature and enqueues scoring.
//
// This handler:
// 1. Receives a simple { candidature_id } payload (no external survey matching needed)
// 2. Extracts PDF text from cv_url (if present)
// 3. Updates cv_texte_extrait on the candidature so the scoring job has full content
//
// Note: scoring is already enqueued by the API endpoint when the candidature is created.

import type PgBoss from "pg-boss";
import { eq } from "drizzle-orm";
import { db } from "../services/shared.js";
import { candidatures } from "@rh/db";
import { extractPdfText } from "../services/pdf.js";
import { notifyJobFailure } from "../services/notifier.js";

export interface InternalIntakePayload {
  candidature_id: string;
}

export async function processInternalIntake(payload: InternalIntakePayload): Promise<void> {
  const [cand] = await db
    .select()
    .from(candidatures)
    .where(eq(candidatures.id, payload.candidature_id));

  if (!cand) {
    throw new Error(`Candidature ${payload.candidature_id} introuvable`);
  }

  // Extract PDF text if CV URL is present
  if (cand.cv_url) {
    const result = await extractPdfText(cand.cv_url);
    if (result) {
      await db
        .update(candidatures)
        .set({ cv_texte_extrait: result.text })
        .where(eq(candidatures.id, cand.id));
    }
  }
  // Scoring is already enqueued by the API endpoint — no need to re-enqueue here.
}

export async function registerInternalIntake(boss: PgBoss) {
  const QUEUE = "intake-internal";
  await boss.createQueue(QUEUE);
  await boss.work<InternalIntakePayload>(
    QUEUE,
    { batchSize: 2, includeMetadata: true },
    async (jobs: any[]) => {
      for (const job of jobs) {
        try {
          await processInternalIntake(job.data as InternalIntakePayload);
        } catch (e: any) {
          const isFinalAttempt = (job.retryCount ?? 0) >= (job.retryLimit ?? 0);
          if (isFinalAttempt) {
            await notifyJobFailure({
              queue: QUEUE,
              job_id: job.id,
              error: e?.message ?? String(e),
            }).catch(() => {});
          }
          throw e;
        }
      }
    },
  );
}
