# Recipe — Vercel / Fly.io / Render / Docker générique

> **Pré-requis** : tu as déjà fait [cloud-setup.md](cloud-setup.md). Tu as un `.env` complet et le projet Supabase Cloud en place.

Cette recipe couvre les hébergeurs **non détaillés** dans `host-railway.md` ou `host-coolify.md`. Le principe est le même partout : tu as 3 services à héberger (`web`, `api`, `worker`) + Supabase comme BD/Auth externe.

---

## Principes communs (à savoir avant de choisir un hébergeur)

### Les 3 services à déployer

| Service | Tech | Port | Long-running ? |
|---|---|---|---|
| `web` | React + Vite + nginx | 80 | Statique après build, peut être servi par CDN |
| `api` | Node + Hono | 3000 | Oui, doit rester up |
| `worker` | Node + pg-boss + tsx watch | aucun | Oui, doit rester up |

### Vars d'environnement par service

- `web` consomme **uniquement les VITE_*** au moment du build. Bakées dans le bundle. Aucune var runtime à part celles que nginx pourrait consommer (rien chez nous).
- `api` et `worker` consomment **toutes les vars sans préfixe** (DATABASE_URL, ANTHROPIC_API_KEY, etc.) au runtime. Ne nécessitent **pas** les VITE_*.

### Healthchecks

| Service | Check |
|---|---|
| `web` | HTTP `GET /` → 200 |
| `api` | HTTP `GET /api/health` → 200 |
| `worker` | Process `pgrep -f "tsx"` (le worker tourne en TS source via tsx, **pas en dist/**) |

> ⚠️ Si tu utilises un hébergeur qui détecte automatiquement les healthchecks via Dockerfile, vérifie qu'il utilise bien le `HEALTHCHECK` du Dockerfile et pas une heuristique custom.

---

## Recipe Vercel + autre (split front/back)

**Quand l'utiliser** : tu veux le meilleur CDN possible pour le frontend (latence faible mondiale) et accepte d'avoir un dashboard séparé pour l'API/worker.

### Vercel pour le frontend uniquement

1. [vercel.com](https://vercel.com) → **Add New Project** → import ton fork
2. Vercel détecte Vite. Configure :
   - **Root Directory** : `apps/web`
   - **Build Command** : `cd ../.. && pnpm install --frozen-lockfile && pnpm --filter @rh/web build`
   - **Output Directory** : `dist`
3. Environment Variables : ajoute les **VITE_*** uniquement (anon key, API URL, branding)
4. Deploy

> Vercel ne peut **pas** héberger l'API (timeout serverless 10s, pas adapté pour pg-boss). Tu héberges `api` + `worker` ailleurs.

### API + worker sur Fly.io (recommandé en complément Vercel)

```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Login
fly auth login

# Crée 2 apps (api et worker)
cd apps/api && fly launch --no-deploy --name recruit-api
cd ../jobs && fly launch --no-deploy --name recruit-worker

# Set les secrets pour chaque
fly secrets set DATABASE_URL=... ANTHROPIC_API_KEY=... [...] -a recruit-api
fly secrets set DATABASE_URL=... ANTHROPIC_API_KEY=... [...] -a recruit-worker

# Deploy
fly deploy -a recruit-api
fly deploy -a recruit-worker
```

> Fly nécessite un Dockerfile par app. Le repo en a déjà un dans `apps/api/Dockerfile` et `apps/jobs/Dockerfile`. Configure le `Dockerfile` path dans `fly.toml` si besoin.

### API + worker sur Render

Render a un free tier limité (sleep après 15 min d'inactivité — incompatible avec un worker qui doit tourner 24/7). Utilise les plans payants ($7/mois minimum par service).

1. [render.com](https://render.com) → **New** → **Web Service** (pour api) et **Background Worker** (pour worker)
2. Connect ton repo, choisis le Dockerfile correspondant
3. Configure les env vars
4. Deploy

---

## Recipe Docker pur (n'importe quel VPS)

Tu as un VPS, tu veux juste `docker compose up` :

```bash
ssh root@<ton-vps>
git clone https://github.com/<ton-fork>/recruit-os
cd recruit-os
cp .env.example .env
# édite .env avec tes valeurs (cloud-setup.md)
nano .env

docker compose up -d
docker compose logs -f       # surveille le démarrage
```

Pour HTTPS + reverse proxy, ajoute Caddy en frontal :

```caddy
# /etc/caddy/Caddyfile
rh.acme.com {
  reverse_proxy localhost:5173
}
api.acme.com {
  reverse_proxy localhost:3000
}
```

```bash
sudo systemctl reload caddy
```

Caddy gère TLS automatiquement via Let's Encrypt. Aucune config supplémentaire.

> Cette approche n'a pas d'UI de gestion. Pour redéployer, c'est `git pull && docker compose up -d --build`. Si tu veux une UI sans changer de stack, installe Coolify par-dessus → [host-coolify.md](host-coolify.md).

---

## Comparaison rapide

| Hébergeur | Setup | Coût/mois | Auto-deploy | UI | Adapté pour |
|---|---|---|---|---|---|
| Railway | 20 min | ~20€ | ✅ | ✅ | Non-tech, premier déploiement |
| Coolify (VPS) | 30 min | ~6€ (VPS) | ✅ | ✅ | Tech-friendly, économe |
| Vercel + Fly.io | 1h | ~25€ | ✅ | ✅ (2 dashboards) | Perf web max + worker dédié |
| Vercel + Render | 1h | ~30€ | ✅ | ✅ (2 dashboards) | Idem Fly mais sans CLI |
| Docker pur | 30 min | ~5€ (VPS) | ❌ | ❌ | Ops familier avec Docker |

---

## Choses à savoir quel que soit l'hébergeur

### 1. Migration et seed se font une fois, pas à chaque deploy

Les migrations Supabase sont appliquées **manuellement** depuis ta machine (cf. [cloud-setup.md](cloud-setup.md#étape-4)) — pas par l'hébergeur au déploiement. Pareil pour le seed des prompts.

Si tu ajoutes une migration plus tard : applique-la depuis ta machine **avant** de merger la PR qui l'utilise, sinon les containers prod crashent.

### 2. Le worker n'a pas besoin d'URL publique

Le worker pg-boss communique avec la BD Postgres directement, pas via l'API. Pas besoin de domaine ni de port exposé. Sur les hébergeurs PaaS qui exigent une URL, choisis le type "Background Worker" / "Service" (pas "Web Service").

### 3. La RLS Supabase + service role key

L'API utilise `SUPABASE_SERVICE_ROLE_KEY` qui **bypasse** la Row Level Security. C'est volontaire — l'auth est gérée au niveau du middleware Hono via le JWT user, pas via RLS Postgres. Ne mets jamais cette clé côté frontend.

### 4. Update des `VITE_*` = rebuild obligatoire

Les vars `VITE_*` sont **bakées dans le bundle** au moment du build. Si tu changes `VITE_BRAND_NAME` après un déploiement, tu dois redéclencher un build du service `web` (la plupart des hébergeurs le font automatiquement quand tu modifies une var).
