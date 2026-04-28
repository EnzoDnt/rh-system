# Local development

## Prerequisites

- Node 20.11+ (`nvm use`)
- pnpm 9+
- The shared Supabase project `<your-project-name>` (ref `<your-supabase-project-ref>`, eu-west-3) — already provisioned and seeded; see `docs/runbooks/supabase-setup.md`
- A `.env` at repo root (copy from `.env.example` and fill — `DATABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` come from the dashboard, see runbook Step 2)

## First-time setup

    pnpm install

The Supabase DB is already populated by the bootstrap (6 prompts + 4 postes × 5 candidatures + scores + comms + 1 flagged). Run the DB scripts only when you change the schema or want to re-seed locally:

    pnpm --filter @rh/db migrate     # idempotent — tracks applied files in schema_migrations
    pnpm --filter @rh/db seed         # upserts the 6 prompts (safe to re-run)
    pnpm --filter @rh/db seed:test    # wipes Test Candidat * fixtures and re-seeds 4×5
    pnpm --filter @rh/db verify       # row counts + FK orphan check

## Running tests

    pnpm test                 # all packages
    pnpm --filter @rh/db test # schema round-trip + seed-prompts (needs DATABASE_URL)

## Common scripts

- `pnpm db:generate` — regenerate Drizzle SQL after editing `packages/db/src/schema.ts`
- `pnpm db:migrate` — apply pending migrations to `DATABASE_URL`
- `pnpm db:seed` — upsert the 6 IA prompts
- `pnpm db:verify` — count rows + check FK orphans

## Where the data lives

- DB rows: queryable via the Supabase dashboard SQL editor or via `psql "$DATABASE_URL"` once `.env` is filled.
- Read-only verification (no env needed) goes through the Supabase MCP `execute_sql` tool — useful from a Claude session for ad-hoc checks.

## Running the worker locally

    pnpm --filter @rh/jobs dev

The worker connects to the same Postgres as the API (the `DATABASE_URL` from `.env`).
First run provisions the `pgboss` schema automatically.

The API gates `enqueue*()` calls on the database connection. Without a worker
running, jobs queue up — useful for developing the API surface alone.

Stop with Ctrl-C; pg-boss exits gracefully (logs `→ SIGINT — stopping pg-boss…`).
