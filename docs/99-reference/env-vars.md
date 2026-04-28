# Variables d'environnement

Toutes les vars consommées par le système, leur rôle, et leur format. Le schéma source est dans [`packages/config/src/env.ts`](../../packages/config/src/env.ts) (Zod). Si une var manque ou a un mauvais format, l'app crashe au démarrage avec un message explicite.

## Obligatoires

| Variable | Format | Rôle |
|---|---|---|
| `DATABASE_URL` | `postgres://user:pass@host:port/db` | Connexion Postgres. Utilisé par drizzle ORM + pg-boss queues. |
| `SUPABASE_URL` | `https://<ref>.supabase.co` | URL du projet Supabase (Auth + Storage). |
| `SUPABASE_ANON_KEY` | `eyJ…` (JWT) | Clé publique pour le client web (auth). |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ…` (JWT) | Clé serveur pour bypass RLS, génération de magic links admin. |
| `ANTHROPIC_API_KEY` | `sk-ant-…` | Authentification Claude Sonnet. |

## URLs publiques

| Variable | Default | Rôle |
|---|---|---|
| `PUBLIC_API_URL` | `http://localhost:3000` | Construit les URLs externes (CORS, webhook URL bake) |
| `PUBLIC_WEB_URL` | `http://localhost:5173` | Origin autorisé pour CORS, redirect post-login Supabase |
| `PUBLIC_FICHES_URL` | `http://localhost:3000/fiches` | Base URL pour les fiches publiques de poste |

⚠️ Ces 3 URLs doivent être configurées **identiques** côté API et côté worker. Le web utilise `VITE_API_URL` (build-time) à la place.

## Email (Resend)

| Variable | Format | Rôle |
|---|---|---|
| `RESEND_API_KEY` | `re_…` | Auth Resend. Vide → emails désactivés (dev). |
| `RESEND_FROM` | `Nom <email@domain>` | Adresse expéditeur. Doit être sur un domaine vérifié dans Resend. |

## Formbricks

| Variable | Format | Rôle |
|---|---|---|
| `FORMBRICKS_API_KEY` | `fbk_…` | Auth API admin Formbricks (créer surveys + webhooks). Vide → setup-survey désactivé. |
| `FORMBRICKS_BASE_URL` | URL | Base URL de ton instance Formbricks (cloud `https://app.formbricks.com` ou self-host). |
| `FORMBRICKS_ENVIRONMENT_ID` | `cl…` | ID de l'environnement Formbricks où créer les surveys. |
| `FORMBRICKS_WEBHOOK_SECRET` | hex 16+ chars | Secret partagé entre API et webhook URL. Validation `?token=<secret>` ou HMAC. |

## Calendly (optionnel)

| Variable | Format | Rôle |
|---|---|---|
| `CALENDLY_TOKEN` | `eyJ…` (PAT) | Personal Access Token pour générer des liens d'entretien uniques. Vide → invitations sans lien Calendly. |

## Apify (optionnel)

| Variable | Format | Rôle |
|---|---|---|
| `APIFY_API_KEY` | `apify_api_…` | Pour scraper LinkedIn via un actor. Vide → linkedin scraping skipped, candidat reçu sans `linkedin_data`. |

## Notifications (au moins une)

| Variable | Format | Rôle |
|---|---|---|
| `NTFY_TOPIC` | string unguessable | Topic ntfy.sh. POST vers `https://ntfy.sh/<topic>`. Default fallback : `recruit-os-errors`. |
| `SLACK_WEBHOOK_URL` | `https://hooks.slack.com/...` | Override ntfy. Si défini, prend la priorité. |

## Variables build-time côté web (`VITE_*`)

⚠️ Ces vars sont **bakées** au build time, pas runtime. Si tu changes leur valeur, **redeploy le web** est nécessaire.

| Variable | Format | Rôle |
|---|---|---|
| `VITE_SUPABASE_URL` | URL | Idem `SUPABASE_URL` côté serveur, mais pour le client React. |
| `VITE_SUPABASE_ANON_KEY` | JWT | Idem `SUPABASE_ANON_KEY` côté serveur, mais pour le client React. |
| `VITE_API_URL` | URL | URL absolue de l'API. Ex: `https://api.your-domain.example`. |

## Comment configurer selon le déploiement

| Plateforme | Comment |
|---|---|
| **Coolify** | Service → Environment Variables → Add. Build Variables (préfixe VITE_) sont séparées des runtime. |
| **Railway** | Service → Variables. Pour `web`, mets les `VITE_*` en variables (Railway les passe au build). |
| **Vercel** | Project Settings → Environment Variables. Coche "Production" + "Preview" selon besoin. |
| **Self-hosted** | Fichier `.env` à la racine du projet, monté dans `docker-compose.yaml` via `env_file`. |

## Vérifier que tout est bon

```bash
# Lance l'API en local
cd apps/api && pnpm dev
# Si une var manque, tu auras une erreur Zod claire au démarrage :
# Invalid environment:
#   - SUPABASE_URL: Required
```

Les vars optionnelles peuvent être absentes sans crasher.

## Régénérer un secret

Pour `FORMBRICKS_WEBHOOK_SECRET` ou n'importe quel autre secret :

```bash
openssl rand -hex 32   # 64 chars hex
# ou
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

⚠️ Si tu regenères `FORMBRICKS_WEBHOOK_SECRET`, n'oublie pas de mettre à jour côté Formbricks UI : URL du webhook → `?token=<nouveau-secret>`.
