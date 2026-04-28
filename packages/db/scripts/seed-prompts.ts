import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { sql } from "drizzle-orm";
import { getDb, prompts } from "../src/index.js";

const here = dirname(fileURLToPath(import.meta.url));
const promptsDir = join(here, "prompts");

type Seed = {
  nom: string;
  type: string;
  model: string;
  variables_disponibles: { nom: string; description: string }[];
};

const SEED: Seed[] = [
  {
    nom: "Scoring candidat",
    type: "scoring_candidat",
    model: "claude-sonnet-4-6",
    variables_disponibles: [
      { nom: "poste_description", description: "Description du poste" },
      { nom: "criteres", description: "Critères avec poids et descriptions" },
      { nom: "cv_text", description: "Texte extrait du CV" },
      { nom: "reponses", description: "Réponses au formulaire" },
      { nom: "linkedin_data", description: "Données LinkedIn" },
    ],
  },
  {
    nom: "Génération email",
    type: "generation_email",
    model: "claude-sonnet-4-6",
    variables_disponibles: [
      { nom: "candidat_nom", description: "Nom du candidat" },
      { nom: "candidat_email", description: "Email du candidat" },
      { nom: "poste_titre", description: "Titre du poste" },
      { nom: "score_global", description: "Score global (0-100)" },
      { nom: "recommandation", description: "retenir/a_voir/refuser" },
      { nom: "rapport_ia", description: "Rapport d évaluation IA" },
      { nom: "type_email", description: "invitation/refus/relance" },
    ],
  },
  {
    nom: "Génération formulaire",
    type: "generation_formulaire",
    model: "claude-sonnet-4-6",
    variables_disponibles: [
      { nom: "poste_titre", description: "Titre du poste" },
      { nom: "poste_description", description: "Description du poste" },
      { nom: "criteres", description: "Critères de scoring" },
    ],
  },
  {
    nom: "Détection injection",
    type: "guardrails",
    model: "claude-sonnet-4-6",
    variables_disponibles: [
      { nom: "cv_text", description: "Texte du CV à analyser" },
      { nom: "reponses", description: "Réponses du formulaire" },
    ],
  },
  {
    nom: "Génération critères",
    type: "generation_criteres",
    model: "claude-sonnet-4-6",
    variables_disponibles: [
      { nom: "poste_titre", description: "Titre du poste" },
      { nom: "poste_description", description: "Description du poste" },
    ],
  },
  {
    nom: "Génération fiche de poste",
    type: "generation_fiche_poste",
    // NOTE: spec keeps this on the older model intentionally (cf. 04-prompts-ia.md §6).
    // Harmonization to claude-sonnet-4-6 is a v1.1 concern (post-migration).
    model: "claude-sonnet-4-20250514",
    variables_disponibles: [],
  },
];

async function main() {
  const db = getDb();
  for (const seed of SEED) {
    const text = await readFile(join(promptsDir, `${seed.type}.txt`), "utf8");
    await db.insert(prompts).values({
      nom: seed.nom,
      type: seed.type,
      model: seed.model,
      system_prompt: text,
      variables_disponibles: seed.variables_disponibles,
    }).onConflictDoUpdate({
      target: prompts.type,
      set: {
        nom: seed.nom,
        model: seed.model,
        system_prompt: text,
        variables_disponibles: seed.variables_disponibles,
        updated_at: sql`NOW()`,
      },
    });
    console.log(`✓ Seeded prompt: ${seed.type}`);
  }
  console.log(`✓ ${SEED.length} prompts seeded`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
