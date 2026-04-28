# 03 — Flows & jobs asynchrones

> **Source** : 3 flow.yaml ([intake](../../f/rh/intake.flow/flow.yaml), [scoring](../../f/rh/scoring.flow/flow.yaml), [communication](../../f/rh/communication.flow/flow.yaml)) + leurs inline scripts + le schedule [notify_errors](../../f/rh/notify_errors.schedule.yaml).
>
> **Cible recommandée** : Trigger.dev v4 (TS). Équivalents possibles : Inngest, Celery, BullMQ. Le mapping détaillé est donné par flow.

---

## 0. Pourquoi un orchestrateur de jobs ?

Les 3 flows actuels sont des séquences async :
- **Multi-étapes** (4-7 steps), avec passage de données entre étapes
- **Long-running** : un scoring complet prend 10-30s (extraction PDF + scraping + Claude)
- **Skippable steps** (skip_if : pas de CV, pas de LinkedIn, pas d'invitation)
- **Retry-friendly** : un échec ponctuel sur Apify ou Gmail ne doit pas perdre la candidature
- **Idempotents** : on doit pouvoir re-jouer un step

Trigger.dev (ou équivalent) apporte : retry exponentiel, dashboard de runs, logs structurés, reprise sur échec, déduplication, scheduling cron natif.

---

## 1. Job `intake` — Réception d'une candidature

### 1.1 Trigger
- **Source actuelle** : webhook Formbricks → HTTP trigger Windmill `POST /rh/formbricks-webhook` → flow `f/rh/intake`
- **Cible** : route Hono `POST /webhooks/formbricks` → `tasks.trigger("intake", payload)` → task Trigger.dev `intake`

### 1.2 Schéma d'entrée
```ts
// Payload Formbricks v4.5 (exemple réel)
{
  "event": "responseFinished",
  "data": {
    "surveyId": "cmm...",
    "response": {
      "data": {
        "nom": "Jean Dupont",
        "email": "jean@example.com",
        "telephone": "+33 6 12 34 56 78",
        "cv_upload": "https://drive.google.com/file/d/.../view",
        "linkedin_url": "https://linkedin.com/in/jeandupont",
        "q1": "5 ans d'expérience...",
        "q2": "Lyon",
        ...
      }
    }
  }
}
```

> Variantes acceptées : `payload.data.surveyId` ou `payload.surveyId` ou `payload.survey_id`. Code défensif requis. Voir [validate_payload](../../f/rh/intake.flow/valider_et_extraire_les_données_du_webhook_formbricks.inline_script.ts).

### 1.3 Steps (séquentiels, avec données passant d'un step à l'autre)

#### Step 1 : `validate_payload`
- **Source** : [valider_et_extraire_les_données_du_webhook_formbricks.inline_script.ts](../../f/rh/intake.flow/valider_et_extraire_les_données_du_webhook_formbricks.inline_script.ts)
- **Logique** :
  1. Extraire `surveyId` (avec fallbacks)
  2. Extraire `responseData` (chemin variable selon version Formbricks)
  3. Extraire `nom`, `email`, `telephone`, `cv_url`, `linkedin_url` avec **multiples fallbacks de clés** (label/snake_case/camelCase français/anglais)
  4. Si `nom` ou `email` manquants → throw error (exposera la candidature en échec dans le dashboard)
  5. Reste = `reponses_formulaire` (objet plat complet)
- **Output** :
  ```ts
  { survey_id, nom, email, telephone, cv_url, linkedin_url, reponses_formulaire }
  ```

#### Step 2 : `identify_poste`
- **Source** : [identifier_le_poste_via_le_surveyid_formbricks.inline_script.ts](../../f/rh/intake.flow/identifier_le_poste_via_le_surveyid_formbricks.inline_script.ts)
- **Logique** :
  ```sql
  SELECT id, titre, criteres_scoring, calendly_event_type, formbricks_survey_id
  FROM postes WHERE formbricks_survey_id = $1 LIMIT 1
  ```
  Si pas trouvé → erreur explicite listant tous les postes existants (debug-friendly)
- **Output** : `{ poste_id, titre, criteres_scoring, calendly_event_type }`

#### Step 3 : `extract_cv` (skip si pas de cv_url)
- **Source** : [extract_pdf_text.ts](../../f/rh/extract_pdf_text.ts) (script utilitaire)
- **Logique** :
  1. `fetch(pdf_url)` (suit les redirections Drive/Dropbox)
  2. Vérifie content-type PDF
  3. `getDocumentProxy(buffer)` puis `extractText(pdf, { mergePages: true })` via lib `unpdf`
- **Output** : `{ text: string }`
- **Skip condition** : `!cv_url`
- **Recommandation migration** : garder `unpdf` (fonctionne en Bun et Node). Alternative : `pdf-parse` (Node-only).

#### Step 4 : `scrape_linkedin` (skip si pas de linkedin_url)
- **Source** : [scrape_linkedin.ts](../../f/rh/scrape_linkedin.ts)
- **Logique** :
  1. Valide URL contient `linkedin.com/in/`
  2. POST vers Apify : `https://api.apify.com/v2/acts/dev_fusion~Linkedin-Profile-Scraper/run-sync-get-dataset-items?token=<key>`
  3. Body : `{ "profileUrls": [linkedin_url] }`
  4. Timeout 120s
  5. Normalise la réponse en `{ name, headline, summary, location, experience, education, skills, languages, certifications, profileUrl, profilePicture, connectionCount }`
- **Output** : `{ data: object }`
- **Skip condition** : `!linkedin_url`

#### Step 5 : `insert_candidature`
- **Source** : [insérer_la_candidature_en_base_de_données.inline_script.ts](../../f/rh/intake.flow/insérer_la_candidature_en_base_de_données.inline_script.ts)
- **Logique** :
  1. INSERT candidature avec champs scalaires + `'{}'` placeholders pour JSONB
  2. UPDATE via CTE pour les 2 JSONB (`reponses_formulaire`, `linkedin_data`)

  Avec Drizzle/Prisma, fusionner en un seul INSERT (les ORM gèrent JSONB nativement).
- **Output** : `{ candidature_id }`

#### Step 6 : `trigger_scoring`
- **Source** : [retourner_l'identifiant_de_candidature_pour_le_scoring.inline_script.ts](../../f/rh/intake.flow/retourner_l'identifiant_de_candidature_pour_le_scoring.inline_script.ts)
- **Logique** : enqueue le task `scoring` avec `{ candidature_id }`
- **Cible Trigger.dev** : `await scoringTask.trigger({ candidature_id })`
- **Output** : `{ candidature_id, job_id }`

### 1.4 Pseudo-code Trigger.dev cible

```ts
import { task } from "@trigger.dev/sdk/v3";
import { db } from "../db";
import { extractPdfText, scrapeLinkedin } from "../services";
import { scoringTask } from "./scoring";

export const intakeTask = task({
  id: "intake",
  retry: { maxAttempts: 3 },
  run: async (payload: FormbricksWebhookPayload) => {
    // Step 1
    const candidate = await validatePayload(payload);
    // Step 2
    const poste = await identifyPoste(candidate.survey_id);
    // Step 3 (skip si null)
    const cvText = candidate.cv_url ? (await extractPdfText(candidate.cv_url)).text : null;
    // Step 4 (skip si null)
    const linkedinData = candidate.linkedin_url
      ? (await scrapeLinkedin(candidate.linkedin_url)).data
      : null;
    // Step 5
    const { id: candidature_id } = await db.insert(candidatures).values({
      poste_id: poste.poste_id,
      nom: candidate.nom, email: candidate.email,
      telephone: candidate.telephone,
      reponses_formulaire: candidate.reponses_formulaire,
      cv_url: candidate.cv_url, cv_texte_extrait: cvText,
      linkedin_url: candidate.linkedin_url, linkedin_data: linkedinData,
      statut: "nouveau",
    }).returning({ id: candidatures.id }).then(r => r[0]);
    // Step 6
    const handle = await scoringTask.trigger({ candidature_id });
    return { candidature_id, job_id: handle.id };
  },
});
```

---

## 2. Job `scoring` — Évaluation IA d'une candidature

### 2.1 Trigger
- **Source actuelle** : appelé par `intake` (step 6) ou par `rescore_candidature` backend
- **Cible** : task Trigger.dev `scoring` invoqué par `intakeTask` ou par `POST /api/candidatures/:id/rescore`

### 2.2 Schéma d'entrée
```ts
{ candidature_id: UUID }
```

### 2.3 Steps

#### Step 1 : `load_data`
- **Source** : [charger_les_données_de_la_candidature_et_du_poste.inline_script.ts](../../f/rh/scoring.flow/charger_les_données_de_la_candidature_et_du_poste.inline_script.ts)
- **Logique** :
  1. UPDATE statut → `'en_analyse'`
  2. SELECT candidature JOIN poste : retourne tous les champs nécessaires au scoring (cv_texte_extrait, reponses_formulaire, linkedin_data, titre, description, criteres_scoring)
- **Output** : objet ligne joint
- **Erreur** : `"Candidature {id} introuvable"`

#### Step 2 : `guardrails`
- **Source** : [guardrails_check.ts](../../f/rh/guardrails_check.ts)
- **Logique 2 couches** :
  - **Couche 1 — Heuristiques** (locale, rapide, gratuite) :
    - Détection caractères Unicode invisibles (>5 occurrences)
    - Détection patterns d'injection LLM : `ignore previous`, `[INST]`, `<\|im_start\|>`, `act as`, `give me a perfect score`, etc. (~20 regex)
    - Détection texte caché CSS : `color: white`, `display: none`, `font-size: 0`, etc.
    - Détection blocs Base64 ≥ 100 chars
    - Détection espacement excessif (>200 espaces)
    - Si flagged → nettoyage : remplace les segments par `[CONTENU SUPPRIMÉ]` / `[STYLE SUPPRIMÉ]`
    - Retourne sans appeler Claude (économie)
  - **Couche 2 — Claude** (si couche 1 OK) :
    - Charge prompt `type='guardrails'`
    - Envoie `{ cv_text, reponses }` à Claude
    - Si Claude flag → utilise `suspicious_segments` pour nettoyer le contenu
    - Si parsing JSON échoue → assume `flagged: false` (évite de bloquer un candidat légitime)
- **Output** : `{ flagged: boolean, flag_motif: string|null, cleaned_cv: string, cleaned_reponses: object }`

> **Recommandation migration** : conserver l'architecture 2 couches (économie ~80% des appels Claude pour ce step). La liste de patterns regex est versionnable et peut être enrichie au fil du temps.

#### Step 3 : `update_flag`
- **Source** : [marquer_la_candidature_si_flaggée_par_les_guardrails.inline_script.ts](../../f/rh/scoring.flow/marquer_la_candidature_si_flaggée_par_les_guardrails.inline_script.ts)
- **Logique** : si `flagged === true`, UPDATE `flagged=true, flag_motif=$1` ; sinon no-op
- **Output** : `{ updated: boolean }`

#### Step 4 : `score`
- **Source** : [claude_score_candidat.ts](../../f/rh/claude_score_candidat.ts)
- **Logique** :
  1. Charge prompt `type='scoring_candidat'` (cf. [04-prompts-ia.md](04-prompts-ia.md))
  2. Construit user_prompt en injectant : description poste, critères formatés, CV, réponses, LinkedIn
  3. Appelle `client.messages.create({ model, max_tokens: 4096, system, messages })`
  4. Parse la réponse JSON (gère les markdown code blocks)
  5. Valide : `score_global` (0-100), `scores_details` (object), `rapport_ia` (string), `recommandation` (∈ retenir|a_voir|refuser)
- **Output** : `{ score_global, scores_details, rapport_ia, recommandation, model_version }`

> **Note importante** : utilise les `cleaned_cv` et `cleaned_reponses` du step guardrails, pas les originaux.

#### Step 5 : `save_score`
- **Source** : [sauvegarder_le_score_et_mettre_à_jour_le_statut.inline_script.ts](../../f/rh/scoring.flow/sauvegarder_le_score_et_mettre_à_jour_le_statut.inline_script.ts)
- **Logique** :
  1. INSERT score avec ON CONFLICT (candidature_id) DO UPDATE (idempotent — re-scoring possible)
  2. UPDATE jsonb scores_details via CTE (workaround Windmill)
  3. UPDATE candidatures SET statut='score'
- **Output** : `{ success: true }`

#### Step 6 : `generate_email`
- **Source** : [claude_generate_email.ts](../../f/rh/claude_generate_email.ts)
- **Logique** :
  1. **Détermination du type d'email** (côté code, pas côté Claude) :
     - `recommandation === 'retenir'` → `'invitation'`
     - `recommandation === 'refuser'` → `'refus'`
     - `recommandation === 'a_voir'` → `'relance'` (toujours)
  2. Charge prompt `type='generation_email'`
  3. Construit user_prompt avec instructions par type :
     - **invitation** : "ton enthousiaste, mentionne points forts, inclut placeholder `[LIEN_CALENDLY]`"
     - **refus** : "ton respectueux, ne rentre pas dans les détails, encourage à postuler à nouveau"
     - **relance** : "ton positif, propose un échange informel, inclut `[LIEN_CALENDLY]`"
  4. Appelle Claude (`max_tokens: 2048`)
  5. Parse JSON `{ sujet, contenu }`
- **Output** : `{ type, sujet, contenu }`

> **Important** : le placeholder `[LIEN_CALENDLY]` est volontairement injecté par Claude, et **remplacé plus tard** par le flow communication (step inject_calendly).

#### Step 7 : `save_draft`
- **Source** : [sauvegarder_le_brouillon_d'email_en_base.inline_script.ts](../../f/rh/scoring.flow/sauvegarder_le_brouillon_d'email_en_base.inline_script.ts)
- **Logique** : INSERT communications avec statut='brouillon'
- **Output** : `{ success: true }`

### 2.4 Pseudo-code Trigger.dev cible

```ts
export const scoringTask = task({
  id: "scoring",
  retry: { maxAttempts: 2 },
  run: async ({ candidature_id }: { candidature_id: string }) => {
    const data = await loadCandidatureWithPoste(candidature_id);
    const guard = await guardrailsCheck(
      data.cv_texte_extrait ?? "",
      data.reponses_formulaire ?? {}
    );
    if (guard.flagged) {
      await db.update(candidatures)
        .set({ flagged: true, flag_motif: guard.flag_motif })
        .where(eq(candidatures.id, candidature_id));
    }
    const score = await claudeScoreCandidate({
      poste_description: data.description ?? data.titre,
      criteres: data.criteres_scoring,
      cv_text: guard.cleaned_cv,
      reponses: guard.cleaned_reponses,
      linkedin_data: data.linkedin_data,
    });
    await saveScore(candidature_id, score);
    const email = await claudeGenerateEmail({
      candidat_nom: data.nom, candidat_email: data.email,
      poste_titre: data.titre,
      recommandation: score.recommandation,
      rapport_ia: score.rapport_ia,
      score_global: score.score_global,
      feedback: null,
    });
    await db.insert(communications).values({
      candidature_id, type: email.type,
      sujet: email.sujet, contenu: email.contenu,
      statut: "brouillon",
    });
    return { success: true };
  },
});
```

---

## 3. Job `communication` — Envoi d'un email

### 3.1 Trigger
- **Source actuelle** : appelé par `validate_and_send` backend (clic sur "Valider et envoyer" dans l'UI)
- **Cible** : task Trigger.dev `communication` invoqué par `POST /api/communications/:id/send`

### 3.2 Schéma d'entrée
```ts
{ communication_id: UUID }
```

### 3.3 Steps

#### Step 1 : `load_comm`
- **Source** : [load_comm.inline_script.ts](../../f/rh/communication.flow/load_comm.inline_script.ts) (⚠️ fichier qui pointe vers un `.bun.ts` non résolu — limitation Windmill)
- **Logique attendue** (déduite du `flow.yaml` et de l'usage des outputs) :
  ```sql
  SELECT
    c.id, c.type, c.sujet, c.contenu, c.statut,
    cand.nom, cand.email,
    p.calendly_event_type
  FROM communications c
  JOIN candidatures cand ON cand.id = c.candidature_id
  JOIN postes p ON p.id = cand.poste_id
  WHERE c.id = $1::uuid AND c.statut = 'valide'
  ```
- **Output** : `{ id, type, sujet, contenu, statut, nom, email, calendly_event_type }`

#### Step 2 : `calendly` (skip si type ≠ invitation)
- **Source** : [generate_calendly_link.ts](../../f/rh/generate_calendly_link.ts)
- **Logique** :
  1. POST vers `https://api.calendly.com/scheduling_links` avec :
     ```json
     {
       "max_event_count": 1,
       "owner": "<calendly_event_type URI>",
       "owner_type": "EventType"
     }
     ```
  2. Récupère `data.resource.booking_url`
  3. Concatène les query params : `?name=<nom>&email=<email>` (encodeURIComponent)
- **Output** : `{ calendly_link: string }`
- **Skip condition** : `results.load_comm.type !== 'invitation'`

#### Step 3 : `inject_calendly`
- **Source** : [inject_calendly.inline_script.ts](../../f/rh/communication.flow/inject_calendly.inline_script.ts) (⚠️ même limitation .bun.ts)
- **Logique attendue** :
  - Si `calendly_link` non null : remplacer `[LIEN_CALENDLY]` dans `contenu` par le lien
  - UPDATE `communications SET calendly_link = $1` pour traçabilité
  - Retourne `{ final_body: string }`
- **Output** : `{ final_body }`

#### Step 4 : `send`
- **Source** : [send_gmail.ts](../../f/rh/send_gmail.ts)
- **Logique** :
  1. Construit un message MIME HTML simple :
     ```
     To: {to}
     Subject: {subject}
     Content-Type: text/html; charset=utf-8
     MIME-Version: 1.0

     <!DOCTYPE html>
     <html><head><meta charset="utf-8"></head>
     <body>{body}</body>
     </html>
     ```
  2. Encode en base64url
  3. POST vers `https://gmail.googleapis.com/gmail/v1/users/me/messages/send` avec `Authorization: Bearer <oauth_token>`, body `{ "raw": <encoded> }`
  4. Si 401 → erreur explicite (token expiré, à renouveler)
- **Output** : `{ message_id, sent: true }`
- **Alternative recommandée** : Resend (cf. [05-integrations.md §gmail](05-integrations.md#gmail)). Beaucoup plus simple à intégrer (juste API key, pas d'OAuth Google).

#### Step 5 : `update_status`
- **Source** : [update_status.inline_script.ts](../../f/rh/communication.flow/update_status.inline_script.ts) (⚠️ limitation .bun.ts)
- **Logique attendue** :
  - UPDATE communications SET statut='envoye', envoye_at=NOW() WHERE id=$1
  - UPDATE candidatures SET statut=<dérivé du type>:
    - type='invitation' → statut='entretien'
    - type='refus' → statut='refuse'
    - type='relance' → statut='en_cours'
    - type='accuse_reception' → statut inchangé

> **À documenter et confirmer en runtime** : la mécanique exacte de mise à jour du statut candidature après envoi d'email n'est pas extractible des sources Windmill (fichiers `.bun.ts` absents). À reconstruire à partir des flux UI observés.

### 3.4 Gestion d'erreur
- Si `send_gmail` échoue → UPDATE communications SET statut='erreur' (à implémenter si pas déjà fait)
- Retry exponentiel sur erreurs 5xx Gmail (Trigger.dev gère ça nativement)

---

## 4. Cron `notify_errors` — Monitoring

### 4.1 Source
- [notify_errors.ts](../../f/rh/notify_errors.ts) + [notify_errors.schedule.yaml](../../f/rh/notify_errors.schedule.yaml)

### 4.2 Schedule
- Cron : `0 * * * * *` (chaque heure, à 00:00, Europe/Paris)

### 4.3 Logique actuelle (très Windmill-spécifique)
1. Récupère depuis `wmill.getState()` l'ID du dernier job en erreur déjà notifié
2. Appelle l'API Windmill `GET /api/w/zhost-1/jobs/completed/list?per_page=5&success=false&order_desc=true`
3. Si nouveau job en échec trouvé → POST `https://ntfy.sh/<your-legacy-ntfy-topic>` avec un message court
4. `wmill.setState(latest.id)` pour ne pas re-notifier

### 4.4 Migration cible
La logique change radicalement hors Windmill : on n'a plus l'API Windmill, on a Trigger.dev qui a son propre dashboard et webhooks d'erreur.

**Options** :

#### Option A — Webhook Trigger.dev (recommandé)
Trigger.dev v4 envoie nativement des webhooks sur événements `task.failed`, `task.timeout`, etc. Configurer un webhook qui poste vers ntfy / Slack / email.
- **Pas de cron nécessaire** : push-based, instantané
- **Configuration** : dashboard Trigger.dev → Settings → Webhooks

#### Option B — Cron query sur DB Trigger.dev
Si on veut un agrégat horaire (digest plutôt que notif immédiate), créer une cron task Trigger.dev :
```ts
import { schedules } from "@trigger.dev/sdk/v3";

export const notifyErrorsTask = schedules.task({
  id: "notify-errors",
  cron: "0 * * * *",   // chaque heure
  run: async (payload) => {
    // Query Trigger.dev API ou DB pour les runs en erreur depuis 1h
    // POST ntfy / Slack
  }
});
```

#### Option C — Sentry / Datadog / Logtail
Outils dédiés monitoring avec alerting déjà intégré. Surcoût d'infra mais beaucoup plus puissant que ntfy.

**Recommandation** : Option A pour démarrer (gratuit, instantané), Option C si le projet grossit.

### 4.5 Topic ntfy actuel
- Topic : `<your-legacy-ntfy-topic>`
- À renommer en `recruit-os-errors` ou équivalent (le `windmill-` n'a plus de sens)

---

## 5. Récapitulatif des tâches Trigger.dev

```
apps/jobs/src/tasks/
├── intake.ts          // task("intake")     — déclenché par webhook
├── scoring.ts         // task("scoring")    — déclenché par intake ou API rescore
├── communication.ts   // task("communication") — déclenché par API send
└── notify-errors.ts   // schedules.task     — cron horaire (ou webhook)
```

**Configuration globale** :
- `retry.maxAttempts: 3` pour `intake` et `communication` (idempotents)
- `retry.maxAttempts: 2` pour `scoring` (Claude est déterministe à température 0, mais le coût d'un retry est non négligeable ; à régler selon budget)
- `queue.concurrency: 5` (max 5 candidatures scorées en parallèle, évite de saturer l'API Anthropic)
- Logs structurés : `logger.info({ candidature_id, step: "guardrails" }, "Flagged")`

---

## 6. Diagramme global

```
   Webhook Formbricks (POST)
            │
            ▼
   ┌────────────────┐
   │ intake task    │  ① validate → ② identify → ③ extract_cv → ④ scrape_linkedin → ⑤ insert → ⑥ trigger_scoring
   └────────┬───────┘
            ▼
   ┌────────────────┐
   │ scoring task   │  ① load → ② guardrails → ③ update_flag → ④ Claude score → ⑤ save → ⑥ Claude email → ⑦ save draft
   └────────┬───────┘
            │ (BD : statut='score', communication 'brouillon' créée)
            │
            ▼
   ┌────────────────┐
   │ Frontend (UI)  │  RH valide / édite l'email
   └────────┬───────┘
            │ POST /api/communications/:id/send
            ▼
   ┌────────────────┐
   │ communication  │  ① load → ② Calendly (si invitation) → ③ inject → ④ Gmail send → ⑤ update_status
   │ task           │
   └────────────────┘

   notify-errors (cron horaire OU webhook Trigger.dev) → ntfy/Slack
```

---

## 7. Données qui transitent (récap des contrats inter-task)

| Task → Task | Payload |
|---|---|
| Webhook → `intake` | Payload Formbricks complet |
| `intake` → `scoring` | `{ candidature_id }` |
| API `/rescore` → `scoring` | `{ candidature_id }` |
| API `/send` → `communication` | `{ communication_id }` |

Pas de gros payloads inter-task : tout transite par BD pour les CV, LinkedIn, scores. Bonne pratique → conserver.

---

## 8. Pièges connus à anticiper

1. **Payloads volumineux** : un CV PDF peut faire 5 MB. Ne **pas** passer le binaire entre les steps : extraire le texte au step 3 et stocker uniquement le texte. La logique actuelle est déjà OK.
2. **Timeout Apify** : LinkedIn scraping peut prendre 30-60s. Le code actuel timeout à 120s. Ajuster selon les SLO.
3. **Retry de scoring** : si Claude renvoie une réponse mal formée (rare mais arrive), parsing JSON échoue. Le code actuel throw → Trigger.dev retry. Bien — mais cap le retry à 2 pour éviter de bruler des tokens en boucle.
4. **Statut candidature `'en_analyse'` vs `'score'`** : ces statuts ne sont **pas** dans la whitelist du backend `update_candidature_statut`. À aligner (cf. [01-data-model.md §2 BUG CONNU](01-data-model.md#table-candidatures)).
5. **`[LIEN_CALENDLY]` placeholder** : si le flow communication oublie d'injecter (ex: type=relance mais calendly fail), l'email part avec le placeholder visible. Ajouter une vérif `contenu.includes('[LIEN_CALENDLY]')` avant `send` qui throw.
6. **Idempotence** : si un retry déclenche 2× le step `insert_candidature`, on aura des doublons. Solution : ajouter un index unique sur `(poste_id, email, created_at::date)` ou un check préalable.

---

**Suivant** : [04-prompts-ia.md](04-prompts-ia.md) — contenu littéral des 6 prompts système Claude.
