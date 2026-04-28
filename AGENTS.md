# Guide pour les agents IA

Ce fichier est destiné aux agents IA (Claude Code, Cursor, Aider, Devin, Replit Agent, etc.) qui travaillent sur ce repo. Lis-le **avant** de toucher au code.

## Vue rapide

Système de recrutement automatisé en français. Stack : pnpm monorepo, TypeScript strict partout. 3 apps + 3 packages.

```
apps/web      React + Vite + TanStack — dashboard RH privé
apps/api      Hono — REST API + auth Supabase + services Claude
apps/jobs     Worker pg-boss — intake, scoring, communication, heartbeat
packages/db   Drizzle schema + migrations + seed scripts
packages/types Schémas Zod partagés (postes, candidatures, scores, etc.)
packages/config Validation env vars (zod) — loadEnv()
```

## Conventions critiques

### 1. Workspace TS imports via tsx
Les packages workspace exportent **du TS source** (`main: ./src/index.ts`), pas du `dist/`. En prod, les apps tournent via `node --import tsx src/index.ts`. **Ne migre JAMAIS vers un build dist/**, ça casserait les imports inter-packages.

### 2. CORS avant auth dans Hono
Dans `apps/api/src/app.ts`, le middleware CORS doit s'exécuter **avant** auth. Sinon les preflights OPTIONS sont rejetés en 401 (le navigateur n'envoie pas l'Authorization sur OPTIONS).

### 3. pg-boss v10 nécessite createQueue
Avant tout `boss.send()` ou `boss.work()`, il faut `boss.createQueue(name)` explicite. Si tu en oublies un, `send()` retourne **null silencieusement**. Pattern dans `apps/api/src/services/queue-client.ts` (côté send) et chaque `apps/jobs/src/handlers/*.ts` (côté work). Le seul handler qui le fait correctement nativement est `heartbeat.ts` — copie ce pattern.

### 4. Notifications de fail uniquement sur retry final
Dans chaque handler worker, le pattern est :
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
Sinon ntfy spam 3 alertes par job (1 par retry).

### 5. Webhook Formbricks signé via query-param
Formbricks self-hosted ne supporte pas HMAC. La signature passe par `?token=<FORMBRICKS_WEBHOOK_SECRET>` dans l'URL du webhook. Le code de `setup-survey` bake automatiquement le token. Si tu modifies un webhook à la main, n'oublie pas le `?token=`.

### 6. Radix Select interdit value=""
`<SelectItem value="">` crash. Utilise un sentinel `"__none__"` mappé à `""` dans `onValueChange`. Pattern dans `apps/web/src/components/postes/PosteEditor.tsx`.

### 7. Tracking coût Anthropic
Chaque appel `messages.create()` doit être suivi de `logAiCall({...})` avec `prompt_type` clair. Voir `apps/api/src/services/claude.ts` pour le pattern. Pricing dans `apps/api/src/lib/anthropic-cost.ts`.

## Commandes utiles

```bash
pnpm install                        # install all workspaces
pnpm dev                            # api on :3000, web on :5173, worker tsx watch
pnpm typecheck                      # tous les packages
pnpm test                           # tous les tests
pnpm --filter @rh/api test          # tests API seulement
pnpm --filter @rh/db migrate        # applique migrations
pnpm --filter @rh/db seed           # seed les 6 prompts IA
pnpm --filter @rh/db seed:test      # seed test data (postes + candidatures fictives)
```

## Workflow de dev

1. **Toujours lire la doc avant** : [docs/01-comprendre/architecture.md](docs/01-comprendre/architecture.md), [docs/05-operer/runbook-incidents.md](docs/05-operer/runbook-incidents.md)
2. **TDD light** : pour un nouveau handler ou route, écris le test en premier (`apps/api/tests/...`), puis le code
3. **Petits commits** : 1 PR = 1 changement logique. Évite les méga-PRs
4. **Conventional commits** : `feat:`, `fix:`, `chore:`, `docs:`, `build:`, `debug:`. Voir l'historique git.
5. **CI obligatoire** : `.github/workflows/ci.yml` lance typecheck + tests + build sur chaque PR. Si rouge, ne merge pas.

## Ce qu'il NE faut PAS toucher sans réflexion

- `apps/api/src/services/claude.ts` : 6 sites d'appel Anthropic + tracking coût. Si tu changes la signature de `messages.create()`, vérifie tous les call sites.
- `apps/jobs/src/handlers/*.ts` : pattern try/catch + retryCount strictement à respecter
- `packages/db/migrations/*.sql` : ne renomme jamais une migration, ne modifie pas une migration appliquée. Crée une nouvelle.
- Les **prompts en BD** : la table `prompts` est éditée via le dashboard `/prompts`. NE FAIT PAS d'`UPDATE prompts SET ...` direct sans passer par l'historique (sinon perte de versioning).

## Comment ajouter une nouvelle fonctionnalité

Cookbook dans [docs/04-personnaliser/](docs/04-personnaliser/) :
- Ajouter un type de prompt IA → [ajouter-prompt.md](docs/04-personnaliser/ajouter-prompt.md)
- Ajouter une route API + un job pg-boss → [etendre-api.md](docs/04-personnaliser/etendre-api.md)
- Personnaliser couleurs/logo/police → [branding.md](docs/04-personnaliser/branding.md)
- Swap intégration tierce → [integrations.md](docs/04-personnaliser/integrations.md)

## Variables d'environnement

Schéma source : [packages/config/src/env.ts](packages/config/src/env.ts). Liste exhaustive : [docs/99-reference/env-vars.md](docs/99-reference/env-vars.md).

Au démarrage, `loadEnv()` valide `process.env` avec Zod. Si une var manque, l'app crashe avec un message explicite. Donc **ne pas mettre de fallback magique** — préfère une erreur claire au boot qu'un comportement bizarre en runtime.

## Pour aider l'utilisateur à déployer

Lis [docs/02-demarrer/parcours-avec-agent-ia.md](docs/02-demarrer/parcours-avec-agent-ia.md) — c'est précisément le brief utilisateur que tu vas recevoir, avec le workflow attendu (étape par étape, valider à chaque étape, demander les credentials sans les exposer dans tes messages).

## Historique des incidents

[docs/05-operer/runbook-incidents.md](docs/05-operer/runbook-incidents.md) — synthèse des bugs déjà rencontrés et leur fix. Lis avant de coder pour éviter de retomber dans les mêmes pièges.

## Conventions de réponse à l'utilisateur

- **Concis** : pas de blabla. Aller à l'essentiel.
- **Action over plan** : si tu es en autonomie, exécute. Ne demande pas la permission pour des opérations triviales.
- **Confirme avant destructif** : delete BD, drop table, force-push, déploiement prod → toujours confirmer.
- **Réponds en français** sauf si l'utilisateur demande explicitement une autre langue. Le projet est francophone.

## Notes pour les agents en autonomie longue (Devin, Replit, etc.)

- Vérifie `git status` à chaque cycle pour ne pas perdre les changements
- N'écris **jamais** ton secret dans un commit (utilise `.env`, gitignored)
- Si tu déploies, donne à l'utilisateur les URLs finales + comment se logger
- Si tu blocks, retourne le contexte exact (logs, hypothèses) plutôt que de boucler

Bonne adaptation 👋
