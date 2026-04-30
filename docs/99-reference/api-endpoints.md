# Référence API REST

> Liste exhaustive des endpoints exposés par `apps/api`. Tous les endpoints sous `/api/*` requièrent un JWT Supabase (`Authorization: Bearer <token>`). Les endpoints sous `/webhooks/*` et `/fiches/*` sont publics.


---

## 0. Conventions transverses

### Authentification
- **Endpoints internes** (`/api/*`) : header `Authorization: Bearer <Supabase JWT>`. Refus → `401 Unauthorized`.
- **Endpoints publics** (`/webhooks/*`, `/fiches/:id`) : aucune auth. À durcir éventuellement par signature HMAC pour le webhook Formbricks (cf. [05-integrations.md](05-integrations.md#formbricks)).

### Erreurs
Format standard :
```json
{ "error": "Message lisible", "code": "RESOURCE_NOT_FOUND" }
```
Codes recommandés :
- `400 BAD_REQUEST` — validation Zod/Pydantic échouée
- `401 UNAUTHORIZED`, `403 FORBIDDEN`
- `404 NOT_FOUND` — ressource introuvable (ex: `Poste {id} introuvable`)
- `409 CONFLICT` — état invalide (ex: éditer une communication déjà envoyée)
- `422 UNPROCESSABLE_ENTITY` — entité valide mais traitement impossible (ex: `Score pour candidature X introuvable`)
- `500 INTERNAL_ERROR`

### Pagination
**Aucun endpoint actuel n'est paginé** (volumes faibles). Si besoin futur, conventionner sur `?limit=50&offset=0` + headers `X-Total-Count`.

### Format des dates
Toujours `ISO 8601` (`2026-04-26T14:30:00Z`).

### Headers communs
```
Content-Type: application/json
Authorization: Bearer <token>   // sauf endpoints publics
```

---

## 1. POSTES

### `GET /api/postes`
Liste tous les postes avec compteur de candidatures.
- **Source** : [list_postes.ts](../../f/rh/app.raw_app/backend/list_postes.ts)
- **Réponse 200** : array de
  ```ts
  {
    id: UUID, titre: string, description: string | null,
    criteres_scoring: Record<string, { poids: number, description: string }>,
    formbricks_survey_id: string | null, statut: 'ouvert'|'en_cours'|'ferme',
    calendly_event_type: string | null,
    created_at: ISODate, updated_at: ISODate,
    nb_candidatures: number   // COUNT JOIN
  }
  ```
- Ordre : `created_at DESC`.

### `GET /api/postes/:id`
Détail d'un poste + statistiques agrégées.
- **Source** : [get_poste.ts](../../f/rh/app.raw_app/backend/get_poste.ts)
- **Réponse 200** :
  ```ts
  {
    ...Poste,
    fiche_html: string | null,
    fiche_brief: string | null,
    stats: {
      total_candidatures: number,
      total_scored: number,
      total_flagged: number,
      avg_score: number | null
    }
  }
  ```
- **404** si poste inexistant.

### `POST /api/postes`
Crée un poste.
- **Source** : [create_poste.ts](../../f/rh/app.raw_app/backend/create_poste.ts)
- **Body** :
  ```ts
  {
    titre: string,                                                    // required
    description: string,                                              // required
    criteres_scoring: Record<string, { poids: number, description: string }>, // required, peut être {}
    calendly_event_type?: string | null,
    fiche_brief?: string | null
  }
  ```
- **Comportement** : statut initial `'ouvert'`, `criteres_scoring` stocké en JSONB.
- **Réponse 201** : poste complet (toutes colonnes).

### `PATCH /api/postes/:id`
Met à jour partiellement un poste. Tous les champs sont optionnels — seuls ceux présents sont modifiés (équivalent à `COALESCE`).
- **Source** : [update_poste.ts](../../f/rh/app.raw_app/backend/update_poste.ts)
- **Body** :
  ```ts
  {
    titre?: string,
    description?: string,
    criteres_scoring?: Record<string, ...>,
    statut?: 'ouvert'|'en_cours'|'ferme',
    calendly_event_type?: string | null,
    formbricks_survey_id?: string | null,
    fiche_html?: string,
    fiche_brief?: string
  }
  ```
- **Réponse 200** : poste complet mis à jour.
- **404** si introuvable.

---

## 2. CANDIDATURES

### `GET /api/candidatures?poste_id=...&statut=...`
Liste filtrable.
- **Source** : [list_candidatures.ts](../../f/rh/app.raw_app/backend/list_candidatures.ts)
- **Query** : `poste_id?: UUID`, `statut?: string`
- **Réponse 200** : array de
  ```ts
  {
    id, poste_id, poste_titre, nom, email, telephone,
    cv_url, linkedin_url, flagged, flag_motif, notes_rh, statut, created_at,
    score_global: number | null, recommandation: string | null,
    action_proposee: object | null
  }
  ```
- Ordre : `score_global DESC NULLS LAST, created_at DESC`.

### `GET /api/candidatures/:id`
Détail complet (poste + score + communications).
- **Source** : [get_candidature.ts](../../f/rh/app.raw_app/backend/get_candidature.ts)
- **Réponse 200** :
  ```ts
  {
    ...Candidature,
    poste_titre, poste_criteres,
    cv_texte_extrait, linkedin_data,
    reponses_formulaire,
    score_id, score_global, scores_details, rapport_ia,
    recommandation, action_proposee, model_version, score_created_at,
    communications: Communication[]   // triées DESC par created_at
  }
  ```
- **404** si introuvable.

### `PATCH /api/candidatures/:id`
Met à jour les champs éditables d'une candidature.
- **Source** : [update_candidature.ts](../../f/rh/app.raw_app/backend/update_candidature.ts)
- **Body** : tous optionnels — `nom?`, `email?`, `telephone?`, `cv_url?`, `linkedin_url?`, `reponses_formulaire?`, `flagged?`, `flag_motif?`
- **Réponse 200** : candidature complète.

### `PATCH /api/candidatures/:id/statut`
Change uniquement le statut.
- **Source** : [update_candidature_statut.ts](../../f/rh/app.raw_app/backend/update_candidature_statut.ts)
- **Body** : `{ statut: string }`
- **Validation** : actuellement `['nouveau','en_cours','entretien','offre','accepte','refuse','archive']`. À étendre à `['en_analyse','score']` pour aligner avec les flows (cf. [01-data-model.md §2 BUG CONNU](01-data-model.md#table-candidatures)).
- **Réponse 200** : `{ id, statut }`

### `PATCH /api/candidatures/:id/notes`
Met à jour uniquement les notes RH.
- **Source** : [update_notes_rh.ts](../../f/rh/app.raw_app/backend/update_notes_rh.ts)
- **Body** : `{ notes_rh: string }`
- **Réponse 200** : `{ id, notes_rh }`

### `POST /api/candidatures/:id/rescore`
Lance manuellement un re-scoring asynchrone.
- **Source** : [rescore_candidature.ts](../../f/rh/app.raw_app/backend/rescore_candidature.ts)
- **Body** : aucun
- **Comportement** : enqueue le task `scoring` (pg-boss) avec `{ candidature_id }`, retourne le `job_id`
- **Réponse 202 Accepted** : `{ candidature_id, job_id, message: "Re-scoring lancé" }`

---

## 3. SCORES

### `PATCH /api/candidatures/:id/score`
Modifie manuellement le score (ex: corrections RH).
- **Source** : [update_score.ts](../../f/rh/app.raw_app/backend/update_score.ts)
- **Body** :
  ```ts
  {
    score_global?: number,           // 0-100
    scores_details?: Record<string, number>,
    recommandation?: 'retenir'|'a_voir'|'refuser',
    rapport_ia?: string
  }
  ```
- **Réponse 200** : score complet
- **422** si pas de score préalable (le scoring n'a pas tourné).

> Pas d'endpoint POST séparé : le score est créé par le flow `scoring`, l'API ne fait que des updates.

---

## 4. COMMUNICATIONS

### `GET /api/communications?statut=...`
Liste tout l'historique.
- **Source** : [list_communications.ts](../../f/rh/app.raw_app/backend/list_communications.ts)
- **Query** : `statut?: 'brouillon'|'valide'|'envoye'|'erreur'`
- **Réponse 200** : array enrichi avec candidat + poste
  ```ts
  {
    id, candidature_id, candidat_nom, candidat_email,
    poste_id, poste_titre, type, sujet, contenu, statut,
    calendly_link, envoye_at, created_at
  }[]
  ```

### `POST /api/communications`
Crée un brouillon manuellement (utilisé par le frontend après génération IA).
- **Source** : [create_communication.ts](../../f/rh/app.raw_app/backend/create_communication.ts)
- **Body** :
  ```ts
  {
    candidature_id: UUID,
    type: 'invitation'|'refus'|'relance'|'accuse_reception',
    sujet: string,
    contenu: string
  }
  ```
- **Comportement** : statut `'brouillon'`.
- **Réponse 201** : communication complète.

### `PATCH /api/communications/:id`
Édite un brouillon (sujet/contenu uniquement). **Refusé si statut ≠ brouillon**.
- **Source** : [update_communication.ts](../../f/rh/app.raw_app/backend/update_communication.ts)
- **Body** : `{ sujet?: string, contenu?: string }`
- **Réponse 200** : communication mise à jour.
- **409** si déjà validée/envoyée.

### `POST /api/communications/:id/send`
Valide + déclenche l'envoi async.
- **Source** : [validate_and_send.ts](../../f/rh/app.raw_app/backend/validate_and_send.ts)
- **Body** : aucun
- **Comportement** :
  1. UPDATE statut → `'valide'` (atomique, refuse si pas brouillon)
  2. Enqueue le task `communication` (pg-boss) avec `{ communication_id }`
- **Réponse 202** : `{ communication_id, statut: 'valide', job_id }`
- **404** si introuvable ou pas en `'brouillon'`.

---

## 5. ANALYTICS

### `GET /api/analytics`
Retourne 3 sections agrégées (overview, par poste, distribution).
- **Source** : [get_analytics.ts](../../f/rh/app.raw_app/backend/get_analytics.ts)
- **Réponse 200** :
  ```ts
  {
    overview: {
      postes_ouverts: number,
      total_candidatures: number,
      score_moyen: number | null,
      emails_envoyes: number,
      flagged: number
    },
    par_poste: Array<{
      id, titre, statut,
      nb_candidatures, nb_scored, avg_score, nb_flagged
    }>,
    distribution: {
      excellent: number,   // score >= 80
      bon: number,         // 60-79
      moyen: number,       // 40-59
      faible: number       // < 40
    }
  }
  ```

> **Optimisation** : actuellement 3 requêtes SQL séparées. Possibilité de combiner en une seule via CTE pour réduire la latence (gain marginal au volume actuel).

---

## 6. PROMPTS IA

### `GET /api/prompts`
Liste minimale (sidebar UI).
- **Source** : [list_prompts.ts](../../f/rh/app.raw_app/backend/list_prompts.ts)
- **Réponse 200** : array
  ```ts
  { id, nom, type, model, version, updated_at }[]
  ```
- Ordre : `nom ASC`.

### `GET /api/prompts/:id`
Détail + historique.
- **Source** : [get_prompt.ts](../../f/rh/app.raw_app/backend/get_prompt.ts)
- **Réponse 200** :
  ```ts
  {
    id, nom, type, system_prompt, model, variables_disponibles, version,
    created_at, updated_at,
    history: Array<{ id, version, model, created_at }>   // DESC par version
  }
  ```

### `PATCH /api/prompts/:id`
Update système (archive ancienne version + nouvelle version).
- **Source** : [update_prompt.ts](../../f/rh/app.raw_app/backend/update_prompt.ts)
- **Body** : `{ system_prompt: string, model: string }`
- **Validation** : `system_prompt.trim().length > 0`
- **Réponse 200** : `{ success: true, version: <newVersion> }`

### `POST /api/prompts/:id/restore`
Restaure une version d'historique (crée une nouvelle version identique à l'ancienne).
- **Source** : [restore_prompt.ts](../../f/rh/app.raw_app/backend/restore_prompt.ts)
- **Body** : `{ history_id: UUID }`
- **Réponse 200** : `{ success: true, version: <newVersion> }`
- **404** si `history_id` n'appartient pas au prompt ou n'existe pas.

---

## 7. GÉNÉRATION IA (synchrones, appellent Claude)

> Ces endpoints sont **synchrones** (l'utilisateur attend la réponse, latence 5-30s acceptable). Ils ne passent **pas** par pg-boss. Ils chargent le prompt depuis la table `prompts` (sauf `generate_fiche_poste` qui utilisait au départ un prompt hardcodé — désormais aussi en BD via `type='generation_fiche_poste'`).

### `POST /api/ai/generate-criteres`
Génère 4-8 critères de scoring pour un poste.
- **Source** : [generate_criteres_ia.ts](../../f/rh/app.raw_app/backend/generate_criteres_ia.ts)
- **Body** :
  ```ts
  { titre: string, description: string, instructions?: string }
  ```
- **Charge** : prompt `type='generation_criteres'`
- **Réponse 200** : objet JSON `{ "<nom_critere>": { poids: number, description: string }, ... }`

### `POST /api/ai/generate-email`
Génère un brouillon d'email pour un candidat.
- **Source** : [generate_email_ia.ts](../../f/rh/app.raw_app/backend/generate_email_ia.ts)
- **Body** :
  ```ts
  {
    candidat_nom: string,
    poste_titre: string,
    score_global: number | null,
    recommandation: 'retenir'|'a_voir'|'refuser' | null,
    type_email: 'invitation'|'refus'|'relance'|'accuse_reception'
  }
  ```
- **Charge** : prompt `type='generation_email'`
- **Réponse 200** : `{ sujet: string, contenu: string }`

### `POST /api/ai/regenerate-email`
Régénère un email avec feedback utilisateur (variante de `generate-email` avec contexte enrichi).
- **Source** : (yaml présent, .ts absent dans le repo — réimplémentation à partir de [claude_generate_email.ts](../../f/rh/claude_generate_email.ts) qui a la logique complète avec `feedback`)
- **Body** :
  ```ts
  {
    candidat_nom: string, candidat_email: string, poste_titre: string,
    recommandation: string, rapport_ia: string,
    score_global: number,
    feedback: string   // "Rends le ton plus chaleureux", etc.
  }
  ```
- **Réponse 200** : `{ type, sujet, contenu }`

### `POST /api/ai/generate-fiche-poste`
Génère ou régénère le HTML d'une fiche de poste publique.
- **Source** : [generate_fiche_poste.bun.ts](../../f/rh/app.raw_app/backend/generate_fiche_poste.bun.ts) (variante BD-driven) et [generate_fiche_poste.ts](../../f/rh/app.raw_app/backend/generate_fiche_poste.ts) (variante hardcoded — à supprimer)
- **Body** :
  ```ts
  {
    titre: string,
    description: string,
    brief?: string,                  // brief utilisateur libre
    formbricks_survey_id?: string,   // si présent, inclut un bouton "Postuler"
    feedback?: string,               // si présent + current_html, mode édition
    current_html?: string            // requis si feedback présent
  }
  ```
- **Charge** : prompt `type='generation_fiche_poste'` (ou hardcodé en fallback)
- **Réponse 200** : `string` (HTML complet `<!DOCTYPE html>...</html>`)

### `POST /api/ai/generate-survey`
Crée un formulaire Formbricks complet (Claude génère les questions, on les push vers l'API Formbricks).
- **Source** : (yaml présent côté raw app, mais l'implémentation principale est [create_formbricks_survey.ts](../../f/rh/create_formbricks_survey.ts))
- **Body** :
  ```ts
  {
    poste_titre: string,
    poste_description: string,
    criteres: Record<string, { poids: number, description: string }>
  }
  ```
- **Comportement** :
  1. Charge prompt `type='generation_formulaire'`
  2. Appelle Claude → JSON questions
  3. Préfixe avec 5 questions standard (nom/email/téléphone/linkedin/cv)
  4. POST vers Formbricks `/api/v1/management/surveys`
- **Réponse 200** : `{ survey_id: string, survey_url: string }`

---

## 8. INTÉGRATIONS EXTERNES (helpers)

### `GET /api/calendly/events`
Liste les types d'événement Calendly de l'utilisateur (pour dropdown UI).
- **Source** : [list_calendly_events.ts](../../f/rh/app.raw_app/backend/list_calendly_events.ts)
- **Comportement** :
  1. `GET https://api.calendly.com/users/me`
  2. `GET https://api.calendly.com/event_types?user=<uri>&active=true&count=100`
- **Réponse 200** : array `{ uri, name, duration, scheduling_url }[]`

### `POST /api/postes/:id/link-survey`
Associe un survey Formbricks à un poste.
- **Source** : [link_survey.ts](../../f/rh/app.raw_app/backend/link_survey.ts)
- **Body** : `{ formbricks_survey_id: string }`
- **Réponse 200** : `{ id, titre, formbricks_survey_id }`

### `POST /api/postes/:id/setup-webhook`
Crée le webhook Formbricks (idempotent — vérifie l'existant avant).
- **Source** : [setup_formbricks_webhook.ts](../../f/rh/app.raw_app/backend/setup_formbricks_webhook.ts)
- **Body** : `{ survey_id: string }`
- **Comportement** :
  1. `GET https://formbricks.your-domain.example/api/v1/webhooks` (avec `x-api-key`)
  2. Si webhook existe pour `(url, surveyIds)` → return `'already_exists'`
  3. Sinon `POST /api/v1/webhooks` avec `{ url, triggers: ['responseFinished'], surveyIds: [survey_id], environmentId }`
- **Réponse 200** : `{ status: 'created'|'already_exists', webhook_id?, survey_id }`
- **Note** : Le webhook Formbricks doit pointer vers `https://api.your-domain.example/webhooks/formbricks` (cf. §10)

---

## 9. ENDPOINTS PUBLICS (sans auth)

### `POST /webhooks/formbricks`
Réceptionne les soumissions Formbricks et déclenche le flow `intake`.
- **Source** : [formbricks_webhook.http_trigger.yaml](../../f/rh/formbricks_webhook.http_trigger.yaml) → [intake.flow](../../f/rh/intake.flow/flow.yaml)
- **Body** : payload Formbricks v4.5
  ```json
  {
    "event": "responseFinished",
    "data": {
      "surveyId": "cmm...",
      "response": {
        "data": { "nom": "...", "email": "...", "cv_upload": "...", "linkedin_url": "...", "q1": "...", ... }
      }
    }
  }
  ```
- **Comportement** :
  1. Réponse 202 immédiate (pas de validation synchrone)
  2. Enqueue le task `intake` pg-boss avec le payload complet
- **Sécurité recommandée** :
  - Ajouter une signature HMAC côté Formbricks (header `X-Formbricks-Signature`) et vérifier côté API.
  - Sinon, restreindre par IP allowlist ou par token secret en query string.
  - Actuellement : aucune auth — risque de DOS et de pollution si l'URL fuit.

### `GET /fiches/:id`
Sert la fiche de poste publique en HTML.
- **Source** : [serve_fiche_poste.bun.ts](../../f/rh/serve_fiche_poste.bun.ts)
- **Query** : actuellement `?id=<UUID>` (à transformer en path param `/fiches/:id`)
- **Comportement** :
  ```sql
  SELECT fiche_html, titre FROM postes WHERE id = $1::uuid
  ```
  - Si `fiche_html IS NULL` ou poste introuvable → page d'erreur HTML
  - Sinon → renvoie le HTML brut avec `Content-Type: text/html; charset=utf-8`
- **Réponse 200** : `text/html`
- **Réponse 404** : page d'erreur HTML "Fiche de poste non trouvée"

### `GET /test-fiche` (optionnel — POC à retirer)
Page HTML statique de démonstration ([test_serve_html.bun.ts](../../f/rh/test_serve_html.bun.ts)). À supprimer en migration.

---

## 12. Suggestion d'organisation backend (TS/Hono)

```
apps/api/src/
├── index.ts                 // Hono app, middlewares, routes mount
├── middleware/
│   ├── auth.ts              // Vérifie JWT Supabase
│   └── error.ts             // Format d'erreur uniforme
├── routes/
│   ├── postes.ts            // GET, POST, PATCH /api/postes/*
│   ├── candidatures.ts
│   ├── scores.ts
│   ├── communications.ts
│   ├── analytics.ts
│   ├── prompts.ts
│   ├── ai.ts                // /api/ai/*
│   ├── calendly.ts
│   ├── webhooks/
│   │   └── formbricks.ts
│   └── public/
│       └── fiches.ts        // /fiches/:id
├── db/
│   ├── schema.ts            // Drizzle schema (mirror du DDL §1)
│   └── client.ts
├── services/                // Logique métier réutilisable
│   ├── claude.ts            // Wrapper Anthropic SDK avec retry
│   ├── pdf.ts               // extractText (unpdf)
│   ├── linkedin.ts          // Apify wrapper
│   ├── guardrails.ts        // 2 couches (heuristiques + Claude)
│   ├── formbricks.ts        // Création survey + webhook
│   ├── gmail.ts
│   └── calendly.ts
└── jobs/                    // Triggers de tasks pg-boss
    └── trigger-client.ts
```


---

**Suivant** : [03-flows-jobs.md](03-flows-jobs.md) — détail des 3 jobs asynchrones (intake, scoring, communication) et du cron `notify_errors`.
