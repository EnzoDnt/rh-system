# Ajouter un nouveau prompt IA

Cookbook pour ajouter un type de prompt qui n'existe pas dans les 6 par défaut. Exemple fil rouge : ajouter un prompt **"Génération question d'entretien"** qui produit 5 questions personnalisées à poser au candidat lors de l'entretien.

## Étape 1 — Ajouter le seed

Édite `packages/db/scripts/seed-prompts.ts` pour ajouter ton prompt à la liste `SEED` :

```typescript
{
  nom: "Génération questions d'entretien",
  type: "generation_questions_entretien",
  model: "claude-sonnet-4-6",
  variables_disponibles: [
    { nom: "candidat_nom", description: "Nom du candidat" },
    { nom: "poste_titre", description: "Titre du poste" },
    { nom: "rapport_ia", description: "Synthèse IA de la candidature" },
    { nom: "scores_details", description: "Détail des scores par critère" },
  ],
},
```

Crée le fichier prompt `packages/db/scripts/prompts/generation_questions_entretien.txt` :

```text
Tu es un expert RH qui prépare des entretiens de recrutement.

À partir du profil d'un candidat (synthèse IA et scores par critère), génère 5 questions
personnalisées à poser pendant l'entretien :
- 2 questions pour creuser un point fort identifié
- 2 questions pour valider un point d'attention identifié
- 1 question ouverte sur la motivation

Format JSON strict :
{
  "questions": [
    { "type": "fort", "question": "...", "objectif": "..." },
    { "type": "attention", "question": "...", "objectif": "..." },
    ...
  ]
}
```

Lance le seed pour insérer en BD :
```bash
pnpm --filter @rh/db seed
```

## Étape 2 — Ajouter le user prompt builder

Dans `apps/api/src/services/claude-prompts.ts`, ajoute :

```typescript
export function questionsEntretienUserPrompt(input: {
  candidat_nom: string;
  poste_titre: string;
  rapport_ia: string;
  scores_details: Record<string, number>;
}): string {
  return `# Préparer un entretien

## Candidat : ${input.candidat_nom}
## Poste : ${input.poste_titre}

## Synthèse de la candidature
${input.rapport_ia}

## Scores par critère
${Object.entries(input.scores_details).map(([k, v]) => `- ${k}: ${v}/100`).join("\n")}`;
}
```

## Étape 3 — Ajouter la fonction Claude

Dans `apps/api/src/services/claude.ts`, ajoute :

```typescript
import { questionsEntretienUserPrompt } from "./claude-prompts.js";
import { z } from "zod";

const QuestionsEntretienSchema = z.object({
  questions: z.array(z.object({
    type: z.enum(["fort", "attention", "motivation"]),
    question: z.string(),
    objectif: z.string(),
  })).length(5),
});

export async function runQuestionsEntretienPrompt(opts: {
  candidat_nom: string;
  poste_titre: string;
  rapport_ia: string;
  scores_details: Record<string, number>;
}) {
  const { system_prompt, model } = await loadPrompt("generation_questions_entretien");
  const response = await client().messages.create({
    model,
    max_tokens: 2048,
    system: [{ type: "text", text: system_prompt, cache_control: { type: "ephemeral" } }] as any,
    messages: [{ role: "user", content: questionsEntretienUserPrompt(opts) }],
    tools: [{
      name: "submit_questions",
      input_schema: {
        type: "object",
        properties: {
          questions: {
            type: "array", minItems: 5, maxItems: 5,
            items: {
              type: "object",
              properties: {
                type: { type: "string", enum: ["fort", "attention", "motivation"] },
                question: { type: "string" },
                objectif: { type: "string" },
              },
              required: ["type", "question", "objectif"],
            },
          },
        },
        required: ["questions"],
      },
    }],
    tool_choice: { type: "tool", name: "submit_questions" },
  });
  logAiCall({ prompt_type: "generation_questions_entretien", model: response.model, usage: response.usage as any }).catch((e) => console.error("logAiCall failed:", e));
  const block = response.content.find((b: any) => b.type === "tool_use");
  if (!block || block.type !== "tool_use") throw new Error("Claude did not return a tool_use block");
  return QuestionsEntretienSchema.parse(block.input);
}
```

## Étape 4 — Exposer via une route API

Dans `apps/api/src/routes/candidatures.ts`, ajoute :

```typescript
.get("/:id/questions-entretien", async (c) => {
  const id = c.req.param("id");
  const [cand] = await db.execute<any>(sql`
    SELECT c.nom, p.titre as poste_titre, s.rapport_ia, s.scores_details
    FROM candidatures c
    JOIN postes p ON p.id = c.poste_id
    LEFT JOIN scores s ON s.candidature_id = c.id
    WHERE c.id = ${id}
  `);
  if (!cand) throw Errors.notFound("Candidature");
  if (!cand.rapport_ia) return c.json({ questions: [] }); // pas encore scoré
  const out = await runQuestionsEntretienPrompt({
    candidat_nom: cand.nom,
    poste_titre: cand.poste_titre,
    rapport_ia: cand.rapport_ia,
    scores_details: cand.scores_details ?? {},
  });
  return c.json(out);
})
```

## Étape 5 — Afficher dans le dashboard

Dans `apps/web/src/lib/queries.ts` :

```typescript
export function useQuestionsEntretien(candidatureId: string) {
  return useQuery({
    queryKey: ["candidature", candidatureId, "questions-entretien"],
    queryFn: () => api<{ questions: Array<{type: string; question: string; objectif: string}> }>(
      `/api/candidatures/${candidatureId}/questions-entretien`,
    ),
    staleTime: Infinity,  // calcul cher, ne pas refetch automatiquement
    enabled: false,       // déclenché manuellement par bouton
  });
}
```

Dans la page détail candidature, ajoute :

```tsx
const { data, refetch, isFetching } = useQuestionsEntretien(candidature.id);
return (
  <section>
    <h3>Questions d'entretien</h3>
    <Button onClick={() => refetch()} disabled={isFetching}>
      {isFetching ? "Génération..." : "Générer 5 questions"}
    </Button>
    {data && (
      <ul>
        {data.questions.map((q, i) => (
          <li key={i}><strong>{q.type}:</strong> {q.question} <em>({q.objectif})</em></li>
        ))}
      </ul>
    )}
  </section>
);
```

## Étape 6 — Tester

1. Lance `pnpm typecheck` → 0 erreur
2. Lance le seed : `pnpm --filter @rh/db seed`
3. Vérifie que le prompt apparaît dans `/prompts` du dashboard
4. Trouve une candidature scorée, clique "Générer 5 questions" → 5 questions apparaissent
5. Coût : ~0.005€ par génération (tu peux le voir dans `/analytics`)

## Variations possibles

- **Trigger automatique** : enqueue un job pg-boss après le scoring pour générer les questions automatiquement (ajoute une queue `questions_entretien` + handler)
- **Stockage** : si tu veux garder l'historique, ajoute une table `interview_questions` au schéma Drizzle + migration
- **Personnalisation** : ajoute un input texte "instructions custom" sur le bouton, transmets-le au prompt

## Checklist avant prod

- [ ] Le prompt seed est en place
- [ ] La fonction Claude valide la réponse via Zod
- [ ] La route API gère les cas d'erreur (404, candidature non scorée)
- [ ] Le coût est tracké dans `ai_calls`
- [ ] Le UI a un état "loading" + un état "erreur"
- [ ] Tu as testé sur 3 candidatures différentes
