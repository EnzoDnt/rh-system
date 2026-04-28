# 05 — Intégrations externes

> **Source** : scripts utilitaires + backends qui appellent les API externes + ressources Windmill (`u/enzodonati/*`).
>
> Pour chaque intégration : config actuelle, contrat d'appel, sécurité, alternatives documentées.

---

## 1. Anthropic Claude

### Usage actuel
Le cœur de l'app : 6 endpoints d'IA + 2 steps de flow (guardrails + scoring).

| Caller | Quand | Modèle | Max tokens |
|---|---|---|---|
| [claude_score_candidat.ts](../../f/rh/claude_score_candidat.ts) | flow scoring step 4 | depuis BD (`claude-sonnet-4-6`) | 4096 |
| [claude_generate_email.ts](../../f/rh/claude_generate_email.ts) | flow scoring step 6 + UI regenerate | depuis BD | 2048 |
| [guardrails_check.ts](../../f/rh/guardrails_check.ts) | flow scoring step 2 (couche 2) | depuis BD | 1024 |
| [create_formbricks_survey.ts](../../f/rh/create_formbricks_survey.ts) | API generate-survey | depuis BD | 4096 |
| [generate_email_ia.ts](../../f/rh/app.raw_app/backend/generate_email_ia.ts) | API generate-email (UI) | depuis BD | 1024 |
| [generate_criteres_ia.ts](../../f/rh/app.raw_app/backend/generate_criteres_ia.ts) | API generate-criteres | depuis BD | 1024 |
| [generate_fiche_poste.bun.ts](../../f/rh/app.raw_app/backend/generate_fiche_poste.bun.ts) | API generate-fiche-poste | hardcodé `4-20250514` | 4096 |

### Authentification actuelle
- **Resource Windmill** : `u/enzodonati/fond_anthropic`
- **Type** : `RT.Anthropic` → `{ apiKey: string, base_url: string, platform: string, enable_1M_context: boolean }`
- **Champ utilisé** : `apiKey` uniquement
- **Pattern d'accès** :
  ```ts
  const resource = await wmill.getResource("u/enzodonati/fond_anthropic");
  const client = new Anthropic({ apiKey: resource.apiKey });
  ```
  ou via injection via flow (`$res:u/enzodonati/fond_anthropic`)

