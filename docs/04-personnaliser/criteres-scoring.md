# Personnaliser les critères de scoring

Les critères sont **par poste**, stockés en JSON dans `postes.criteres_scoring`. Tu peux les définir manuellement ou les générer avec l'IA depuis le dashboard.

## Format

```json
{
  "<critere_id>": {
    "poids": 30,
    "description": "..."
  },
  ...
}
```

Le `score_global` est la somme pondérée des `scores_details[critere_id]` (0-100 chacun) divisée par la somme des `poids`. Donc les poids ne doivent pas obligatoirement faire 100, mais c'est plus lisible.

## Exemples par industrie

### Tech (Backend Senior TS)

```json
{
  "maitrise_typescript": { "poids": 30, "description": "Composants, génériques, types avancés" },
  "experience_backend": { "poids": 25, "description": "Production, scaling, monitoring" },
  "systeme_distribue": { "poids": 20, "description": "Microservices, queues, event-driven" },
  "communication": { "poids": 15, "description": "Async, écrits, mentorat" },
  "autonomie": { "poids": 10, "description": "Initiative, prise de décision" }
}
```

### Médical (Infirmier en EHPAD)

```json
{
  "diplome_etat": { "poids": 35, "description": "Diplôme d'État infirmier (DEI) requis, vérifié au RPPS" },
  "experience_geriatrie": { "poids": 25, "description": "Expérience auprès de personnes âgées dépendantes (Alzheimer, fin de vie)" },
  "soins_techniques": { "poids": 15, "description": "Pansements complexes, perfusions, sondes, gestion de la douleur" },
  "relation_resident_famille": { "poids": 15, "description": "Empathie, gestion de l'angoisse, communication avec les familles" },
  "rigueur_administrative": { "poids": 10, "description": "Traçabilité dossier patient, transmissions, contraintes RGPD santé" }
}
```

### Retail (Manager de magasin)

```json
{
  "experience_management_equipe": { "poids": 30, "description": "5+ pers, plannings, formation, gestion conflits" },
  "performance_commerciale": { "poids": 25, "description": "CA, marge, panier moyen, taux de conversion — chiffres concrets attendus" },
  "operations_magasin": { "poids": 20, "description": "Inventaires, marchandising, sécurité, hygiène (HACCP si food)" },
  "relation_client": { "poids": 15, "description": "Gestion réclamations, fidélisation, NPS" },
  "amplitude_horaire": { "poids": 10, "description": "Disponibilité weekends + soirées attendue" }
}
```

### Finance (Analyste Crédit)

```json
{
  "formation_finance": { "poids": 25, "description": "Master Finance / École de commerce / CFA partiel" },
  "modelisation_financiere": { "poids": 30, "description": "Excel avancé, modèles DCF, sensibilités, scénarios" },
  "anglais_business": { "poids": 15, "description": "Lecture rapide de rapports annuels EN, oral correct" },
  "rigueur_analytique": { "poids": 20, "description": "Capacité à challenger des hypothèses, esprit critique" },
  "communication_clients": { "poids": 10, "description": "Présentation de notes de crédit en comité" }
}
```

### Design (UX Senior)

```json
{
  "portfolio": { "poids": 20, "description": "Cas d'études détaillés (3+), processus visible" },
  "design_system": { "poids": 25, "description": "Création/maintenance d'un DS production (composants, tokens, doc)" },
  "maitrise_figma": { "poids": 30, "description": "Variants, auto-layout, variables, components" },
  "collaboration_dev": { "poids": 15, "description": "Handoff, tokens, specs, lecture de React/code" },
  "sensibilite_editoriale": { "poids": 10, "description": "Typographie, hiérarchie, sobriété" }
}
```

## Bonnes pratiques

### 1. Pondérations

- Total = 100 lisible mais pas obligatoire (le système normalise)
- 1 critère ne devrait pas dépasser 35-40% (sinon scoring binaire sur ce critère)
- 1 critère < 5% est ignorable, autant ne pas l'inclure

### 2. Descriptions

- Sois **précis et actionnable** : "5+ ans en architecture microservices" > "expérience backend"
- Mentionne ce qui est **non-négociable** : "DEI requis (vérifié au RPPS)" → le LLM scorera 0 si absent
- Ajoute des **anti-patterns** : "Ne pénalise pas l'absence de diplôme si 5+ ans d'expé prouvée"

### 3. Cohérence avec les questions du formulaire

Les questions IA-générées du formulaire Formbricks sont basées sur les critères. Si tu ajoutes un critère "anglais_business", la prochaine génération de formulaire posera une question sur l'anglais.

Workflow : créer le poste avec critères → générer le formulaire (qui en découle) → publier.

## Modification a posteriori

Si tu changes les critères APRÈS qu'un poste ait reçu des candidatures :
- Les anciennes candidatures gardent leurs scores (`scores.scores_details` conserve les anciens critères)
- Pour re-scorer : ouvre la candidature → bouton **Re-scorer**. Le worker utilise les NOUVEAUX critères.

## Comment l'IA utilise les critères

Voir le prompt `Scoring candidat` dans `/prompts`. En gros :

```
Pour chaque critère listé :
1. Cherche dans le CV et les réponses des éléments factuels qui prouvent ou infirment
2. Donne une note 0-100 (pas de "8/10", mets 80)
3. Justifie en 1-2 phrases dans le rapport_ia
```

## Critères qui ne marchent PAS bien

À éviter :
- "**Bon état d'esprit**" → trop vague, le LLM hallucinera
- "**Match culturel**" → idem, et probablement biaisé
- "**Disponibilité immédiate**" → si c'est important, mets-le comme question explicite dans le formulaire
- "**Salaire en adéquation**" → ce n'est pas un critère du candidat, c'est de la négociation

À privilégier :
- Compétences vérifiables dans le CV (technologies, années d'expérience, diplômes)
- Mentions explicites attendues dans les réponses au formulaire
- Combinaisons mesurables ("3+ ans backend AVEC mention de TypeScript")
