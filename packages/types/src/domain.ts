import { z } from "zod";

// --- QUESTIONS (native form, replaces Formbricks) ---
export const QuestionTypeSchema = z.enum([
  "text", "email", "tel", "url", "long_text", "file_pdf", "select",
]);
export type QuestionType = z.infer<typeof QuestionTypeSchema>;

export const QuestionSchema = z.object({
  id: z.string().min(1).regex(/^[a-z_][a-z0-9_]*$/, "id must be snake_case"),
  type: QuestionTypeSchema,
  label: z.string().min(1),
  required: z.boolean().default(false),
  options: z.array(z.string()).optional(),
  placeholder: z.string().optional(),
  help_text: z.string().optional(),
});
export type Question = z.infer<typeof QuestionSchema>;

export const QuestionsArraySchema = z.array(QuestionSchema);

export const STANDARD_QUESTIONS: Question[] = [
  { id: "nom", type: "text", label: "Nom complet", required: true },
  { id: "email", type: "email", label: "Email", required: true },
  { id: "telephone", type: "tel", label: "Téléphone", required: false },
  { id: "linkedin_url", type: "url", label: "Lien LinkedIn", required: false, placeholder: "https://linkedin.com/in/..." },
  { id: "cv_pdf", type: "file_pdf", label: "Ton CV (PDF)", required: true },
];

// Statut enums (cf. docs/migration/01-data-model.md §2)
export const PosteStatutSchema = z.enum(["ouvert", "en_cours", "ferme"]);
export type PosteStatut = z.infer<typeof PosteStatutSchema>;

// IMPORTANT: 9 statuts accepted by DB CHECK (see "BUG CONNU" in 01-data-model.md).
// We align the API on the full set, NOT on the truncated 7-value Windmill whitelist.
export const CandidatureStatutSchema = z.enum([
  "nouveau", "en_analyse", "score",
  "en_cours", "entretien", "offre",
  "accepte", "refuse", "archive",
]);
export type CandidatureStatut = z.infer<typeof CandidatureStatutSchema>;

export const CommunicationTypeSchema = z.enum([
  "invitation", "refus", "relance", "accuse_reception",
]);
export type CommunicationType = z.infer<typeof CommunicationTypeSchema>;

export const CommunicationStatutSchema = z.enum([
  "brouillon", "valide", "envoye", "erreur", "marque_envoye",
]);
export type CommunicationStatut = z.infer<typeof CommunicationStatutSchema>;

export const RecommandationSchema = z.enum(["retenir", "a_voir", "refuser"]);
export type Recommandation = z.infer<typeof RecommandationSchema>;

export const PromptTypeSchema = z.enum([
  "scoring_candidat",
  "generation_email",
  "generation_formulaire",
  "guardrails",
  "generation_criteres",
  "generation_fiche_poste",
]);
export type PromptType = z.infer<typeof PromptTypeSchema>;

// JSONB shapes
export const CritereSchema = z.object({
  poids: z.number().min(0).max(100),
  description: z.string(),
});
export const CriteresScoringSchema = z.record(z.string(), CritereSchema);

export const ScoresDetailsSchema = z.record(z.string(), z.number().min(0).max(100));

export const VariableDisponibleSchema = z.object({
  nom: z.string(),
  description: z.string(),
});
export const VariablesDisponiblesSchema = z.array(VariableDisponibleSchema);

// Entity schemas (shape only — id/dates added in DB layer)
export const PosteSchema = z.object({
  titre: z.string().min(1),
  description: z.string().nullable().optional(),
  criteres_scoring: CriteresScoringSchema,
  formbricks_survey_id: z.string().nullable().optional(),
  lien_reservation_url: z.string().nullable().optional(),
  fiche_html: z.string().nullable().optional(),
  fiche_brief: z.string().nullable().optional(),
  statut: PosteStatutSchema.optional(),
});

export const CandidatureSchema = z.object({
  poste_id: z.string().uuid(),
  nom: z.string().min(1),
  email: z.string().email(),
  telephone: z.string().nullable().optional(),
  cv_url: z.string().url().nullable().optional(),
  cv_texte_extrait: z.string().nullable().optional(),
  linkedin_url: z.string().url().nullable().optional(),
  linkedin_data: z.record(z.string(), z.unknown()).optional(),
  reponses_formulaire: z.record(z.string(), z.unknown()),
  flagged: z.boolean().optional(),
  flag_motif: z.string().nullable().optional(),
  notes_rh: z.string().nullable().optional(),
  statut: CandidatureStatutSchema.optional(),
});

// IA outputs (used by services and tests)
export const ScoringResponseSchema = z.object({
  score_global: z.number().min(0).max(100),
  scores_details: ScoresDetailsSchema,
  rapport_ia: z.string().min(1),
  recommandation: RecommandationSchema,
});
export type ScoringResponse = z.infer<typeof ScoringResponseSchema>;

export const EmailResponseSchema = z.object({
  sujet: z.string().min(1),
  contenu: z.string().min(1),
});
export type EmailResponse = z.infer<typeof EmailResponseSchema>;

export const GuardrailsResponseSchema = z.object({
  flagged: z.boolean(),
  motif: z.string().nullable(),
  suspicious_segments: z.array(z.string()).default([]),
});
export type GuardrailsResponse = z.infer<typeof GuardrailsResponseSchema>;