### Migration cible
- **Variable d'env** : `ANTHROPIC_API_KEY`
- **SDK** : `@anthropic-ai/sdk` (TS) ou `anthropic` (Python)
- **Wrapper** : créer un service `services/claude.ts` centralisé avec :
  - Singleton client
  - Retry exponentiel sur 429/5xx (par défaut le SDK le fait, mais à confirmer)
  - Logs structurés (model, tokens in/out, durée)
  - Cache prompt activé sur les system prompts longs (cf. [04-prompts-ia.md §10](04-prompts-ia.md#recommandations-pour-la-migration))

### Sécurité
- Ne **jamais** logger les CV/réponses (PII) — masquer en debug
- L'API key Anthropic donne accès à un budget non plafonné par défaut → activer un usage cap dans le dashboard Anthropic (~$100/mois suffisant pour ce volume)
- En cas de fuite : rotation immédiate via dashboard

### Alternatives
**Aucune alternative recommandée** : Claude est central pour la qualité du scoring, et les prompts sont tunés pour Claude. Migrer vers GPT-4 nécessiterait une réécriture complète des prompts et des évals.

> Si vraiment besoin de fallback (résilience) : implémenter un secondaire avec **OpenAI GPT-4o** mais réécrire les prompts en mode tool use (plus portable). À ne pas faire en v1.

---

## 2. Formbricks (self-hosted)

### Usage actuel
- **Création de surveys** : [create_formbricks_survey.ts](../../f/rh/create_formbricks_survey.ts)
- **Création de webhooks** : [setup_formbricks_webhook.ts](../../f/rh/app.raw_app/backend/setup_formbricks_webhook.ts)
- **Réception des candidatures** : webhook `responseFinished` → flow `intake`

### Configuration actuelle
| Élément | Valeur |
|---|---|
| **Instance URL** | `https://formbricks.your-domain.example` |
| **Version** | `4.5.0` |
| **Project** | <Votre Marque>-claude (ID: `cmmyqflni044xmw01x9odj9fe`) |
| **Environment Production** | `<your-formbricks-environment-id>` (hardcodé dans setup_webhook) |
| **API Key** | Variable Windmill `u/enzodonati/crisper_formbricks` (Manage scope) |
| **Header API** | `x-api-key: <key>` |

### Endpoints utilisés
| Méthode | URL | Usage |
|---|---|---|
| POST | `/api/v1/management/surveys` | Créer un survey |
| GET | `/api/v1/webhooks` | Lister webhooks (idempotence check) |
| POST | `/api/v1/webhooks` | Créer un webhook |

> **Important — piège connu** : l'endpoint webhooks est `/api/v1/webhooks` et **PAS** `/api/v1/management/webhooks` (qui retourne 404). Documenté dans la mémoire projet `feedback_windmill_datatable.md`.

### Format payload — création survey
```json
{
  "environmentId": "<your-formbricks-environment-id>",
  "name": "Candidature - Développeur Full-Stack",
  "type": "link",
  "status": "inProgress",
  "questions": [
    {
      "id": "nom",
      "type": "openText",
      "headline": { "default": "Quel est votre nom complet ?" },
      "required": true,
      "inputType": "text"
    },
    ...
  ],
  "welcomeCard": { ... },
  "thankYouCard": { ... }
}
```

### Format payload — création webhook
```json
{
  "url": "https://api.your-domain.example/webhooks/formbricks",
  "triggers": ["responseFinished"],
  "surveyIds": ["cmm..."],
  "environmentId": "<your-formbricks-environment-id>"
}
```

### Format payload reçu (webhook → notre API)
```json
{
  "event": "responseFinished",
  "data": {
    "surveyId": "cmm...",
    "response": {
      "data": {
        "nom": "...", "email": "...", "telephone": "...",
        "cv_upload": "...", "linkedin_url": "...",
        "q1": "...", "q2": "...", ...
      }
    }
  }
}
```

> **Variantes de format** : Formbricks a évolué entre versions. Le code [validate_payload](../../f/rh/intake.flow/valider_et_extraire_les_données_du_webhook_formbricks.inline_script.ts) gère 3 variantes (`payload.data.surveyId` / `payload.surveyId` / `payload.survey_id`). À conserver tel quel.

### Limitations Formbricks v4.5 (connues)
- Type `rating` **ne fonctionne pas** via API (HTTP 400) → conversion silencieuse en `openText` côté code
- Type `placeholder` non supporté
- Création de survey requiert `environmentId` dans le body
- L'API `x-api-key` est rate-limitée (à vérifier dans la doc)

### Migration cible
1. **Conserver l'instance Formbricks self-hosted** — elle marche, pas de raison de changer
2. **Reconfigurer les webhooks** : pointer vers la nouvelle URL `https://api.your-domain.example/webhooks/formbricks`
   - **Procédure** : pour chaque survey actif, appeler `POST /api/v1/webhooks` avec la nouvelle URL et supprimer l'ancien webhook Windmill via `DELETE /api/v1/webhooks/<id>` (à vérifier — sinon manuel via UI Formbricks)
3. **Ajouter signature HMAC** : Formbricks v4.5+ supporte la signature webhook. Configurer :
   - Côté Formbricks : générer un secret webhook
   - Côté API : vérifier `X-Formbricks-Signature` header avec HMAC-SHA256
4. **Stocker l'environment ID** dans `process.env.FORMBRICKS_ENVIRONMENT_ID` (ne pas hardcoder)

### Alternatives (à documenter dans la spec, pas à implémenter)
| Outil | Pour | Contre |
|---|---|---|
| **Tally** | Cloud, freemium, simple | Webhooks payants au-delà de 10/mois, moins customizable |
| **Typeform** | Très polished UX, webhooks natifs | Cher, vendor lock-in |
| **Formulaires React custom** (React Hook Form + shadcn) | Contrôle total, intégration directe | Coût de dev + perte de l'analytics Formbricks |
| **Plausible Forms** | Open source, simple | Pas de logique conditionnelle complexe |

**Décision recommandée** : conserver Formbricks self-hosted. Migrer plus tard si l'instance devient trop lourde à maintenir.

---

## 3. Gmail (envoi emails)

### Usage actuel
- **Caller unique** : [send_gmail.ts](../../f/rh/send_gmail.ts) (appelé par flow communication step 4)
- **Resource Windmill** : `u/enzodonati/avid_gmail`
- **Type** : `RT.Gmail` → `{ token: string }` (OAuth Bearer token)

### Logique actuelle
```ts
// MIME assembly
const messageParts = [
  `To: ${to}`,
  `Subject: ${subject}`,
  `Content-Type: text/html; charset=utf-8`,
  `MIME-Version: 1.0`,
  "",
  `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${body}</body></html>`,
];
const rawMessage = messageParts.join("\r\n");
const encoded = Buffer.from(rawMessage).toString("base64")
  .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

// Send
await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
  method: "POST",
  headers: { Authorization: `Bearer ${gmail.token}`, "Content-Type": "application/json" },
  body: JSON.stringify({ raw: encoded }),
});
```

### Limitations
- **OAuth complexe** : Windmill gère le refresh du token automatiquement via la resource. Hors Windmill, il faut implémenter le full OAuth flow Google (consent screen, refresh token storage, rotation).
- **Délivrabilité** : Gmail OAuth = limite ~500 messages/jour par compte. OK pour <Votre Marque> actuellement.
- **Branding** : email envoyé depuis l'adresse personnelle du compte connecté (Enzo). Pas d'option "From" custom.

### Migration cible — 2 options

#### Option A — Conserver Gmail (si on tient à envoyer depuis l'adresse Enzo)
- Implémenter OAuth 2.0 Google côté API :
  - Endpoint `/auth/gmail/callback` qui reçoit le code d'autorisation
  - Stocker `refresh_token` chiffré dans Supabase Vault
  - Service `gmail.ts` qui rafraîchit l'access token automatiquement
- **Effort** : 1-2 jours

#### Option B — **Resend** (recommandée)
- API key only (pas d'OAuth) : `RESEND_API_KEY`
- SDK officiel TS : `resend`
- Code minimal :
  ```ts
  import { Resend } from "resend";
  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: "L'équipe Recrutement <recrutement@your-domain.example>",
    to,
    subject,
    html: body,
  });
  ```
- **Avantages** : DX excellente, dashboard avec délivrabilité, webhooks `delivered/bounced/complained`, gratuit jusqu'à 3000 emails/mois (plus que largement suffisant)
- **Configuration** : ajouter SPF/DKIM/DMARC sur le domaine `your-domain.example`
- **Effort** : 1 jour

#### Autres alternatives
- **Postmark** : excellent transactional, $10/mois minimum
- **AWS SES** : moins cher à grande échelle, plus complexe à configurer
- **SendGrid** : possible mais réputation moins bonne que Resend/Postmark

**Recommandation** : Option B (Resend) — beaucoup plus simple, branding `recrutement@your-domain.example` plus pro qu'un Gmail personnel.

---

## 4. Calendly

### Usage actuel
- **Liste types d'événement** : [list_calendly_events.ts](../../f/rh/app.raw_app/backend/list_calendly_events.ts) (UI dropdown lors de la création de poste)
- **Génération de single-use link** : [generate_calendly_link.ts](../../f/rh/generate_calendly_link.ts) (flow communication step 2)
- **Resource Windmill** : `u/enzodonati/issue_free_calendly`
- **Type** : `RT.Calendly` → `{ token: string }` (Personal Access Token)

### Endpoints utilisés
| Méthode | URL | Usage |
|---|---|---|
| GET | `https://api.calendly.com/users/me` | Récupère URI utilisateur |
| GET | `https://api.calendly.com/event_types?user=<uri>&active=true&count=100` | Liste event types |
| POST | `https://api.calendly.com/scheduling_links` | Crée un single-use link |

### Format requête création link
```json
{
  "max_event_count": 1,
  "owner": "https://api.calendly.com/event_types/UUID",
  "owner_type": "EventType"
}
```

### Format réponse
```json
{
  "resource": {
    "booking_url": "https://calendly.com/d/abc-def-ghi/...",
    "owner": "...",
    "owner_type": "EventType"
  }
}
```

Le `booking_url` est ensuite enrichi côté code :
```
{booking_url}?name={URLEncoded(candidat_nom)}&email={URLEncoded(candidat_email)}
```

### Migration cible
- **Variable d'env** : `CALENDLY_TOKEN`
- **Pas de SDK officiel TS** — utiliser `fetch` natif (le code actuel est OK)
- **Wrapper** : `services/calendly.ts` avec gestion d'erreurs (token expiré, event type inactif, etc.)

### Limitations Calendly
- Personal Access Token : pas d'expiration mais lié au compte de l'utilisateur (Enzo). Si le compte ferme, tout casse → migrer vers OAuth 2.0 si plusieurs RH utilisent.
- Single-use links : marche pour le pricing standard. Les "scheduling_links" sont une feature de plans payants — vérifier le plan <Votre Marque> actuel.

### Alternatives
| Outil | Pour | Contre |
|---|---|---|
| **Cal.com** (open source) | Self-hostable, customizable | Moins UX que Calendly |
| **Cal.com Cloud** | Migration facile depuis Calendly | Pricing similaire |
| **Lien Calendly statique** (sans single-use) | Simplifie : on fait juste un copier-coller du lien public Calendly dans le mail | Plus de tracking, plusieurs candidats peuvent réserver le même créneau |
| **Google Calendar API direct** | Si on veut intégrer profondément | Très lourd à implémenter |

**Recommandation** : conserver Calendly. Si bug ou pricing pose problème, basculer vers Cal.com Cloud (migration documentée, prix similaire).

---

## 5. Apify (LinkedIn scraping)

### Usage actuel
- **Caller unique** : [scrape_linkedin.ts](../../f/rh/scrape_linkedin.ts) (flow intake step 4, optionnel)
- **Acteur Apify** : `dev_fusion~Linkedin-Profile-Scraper`
- **Variable Windmill** : `u/enzodonati/foolproof_apify_api_key`

### Endpoint
```
POST https://api.apify.com/v2/acts/dev_fusion~Linkedin-Profile-Scraper/run-sync-get-dataset-items?token=<key>
Body: { "profileUrls": ["https://linkedin.com/in/jeandupont"] }
Timeout: 120s
```

### Réponse normalisée (post-traitement code-side)
```json
{
  "name": "Jean Dupont",
  "headline": "Senior Developer",
  "summary": "...",
  "location": "Paris, France",
  "experience": [...],
  "education": [...],
  "skills": [...],
  "languages": [...],
  "certifications": [...],
  "profileUrl": "https://linkedin.com/in/jeandupont",
  "profilePicture": "https://...",
  "connectionCount": 500
}
```

### Limitations
- **Coût** : $0.10-0.50 par profil scrapé (selon plan Apify). À ce volume (50-200/an), c'est négligeable.
- **Échecs** : profils privés ou anciennes URLs LinkedIn → erreur `"No data returned"`. Le step est `skip_if !linkedin_url` — donc juste de l'info bonus.
- **RGPD/ToS LinkedIn** : le scraping est dans une zone grise. <Votre Marque> assume le risque. À documenter dans une politique interne.

### Migration cible
- **Variable d'env** : `APIFY_API_KEY`
- **Pas de changement** côté logique : le code actuel fonctionne tel quel

### Alternatives
| Outil | Pour | Contre |
|---|---|---|
| **Proxycurl** | API LinkedIn légale (pricing par lookup) | Plus cher ($0.40/lookup) mais plus stable |
| **BrightData LinkedIn dataset** | Très complet | Pricing à la donnée, plus cher |
| **Suppression du scraping** (option safest) | Élimine risque RGPD/ToS | Perte d'info bonus pour le scoring |
| **Demander le CSV LinkedIn** au candidat lui-même | 100% RGPD | Friction UX |

**Recommandation** : conserver Apify (volume faible, coût négligeable). Si LinkedIn change leur structure et casse l'acteur, migrer vers Proxycurl (API officielle commerciale, plus stable).

---

## 6. PDF parsing (CV)

### Usage actuel
- **Caller unique** : [extract_pdf_text.ts](../../f/rh/extract_pdf_text.ts) (flow intake step 3, optionnel)
- **Lib** : `unpdf` (wrapper Bun-compatible de pdf.js)

### Logique
```ts
import { extractText, getDocumentProxy } from "unpdf";
const response = await fetch(pdf_url);
const buffer = new Uint8Array(await response.arrayBuffer());
const pdf = await getDocumentProxy(buffer);
const { text } = await extractText(pdf, { mergePages: true });
```

### Migration cible
- **Bun/Node** : conserver `unpdf` (works out of the box)
- **Python** : `pypdf` ou `pdfplumber` (équivalents matures)

### Limitations
- **CV scannés** (image plutôt que texte) → extraction vide ou bruit. Pas d'OCR.
- **PDFs avec layouts complexes** (colonnes) → extraction parfois mal ordonnée mais Claude s'adapte plutôt bien.
- **Drive/Dropbox URLs** : le `fetch` doit suivre les redirections. C'est le cas par défaut en Bun/Node.

### Améliorations possibles
- Ajouter OCR (Tesseract.js, ou API Cloud Vision) si beaucoup de CV scannés
- Validation taille (refuser PDFs > 10 MB pour éviter abus)
- Validation type MIME stricte (`application/pdf`)

---

## 7. ntfy (notifications)

### Usage actuel
- **Caller unique** : [notify_errors.ts](../../f/rh/notify_errors.ts) (schedule horaire)
- **Topic** : `<your-legacy-ntfy-topic>` (à renommer)
- **URL** : `https://ntfy.sh/<topic>` (instance publique gratuite)

### Logique
```ts
await fetch(`https://ntfy.sh/${NTFY_TOPIC}`, {
  method: "POST",
  body: "JOB FAILED: <script_path> — <error_msg> (ID: <job_id>)",
});
```

### Migration cible
- Soit **conserver ntfy** : gratuit, simple, mobile push via app ntfy
- Soit **basculer vers Slack webhook** :
  ```ts
  await fetch(process.env.SLACK_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: `🚨 Job failed: ${jobName} — ${error}` }),
  });
  ```
- Soit **Discord webhook** : même principe que Slack

### Recommandation
- **Court terme** : conserver ntfy (zéro friction)
- **Si projet grossit** : Sentry pour erreurs structurées + Slack pour alerts ciblées

---

## 8. Synthèse — tableau des secrets à transférer

| Source actuelle | Type | Destination cible (env var ou Vault) |
|---|---|---|
| `u/enzodonati/fond_anthropic` (resource) | API key Anthropic | `ANTHROPIC_API_KEY` |
| `u/enzodonati/avid_gmail` (resource) | OAuth token Gmail | `GMAIL_OAUTH_REFRESH_TOKEN` (+ client ID/secret) **ou** remplacer par `RESEND_API_KEY` |
| `u/enzodonati/issue_free_calendly` (resource) | Personal Access Token Calendly | `CALENDLY_TOKEN` |
| `u/enzodonati/foolproof_apify_api_key` (variable) | API key Apify | `APIFY_API_KEY` |
| `u/enzodonati/crisper_formbricks` (variable) | API key Formbricks Manage | `FORMBRICKS_API_KEY` |
| Hardcodé `<your-formbricks-environment-id>` | Formbricks env ID | `FORMBRICKS_ENVIRONMENT_ID` |
| Hardcodé `https://formbricks.your-domain.example` | Formbricks base URL | `FORMBRICKS_BASE_URL` |
| Trigger.dev (nouveau) | Project access token | `TRIGGER_SECRET_KEY` |
| Supabase (nouveau) | Service role key | `SUPABASE_SERVICE_ROLE_KEY` |
| Supabase (nouveau) | Anon key | `SUPABASE_ANON_KEY` (côté frontend) |
| Supabase (nouveau) | URL projet | `SUPABASE_URL` |

