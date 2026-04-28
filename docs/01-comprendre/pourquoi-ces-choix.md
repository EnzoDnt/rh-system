# Pourquoi ces choix techniques

Mini-ADRs (Architectural Decision Records) — pourquoi cette stack et pas une autre. Utile pour décider si tu veux fork & garder, ou fork & remplacer une brique.

## Pourquoi Hono (pas Express, pas Next.js API)

- **Petit, rapide, Web Standards** : `Request`/`Response` natifs, pas de magie. Marche sur Node, Bun, Deno, Cloudflare Workers, Vercel Edge.
- **Middleware composable** : auth, CORS, logger en quelques lignes.
- **Tooling Zod-friendly** : `zValidator` valide body/query/params avant le handler.
- **À considérer si tu remplaces** : Fastify (plus rapide encore mais plus verbose), Bun.serve (plus simple mais lock-in Bun).

## Pourquoi pg-boss (pas Bull/BullMQ, pas SQS)

- **Pas d'infra additionnelle** : utilise le Postgres déjà présent (Supabase). Zéro Redis, zéro service externe.
- **Persistance native** : si le worker crash, les jobs restent en `created` et sont repris au redémarrage.
- **Retry exponentiel** : `retryLimit + retryBackoff` géré par la lib, pas besoin de re-coder.
- **Simple** : 4 lignes pour démarrer, 6 lignes par handler.
- **Limite à connaître** : pg-boss v10+ exige `boss.createQueue(name)` explicite avant `boss.send()` ou `boss.work()`. Si oublié, `send()` retourne `null` silencieusement. (Voir incident historique dans [05-operer/runbook-incidents.md](../05-operer/runbook-incidents.md))

## Pourquoi Supabase (pas Neon + Auth0, pas Clerk + Vercel Postgres)

- **Pack tout-en-un** : Postgres + Auth (magic link) + Storage + Edge Functions + Dashboard.
- **Free tier généreux** : Pro à 25$/mois supporte largement un cabinet de recrutement.
- **Migrations Drizzle marchent direct** : on commit du SQL, on push.
- **À considérer si tu remplaces** : Neon (Postgres serverless, mais pas d'auth) + Clerk (auth premium). Plus cher mais plus moderne.

## Pourquoi Drizzle (pas Prisma, pas raw SQL)

- **TypeScript-first** : le schéma EST du TS (`pgTable("candidatures", { ... })`). Plus de génération de fichiers tiers à committer.
- **Léger** : pas de runtime engine séparé comme Prisma.
- **SQL transparent** : `db.execute(sql\`SELECT ...\`)` quand on veut du raw, sans fight l'ORM.
- **À considérer si tu remplaces** : Kysely (encore plus type-safe mais plus verbose), Prisma (meilleur tooling visuel mais plus lourd).

## Pourquoi Claude Sonnet (pas GPT-4o, pas Mistral Large)

- **Tool use exemplaire** : la fiabilité de `tool_choice: forced` permet d'avoir un score JSON valide ~100% du temps.
- **Prompt caching** : les system prompts longs sont cachés (90% de réduction de coût sur les calls répétés).
- **Bon en français** : le ton des emails et des rapports IA est plus naturel qu'avec GPT-4o (test interne).
- **À considérer si tu remplaces** : GPT-4o (plus rapide), Mistral Large (français natif, moins cher), Llama via Groq (très rapide, gratuit dev).

Le code utilise `@anthropic-ai/sdk` mais l'abstraction passe par 6 prompts en BD (table `prompts`). Tu peux remplacer Anthropic par OpenAI en réécrivant juste `apps/api/src/services/claude.ts` (tout le reste utilise les mêmes Zod schemas).

## Pourquoi Formbricks (pas Tally, pas Typeform, pas formulaire React custom)

- **Self-hostable** (open-source) : tu héberges tes données candidat où tu veux.
- **Webhooks natifs** : `responseFinished` fire un POST sur ton URL en quelques secondes.
- **API d'admin** : tu peux créer des surveys par programmation (`POST /api/v1/management/surveys`) — c'est ce que fait `setup-survey` quand le RH clique "Créer le formulaire".
- **Limites connues** : v3 ne supporte pas la signature HMAC des webhooks → on utilise un token dans l'URL (sécurité par obscurité acceptable pour ce contexte).
- **À considérer si tu remplaces** : Tally (cloud only, plus joli, plus simple), Typeform (cher mais excellent UX), formulaire React custom + Cal.com (plus de contrôle, plus de boulot).

## Pourquoi Resend (pas Postmark, pas SendGrid, pas SES)

- **DX moderne** : SDK TypeScript propre, dashboard simple.
- **Pricing dev-friendly** : 100 emails/jour gratuits, puis ~1$/1000 emails.
- **API simple** : `await resend.emails.send({ ... })` et basta.
- **À considérer** : Postmark (deliverability légendaire, plus cher), SES (le moins cher mais setup plus pénible).

## Pourquoi React + Vite (pas Next.js, pas Remix)

- **Pure SPA suffit** : l'app RH est privée, derrière un login. Pas besoin de SSR / SEO / streaming. Vite build en 2s, Next prendrait 30s.
- **Routing simple via TanStack Router** : type-safe, file-based, gère le refresh.
- **Bundle léger** : ~200KB gzip pour toute l'app.
- **À considérer** : Next.js (si tu veux SSR pour la fiche publique du poste — actuellement servi en HTML statique par l'API), Remix (équivalent à Next, plus modulaire).

## Pourquoi Coolify + Hetzner (pas Vercel + Railway, pas AWS)

- **Coût** : 6€/mois sur Hetzner pour un VPS qui fait tourner web + api + worker + Formbricks + Postgres.
- **Pas de vendor lock-in** : Coolify est open-source. Tu peux migrer où tu veux en 1 docker-compose.
- **Friction** : le setup initial demande 30 min de bidouille (vs 2 clics sur Vercel).
- **À considérer si tu remplaces** : Vercel (web) + Railway/Render (api+worker) + Supabase (DB) — plus simple mais plus cher (~50€/mois).

Voir [03-deployer/matrice-de-choix.md](../03-deployer/matrice-de-choix.md) pour décider.
