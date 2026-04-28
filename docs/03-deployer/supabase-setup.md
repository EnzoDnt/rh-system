# Runbook — Supabase Project Setup (<your-project-name>)

> Audience: ops / backend engineer setting up the production Supabase project from scratch.
> Last updated: 2026-04-26

---

## Project reference

| Field | Value |
|---|---|
| **Project name** | `<your-project-name>` |
| **Region** | `eu-west-3` — AWS Paris |
| **Organization** | ZENITHIA (Pro tier) |
| **Project ref** | `<your-supabase-project-ref>` |
| **Project URL** | https://<your-supabase-project-ref>.supabase.co |
| **Dashboard URL** | https://supabase.com/dashboard/project/<your-supabase-project-ref> |
| **Postgres version** | 17 |
| **Provisioned** | 2026-04-26 |
| **Provisioning method** | Supabase MCP (`create_project`) — no UI step needed |

---

## Credentials — where they live

All secrets are stored in **1Password**, vault **`<Votre Vault Secrets>`**, item **`Supabase — <votre-projet>`**.

| Secret | 1Password field |
|---|---|
| Database password (postgres user) | `db_password` |
| `SUPABASE_URL` | `project_url` |
| `SUPABASE_ANON_KEY` | `anon_key` |
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role_key` |
| `DATABASE_URL` (Transaction pooler) | `database_url` |

**Rule:** never commit any of these values. The `.env` file is git-ignored. The `.env.example` file is the committed template.

---

## Step 1 — Create the Supabase project (already done via MCP, 2026-04-26)

The project was provisioned through the Supabase MCP tool (`create_project`) on 2026-04-26. No UI work was needed. To recreate from scratch (DR scenario):
- Via MCP: `create_project(name=<your-project-name>, region=eu-west-3, organization_id=<your-supabase-org-id>)`.
- Via UI: dashboard → New project → name `<your-project-name>`, region `eu-west-3 (EU West - Paris)`, plan **Pro** (Free tier blocks at 2 active projects per admin).
Wait until status is **Healthy** (~1-2 min), then capture credentials per Step 2.

---

## Step 2 — Capture credentials from the dashboard

### API keys (Settings → API)

Navigate to: **Settings** (gear icon, left sidebar) → **API** on https://supabase.com/dashboard/project/<your-supabase-project-ref>.

| What | Where | Env var | Already known |
|---|---|---|---|
| Project URL | top of API page | `SUPABASE_URL` | `https://<your-supabase-project-ref>.supabase.co` |
| Anon public key (legacy JWT) | "Project API keys" → `anon public` | `SUPABASE_ANON_KEY` | starts `eyJhbGciOi…` (in 1Password) |
| Service role key | "Project API keys" → `service_role secret` (click "Reveal") | `SUPABASE_SERVICE_ROLE_KEY` | grab from dashboard, store in 1Password |

> The service-role key bypasses Row Level Security. Treat it like a root password — never expose it client-side. The Supabase MCP cannot return this key — operator must copy from dashboard once and persist in 1Password + Coolify env.

### Database URL (Settings → Database)

Navigate to: **Settings** → **Database** → **Connection string** tab → select **URI**.

Use the **Transaction pooler** connection string (port **6543**), not the direct connection (port 5432). For this project the pooler shard is `aws-1-eu-west-3` (not `aws-0`):

```
postgres://postgres.<your-supabase-project-ref>:[DB_PASSWORD]@aws-1-eu-west-3.pooler.supabase.com:6543/postgres
```

> **Why `aws-1`** : Supabase poolers are sharded per project across multiple AWS sub-zones in the same region. The dashboard's "Connection string → URI" panel always shows the correct host for this project — copy from there rather than guessing. The direct connection host (`db.<ref>.supabase.co`) is IPv6-only and won't resolve from most local networks; always use the pooler.

`[DB_PASSWORD]` was set when the project was created via MCP — the MCP did not return it. Either:
- **(a)** Reset it: dashboard → Settings → Database → Reset database password → save the new value to 1Password vault `<Votre Vault Secrets>` immediately.
- **(b)** Copy the full URL directly from the dashboard's "Connection string" panel (URL-encoded password is included).

Set the resulting URL as `DATABASE_URL` in `.env` (local) and Coolify env (prod).

