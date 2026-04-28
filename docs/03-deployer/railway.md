# Déployer sur Railway

⚠️ **Stub à compléter** — voir [matrice-de-choix.md](matrice-de-choix.md) pour le contexte.

## Architecture

Railway tout-en-un : `web` + `api` + `worker` dans un seul projet. Postgres via Supabase (recommandé) plutôt que Postgres Railway.

## Étapes

1. https://railway.app → New Project → Deploy from GitHub repo
2. Sélectionne ton fork
3. Railway détecte `docker-compose.yaml` et crée 3 services
4. Pour chaque service, dans **Variables** : colle tes env vars (voir [02-demarrer/prerequis.md](../02-demarrer/prerequis.md))
5. Pour `web`, configure les **Build Variables** (préfixe `VITE_`) — pas runtime
6. Génère un domaine public pour `web` et `api`
7. Mets à jour `PUBLIC_API_URL`, `PUBLIC_WEB_URL`, `PUBLIC_FICHES_URL` avec les URLs réelles, puis redeploy

## Domaine custom

Railway → Settings → Domains → Add Custom Domain → suis les instructions DNS (CNAME).

## Coût attendu

- 3 services Railway : ~5-10€/mois en idle, ~20€/mois avec trafic raisonnable
- Postgres Supabase Pro : 25€/mois si > 50 candidatures/mois (sinon Free)
- Anthropic : ~5-15€/mois selon volume

## Limites

- Pas d'option "scale to zero" → les services tournent même sans trafic
- Logs limités à 7 jours sur le free tier

## Alternatives

- [vercel-railway.md](vercel-railway.md) — meilleure perf web grâce à Vercel CDN
- [matrice-de-choix.md](matrice-de-choix.md) — comparatif global
