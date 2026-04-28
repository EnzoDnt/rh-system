# Parcours clic-à-clic (sans coder)

Tu n'es pas développeur ? Tu peux quand même déployer ce système. Ce guide passe **uniquement par des interfaces web** (pas de terminal, pas de Git CLI).

⏱️ **Temps estimé** : 1h30 à 2h pour quelqu'un qui découvre ces outils.

⚠️ **Note honnête** : c'est plus rapide et fiable de demander à ton agent IA de faire l'install pour toi (voir [parcours-avec-agent-ia.md](parcours-avec-agent-ia.md)). Ce parcours-ci est fait pour ceux qui veulent comprendre chaque étape.

## Étape 0 — Préparer les comptes

Lis [prerequis.md](prerequis.md) et crée tes comptes Supabase, Anthropic, Resend, Formbricks. Garde tous les credentials dans un doc brouillon (1Password, Notion, peu importe).

## Étape 1 — Cloner le repo en ZIP

1. Va sur l'URL GitHub du projet (celle qu'on t'a partagée)
2. Clique le bouton vert **"Code"** → **"Download ZIP"**
3. Décompresse le ZIP sur ton bureau

Note : si tu veux recevoir les mises à jour automatiquement, il vaut mieux **forker** le repo sur ton propre GitHub (clic "Fork" en haut à droite). Mais ça demande un compte GitHub + une compréhension minimale de Git. Tu peux y revenir plus tard.

## Étape 2 — Préparer Supabase

1. Va sur https://supabase.com → "Start your project"
2. Crée un projet : nom au choix, région **EU West (Paris)** si tu es en Europe, **Pro plan recommandé** (Free a des limites cassantes au-dessus de 50 users)
3. Note l'**URL du projet** (`https://xxxxxxxx.supabase.co`)
4. Settings → API → copie :
   - `anon` `public` key → ce sera `SUPABASE_ANON_KEY`
   - `service_role` `secret` key → ce sera `SUPABASE_SERVICE_ROLE_KEY`
5. Settings → Database → copie le `Connection string` mode **Session pooler** (port 5432) → ce sera `DATABASE_URL`. Remplace `[YOUR-PASSWORD]` par le mot de passe que tu as créé.

**Application des migrations** : la suite la plus simple est d'utiliser le **SQL Editor** de Supabase. Va sur l'onglet `SQL Editor`, ouvre les fichiers `packages/db/migrations/0000_tough_skrulls.sql` puis `0001_triggers_and_rls.sql` puis `0002_ai_calls_table.sql` du repo, copie-colle leur contenu dans l'éditeur dans l'ordre, et clique "Run" pour chaque.

**Seed des prompts** : ce sera fait à l'étape 4 quand l'API tournera.

## Étape 3 — Préparer Anthropic

1. https://console.anthropic.com → Sign up
2. Settings → API Keys → Create Key
3. Note la clé : `ANTHROPIC_API_KEY`
4. **Important** : ajoute du crédit (5-10$ pour démarrer). Sans crédit, les calls retournent 401.

## Étape 4 — Déployer (le choix)

Trois options simples, du plus facile au plus DIY :

### Option A — Railway (le plus simple, payant ~20€/mois)

1. https://railway.app → "Start a New Project"
2. "Deploy from GitHub repo" → sélectionne ton fork
3. Railway détecte le `docker-compose.yaml` et propose de déployer les 3 services (web, api, worker). Accepte.
4. Pour chaque service, va dans Variables et copie tes valeurs (depuis ton brouillon de l'étape 0)
5. Railway expose 3 URLs publiques. Note l'URL de `api` et l'URL de `web`.
6. Mets à jour `PUBLIC_API_URL` et `PUBLIC_WEB_URL` avec ces URLs réelles, redéploie.

### Option B — Vercel (web) + Railway (api+worker) + Supabase (DB) — meilleure perf, plus complexe

Vercel pour le frontend (zéro config), Railway pour le backend Node, Supabase pour la DB. Plus optimal mais 3 dashboards à gérer. Lis [03-deployer/vercel-railway.md](../03-deployer/vercel-railway.md) (à venir).

### Option C — Coolify sur ton propre VPS (le moins cher, ~6€/mois)

Voir [03-deployer/deployments.md](../03-deployer/deployments.md). Demande de la patience.

## Étape 5 — Configurer Formbricks

1. Crée un compte Formbricks : https://app.formbricks.com (cloud) OU self-host depuis https://github.com/formbricks/formbricks
2. Settings → API Keys → crée une clé avec scope **Manage** sur ton environnement
3. Note l'`environment ID` (URL : `app.formbricks.com/environments/<env-id>/...`)
4. **Pas de webhook à configurer manuellement** : ton instance API exposera `/api/postes/:id/setup-survey` qui crée le survey et le webhook automatiquement.

## Étape 6 — Configurer Resend

1. https://resend.com → Sign up
2. Domains → Add Domain → ajoute ton domaine (ex: `your-domain.example`)
3. Resend te donne 3 records DNS (DKIM, SPF, return-path) à ajouter chez ton registrar (OVH, Cloudflare, Namecheap, Gandi…). Ajoute-les.
4. Attends que les 3 records soient `Verified` (peut prendre 5-30 min).
5. API Keys → Create → note la clé `re_...`

## Étape 7 — Premier login

1. Va sur l'URL `web` que Railway/Vercel t'a donnée
2. Tu vois la page de login : entre ton email
3. Tu reçois un magic link → clique
4. **Premier login** : tu es maintenant authentifié

⚠️ **Tout le monde avec un magic link peut s'inscrire**. Si tu veux restreindre, il faut configurer Supabase Auth → Authentication → Email Whitelist (option Pro). Pour le MVP, tu peux laisser ouvert et juste ne pas partager l'URL.

## Étape 8 — Créer ton premier poste

Dans le dashboard `/postes` :
1. Clique "Nouveau poste"
2. Renseigne titre + description riche
3. Clique "Générer critères avec l'IA" → 4-8 critères apparaissent (modifiables)
4. Clique "Créer"
5. Sur la page détail du poste, clique "Créer le formulaire" → ça génère un Formbricks survey + le webhook

L'URL Formbricks publique apparaît. Partage-la aux candidats.

## Étape 9 — Tester avec un faux candidat

Soumets une candidature toi-même avec un faux CV (PDF lien Drive). Dans 30-60 secondes, la candidature apparaît dans `/candidatures`, scorée. Tu vois le rapport IA. Tu peux éditer le brouillon d'email et l'envoyer.

## Tu es bloqué ?

- Lis [05-operer/runbook-incidents.md](../05-operer/runbook-incidents.md) pour les gotchas connus
- Vérifie les logs Railway/Vercel/Coolify si une étape rate
- Dans Skool/Discord de la communauté, demande de l'aide
