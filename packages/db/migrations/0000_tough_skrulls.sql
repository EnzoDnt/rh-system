CREATE TABLE IF NOT EXISTS "candidatures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"poste_id" uuid NOT NULL,
	"nom" text NOT NULL,
	"email" text NOT NULL,
	"telephone" text,
	"cv_url" text,
	"cv_texte_extrait" text,
	"linkedin_url" text,
	"linkedin_data" jsonb DEFAULT '{}'::jsonb,
	"reponses_formulaire" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"flagged" boolean DEFAULT false NOT NULL,
	"flag_motif" text,
	"notes_rh" text,
	"statut" text DEFAULT 'nouveau' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "communications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"candidature_id" uuid NOT NULL,
	"type" text NOT NULL,
	"sujet" text NOT NULL,
	"contenu" text NOT NULL,
	"statut" text DEFAULT 'brouillon' NOT NULL,
	"calendly_link" text,
	"envoye_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "postes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"titre" text NOT NULL,
	"description" text,
	"criteres_scoring" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"formbricks_survey_id" text,
	"calendly_event_type" text,
	"fiche_html" text,
	"fiche_brief" text,
	"statut" text DEFAULT 'ouvert' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "prompts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nom" text NOT NULL,
	"type" text NOT NULL,
	"system_prompt" text NOT NULL,
	"model" text DEFAULT 'claude-sonnet-4-6' NOT NULL,
	"variables_disponibles" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "prompts_type_unique" UNIQUE("type")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "prompts_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prompt_id" uuid NOT NULL,
	"system_prompt" text NOT NULL,
	"model" text NOT NULL,
	"version" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"candidature_id" uuid NOT NULL,
	"score_global" integer,
	"scores_details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"rapport_ia" text,
	"recommandation" text,
	"action_proposee" jsonb,
	"model_version" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "scores_candidature_id_unique" UNIQUE("candidature_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "candidatures" ADD CONSTRAINT "candidatures_poste_id_postes_id_fk" FOREIGN KEY ("poste_id") REFERENCES "public"."postes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "communications" ADD CONSTRAINT "communications_candidature_id_candidatures_id_fk" FOREIGN KEY ("candidature_id") REFERENCES "public"."candidatures"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "prompts_history" ADD CONSTRAINT "prompts_history_prompt_id_prompts_id_fk" FOREIGN KEY ("prompt_id") REFERENCES "public"."prompts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "scores" ADD CONSTRAINT "scores_candidature_id_candidatures_id_fk" FOREIGN KEY ("candidature_id") REFERENCES "public"."candidatures"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_cand_poste_id" ON "candidatures" USING btree ("poste_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_cand_statut" ON "candidatures" USING btree ("statut");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_cand_flagged" ON "candidatures" USING btree ("flagged");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_cand_email" ON "candidatures" USING btree ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_cand_created_at" ON "candidatures" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_comm_candidature" ON "communications" USING btree ("candidature_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_comm_statut" ON "communications" USING btree ("statut");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_comm_type" ON "communications" USING btree ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_comm_created_at" ON "communications" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_postes_statut" ON "postes" USING btree ("statut");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_postes_formbricks" ON "postes" USING btree ("formbricks_survey_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_postes_created_at" ON "postes" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_prompts_type" ON "prompts" USING btree ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_history_prompt_id" ON "prompts_history" USING btree ("prompt_id","version" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_scores_candidature" ON "scores" USING btree ("candidature_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_scores_recommandation" ON "scores" USING btree ("recommandation");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_scores_score_global" ON "scores" USING btree ("score_global" DESC NULLS LAST);