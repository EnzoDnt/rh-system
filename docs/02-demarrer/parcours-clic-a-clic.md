# Parcours clic-à-clic (sans coder)

Tu n'es pas développeur ? Tu peux quand même déployer ce système. Ce guide passe **uniquement par des interfaces web** (pas de terminal, pas de Git CLI).

⏱️ **Temps estimé** : 1h à 1h30 pour quelqu'un qui découvre ces outils.

⚠️ **Note honnête** : c'est plus rapide et fiable de demander à ton agent IA (Claude Code, Cursor, etc.) de faire l'install pour toi (voir [parcours-avec-agent-ia.md](parcours-avec-agent-ia.md)). Ce parcours-ci est fait pour ceux qui veulent comprendre chaque étape ou qui n'ont pas d'agent IA sous la main.

## Étape 0 — Préparer les comptes

Tu vas avoir besoin de :
- Un compte **GitHub** (gratuit) pour forker le repo
- Un compte **Supabase** (gratuit pour commencer)
- Un compte **Anthropic** (paie à l'usage, mets ~5-10€ de crédit)
- Un compte chez ton **hébergeur** : Railway recommandé (~20€/mois), sinon Coolify si tu as déjà un VPS

Optionnel :
- **Resend** si tu veux envoyer les emails automatiquement (sinon tu utilises ton client mail via le bouton "Ouvrir dans mon mail")

Garde tous les credentials dans un doc brouillon (1Password, Notion, peu importe). Lis [prerequis.md](prerequis.md) pour les détails compte par compte.

## Étape 1 — Forker le repo

1. Va sur l'URL GitHub du projet (celle qu'on t'a partagée)
2. Clique le bouton **"Fork"** en haut à droite (nécessite un compte GitHub)
3. Tu as maintenant `<ton-username>/rh-system` sur ton GitHub

> 💡 Tu peux aussi télécharger le ZIP via le bouton "Code" → "Download ZIP", mais tu ne recevras pas les mises à jour. Le fork est plus durable.

## Étape 2 — Créer le projet Supabase Cloud

1. Va sur [supabase.com](https://supabase.com) → "Start your project"
2. Crée un projet :
   - Nom au choix (ex: `recruit-acme`)
   - **Région** : la plus proche de tes utilisateurs (ex: `eu-west-3` Paris pour la France)
   - **Database password** : génère un mot de passe fort, **garde-le précieusement** (impossible à récupérer ensuite)
   - **Plan** : Free pour démarrer (passe en Pro plus tard si besoin)
3. Attends ~2 min que le statut passe à **Healthy**
4. Récupère 4 valeurs (à mettre dans ton brouillon) :

| Valeur | Où la trouver |
|---|---|
| Project URL | Settings → API → Project URL |
| Anon public key | Settings → API → `anon public` |
| Service role key | Settings → API → `service_role` (clic "Reveal") |
| Database URL (pooler) | Settings → Database → Connection string → URI (Transaction pooler, port 6543) |

> ⚠️ La service role key bypasse la sécurité. Ne la mets jamais dans un endroit public (frontend, GitHub, Slack…). Uniquement dans ton brouillon perso et dans ton hébergeur.

## Étape 3 — Appliquer les migrations BD

Sur le dashboard Supabase, onglet **SQL Editor** (icône `< >` à gauche).

Pour chaque fichier dans `packages/db/migrations/` (sur GitHub) **dans l'ordre numérique** :
1. Ouvre le fichier sur GitHub (ex: `0000_tough_skrulls.sql`)
2. Clique "Raw" (en haut à droite) pour voir le contenu brut
3. Copie tout le contenu
4. Sur Supabase SQL Editor, clique "+ New query", colle, clique **Run**
5. Tu dois voir "Success. No rows returned"
6. Passe au fichier suivant (0001, 0002, 0003, …)

Il y a une dizaine de fichiers. Compte ~10 min.

## Étape 4 — Créer la clé Anthropic

1. Va sur [console.anthropic.com](https://console.anthropic.com)
2. Crée un compte
3. **Important** : ajoute une carte de paiement et crédite au moins 5$
4. Settings → API Keys → **Create key** → name au choix → copie la clé qui commence par `sk-ant-api03-…`
5. Note-la dans ton brouillon : `ANTHROPIC_API_KEY`

> Sans crédit, **toutes** les fonctions IA (scoring, génération emails) échouent en 401. Tu peux mettre un budget alert pour éviter de te faire surprendre.

## Étape 5 — Choisir et configurer ton hébergeur

Le plus simple pour démarrer : **Railway**. Push-to-deploy depuis ton fork GitHub, gestion env vars via UI, ~20€/mois.

### Sur Railway (recommandé)

1. Va sur [railway.app](https://railway.app) → **Sign in with GitHub**
2. **New Project** → **Deploy from GitHub repo** → sélectionne ton fork
3. Railway détecte le `docker-compose.yaml` et propose 3 services (web, api, worker). **Accepte.**
4. Pour chaque service, va dans **Variables** et colle les valeurs depuis ton brouillon (cf. [host-railway.md](../03-deployer/host-railway.md) pour la liste exacte par service)
5. Pour le service **web**, n'oublie pas les variables avec le préfixe `VITE_*` (ce sont des build vars, bakées dans le bundle)
6. **Deploy** chaque service
7. Pour `web` et `api`, va dans Settings → Networking → **Generate Domain** pour avoir une URL publique
8. Reviens dans les Variables et **mets à jour** `PUBLIC_WEB_URL` (sur api+worker) et `VITE_API_URL` (sur web) avec les URLs Railway réelles, puis redeploy

Doc complète Railway : [host-railway.md](../03-deployer/host-railway.md).

### Autres options

- [host-coolify.md](../03-deployer/host-coolify.md) — si tu as déjà un Coolify
- [host-generic.md](../03-deployer/host-generic.md) — Vercel + Fly.io, ou Docker pur

## Étape 6 — Personnaliser ton branding

Dans les Variables de ton hébergeur, ajoute (toutes optionnelles) :

```
BRAND_NAME=Acme Recrutement
VITE_BRAND_NAME=Acme Recrutement
VITE_BRAND_PRIMARY_COLOR=#1f6feb
VITE_BRAND_LOGO_URL=https://acme.com/logo.svg
```

Doc complète : [docs/04-personnaliser/branding.md](../04-personnaliser/branding.md).

> ⚠️ Sur Railway tu peux écrire les hex sans guillemets. Si tu remplis un fichier `.env` à la main, **quote** la couleur (`"#1f6feb"`).

## Étape 7 — Configurer Supabase Auth

Dashboard Supabase → **Authentication** → **URL Configuration** :
- **Site URL** : ton URL web Railway (ex: `https://recruit-web-production.up.railway.app`)
- **Redirect URLs** : ajoute `<ton-URL-web>/**`

Puis **Authentication** → **Users** → **Add user** :
- Mode magic link : entre ton email + clique "Send magic link"
- Mode password : entre email + mot de passe direct

## Étape 8 — Premier login + premier poste

1. Va sur ton URL web
2. Tu vois la page de login avec ton `BRAND_NAME` et ta couleur primaire
3. Login (magic link reçu par email, ou mot de passe selon ce que tu as configuré)
4. Tu arrives sur `/postes` (vide)
5. Clique **+ Nouveau poste** → renseigne titre + description → "Générer critères avec l'IA" → "Créer"
6. Sur la page détail, génère le formulaire avec l'IA
7. Note l'URL `/postuler/<slug>` du poste — c'est ce que tu partages aux candidats

## Étape 9 — Tester avec un faux candidat

Ouvre ton URL `/postuler/<slug>` dans une fenêtre privée (pour simuler un candidat). Remplis le formulaire avec un faux CV (n'importe quel PDF), valide.

Dans 30-60 secondes, la candidature apparaît dans `/candidatures`, scorée par l'IA. Tu vois le rapport, le score par critère, et un brouillon d'email auto-généré (selon la recommandation IA : invitation, refus, …). Tu peux éditer le brouillon et l'envoyer via "Ouvrir dans mon mail".

## Tu es bloqué ?

- Vérifie les logs de ton hébergeur (Railway → service → Logs)
- Lis [05-operer/runbook-incidents.md](../05-operer/runbook-incidents.md) pour les gotchas connus
- Dans Skool/Discord de la communauté, demande de l'aide
