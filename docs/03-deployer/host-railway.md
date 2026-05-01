# Recipe — Déployer sur Railway

> **Pré-requis** : tu as déjà fait [cloud-setup.md](cloud-setup.md). Tu as un `.env` complet, le projet Supabase Cloud est en place, les migrations + prompts sont appliqués.

Railway est le chemin **le plus simple** pour un non-tech qui n'a pas de VPS. Push-to-deploy depuis GitHub, gestion des env vars via UI, healthchecks gérés.

**Coût indicatif** : ~15-25€/mois pour les 3 services (web, api, worker) en usage modeste.

---

## Étape 1 — Compte Railway

[railway.app](https://railway.app) → **Sign in with GitHub**. Ajoute une carte de paiement (sinon les services s'arrêtent après le crédit gratuit).

---

## Étape 2 — Importer le repo

1. Dashboard → **New Project** → **Deploy from GitHub repo**
2. Sélectionne ton fork du repo `recruit-os` (Railway demande l'autorisation GitHub la première fois)
3. Railway détecte le `docker-compose.yaml` à la racine et propose de créer **3 services** : `web`, `api`, `worker`
4. Accepte → ne déploie pas tout de suite, on configure les vars d'abord

---

## Étape 3 — Configurer les variables d'environnement

Pour chaque service, va dans **Variables** et colle les valeurs.

### Service `api` (port :3000)

```
DATABASE_URL=                  # de cloud-setup.md
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
PUBLIC_API_URL=https://<ton-api-domain>     # voir Étape 5
PUBLIC_WEB_URL=https://<ton-web-domain>
PUBLIC_FICHES_URL=https://<ton-api-domain>/fiches
BRAND_NAME=Acme Recrutement
RESEND_API_KEY=                # optionnel
```

### Service `worker` (pas de port HTTP, healthcheck via process)

Mêmes variables que `api` (le worker importe les services Claude depuis l'API). Tu peux **copier-coller** le set complet.

### Service `web` (port :80 derrière nginx, frontend statique)

Le web a **deux types de vars** :

**Build vars** (utilisées par Vite au moment du build → bakées dans le bundle) :
```
VITE_SUPABASE_URL=https://<ref>.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_API_URL=https://<ton-api-domain>
VITE_BRAND_NAME=Acme Recrutement
VITE_BRAND_PRIMARY_COLOR=#1f6feb       # ⚠️ Railway ne réinterprète pas le # comme commentaire, pas besoin de quotes ici
```

> ⚠️ Si tu changes une `VITE_*` après un déploiement, **rebuild** est nécessaire (Railway le fait automatiquement quand tu changes une var).

---

## Étape 4 — Premier déploiement

Pour chaque service : **Deploy** (ou push un commit sur `main`, Railway redeploy auto).

Surveille les logs :
- `api` doit afficher `api listening on :3000`
- `worker` doit afficher `✓ pg-boss started, ✓ handlers registered`
- `web` doit terminer son build Vite sans erreur

Si un service crash en boucle, va voir [troubleshooting](#troubleshooting).

---

## Étape 5 — Domaines + URLs publiques

Railway donne par défaut des URLs `*.up.railway.app`. Tu peux soit :

### A. Garder les URLs Railway (gratuit, le plus simple)

1. Pour chaque service → **Settings** → **Networking** → **Generate Domain**
2. Tu obtiens 3 URLs type :
   - `recruit-web-production.up.railway.app`
   - `recruit-api-production.up.railway.app`
   - (worker : pas d'URL, c'est normal)
3. Reviens dans les Variables et **mets à jour** :
   - `PUBLIC_WEB_URL` (sur api + worker)
   - `PUBLIC_API_URL` (sur api + worker)
   - `VITE_API_URL` (sur web — déclenchera un rebuild)
4. Mets aussi à jour côté Supabase : Authentication → URL Configuration → Site URL = ton URL web Railway.

### B. Domaine custom (5 min, look pro)

1. Railway → service web → **Settings** → **Custom Domain** → entre ton domaine (ex. `rh.acme.com`)
2. Railway te donne un CNAME à ajouter chez ton registrar (OVH, Cloudflare, etc.)
3. Idem pour `api.acme.com` sur le service api
4. Attends 5-10 min que les DNS propagent + TLS Let's Encrypt automatique
5. Mets à jour les `PUBLIC_*` + `VITE_API_URL` + Supabase Site URL avec les domaines custom

---

## Étape 6 — Vérification post-deploy

```bash
curl https://<ton-api-domain>/api/health     # → {"ok":true}
curl https://<ton-api-domain>/config         # → {"resend_enabled":false} (ou true)
open https://<ton-web-domain>                # → page login avec ton BRAND_NAME
```

Login avec l'utilisateur Supabase créé à `cloud-setup.md` étape 6. Tu dois voir le dashboard avec ta couleur + ton nom.

Crée un poste de test → vérifie que la génération IA des questions marche (bouton "Générer questions IA" ou via API).

---

## Mises à jour suivantes (push-to-deploy)

Une fois ton repo connecté, **chaque push sur `main`** déclenche un redeploy auto des 3 services. Pour pousser un fix :

```bash
git checkout -b fix/whatever
# ... modifs ...
git commit -am "fix: ..."
gh pr create
# merge la PR → Railway redeploy automatiquement
```

Tu peux désactiver le auto-deploy sur certaines branches via Railway → service → Settings → Source.

---

## Troubleshooting

| Symptôme | Cause probable | Fix |
|---|---|---|
| `web` build échoue avec `import.meta.env.VITE_SUPABASE_URL is undefined` | Build vars pas définies au moment du build | Vérifie les VITE_* dans Variables, force un redeploy |
| `worker` crash au boot avec `ANTHROPIC_API_KEY: String must contain` | Var manquante OU vide | Vérifie ANTHROPIC_API_KEY dans Variables du service worker |
| `api` retourne 500 sur `/api/postes` | DATABASE_URL pas valide | Test depuis local : `psql "$DATABASE_URL" -c "SELECT 1;"` |
| Login impossible : "Invalid redirect URL" | Site URL Supabase pas à jour | Dashboard Supabase → Auth → URL Configuration → ajoute le domaine Railway |
| Bouton primaire reste ambré | `VITE_BRAND_PRIMARY_COLOR` pas appliquée | Vérifie qu'elle est dans les Variables du service `web` (pas `api`), force un redeploy |
| Génération IA échoue 401 | Pas de crédit Anthropic | Ajoute une carte sur console.anthropic.com |

---

## Coûts à surveiller

Railway facture à l'usage. Pour ce projet :
- **api** : ~5-10€/mois (toujours allumé, charge faible)
- **worker** : ~5-10€/mois (toujours allumé pour pg-boss)
- **web** : ~3-5€/mois (statique, mais nginx tourne)
- **Total** : ~15-25€/mois

Si tu veux réduire : tu peux merger api + worker dans le même service en lançant les deux process avec un script (mais perds l'isolation et le scaling indépendant). Pas recommandé.

> Supabase est facturé séparément (Free ou 25$/mois Pro).