**Stockage** : Doppler (recommandé) ou Infisical (open source) ou Supabase Vault. Jamais en `.env` committé.

---

## 9. URL publiques à reconfigurer

| URL Windmill | Nouvelle URL cible | Action |
|---|---|---|
| `https://your-domain.example/api/r/rh/formbricks-webhook` | `https://api.your-domain.example/webhooks/formbricks` | Reconfigurer chaque webhook côté Formbricks (UI ou API) |
| `https://your-domain.example/api/r/rh/fiche?id=...` | `https://your-domain.example/fiches/:id` | Mettre à jour les liens partagés (LinkedIn posts, signatures, etc.) |
| `https://your-domain.example/apps/...` | `https://rh.your-domain.example` | Communiquer aux RH internes |

> **Procédure recommandée pour la migration des webhooks Formbricks** :
> 1. Lister tous les webhooks actifs : `GET https://formbricks.your-domain.example/api/v1/webhooks`
> 2. Pour chacun pointant vers Windmill : créer un nouveau pointant vers la nouvelle URL
> 3. Tester en envoyant une candidature de test
> 4. Une fois validé, supprimer les anciens webhooks Windmill : `DELETE /api/v1/webhooks/<id>`
> 5. Désactiver le HTTP trigger Windmill (pour éviter double traitement)

---

**Suivant** : [06-frontend-ui.md](06-frontend-ui.md) — refonte du frontend React (5 onglets, composants, state management).
