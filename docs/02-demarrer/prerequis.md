# Prérequis

Comptes externes à créer avant de lancer le système. Tous les prestataires ont un free tier suffisant pour démarrer.

## Obligatoires

| Service | Pour quoi | Free tier suffisant ? | Lien |
|---|---|---|---|
| **Supabase** | DB Postgres + Auth (magic link) + Storage | ✅ jusqu'à ~50 candidatures/mois (Free) ; sinon Pro 25$/mois | https://supabase.com |
| **Anthropic** | Claude Sonnet 4.6 (scoring, emails, fiches) | ⚠️ pay-as-you-go (~5-15€/mois pour 100 candidatures) | https://console.anthropic.com |
| **Resend** | Email delivery | ✅ 100 emails/jour gratuit (3000/mois) | https://resend.com |
| **Formbricks** | Formulaire de candidature | ✅ self-host gratuit OU cloud Pro 49$/mois | https://formbricks.com |

## Optionnels (selon tes besoins)

| Service | Pour quoi | Si tu n'en veux pas |
|---|---|---|
| **Calendly** | Lien auto pour réserver un entretien | Tu mets un lien Cal.com / Doodle / un email manuel |
| **Apify** (avec actor LinkedIn scraper) | Enrichir candidat via son profil LinkedIn | Désactive : `APIFY_API_KEY=` vide → scraping return null |
| **ntfy.sh** | Notifications push (heartbeat, alertes job en échec) | Désactive : `NTFY_TOPIC=` vide → log console only |
| **Slack** | Alternative à ntfy | Désactive : `SLACK_WEBHOOK_URL=` vide |

## Comptes que tu peux skipper en dev

- **Supabase** : tu peux faire tourner un Postgres local + skip l'auth en dev (modifier `apps/api/src/middleware/auth.ts` temporairement)
- **Resend** : si tu n'envoies aucun email en dev, ce n'est pas requis
- **Calendly** : facultatif

## Variables d'env à récupérer

Avant de cloner, prépare ces valeurs dans un fichier brouillon :

```env
# Obligatoires
SUPABASE_URL=https://xxxxxxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhb...
SUPABASE_SERVICE_ROLE_KEY=eyJhb...
DATABASE_URL=postgres://postgres.xxxxxxxxxxxxxxxx:<password>@aws-0-eu-west-3.pooler.supabase.com:5432/postgres
ANTHROPIC_API_KEY=sk-ant-api03-...

# URLs publiques de ton déploiement
PUBLIC_API_URL=https://api.your-domain.example
PUBLIC_WEB_URL=https://rh.your-domain.example
PUBLIC_FICHES_URL=https://fiches.your-domain.example

# Email
RESEND_API_KEY=re_...
RESEND_FROM=L'équipe Recrutement <recrutement@your-domain.example>

# Formbricks (cloud ou self-host)
FORMBRICKS_API_KEY=fbk_...
FORMBRICKS_BASE_URL=https://app.formbricks.com  # ou ton self-host
FORMBRICKS_ENVIRONMENT_ID=clxxxxxx
FORMBRICKS_WEBHOOK_SECRET=$(openssl rand -hex 32)  # génère un secret 64-char hex

# Optionnel
CALENDLY_TOKEN=eyJraWQ...  # personal access token
APIFY_API_KEY=apify_api_...
NTFY_TOPIC=mon-topic-ntfy-secret-x9k3m
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

**Attention DKIM/SPF** : pour que tes emails Resend n'atterrissent pas en spam, configure les records DNS sur `your-domain.example` (Resend te donne 3 entrées : DKIM, SPF, return-path). Test via https://www.mail-tester.com → score >9/10 obligatoire avant la prod.

## Prochaine étape

→ [parcours-developpeur.md](parcours-developpeur.md) si tu veux clone + lancer en local
→ [parcours-clic-a-clic.md](parcours-clic-a-clic.md) si tu veux déployer sans code
→ [parcours-avec-agent-ia.md](parcours-avec-agent-ia.md) si tu veux déléguer à ton agent IA
