# Déployer sur Vercel + Railway + Supabase

Architecture la plus performante côté web : `web` sur Vercel (CDN edge), `api` + `worker` sur Railway (Node services), DB sur Supabase.

⚠️ **Stub à compléter** — squelette pour démarrer, à enrichir avec captures Vercel/Railway.

## Pourquoi cette combinaison

- **Vercel** : déploiement Vite zéro-config, CDN global, build en 30s
- **Railway** : services Node Long-running (le worker pg-boss doit poll en continu)
- **Supabase** : Auth + Postgres + Storage managed

## Étape 1 — `web` sur Vercel

1. https://vercel.com → New Project → Import Git Repository (ton fork)
2. Vercel détecte automatiquement Vite
3. **Root Directory** : `apps/web`
4. **Build Command** : `cd ../.. && pnpm install && pnpm --filter @rh/web build`
5. **Output Directory** : `dist`
6. **Environment Variables** (Build) :
   - `VITE_SUPABASE_URL=https://...`
   - `VITE_SUPABASE_ANON_KEY=...`
   - `VITE_API_URL=https://api.your-domain.example` (à remplir une fois Railway up, voir étape 2)
7. Deploy

⚠️ Les variables `VITE_*` sont **build-time** : si tu changes `VITE_API_URL`, redeploy nécessaire.

## Étape 2 — `api` + `worker` sur Railway

1. https://railway.app → New Project → Empty
2. Add Service → Deploy from GitHub repo → ton fork
3. Crée 2 services : un nommé `api`, un nommé `worker`
4. Pour chaque service :
   - **Settings → Source** : root directory `/`
   - **Settings → Deploy** : custom command
     - `api` : `pnpm install && cd apps/api && node --import tsx src/index.ts`
     - `worker` : `pnpm install && cd apps/jobs && node --import tsx src/index.ts`
5. Variables (env runtime, pas build-time) : voir [02-demarrer/prerequis.md](../02-demarrer/prerequis.md)
6. **Networking** → Generate Public Domain pour `api` (le worker n'a pas besoin)

## Étape 3 — DB sur Supabase

Voir [supabase-setup.md](supabase-setup.md).

## Étape 4 — Lier les services

- Récupère les domaines Vercel + Railway générés
- Mets à jour les env vars Vercel : `VITE_API_URL=https://api-xxx.up.railway.app`
- Mets à jour les env vars Railway : `PUBLIC_WEB_URL=https://web-xxx.vercel.app`
- Redeploy

## Domaines custom

- Vercel : Settings → Domains → ajoute `rh.your-domain.example` (CNAME)
- Railway : Settings → Domains → ajoute `api.your-domain.example` (CNAME)

## Coût

- Vercel free (Hobby plan suffit pour app privée)
- Railway ~10€/mois pour 2 services
- Supabase Pro 25€/mois
- **Total : ~35€/mois** + Anthropic à l'usage

## Alternatives

- Si tu veux moins cher : [matrice-de-choix.md](matrice-de-choix.md) → option C (Coolify)