> Use the Transaction pooler (port 6543) because Coolify containers are ephemeral and do not hold long-lived connections. The Session pooler (port 5432) is for persistent connections (e.g. Prisma Migrate — use that only during migration scripts).

---

## Step 3 — Write the local .env file

Copy `.env.example` to `.env` at the repo root (it is git-ignored):

```bash
cp .env.example .env
```

Fill in the Supabase block:

```dotenv
# --- Supabase ---
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
DATABASE_URL=postgres://postgres.<project-ref>:<db-password>@aws-0-eu-west-3.pooler.supabase.com:6543/postgres
```

Store a copy of all four values in 1Password (vault: **`<Votre Vault Secrets>`**, item: **`Supabase — <votre-projet>`**) before closing the browser tab — the service-role key is only fully visible once.

---

## Step 4 — Verify connectivity

Install `psql` if missing (macOS):

```bash
brew install libpq && brew link --force libpq
```

Test the connection:

```bash
psql "$DATABASE_URL" -c "SELECT version();"
```

Expected output: a line starting with `PostgreSQL 15` (or higher). If you see a connection error, double-check that the DATABASE_URL uses port **6543** and that the password is URL-encoded (special chars like `@`, `#`, `%` must be percent-encoded).

---

## Accessing the SQL editor

From the Supabase dashboard: **SQL Editor** (left sidebar, `< >` icon).

Use it for:
- Ad-hoc queries during incidents
- Running one-off migration scripts (paste SQL, click Run)
- Inspecting tables (also accessible via **Table Editor**)

Prefer running schema migrations through code (`drizzle-kit push` or migration files) rather than hand-editing via the SQL editor, to keep the schema in version control.

---

## How to rotate the service-role key

> Rotate if the key is leaked, an employee with access leaves, or as a routine security audit.

1. Open the Supabase dashboard → **Settings** → **API**.
2. In the "Project API keys" section, click **Rotate** next to `service_role secret`.
3. Confirm the rotation — Supabase invalidates the old key immediately.
4. Copy the new key.
5. Update **1Password** (vault `<Votre Vault Secrets>`, item `Supabase — <votre-projet>`, field `service_role_key`).
6. Update the secret in **Coolify**:
   - Open the Coolify dashboard → your app → **Environment Variables**.
   - Replace the value of `SUPABASE_SERVICE_ROLE_KEY`.
   - Redeploy the app.
7. Update your local `.env` if you have one.
8. Verify the app is healthy after redeployment (health check endpoint or smoke test).

> The anon key can be rotated the same way. The `DATABASE_URL` password is separate (Supabase → Settings → Database → Reset database password).

---

## Supabase Auth setup (magic link)

This project uses Supabase Auth for RH user login via magic link email. After creating the project:

1. Dashboard → **Authentication** → **Providers** → ensure **Email** is enabled.
2. Dashboard → **Authentication** → **Email Templates** → customize the magic link email if needed.
3. Dashboard → **Authentication** → **URL Configuration**:
   - **Site URL**: `https://rh.your-domain.example`
   - **Redirect URLs**: add `https://rh.your-domain.example/**`

---

## Environment variables summary

| Env var | Source | Used by |
|---|---|---|
| `SUPABASE_URL` | Settings → API → Project URL | API server, frontend |
| `SUPABASE_ANON_KEY` | Settings → API → anon public | Frontend (Auth client) |
| `SUPABASE_SERVICE_ROLE_KEY` | Settings → API → service_role | API server only (never frontend) |
| `DATABASE_URL` | Settings → Database → URI (port 6543) | API server, migration scripts |

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `psql: FATAL: password authentication failed` | Wrong password or URL-encoding issue | Re-copy DATABASE_URL from dashboard; URL-encode special chars |
| `psql: could not connect to server` | Wrong port or network | Ensure port is 6543 (pooler), not 5432 |
| `JWT expired` or 401 from Supabase API | Anon/service key mismatch | Verify SUPABASE_URL and key belong to the same project |
| `new row violates row-level security` | Using anon key server-side | Switch to service-role key on the server |
| Project shows "Paused" in dashboard | Free-tier inactivity pause | Click "Restore" in the dashboard; upgrade to Pro to prevent |
