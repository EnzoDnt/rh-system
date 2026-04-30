# Intégrations externes — référence

> Pour chaque service tiers utilisé : config attendue, contrat d'appel, sécurité, alternatives.


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
| **API Key** | Variable d'env `FORMBRICKS_API_KEY` (scope Manage) |
| **Header API** | `x-api-key: <key>` |

### Endpoints utilisés
| Méthode | URL | Usage |
|---|---|---|
| POST | `/api/v1/management/surveys` | Créer un survey |
| GET | `/api/v1/webhooks` | Lister webhooks (idempotence check) |
| POST | `/api/v1/webhooks` | Créer un webhook |

> **Important — piège connu** : l'endpoint webhooks est `/api/v1/webhooks` et **PAS** `/api/v1/management/webhooks` (qui retourne 404). Piège connu, vérifié à la main lors du setup.

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
