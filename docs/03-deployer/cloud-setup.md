# Setup cloud — étapes communes à tous les hébergeurs

Avant de déployer chez Railway, Coolify, Vercel ou autre, ces étapes-là sont **les mêmes pour tout le monde** : créer le projet Supabase Cloud, récupérer la clé Anthropic, construire le `.env` complet, appliquer les migrations BD et seeder les prompts IA.

Une fois cette doc terminée, tu auras :
- Un projet Supabase Cloud opérationnel avec le schéma + les 6 prompts IA seedés
- Un fichier `.env` complet, vérifié, prêt à être copié dans ton hébergeur
- Une clé Anthropic active

Ensuite tu choisis ton hébergeur et tu suis sa recipe :
- [host-railway.md](host-railway.md) — non-tech, ~20 min, ~20€/mois
- [host-coolify.md](host-coolify.md) — VPS perso, ~10 min si Coolify déjà en place
- [host-generic.md](host-generic.md) — Vercel split, Fly.io, Render, Docker maison

---

## Pré-requis machine (l'agent IA peut les installer)

Si tu suis ce guide avec un agent IA (Claude Code, Cursor, …), il peut installer ce qui manque tout seul. Si tu fais à la main, voici ce qu'il faut :

| Outil | Pour quoi faire | Installer |
|---|---|---|
| Node 20+ | Lancer le repo en local pour vérifier | `nvm install 20` ou [nodejs.org](https://nodejs.org) |
| pnpm 9+ | Gestionnaire de packages monorepo | `corepack enable && corepack prepare pnpm@latest --activate` |
| Supabase CLI | Pousser le schéma + seed sur Supabase Cloud | `brew install supabase/tap/supabase` (macOS) ou [docs.supabase.com/guides/cli](https://supabase.com/docs/guides/cli) |
| `psql` (optionnel) | Tester la connexion BD | `brew install libpq && brew link --force libpq` (macOS) |
| `gh` (optionnel) | Si tu veux ouvrir des PR depuis le terminal | `brew install gh` |

> 💡 **Agent IA** : si une commande échoue avec "command not found", installe l'outil via le gestionnaire de paquets de l'OS détecté (`brew` sur macOS, `apt` sur Debian/Ubuntu, `winget`/`choco` sur Windows), puis relance.

---

## Étape 1 — Créer le projet Supabase Cloud

Tu as deux chemins. **Choisis le plus simple pour toi.**

### Option A : via le dashboard Supabase (recommandé pour la première fois)

1. Va sur [supabase.com](https://supabase.com) → **New project**
2. Renseigne :
   - **Name** : ce que tu veux (ex. `recruit-acme`)
   - **Database password** : génère un mot de passe fort, **garde-le précieusement** (impossible à récupérer ensuite)
   - **Region** : choisis la plus proche de tes utilisateurs (ex. `eu-west-3` pour la France)
   - **Plan** : Free (suffit pour tester) ou Pro (recommandé en prod : 25$/mois, sauvegarde quotidienne, pas de pause après inactivité)
3. Attends ~2 min que le statut passe à **Healthy**
4. Récupère 4 valeurs :

| Valeur | Où la trouver | Variable .env |
|---|---|---|
| Project URL | Settings → API → Project URL | `SUPABASE_URL` |
| Anon public key | Settings → API → `anon public` | `SUPABASE_ANON_KEY` |
| Service role key | Settings → API → `service_role` (clic "Reveal") | `SUPABASE_SERVICE_ROLE_KEY` |
| Database URL (pooler 6543) | Settings → Database → Connection string → URI (Transaction pooler) | `DATABASE_URL` |

> ⚠️ La service role key bypasse la Row Level Security. Ne la commit jamais. Ne la mets jamais dans un client browser. Elle ne va que côté serveur (API + worker + Coolify env).

### Option B : via la Supabase CLI (pour les agents IA / tech-friendly)

```bash
# 1. Login (ouvre browser, persiste le token dans ~/.supabase)
supabase login

# 2. Liste tes orgs (récupère l'ORG_ID)
supabase orgs list

# 3. Crée le projet
supabase projects create "recruit-acme" \
  --org-id <ORG_ID> \
  --region eu-west-3 \
  --db-password '<PASSWORD-FORT>'

# 4. Récupère le ref + URL
supabase projects list
# → garde la PROJECT_REF (string courte type abcdefghij)
```

La création peut prendre 1-2 min. Une fois `Healthy`, va sur le dashboard pour récupérer les 4 valeurs (la CLI ne donne pas la service role key — il faut la copier depuis Settings → API).

---

## Étape 2 — Créer la clé Anthropic

1. Va sur [console.anthropic.com](https://console.anthropic.com)
2. Crée un compte si besoin
3. **Important** : ajoute une carte de paiement et crédite au moins 5$. Sans crédit, **toutes** les fonctions IA (scoring, génération emails, fiche de poste, formulaire, guardrails) échouent en 401.
4. Settings → API Keys → **Create key** → name `recruit-os-prod` → copie la clé qui commence par `sk-ant-api03-…`
5. Garde cette valeur pour `ANTHROPIC_API_KEY` dans ton `.env`.

> Coût indicatif : un workflow complet (scoring + génération email) sur Claude Sonnet 4.6 coûte ~0.05–0.10$ par candidat. Pour 100 candidats/mois → ~10$/mois.

---

## Étape 3 — Construire le `.env`

Dans le repo cloné :

```bash
cp .env.example .env
```

Remplis avec les valeurs collectées aux étapes 1 et 2. Variables **obligatoires** :

```dotenv
DATABASE_URL=postgres://postgres.<ref>:<password>@aws-1-<region>.pooler.supabase.com:6543/postgres
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
ANTHROPIC_API_KEY=sk-ant-api03-...
PUBLIC_API_URL=http://localhost:3000      # à changer pour ton domaine prod plus tard
PUBLIC_WEB_URL=http://localhost:5173      # idem
PUBLIC_FICHES_URL=http://localhost:3000/fiches
```

Variables **frontend** (préfixe VITE_, bakées au build, à dupliquer côté hébergeur en build vars) :

```dotenv
VITE_SUPABASE_URL=https://<ref>.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...           # même valeur que SUPABASE_ANON_KEY
VITE_API_URL=http://localhost:3000      # ton domaine API en prod
```

Variables **branding** (toutes optionnelles, défauts neutres) — voir [docs/04-personnaliser/branding.md](../04-personnaliser/branding.md) :

```dotenv
BRAND_NAME=Acme Recrutement
VITE_BRAND_NAME=Acme Recrutement
VITE_BRAND_PRIMARY_COLOR="#1f6feb"      # ⚠️ guillemets si la valeur commence par #
```

Variables **optionnelles** (si tu veux les fonctionnalités correspondantes) :

```dotenv
RESEND_API_KEY=             # envoi email automatique (sinon mailto: dans le client)
APIFY_API_KEY=              # scraping LinkedIn (sinon scoring sans LinkedIn)
NTFY_TOPIC_URL=             # push notifs externes (sinon dashboard /notifications suffit)
SLACK_WEBHOOK_URL=          # idem
```

---

## Étape 4 — Appliquer les migrations sur Supabase Cloud

Tu as trois moyens. **Choisis selon ton confort.**

### Option A : `psql` direct (le plus rapide, recommandé)

```bash
cd packages/db
for f in migrations/*.sql; do
  echo "→ $f"
  psql "$DATABASE_URL" -f "$f"
done
```

Vérifie qu'il n'y a pas d'erreur. Les migrations sont **idempotentes** (`CREATE TABLE IF NOT EXISTS` partout) → tu peux les rejouer sans risque.

### Option B : via la Supabase CLI

```bash
# Lie ton repo local au projet Supabase Cloud (une fois)
supabase link --project-ref <PROJECT_REF>

# Pousse le schéma
supabase db push
```

### Option C : copier-coller dans le SQL Editor (clic-à-clic, sans CLI)

Dashboard Supabase → SQL Editor → New query → colle le contenu de chaque fichier `packages/db/migrations/*.sql` un par un dans l'ordre numérique → Run pour chaque.

---

## Étape 5 — Seeder les prompts IA

Les 6 prompts IA (scoring, génération email, formulaire, guardrails, critères, fiche de poste) doivent être présents en BD pour que le système marche. Sans ça, les jobs scoring + email échouent.

```bash
pnpm install                       # si pas déjà fait
pnpm --filter @rh/db seed
```

Tu devrais voir :
```
✓ upserted 6 prompts (scoring_candidat, generation_email, ...)
```

> ℹ️ Le placeholder `<Votre Marque>` dans les prompts est substitué automatiquement à `BRAND_NAME` au runtime côté API/worker. Pas besoin d'éditer les prompts pour personnaliser la marque.

---

## Étape 6 — Configurer Supabase Auth (utilisateurs RH)

Tu vas vouloir te logger sur le dashboard de l'app. Deux modes au choix : magic link ou mot de passe.

### Mode magic link (par défaut)

Dashboard Supabase → **Authentication** → **URL Configuration** :
- **Site URL** : `https://<ton-domaine-web>` (ou `http://localhost:5173` pour les tests)
- **Redirect URLs** : ajoute `https://<ton-domaine-web>/**`

Ensuite **Authentication** → **Users** → **Add user** → email + cliquer "Send magic link" → tu reçois l'invit par email.

### Mode mot de passe

Dashboard Supabase → **Authentication** → **Users** → **Add user** → email + mot de passe direct (pas d'email envoyé).
Sur l'app, choisis l'onglet "Mot de passe" sur `/login`.

---

## Étape 7 — Vérifier en local avant de déployer

```bash
pnpm install
pnpm typecheck                       # 6 packages doivent être Done
pnpm test                            # 76 tests doivent passer
pnpm dev                             # api :3000, web :5173, worker
```

Dans un autre terminal :

```bash
curl http://localhost:3000/api/health    # → {"ok":true}
curl http://localhost:3000/config        # → {"resend_enabled":false} (ou true si tu as RESEND_API_KEY)
open http://localhost:5173               # → page login
```

Login avec l'utilisateur que tu as créé étape 6 → tu devrais voir le dashboard avec ton `BRAND_NAME` et ta couleur primaire.

Crée un poste de test → vérifie que la génération de questions IA marche (= ta clé Anthropic est OK + crédit suffisant + prompts seedés).

---

## Tu es prêt à déployer

Le `.env` est complet et testé. Choisis ta cible :

- **Tu n'as pas de VPS, tu veux le minimum de friction** → [host-railway.md](host-railway.md)
- **Tu as déjà un Coolify quelque part** → [host-coolify.md](host-coolify.md)
- **Tu veux Vercel pour le front + autre chose pour l'API** → [host-generic.md](host-generic.md)

---

## Troubleshooting rapide

| Symptôme | Cause probable | Fix |
|---|---|---|
| `pnpm install` échoue avec "Unsupported engine" | pnpm < 9 | `corepack prepare pnpm@latest --activate` |
| Worker crash : `ANTHROPIC_API_KEY: String must contain at least 1 character(s)` | Clé absente OU shadowed par le shell | Voir [parcours-developpeur.md](../02-demarrer/parcours-developpeur.md#worker-boot-fails) |
| `psql: FATAL: password authentication failed` | DATABASE_URL mal formée | Recopie depuis le dashboard, vérifie l'URL-encoding du password |
| App boot mais bouton primaire reste ambré au lieu de ta couleur | Tu n'as pas mis de guillemets autour de `VITE_BRAND_PRIMARY_COLOR=#xxx` | Quote la valeur : `VITE_BRAND_PRIMARY_COLOR="#1f6feb"` |
| Premier scoring échoue 401 | Pas de crédit Anthropic | Ajoute une carte sur [console.anthropic.com](https://console.anthropic.com) |
