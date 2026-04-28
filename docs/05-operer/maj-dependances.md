# Mise à jour des dépendances

## Stratégie globale

Pas de mise à jour aveugle. Pour chaque montée de version :
1. Lire le changelog
2. Regarder les breaking changes
3. Tester en local avant de pousser

## Mises à jour typiques

### Anthropic SDK + modèles Claude

Anthropic publie de nouveaux modèles fréquemment (Sonnet 4.6 → 4.7 → 4.8…). Pour upgrader :

1. Update `@anthropic-ai/sdk` : `pnpm up @anthropic-ai/sdk -r --latest`
2. Update les `model` en BD via le dashboard `/prompts` (un par un, vérifie le résultat sur une candidature test avant)
3. Update les prix dans `apps/api/src/lib/anthropic-cost.ts` (`USD_PER_MTOK`)
4. Lance les tests : `pnpm test`

### pg-boss

⚠️ **Source d'incidents historiques.** Lis impérativement le [migration guide](https://github.com/timgit/pg-boss/blob/master/docs/migration.md) avant.

Bugs déjà rencontrés :
- v9 → v10 : `createQueue` devient explicite. Sinon `send()` retourne null silencieusement.
- v10 : suppression de l'event `failed.<queueName>` → le code utilise désormais try/catch + notify dans chaque handler.

Si tu upgrades : applique les changements pattern par pattern, un handler à la fois, teste à chaque étape.

### Drizzle ORM

Globalement smooth, mais parfois des changements dans la signature de `db.execute` ou des helpers. Test plan :

```bash
pnpm up drizzle-orm -r --latest
pnpm typecheck   # détecte 90% des breaks
pnpm test
```

Si tu changes le schema : `pnpm db:generate` puis applique la migration générée en SQL.

### React + Vite + TanStack Router

3 paquets liés. Update ensemble :
```bash
pnpm up react react-dom vite @tanstack/react-router @tanstack/react-query --filter @rh/web --latest
pnpm --filter @rh/web build
pnpm --filter @rh/web typecheck
```

Vérifie que le routing marche (login, postes, candidatures, prompts).

### Supabase (auth + DB)

Tu n'as quasiment rien à upgrader côté code (Supabase est un service). Quand Supabase rolled out une nouvelle version Postgres (15 → 16 → 17), tu peux upgrader via le dashboard. Test plan : restore un backup dans un projet de test, vérifie que les RLS policies marchent.

### Hono + middleware

```bash
pnpm up hono @hono/zod-validator -r --latest
```

Hono est très stable mais regarde les breaking changes des middlewares (CORS, jwt) à chaque major version.

## Migrations de schéma DB

Quand tu modifies le schéma Drizzle :
1. `pnpm db:generate` → crée un nouveau fichier `packages/db/migrations/00XX_*.sql`
2. **Vérifie le SQL généré** (parfois Drizzle fait des trucs surprenants : `DROP COLUMN` au lieu de `ALTER COLUMN`)
3. Applique en local : `pnpm db:migrate`
4. Commit la migration ET le schéma TS dans le même commit
5. Déploie l'app — la migration sera appliquée au prochain démarrage
6. **Vérifie en prod** que la migration s'est bien appliquée : `\dt` dans psql

Pour les migrations Supabase : applique via le SQL Editor du dashboard ou via `supabase db push` si tu utilises la CLI.

## Mises à jour de sécurité

Dependabot (GitHub) crée automatiquement des PRs pour les CVE. Stratégie :
- Patch (x.y.Z) : merge sans réfléchir si CI vert
- Minor (x.Y.z) : lis le changelog rapidement
- Major (X.y.z) : voir paragraphes spécifiques ci-dessus

## Quand ne PAS upgrader

- Si tu pars en vacances dans 3 jours : ne touche à rien de risqué
- Si la version actuelle marche et que la nouvelle apporte 0 valeur business : laisse
- Si tu n'as pas le temps de tester en prod après : reporte
