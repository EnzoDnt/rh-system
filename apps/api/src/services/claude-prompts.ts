// User-prompt templates — verbatim from docs/migration/04-prompts-ia.md.
// System prompts live in the DB (table `prompts`) and are loaded at runtime.

export function scoringUserPrompt(input: {
  poste_description: string;
  criteres: Record<string, { poids: number; description: string }>;
  cv_text: string | null;
  reponses: Record<string, unknown>;
  linkedin_data: unknown | null;
}): string {
  const criteresList = Object.entries(input.criteres)
    .map(([nom, c]) => `- **${nom}** (poids: ${c.poids}/100) : ${c.description}`)
    .join("\n");
  const reponses = Object.keys(input.reponses).length
    ? "```json\n" + JSON.stringify(input.reponses, null, 2) + "\n```"
    : "Aucune réponse fournie.";
  const linkedin = input.linkedin_data
    ? "```json\n" + JSON.stringify(input.linkedin_data, null, 2) + "\n```"
    : "Aucune donnée LinkedIn disponible.";
  return `# Évaluation de candidature

## Description du poste
${input.poste_description || "Poste non décrit"}

## Critères d'évaluation (avec pondération)
${criteresList}

## CV du candidat
\`\`\`
${input.cv_text || "Aucun CV fourni. Évaluer uniquement sur les réponses au formulaire."}
\`\`\`

## Réponses du candidat au formulaire
${reponses}

## Données LinkedIn du candidat
${linkedin}
`;
}

export function emailUserPrompt(input: {
  candidat_nom: string;
  candidat_email: string;
  poste_titre: string;
  score_global: number | null;
  recommandation: "retenir" | "a_voir" | "refuser" | null;
  rapport_ia: string;
  emailType: "invitation" | "refus" | "relance";
  feedback?: string | null;
}): string {
  const typeInstructions: Record<string, string> = {
    invitation: "C'est un email d'INVITATION à un entretien. Le ton doit être enthousiaste et accueillant. Inclus le placeholder [LIEN_CALENDLY] à l'endroit où le candidat doit cliquer pour réserver un créneau d'entretien. Mentionne que l'équipe a été impressionnée par son profil.",
    refus: "C'est un email de REFUS courtois. Le ton doit être respectueux, bienveillant et encourageant. Remercie le candidat pour son intérêt et le temps consacré à sa candidature. Ne rentre pas dans les détails négatifs, reste vague sur les raisons (ex: \"d'autres profils correspondaient davantage aux besoins actuels\"). Encourage le candidat à postuler de nouveau à l'avenir.",
    relance: "C'est un email de RELANCE / SUIVI pour un profil \"à revoir\". Le ton doit être positif et ouvert. Indique que le profil a retenu l'attention et que l'équipe souhaite en savoir plus. Propose un échange informel ou un complément d'information. Inclus le placeholder [LIEN_CALENDLY] pour proposer un créneau de discussion.",
  };
  const feedbackBlock = input.feedback
    ? `\n## Instructions de régénération (feedback utilisateur)\n${input.feedback}\n`
    : "";
  return `# Rédaction d'email candidat

## Informations
- **Candidat** : ${input.candidat_nom} (${input.candidat_email})
- **Poste** : ${input.poste_titre}
- **Score global** : ${input.score_global ?? "n/a"}/100
- **Recommandation** : ${input.recommandation ?? "n/a"}
- **Type d'email à rédiger** : ${input.emailType}

## Rapport d'évaluation IA
${input.rapport_ia}

## Consignes pour ce type d'email
${typeInstructions[input.emailType]}
${feedbackBlock}`;
}

export function determineEmailType(reco: string | null): "invitation" | "refus" | "relance" {
  if (reco === "retenir") return "invitation";
  if (reco === "refuser") return "refus";
  return "relance";
}

export function criteresUserPrompt(input: { titre: string; description: string; instructions?: string }): string {
  const extra = input.instructions ? `\n\n## Instructions spécifiques pour les critères\n${input.instructions}` : "";
  return `## Poste
Titre : ${input.titre}
Description : ${input.description}${extra}`;
}

export function fichePosteUserPrompt(input: {
  titre: string;
  description: string;
  brief?: string;
  feedback?: string;
  current_html?: string;
}): string {
  if (input.feedback && input.current_html) {
    return `Voici la fiche de poste HTML actuelle :

\`\`\`html
${input.current_html}
\`\`\`

## Modifications demandées
${input.feedback}

Applique ces modifications et retourne le HTML complet mis à jour. Conserve le même style et structure, ne modifie que ce qui est demandé.`;
  }
  const brief = input.brief ? `\n\n## Brief supplémentaire\n${input.brief}` : "";
  return `Génère la fiche de poste HTML pour :

## Poste
Titre : ${input.titre}
Description : ${input.description}${brief}

IMPORTANT: Ne pas inclure de bouton Postuler (le lien de candidature est fourni séparément par le système).`;
}

export function formulaireUserPrompt(input: {
  poste_titre: string;
  poste_description: string;
  criteres: Record<string, { poids: number; description: string }>;
}): string {
  const criteresList = Object.entries(input.criteres)
    .map(([n, c]) => `- **${n}** (poids: ${c.poids}/100) : ${c.description}`)
    .join("\n");
  return `# Génération de questions pour un formulaire de candidature

## Poste : ${input.poste_titre}

## Description du poste
${input.poste_description}

## Critères d'évaluation
${criteresList}`;
}
