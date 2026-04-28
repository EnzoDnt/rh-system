# Matrice de choix — où déployer

3 services à héberger : `web` (React SPA), `api` (Hono), `worker` (pg-boss). Plus une DB Postgres + une instance Formbricks. Voici les combinaisons les plus rationnelles.

## Comparatif rapide

| Option | Coût/mois | Setup | DX | Quand choisir |
|---|---|---|---|---|
| **A. Railway tout-en-un** | ~20€ | 30 min | ⭐⭐⭐ | Tu veux le minimum de friction. Tu paies pour la simplicité. |
| **B. Vercel + Railway + Supabase** | ~50€ | 1h | ⭐⭐⭐⭐ | Tu veux la meilleure perf web (CDN Vercel) et tu acceptes 3 dashboards. |
| **C. Coolify sur Hetzner** | ~6€ | 2h | ⭐⭐ | Tu veux le moins cher possible et tu n'as pas peur du DIY. |
| **D. Self-hosted Docker** | ~10€ (VPS) | 1h | ⭐⭐ | Tu as déjà un VPS, juste docker-compose up. |
| **E. Local seulement (dev)** | 0€ | 15 min | ⭐ | Tu veux juste tester le système. Pas pour la prod. |

## Détail option par option

### A. Railway tout-en-un

**Architecture** : Railway héberge web + api + worker + Postgres dans un seul projet. Formbricks séparément (cloud ou Railway).

**Pour qui** : non-techniques qui veulent juste que ça marche.

**Comment** : `New Project → Deploy from GitHub`, Railway détecte le `docker-compose.yaml`, déploie les 3 services. Tu colles les env vars depuis ton brouillon. Domaines `*.up.railway.app` par défaut, ou tu connectes ton domaine custom.

**Limites** :
- Coût scale avec l'usage (peut grimper si beaucoup de candidats)
- Pas de free tier généreux (5$ de crédit puis facturation usage)
- Postgres Railway plus cher que Supabase pour les mêmes specs

**Recommandation** : utilise Railway pour `api` + `worker` mais garde Supabase pour la DB (et Auth).

→ Voir [railway.md](railway.md) (à venir)

### B. Vercel + Railway + Supabase

**Architecture** :
- `web` (React) → Vercel (CDN global, build instantané)
- `api` + `worker` → Railway (Node services)
- Postgres + Auth + Storage → Supabase
- Formbricks → cloud Pro ou Railway

**Pour qui** : équipes qui veulent prod-grade sans les contraintes Coolify.

**Comment** : 3 dashboards à configurer mais chacun est trivial. Vercel détecte automatiquement Vite, Railway détecte Node, Supabase est managé.

**Avantages** : meilleure perf web (CDN edge Vercel), zéro maintenance VPS.

**Limites** : 3 factures différentes, 3 dashboards à monitorer.

→ Voir [vercel-railway.md](vercel-railway.md) (à venir)

### C. Coolify sur Hetzner (l'option originale du projet)

**Architecture** : un VPS Hetzner avec Coolify (open-source PaaS) qui orchestre tous les services + Traefik pour le reverse proxy + Let's Encrypt automatique.

**Pour qui** : tech-friendly qui veut maîtriser sa stack.

**Coût** : VPS CX22 (4 vCPU, 8GB RAM) = 6€/mois, supporte web + api + worker + Postgres + Formbricks + Traefik.

**Setup** :
1. Provisionne un VPS Hetzner (~5 min)
2. SSH + installe Coolify (`curl -fsSL https://get.coolify.io | bash`)
3. Configure ton domaine sur Cloudflare/OVH (4 sous-domaines : `rh.`, `api.`, `fiches.`, `formbricks.`)
4. Coolify UI → Add Project → branche ton GitHub → Deploy

**Limites** :
- Coolify a des bugs occasionnels (cf. incident "deploy stuck 10h" dans le runbook historique)
- Tu gères la maintenance OS du VPS (mises à jour, sécurité)

→ Voir [deployments.md](deployments.md) pour le runbook complet

### D. Self-hosted Docker (n'importe quel VPS)

**Architecture** : ton VPS, ton docker-compose.yaml, ton reverse proxy (Caddy / nginx / Traefik manuel).

**Pour qui** : tu as déjà un VPS et tu sais l'admin.

**Comment** :
```bash
git clone <ton repo>
cd recruit-os
cp .env.example .env  # remplis
docker compose up -d
```
Pour le reverse proxy + HTTPS, le plus simple est **Caddy** :
```caddy
rh.your-domain.example { reverse_proxy localhost:5173 }
api.your-domain.example { reverse_proxy localhost:3000 }
fiches.your-domain.example { reverse_proxy localhost:3000 }
```

**Limites** : pas de UI, tout en CLI. Pas pour les non-techniques.

→ Voir [self-hosted-vps.md](self-hosted-vps.md) (à venir)

### E. Local seulement (dev / démo)

**Architecture** : tu fais tourner web + api + worker + Postgres en local sur ta machine.

**Pour qui** : tu veux juste essayer le système avant d'investir dans un cloud.

**Comment** : voir [parcours-developpeur.md](../02-demarrer/parcours-developpeur.md). Postgres via Docker (`docker run postgres:16`), Formbricks en cloud (free tier).

**Limites** : ne marche que sur ta machine. Tu ne peux pas accepter de vrais candidats (les webhooks Formbricks ne peuvent pas joindre `localhost:3000` depuis l'internet — sauf via ngrok).

## Mon vote

- Tu débutes : **A. Railway** (simple, prévisible, ~20€/mois)
- Tu vas avoir 100+ candidatures/mois : **B. Vercel + Railway + Supabase** (meilleure perf, ~50€/mois)
- Tu veux maximiser le ratio simple/coût : **C. Coolify sur Hetzner** (~6€/mois mais DIY)
- Tu veux juste tester : **E. Local**

Tu peux commencer en A, monter en B quand tu as plus de volume, et migrer en C si tu deviens très technique.
