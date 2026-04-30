import type PgBoss from "pg-boss";
import { eq } from "drizzle-orm";
import { db } from "../services/shared.js";
import { postes, candidatures } from "@rh/db";
import { extractPdfText } from "../services/pdf.js";
import { scrapeLinkedin } from "../services/linkedin.js";
import { notifyJobFailure } from "../services/notifier.js";

const KEYS_NOM   = ["nom", "name", "fullName", "full_name", "nom_complet"];
const KEYS_EMAIL = ["email", "mail", "e_mail", "courriel"];
const KEYS_TEL   = ["telephone", "phone", "tel", "tel_portable", "phone_number"];
const KEYS_CV    = ["cv_upload", "cv", "cv_url", "lien_cv", "resume", "resume_url"];
const KEYS_LI    = ["linkedin_url", "linkedin", "lien_linkedin"];

function pick(data: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = data[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

function extractSurveyId(payload: any): string | null {
  return payload?.data?.surveyId ?? payload?.surveyId ?? payload?.survey_id ?? null;
}
function extractResponseData(payload: any): Record<string, unknown> {
  return payload?.data?.response?.data ?? payload?.response?.data ?? payload?.data?.data ?? payload?.data ?? {};
}

export async function processIntakePayload(payload: any): Promise<{ candidature_id: string }> {
  const survey_id = extractSurveyId(payload);
  if (!survey_id) throw new Error("surveyId introuvable dans le payload Formbricks");
  const data = extractResponseData(payload);
  const nom = pick(data, KEYS_NOM);
  const email = pick(data, KEYS_EMAIL);
  if (!nom || !email) throw new Error("nom ou email manquant dans la candidature");
  const telephone    = pick(data, KEYS_TEL);
  const cv_url       = pick(data, KEYS_CV);
  const linkedin_url = pick(data, KEYS_LI);

  const reponses_formulaire: Record<string, unknown> = { ...data };
  for (const k of [...KEYS_NOM, ...KEYS_EMAIL, ...KEYS_TEL, ...KEYS_CV, ...KEYS_LI]) {
    delete reponses_formulaire[k];
  }

  const [poste] = await db.select().from(postes).where(eq(postes.formbricks_survey_id, survey_id));
  if (!poste) {
    const all = await db.select({ id: postes.id, titre: postes.titre, fb: postes.formbricks_survey_id }).from(postes);
    throw new Error(`Aucun poste pour surveyId=${survey_id}. Postes existants: ${JSON.stringify(all)}`);
  }

  const cv_texte_extrait = cv_url ? (await extractPdfText(cv_url))?.text ?? null : null;
  const linkedin_data = (linkedin_url && process.env.APIFY_API_KEY?.trim())
    ? (await scrapeLinkedin(linkedin_url).catch(() => null))?.data ?? null
    : null;

  const [row] = await db.insert(candidatures).values({
    poste_id: poste.id, nom, email,
    telephone: telephone ?? null,
    cv_url: cv_url ?? null, cv_texte_extrait,
    linkedin_url: linkedin_url ?? null,
    linkedin_data: linkedin_data ?? {},
    reponses_formulaire,
    statut: "nouveau",
  }).returning({ id: candidatures.id });
  return { candidature_id: row!.id };
}

export async function registerIntake(boss: PgBoss) {
  await boss.createQueue("intake");
  await boss.work<any>("intake", { batchSize: 2, includeMetadata: true }, async (jobs: any[]) => {
    for (const job of jobs) {
      try {
        const out = await processIntakePayload(job.data);
        await boss.send("scoring", { candidature_id: out.candidature_id }, {
          retryLimit: 2, retryBackoff: true, expireInHours: 1,
        });
      } catch (e: any) {
        const isFinalAttempt = (job.retryCount ?? 0) >= (job.retryLimit ?? 0);
        if (isFinalAttempt) {
          await notifyJobFailure({ queue: "intake", job_id: job.id, error: e?.message ?? String(e) }).catch(() => {});
        }
        throw e;
      }
    }
  });
}
