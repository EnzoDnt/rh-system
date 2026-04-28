# Deployments

All 3 services deploy together via Coolify on every push to `main`. There's no per-service workflow because they share build context (workspace).

## Pre-deploy checklist (manual)

1. CI green on the branch you're about to merge.
2. `pnpm --filter @rh/db migrate` already applied to Supabase if the PR includes new migrations.
3. `git status` clean.

## Post-deploy verification

    curl https://api.your-domain.example/api/health     # → {"ok":true}
    open https://rh.your-domain.example                 # → login page
    # Worker: Coolify logs should show "✓ pg-boss started, ✓ handlers registered"

## Rollback to previous deploy

Coolify UI → service → Deployments → previous green deploy → Redeploy. Takes ~30s.
