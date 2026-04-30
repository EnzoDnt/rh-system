import { pgTable, uuid, text, jsonb, integer, boolean, timestamp, numeric, index, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// --- POSTES ---
export const postes = pgTable("postes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  titre: text("titre").notNull(),
  description: text("description"),
  criteres_scoring: jsonb("criteres_scoring").notNull().default(sql`'{}'::jsonb`),
  formbricks_survey_id: text("formbricks_survey_id"),
  lien_reservation_url: text("lien_reservation_url"),
  fiche_html: text("fiche_html"),
  fiche_brief: text("fiche_brief"),
  statut: text("statut").notNull().default("ouvert"),
  created_at: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { mode: "string" }).notNull().defaultNow(),
}, (t) => ({
  idxStatut: index("idx_postes_statut").on(t.statut),
  idxFormbricks: index("idx_postes_formbricks").on(t.formbricks_survey_id),
  idxCreated: index("idx_postes_created_at").on(t.created_at.desc()),
}));

// --- CANDIDATURES ---
export const candidatures = pgTable("candidatures", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  poste_id: uuid("poste_id").notNull().references(() => postes.id, { onDelete: "cascade" }),
  nom: text("nom").notNull(),
  email: text("email").notNull(),
  telephone: text("telephone"),
  cv_url: text("cv_url"),
  cv_texte_extrait: text("cv_texte_extrait"),
  linkedin_url: text("linkedin_url"),
  linkedin_data: jsonb("linkedin_data").default(sql`'{}'::jsonb`),
  reponses_formulaire: jsonb("reponses_formulaire").notNull().default(sql`'{}'::jsonb`),
  flagged: boolean("flagged").notNull().default(false),
  flag_motif: text("flag_motif"),
  notes_rh: text("notes_rh"),
  statut: text("statut").notNull().default("nouveau"),
  created_at: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { mode: "string" }).notNull().defaultNow(),
}, (t) => ({
  idxPoste: index("idx_cand_poste_id").on(t.poste_id),
  idxStatut: index("idx_cand_statut").on(t.statut),
  idxFlagged: index("idx_cand_flagged").on(t.flagged),
  idxEmail: index("idx_cand_email").on(t.email),
  idxCreated: index("idx_cand_created_at").on(t.created_at.desc()),
}));

// --- SCORES ---
export const scores = pgTable("scores", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  candidature_id: uuid("candidature_id").notNull().unique().references(() => candidatures.id, { onDelete: "cascade" }),
  score_global: integer("score_global"),
  scores_details: jsonb("scores_details").notNull().default(sql`'{}'::jsonb`),
  rapport_ia: text("rapport_ia"),
  recommandation: text("recommandation"),
  action_proposee: jsonb("action_proposee"),
  model_version: text("model_version"),
  created_at: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { mode: "string" }).notNull().defaultNow(),
}, (t) => ({
  idxCand: index("idx_scores_candidature").on(t.candidature_id),
  idxReco: index("idx_scores_recommandation").on(t.recommandation),
  idxScore: index("idx_scores_score_global").on(t.score_global.desc()),
}));

// --- COMMUNICATIONS ---
export const communications = pgTable("communications", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  candidature_id: uuid("candidature_id").notNull().references(() => candidatures.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  sujet: text("sujet").notNull(),
  contenu: text("contenu").notNull(),
  statut: text("statut").notNull().default("brouillon"),
  calendly_link: text("calendly_link"),
  envoye_at: timestamp("envoye_at", { mode: "string" }),
  marque_envoye_at: timestamp("marque_envoye_at", { mode: "string" }),
  created_at: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { mode: "string" }).notNull().defaultNow(),
}, (t) => ({
  idxCand: index("idx_comm_candidature").on(t.candidature_id),
  idxStatut: index("idx_comm_statut").on(t.statut),
  idxType: index("idx_comm_type").on(t.type),
  idxCreated: index("idx_comm_created_at").on(t.created_at.desc()),
}));

// --- PROMPTS ---
export const prompts = pgTable("prompts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  nom: text("nom").notNull(),
  type: text("type").notNull().unique(),
  system_prompt: text("system_prompt").notNull(),
  model: text("model").notNull().default("claude-sonnet-4-6"),
  variables_disponibles: jsonb("variables_disponibles").notNull().default(sql`'[]'::jsonb`),
  version: integer("version").notNull().default(1),
  created_at: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { mode: "string" }).notNull().defaultNow(),
}, (t) => ({
  idxType: index("idx_prompts_type").on(t.type),
}));

// --- PROMPTS_HISTORY ---
export const promptsHistory = pgTable("prompts_history", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  prompt_id: uuid("prompt_id").notNull().references(() => prompts.id, { onDelete: "cascade" }),
  system_prompt: text("system_prompt").notNull(),
  model: text("model").notNull(),
  version: integer("version").notNull(),
  created_at: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
}, (t) => ({
  idxPromptVersion: index("idx_history_prompt_id").on(t.prompt_id, t.version.desc()),
}));

// --- AI_CALLS ---
export const aiCalls = pgTable("ai_calls", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  prompt_type: text("prompt_type").notNull(),
  model: text("model").notNull(),
  input_tokens: integer("input_tokens").notNull().default(0),
  output_tokens: integer("output_tokens").notNull().default(0),
  cache_creation_tokens: integer("cache_creation_tokens").notNull().default(0),
  cache_read_tokens: integer("cache_read_tokens").notNull().default(0),
  cost_eur: numeric("cost_eur", { precision: 10, scale: 6 }).notNull().default("0"),
  candidature_id: uuid("candidature_id").references(() => candidatures.id, { onDelete: "set null" }),
  poste_id: uuid("poste_id").references(() => postes.id, { onDelete: "set null" }),
  created_at: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
}, (t) => ({
  idxCreated: index("idx_ai_calls_created_at").on(t.created_at.desc()),
  idxType: index("idx_ai_calls_prompt_type").on(t.prompt_type),
}));
