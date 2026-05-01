# Recipe — Déployer sur Coolify

> **Pré-requis** : tu as déjà fait [cloud-setup.md](cloud-setup.md). Tu as un `.env` complet et une instance Coolify qui tourne (auto-hébergée sur ton VPS, ou via [coolify.io/cloud](https://coolify.io/cloud)).

Coolify détecte automatiquement le `docker-compose.yaml` à la racine du repo. Le setup est très court — la majorité du temps, c'est juste "pointer Coolify sur le repo + configurer les env vars".

---

## Étape 1 — Créer la ressource

Dashboard Coolify → **Projects** → **New Project** → nom au choix → **+ New Resource**.

Choisis **Docker Compose Empty** (ou "Public Repository" puis indique l'URL si ton repo est public).

Pour un repo GitHub privé : utilise **GitHub App** (Coolify → Sources → Configure GitHub App une fois pour toutes), puis crée une ressource **Application → Public Repository** et sélectionne ton fork.

Coolify lit le `docker-compose.yaml` et propose de créer 3 services : `web`, `api`, `worker`. **Accepte.**

---

## Étape 2 — Configurer les variables d'environnement

Dans la ressource Coolify, onglet **Environment Variables**.

Coolify ne distingue pas "build vars" et "runtime vars" comme Railway. Toutes les vars sont injectées au moment du build ET au runtime du container concerné.

Colle **tout le contenu** de ton `.env` (sauf les commentaires). Coolify les répartit automatiquement entre les services selon leur usage dans le `docker-compose.yaml`.

Les variables critiques :

```dotenv
# Backend (api + worker)
DATABASE_URL=...
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
ANTHROPIC_API_KEY=...
PUBLIC_API_URL=https://<api-domain>
PUBLIC_WEB_URL=https://<web-domain>
PUBLIC_FICHES_URL=https://<api-domain>/fiches
BRAND_NAME=Acme Recrutement

# Frontend (build time pour le service web)
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_API_URL=https://<api-domain>
VITE_BRAND_NAME=Acme Recrutement
VITE_BRAND_PRIMARY_COLOR=#1f6feb
```

> ⚠️ Coolify n'interprète pas le `#` comme un commentaire dans son éditeur d'env vars (contrairement à un fichier dotenv). Pas besoin de quotes autour de la couleur hex ici.

---

## Étape 3 — Domaines

Pour chaque service exposé (web et api), onglet **Domains** → ajoute :
- `rh.acme.com` → service `web` (port 80)
- `api.acme.com` → service `api` (port 3000)

(Le worker n'a pas de domaine, c'est normal.)

Coolify gère automatiquement le TLS via Let's Encrypt. Vérifie que tes DNS pointent bien le A record vers l'IP du VPS Coolify.

---

## Étape 4 — Premier deploy

Clic **Deploy**. Suis les logs.

Tu devrais voir :
- `api` : `api listening on :3000`
- `worker` : `✓ pg-boss started, ✓ handlers registered`
- `web` : build Vite OK + nginx démarre

Healthchecks Coolify :
- `web` : check HTTP `:80/`
- `api` : check HTTP `:3000/api/health`
- `worker` : check process via `pgrep -f "tsx"`

---

## Étape 5 — Vérification

```bash
curl https://api.acme.com/api/health    # → {"ok":true}
open https://rh.acme.com                # → page login
```

Login → dashboard avec ton branding.

---

## Mises à jour suivantes

Push-to-deploy depuis GitHub : Coolify écoute les webhooks et redeploy à chaque push sur la branche configurée (par défaut `main`).

Pour rollback : Coolify UI → service → **Deployments** → clic "Redeploy" sur un build précédent.

---

## Troubleshooting

| Symptôme | Cause probable | Fix |
|---|---|---|
| Worker en restart loop | Le healthcheck échoue (process pas détecté) | Vérifie les logs ; le check est `pgrep -f "tsx"` (worker tourne en TS source via tsx, pas dist/) |
| Web build OK mais 502 sur le domaine | DNS pas propagé OU Coolify pas en frontal | Vérifie que le A record du domaine pointe l'IP VPS, et que le service Coolify écoute bien sur le port |
| Login impossible : "Invalid redirect URL" | Site URL Supabase pas à jour | Dashboard Supabase → Auth → URL Configuration → mets ton domaine Coolify |
| Build web OK mais bouton ambré | `VITE_BRAND_PRIMARY_COLOR` non appliquée | Vérifie la var dans les env vars Coolify ET force un rebuild |

> Pour les bugs Coolify-spécifiques (deploy stuck, build cache pourri), consulter le runbook : [docs/05-operer/runbook-incidents.md](../05-operer/runbook-incidents.md).

---

## Coûts

Coolify est gratuit (open-source). Tu paies juste ton VPS.

Configuration recommandée minimum :
- **VPS Hetzner CX22** (4 vCPU, 8GB RAM, 40GB SSD) → 6€/mois
- Tient web + api + worker + Coolify lui-même + Traefik intégré sans souci

Si tu veux ajouter Postgres dans le VPS au lieu de Supabase Cloud (pour économiser le 25$/mois Pro), c'est possible mais tu perds l'Auth Supabase managée. Pas recommandé pour la v1.
