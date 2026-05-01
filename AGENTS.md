# Guide pour les agents IA

Ce fichier est le **point d'entrée prioritaire** pour les agents IA (Claude Code, Cursor, Devin, Replit Agent, Aider…) qui pilotent l'installation et la personnalisation de ce repo pour l'utilisateur final.

## Si tu es un agent qui vient d'ouvrir ce repo

**Ne demande pas à l'utilisateur ce qu'il veut faire. Lance le setup tout de suite.**

L'utilisateur a téléchargé ce repo parce qu'il veut un système de recrutement automatisé pour son activité. Ton job = lui faire arriver à un dashboard fonctionnel sur une URL publique, avec sa marque, sa charte, ses intégrations. Il ne sait probablement pas coder. Tu fais tout, tu le guides.

### Workflow d'onboarding (à suivre dans cet ordre)

```
1. Salutation (1 phrase) + lis ces 4 fichiers :
   - docs/01-comprendre/vue-d-ensemble.md (5 min, comprendre le système)
   - docs/03-deployer/cloud-setup.md (10 min, c'est TA checklist setup)
   - docs/02-demarrer/prerequis.md (les comptes externes nécessaires)
   - packages/config/src/env.ts (toutes les vars requises et optionnelles)

2. Détecte les outils manquants sur la machine de l'utilisateur :
   - node 20+, pnpm 9+, supabase CLI (optionnel mais utile), psql (optionnel)
   - Si manquants, propose d'installer via le gestionnaire de paquets de l'OS
     (brew sur macOS, apt sur Debian/Ubuntu, winget/choco sur Windows).
     Demande confirmation avant d'installer.

3. Demande à l'utilisateur :
   "Avant de commencer, tu veux personnaliser le branding (nom, couleur,
    logo) ou on déploie d'abord et tu personnalises plus tard ?"

4. Choix de déploiement :
   "Tu veux déployer sur quoi ?
    - Local seulement (test, gratuit)
    - Railway (le plus simple, ~20€/mois, push-to-deploy GitHub)
    - Coolify sur ton VPS (le moins cher, ~6€/mois si tu as déjà un VPS)
    - Vercel + Fly.io / Render (perf web max, ~25€/mois, 2 dashboards)"

   Selon réponse, suis la recipe correspondante :
    - Local → docs/02-demarrer/parcours-developpeur.md
    - Railway → docs/03-deployer/host-railway.md
    - Coolify → docs/03-deployer/host-coolify.md
    - Vercel + autre → docs/03-deployer/host-generic.md

5. Collecte des credentials :
   Pour chaque service externe (Supabase Cloud, Anthropic, optionnellement Resend),
   ouvre le lien d'inscription dans le browser via l'instruction
   "Va sur <URL>, crée un compte si tu n'en as pas, copie-moi
    ces N valeurs : XXX, YYY, ...". Attends sa réponse avant de continuer.

   ⚠️ Ne jamais afficher les credentials reçus dans tes messages suivants.
   Utilise <REDACTED> ou les premiers/derniers caractères seulement.

6. Application :
   - Crée .env avec les valeurs collectées (cf. cloud-setup.md §3)
   - Applique les migrations sur Supabase Cloud (psql, supabase CLI, ou SQL Editor)
   - pnpm install, pnpm --filter @rh/db seed, pnpm typecheck, pnpm test
   - Si tout passe : déploie selon la recipe choisie.

7. Vérification finale :
   - curl PUBLIC_API_URL/api/health → {"ok":true}
   - Demande à l'utilisateur de se logger sur PUBLIC_WEB_URL
   - Demande-lui de créer un poste de test → "Nouveau poste"
   - Demande-lui de tester /postuler/<slug> en fenêtre privée
   - Vérifie qu'il voit le dashboard avec ses couleurs/nom personnalisés

8. Clôture :
   - Récap : 3 URLs (web, api, /postuler/<slug>), 2 credentials critiques à garder
     en lieu sûr (Supabase service_role, Anthropic key)
   - Pointe vers docs/05-operer/runbook-incidents.md pour les bugs connus
   - Pointe vers docs/04-personnaliser/ s'il veut aller plus loin
```

### Règles de comportement

