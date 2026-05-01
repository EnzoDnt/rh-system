# Matrice de choix — où déployer

Tu as **3 services** à héberger : `web` (React SPA), `api` (Hono), `worker` (pg-boss). La BD + l'Auth sont assurées par **Supabase Cloud** (pas auto-hébergé), peu importe ton choix d'hébergeur applicatif.

Voici les combinaisons les plus rationnelles.

## Comparatif rapide

| Option | Coût/mois | Setup | DX | Quand choisir |
|---|---|---|---|---|
| **A. Railway tout-en-un** | ~20€ | 30 min | ⭐⭐⭐ | Tu veux le minimum de friction. Tu paies pour la simplicité. |
| **B. Vercel + Fly.io / Render** | ~25€ | 1h | ⭐⭐⭐⭐ | Tu veux la meilleure perf web (CDN Vercel) et tu acceptes 2 dashboards. |
| **C. Coolify sur VPS** | ~6€ | 30 min | ⭐⭐ | Tu as déjà un Coolify ou un VPS, tu veux le moins cher possible. |
| **D. Self-hosted Docker** | ~5€ (VPS) | 1h | ⭐ | Tu sais l'admin Linux, tu veux 0 dépendance UI. |
| **E. Local seulement (dev)** | 0€ | 15 min | ⭐ | Tu veux juste tester le système. Pas pour la prod. |

## Détail option par option

### A. Railway tout-en-un

**Architecture** : Railway héberge `web` + `api` + `worker` dans un seul projet. BD + Auth sur Supabase Cloud.

**Pour qui** : non-techniques qui veulent juste que ça marche, sans VPS, sans Docker à gérer.

**Recipe** : [host-railway.md](host-railway.md)

**Coût indicatif** :
- 3 services Railway : ~15-25€/mois
- Supabase : Free (limite 500MB BD) ou Pro 25$/mois (recommandé prod)
- Anthropic : ~5-15€/mois selon volume

### B. Vercel + Fly.io (ou Render) + Supabase

**Architecture** :
- `web` (React) → Vercel (CDN global, build instantané)
- `api` + `worker` → Fly.io (Node services, machines toujours allumées)
- BD + Auth → Supabase Cloud

**Pour qui** : tu veux la meilleure perf web (CDN edge mondial), tu vises 100+ candidats/mois.

**Recipe** : [host-generic.md](host-generic.md#recipe-vercel--autre-split-frontback)

**Coût** : Vercel Hobby gratuit + Fly ~10€/mois + Supabase Free → ~10-25€/mois.

### C. Coolify sur VPS

**Architecture** : un VPS (Hetzner, Scaleway, OVH…) avec Coolify (open-source PaaS) qui orchestre les 3 services + Traefik intégré + Let's Encrypt automatique. BD sur Supabase Cloud.

**Pour qui** : tu as déjà un Coolify quelque part, ou tu es prêt à provisionner un VPS et installer Coolify (~10 min).

**Recipe** : [host-coolify.md](host-coolify.md)

**Coût** : VPS Hetzner CX22 (4 vCPU, 8GB RAM) = 6€/mois. Tient web + api + worker + Coolify lui-même + plein de marge.

### D. Self-hosted Docker (sans Coolify)

**Architecture** : ton VPS, ton `docker-compose.yaml`, ton reverse proxy (Caddy / nginx / Traefik manuel).

**Pour qui** : tu sais l'admin Linux, tu veux 0 abstraction.

**Recipe** : [host-generic.md](host-generic.md#recipe-docker-pur-nimporte-quel-vps)

**Limites** : pas de UI, redéploiement manuel (`git pull && docker compose up -d --build`).

### E. Local seulement (dev / démo)

**Architecture** : tu fais tourner web + api + worker en local sur ta machine. Postgres via Supabase Cloud (recommandé) ou Supabase CLI local.

**Pour qui** : tu veux essayer avant d'investir dans un cloud.

**Recipe** : [parcours-developpeur.md](../02-demarrer/parcours-developpeur.md), [local-only.md](local-only.md).

**Limites** : ne marche que sur ta machine. Tu ne peux pas accepter de vraies candidatures publiques (l'URL `/postuler/:slug` n'est pas accessible depuis Internet — sauf via ngrok/Cloudflare Tunnel).

## Mon vote

- Tu débutes : **A. Railway** (simple, prévisible, ~20€/mois)
- Tu vas avoir 100+ candidatures/mois : **B. Vercel + Fly** (meilleure perf, ~25€/mois)
- Tu veux maximiser le ratio simple/coût et tu as déjà un Coolify : **C. Coolify** (~6€/mois VPS)
- Tu veux juste tester avant d'investir : **E. Local**

Tu peux commencer en A, monter en B ou C plus tard si besoin. Le `.env` reste identique.
