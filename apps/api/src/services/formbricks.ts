import { loadEnv } from "@rh/config";

function fbHeaders() {
  const env = loadEnv();
  if (!env.FORMBRICKS_API_KEY || !env.FORMBRICKS_BASE_URL || !env.FORMBRICKS_ENVIRONMENT_ID) {
    throw new Error("Formbricks env not configured");
  }
  return { "x-api-key": env.FORMBRICKS_API_KEY, "Content-Type": "application/json" };
}

const STANDARD_QUESTIONS = [
  { id: "nom",          type: "openText", headline: { default: "Quel est votre nom complet ?" }, required: true, inputType: "text" },
  { id: "email",        type: "openText", headline: { default: "Quelle est votre adresse email ?" }, required: true, inputType: "email" },
  { id: "telephone",    type: "openText", headline: { default: "Quel est votre numéro de téléphone ?" }, required: true, inputType: "text" },
  { id: "linkedin_url", type: "openText", headline: { default: "Quel est le lien vers votre profil LinkedIn ?" }, required: false, inputType: "text" },
  { id: "cv_upload",    type: "openText", headline: { default: "Veuillez fournir un lien vers votre CV (Google Drive, Dropbox, etc.)" }, subheader: { default: "Partagez un lien accessible vers votre CV au format PDF" }, required: true, inputType: "text" },
];

export async function createSurvey(input: {
  posteTitre: string;
  generatedQuestions: Array<Record<string, unknown>>;
}) {
  const env = loadEnv();
  const body = {
    environmentId: env.FORMBRICKS_ENVIRONMENT_ID,
    name: `Candidature - ${input.posteTitre}`,
    type: "link",
    status: "inProgress",
    questions: [
      ...STANDARD_QUESTIONS,
      ...input.generatedQuestions.map((q: any, i: number) => {
        const out: any = {
          ...q,
          type: q.type === "rating" ? "openText" : q.type,
          headline: typeof q.headline === "string" ? { default: q.headline } : q.headline,
        };
        if (typeof q.subheader === "string") out.subheader = { default: q.subheader };
        if ((q.type === "multipleChoiceSingle" || q.type === "multipleChoiceMulti") && Array.isArray(q.choices)) {
          out.choices = q.choices.map((c: any, j: number) => {
            if (typeof c === "string") return { id: `${q.id ?? `q${i}`}_c${j}`, label: { default: c } };
            return { id: c.id ?? `${q.id ?? `q${i}`}_c${j}`, label: typeof c.label === "string" ? { default: c.label } : c.label };
          });
        }
        return out;
      }),
    ],
    welcomeCard: {
      enabled: true,
      headline: { default: `Candidature - ${input.posteTitre}` },
      html: { default: `<p>Merci de votre intérêt pour le poste de <strong>${input.posteTitre}</strong> chez nous.</p><p>Ce formulaire nous permettra de mieux connaître votre profil. Veuillez remplir toutes les sections avec soin.</p>` },
      buttonLabel: { default: "Commencer" },
      timeToFinish: false,
      showResponseCount: false,
    },
    thankYouCard: {
      enabled: true,
      headline: { default: "Merci pour votre candidature !" },
      subheader: { default: "Votre candidature a bien été enregistrée. Notre équipe l'examinera dans les meilleurs délais." },
    },
  };
  const r = await fetch(`${env.FORMBRICKS_BASE_URL}/api/v1/management/surveys`, {
    method: "POST", headers: fbHeaders(), body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`Formbricks createSurvey ${r.status}: ${await r.text()}`);
  const out: any = await r.json();
  const surveyId = out.data?.id ?? out.id;
  const env2 = loadEnv();
  return { survey_id: surveyId, survey_url: `${env2.FORMBRICKS_BASE_URL}/s/${surveyId}` };
}

export async function setupWebhook(input: { survey_id: string; targetUrl: string }) {
  const env = loadEnv();
  const list = await fetch(`${env.FORMBRICKS_BASE_URL}/api/v1/webhooks`, { headers: fbHeaders() });
  if (list.ok) {
    const data: any = await list.json();
    const all = data.data ?? data ?? [];
    const exists = all.find((w: any) => w.url === input.targetUrl && (w.surveyIds ?? []).includes(input.survey_id));
    if (exists) return { status: "already_exists" as const, webhook_id: exists.id, survey_id: input.survey_id };
  }
  const r = await fetch(`${env.FORMBRICKS_BASE_URL}/api/v1/webhooks`, {
    method: "POST", headers: fbHeaders(),
    body: JSON.stringify({
      url: input.targetUrl,
      triggers: ["responseFinished"],
      surveyIds: [input.survey_id],
      environmentId: env.FORMBRICKS_ENVIRONMENT_ID,
    }),
  });
  if (!r.ok) throw new Error(`Formbricks createWebhook ${r.status}: ${await r.text()}`);
  const out: any = await r.json();
  return { status: "created" as const, webhook_id: out.data?.id ?? out.id, survey_id: input.survey_id };
}