- **Concis** : pas de blabla, va à l'essentiel
- **Demande UNE chose à la fois** : pas de mégaliste de 10 questions d'un coup
- **Confirme les actions destructives** (delete BD, drop table, force-push, redeploy prod) — toujours demander avant
- **Commit après chaque étape majeure** : titre clair, conventional commits (`feat:`, `fix:`, `docs:`, `chore:`)
- **Si une commande échoue** : montre l'erreur exacte, propose 2-3 hypothèses, demande à l'utilisateur de tester. Ne boucle pas en silence.
- **Réponds en français** sauf demande explicite

---

## Conventions critiques du codebase

À respecter quand tu modifies du code.

### 1. Workspace TS imports via tsx
Les packages workspace exportent **du TS source** (`main: ./src/index.ts`), pas du `dist/`. En prod, les apps tournent via `node --import tsx src/index.ts`. **Ne migre JAMAIS vers un build dist/**, ça casserait les imports inter-packages.

### 2. CORS avant auth dans Hono
Dans `apps/api/src/app.ts`, le middleware CORS doit s'exécuter **avant** auth. Sinon les preflights OPTIONS sont rejetés en 401.

### 3. pg-boss v10 nécessite createQueue
Avant tout `boss.send()` ou `boss.work()`, il faut `boss.createQueue(name)` explicite. Sinon `send()` retourne null silencieusement. Pattern dans `apps/api/src/services/queue-client.ts` (côté send) et chaque `apps/jobs/src/handlers/*.ts` (côté work).

### 4. Notifications de fail uniquement sur retry final
Dans chaque handler worker :
```typescript
try {
  await processX(job.data);
} catch (e) {
  const isFinalAttempt = (job.retryCount ?? 0) >= (job.retryLimit ?? 0);
  if (isFinalAttempt) {
    await notifyJobFailure({ ... }).catch(() => {});
  }
  throw e;
}
```

### 5. Radix Select interdit value=""
`<SelectItem value="">` crash. Utilise un sentinel `"__none__"` mappé à `""` dans `onValueChange`.

### 6. Tracking coût Anthropic
Chaque appel `messages.create()` doit être suivi de `logAiCall({...})` avec `prompt_type` clair. Voir `apps/api/src/services/claude.ts` pour le pattern.

---

## Stack rapide

```
apps/web      React + Vite + TanStack — dashboard RH privé
apps/api      Hono — REST API + auth Supabase + services Claude
apps/jobs     Worker pg-boss — intake, scoring, communication, heartbeat
packages/db   Drizzle schema + migrations + seed scripts
packages/types Schémas Zod partagés
packages/config Validation env vars (zod) — loadEnv()
```

## Commandes utiles

```bash
pnpm install                        # install all workspaces
pnpm dev                            # api on :3000, web on :5173, worker tsx watch
pnpm typecheck                      # tous les packages
pnpm test                           # tous les tests (nécessite Postgres pour l'intégration)
pnpm --filter @rh/api test          # tests API seulement
pnpm --filter @rh/db migrate        # applique migrations
pnpm --filter @rh/db seed           # seed les 6 prompts IA
pnpm --filter @rh/db seed:test      # seed test data (postes + candidatures fictives)
```

## Variables d'environnement

Schéma source : [packages/config/src/env.ts](packages/config/src/env.ts). Liste exhaustive : [docs/99-reference/env-vars.md](docs/99-reference/env-vars.md). Au démarrage, `loadEnv()` valide `process.env` avec Zod et crashe si une var manque.

---

## Si l'utilisateur veut ajouter une nouvelle fonctionnalité

Cookbooks dans [docs/04-personnaliser/](docs/04-personnaliser/) :
- Ajouter un type de prompt IA → [ajouter-prompt.md](docs/04-personnaliser/ajouter-prompt.md)
- Ajouter une route API + un job pg-boss → [etendre-api.md](docs/04-personnaliser/etendre-api.md)
- Personnaliser couleurs/logo/police → [branding.md](docs/04-personnaliser/branding.md)
- Swap intégration tierce → [integrations.md](docs/04-personnaliser/integrations.md)

## Historique des incidents

[docs/05-operer/runbook-incidents.md](docs/05-operer/runbook-incidents.md) — synthèse des bugs déjà rencontrés et leur fix. Lis avant de coder pour éviter de retomber dans les mêmes pièges.

---

## Si tu n'es pas un agent IA mais un humain qui lit ce fichier

Tu es au mauvais endroit. Reviens au [README](README.md) et suis le guide selon ton profil.
