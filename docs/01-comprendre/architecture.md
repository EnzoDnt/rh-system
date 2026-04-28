# 00 — Vue d'ensemble : migration du micro-logiciel Recrutement hors Windmill

> **Audience** : équipes techniques chargées de la migration.
> **Ce dossier** : 9 documents Markdown numérotés, à lire dans l'ordre. Chaque document est self-contained, mais référence systématiquement les fichiers sources Windmill.

---

## 1. Contexte

<Votre Entreprise> est un cabinet de conseil. Le micro-logiciel RH actuel automatise un pipeline de recrutement de bout en bout :

```
Candidat remplit un formulaire Formbricks
    ↓ webhook
Extraction CV PDF + scraping LinkedIn (optionnel)
    ↓
Guardrails IA (détection injection prompt)
    ↓
Scoring multi-critères Claude (rapport + recommandation)
    ↓
Génération brouillon d'email Claude
    ↓
RH valide / édite dans l'app
    ↓
Envoi Gmail + lien Calendly (si invitation)
```

Le tout repose aujourd'hui sur **Windmill** (instance `zhost-1`), avec :
- 1 raw app React (5 onglets) hébergée sur Windmill
- 25 backends TypeScript appelés par le frontend
- 3 flows asynchrones (intake, scoring, communication)
- ~14 scripts utilitaires
- 3 HTTP triggers publics (webhook Formbricks, fiches de poste publiques en HTML, page de test)
- 1 schedule horaire (notification d'erreurs via ntfy)
- 1 datatable PostgreSQL interne `project_rh` avec 6 tables

**Volume cible** : ~5-10 postes/an, ~50-200 candidatures/an. Charge faible mais valeur métier élevée.

## 2. Pourquoi migrer

- **Couplage fort à Windmill** : toute la persistance, l'auth implicite, l'orchestration, les triggers et la BD vivent dans l'environnement Windmill. Difficulté à versionner, déployer, monitorer hors de l'UI Windmill.
- **Limitations identifiées** (cf. mémoire projet) :
  - Cast JSONB impossible sur paramètres bindés → workaround systématique INSERT vide + UPDATE via CTE
  - Inline scripts de flows (`*.inline_script.ts`) qui pointent vers des `.bun.ts` non résolus localement
  - Lock files fragiles (dépendances qui sautent)
  - Pattern HTML serving non standard (`windmill_content_type` + `result`)
- **Évolutivité** : ajout de nouvelles features (gestion des prompts IA, fiches publiques, etc.) coûte de plus en plus cher en bricolage.
- **Souveraineté** : repasser sur du standard (Postgres, React, Node, queue managée) facilite l'embarquement de nouveaux développeurs.

## 3. Périmètre de la migration

**Tout migrer hors Windmill**, sans régression fonctionnelle :

| Couche actuelle | Composants | Fichiers source |
|---|---|---|
| Frontend | App React 5 onglets | [f/rh/app.raw_app/App.tsx](../../f/rh/app.raw_app/App.tsx), [index.css](../../f/rh/app.raw_app/index.css) |
| Backend API | 25 backends CRUD/IA | [f/rh/app.raw_app/backend/](../../f/rh/app.raw_app/backend/) |
| Jobs async | 3 flows | [intake.flow](../../f/rh/intake.flow/), [scoring.flow](../../f/rh/scoring.flow/), [communication.flow](../../f/rh/communication.flow/) |
| Scripts utilitaires | 14 scripts | extract_pdf, scrape_linkedin, guardrails, scoring, email, gmail, formbricks, calendly, etc. |
| Webhook public | Formbricks intake | [formbricks_webhook.http_trigger.yaml](../../f/rh/formbricks_webhook.http_trigger.yaml) |
| HTML public | Fiches de poste | [serve_fiche_poste.bun.ts](../../f/rh/serve_fiche_poste.bun.ts) + [trigger](../../f/rh/serve_fiche_poste.http_trigger.yaml) |
| Schedule | Monitoring d'erreurs | [notify_errors.ts](../../f/rh/notify_errors.ts) + [schedule](../../f/rh/notify_errors.schedule.yaml) |
| BD | 6 tables Postgres | datatable interne `project_rh` |
| Secrets | Resources & variables | `fond_anthropic`, `avid_gmail`, `issue_free_calendly`, `foolproof_apify_api_key`, `crisper_formbricks` |

## 4. Architecture cible — recommandation assumée

> Tu hésites entre **Python FastAPI** et **Node/Bun TypeScript** pour le backend.
> **Ma recommandation : Stack A (Bun + TS end-to-end)**. Détaillée ci-dessous, avec Stack B en alternative.

### Stack A — Bun + TypeScript end-to-end (recommandée)

```
┌───────────────────────┐
│ Frontend SPA (Vite)   │ React 19 + TypeScript + Tailwind + shadcn/ui
│   apps/web            │ TanStack Query + React Router 7 + Supabase Auth
└───────────┬───────────┘
            │ fetch /api/*
            ▼
┌───────────────────────┐
│ API Bun + Hono        │ Routes REST → Drizzle ORM → Supabase Postgres
│   apps/api            │ Zod pour validation, JWT Supabase pour auth
└─────┬─────────────┬───┘
      │             │
      │             └─→ Supabase Storage (CV PDF si auto-upload)
      ▼
┌───────────────────────┐
│ Trigger.dev v4 tasks  │ 3 tasks principaux (intake/scoring/communication)
│   apps/jobs           │ + 1 cron (notify_errors)
└─────┬─────────────────┘
      │
      ▼
┌───────────────────────┐
│ Supabase Postgres     │ 6 tables (postes, candidatures, scores,
│                       │ communications, prompts, prompts_history)
└───────────────────────┘

Webhooks publics : Hono routes
  POST /webhooks/formbricks   → trigger task intake
  GET  /fiches/:id            → sert HTML stocké en BD
```

| Couche | Choix | Raison |
|---|---|---|
| Frontend | **Vite + React 19 + TS + Tailwind + shadcn/ui** | Standard moderne, App.tsx actuel transposable presque tel quel (React 19 déjà utilisé) |
| State serveur | **TanStack Query** | Cache, refetch, mutations, optimistic updates |
| State UI global | **Zustand** (léger) | Toast notifications, modals globales |
| Routing | **React Router v7** | SPA standard |
| Auth | **Supabase Auth** | Email/password ou magic link, JWT bearer dans tous les `/api/*` |
| Backend API | **Bun + Hono + Zod + Drizzle ORM** | Cohérence TS, portage 1:1 des 25 backends actuels (déjà en TS), Hono = perf + DX, Drizzle = JSONB natif |
| BD | **Supabase Postgres (cloud)** | Postgres managé, gratuit jusqu'à 500MB, RLS si besoin, dashboard SQL |
| Storage | **Supabase Storage** | Pour uploader les CV PDF si on remplace les liens Drive externes |
| Jobs async | **Trigger.dev v4** | Conçu pour ce type de pipeline IA, déjà dans ton écosystème, retry/dashboard/logs natifs |
| Schedules | **Trigger.dev cron** | Remplace la schedule Windmill `notify_errors` |
| Webhooks publics | **Routes Hono** (`/webhooks/formbricks`) | Pas d'auth, parsing JSON natif |
| HTML public | **Route Hono** (`/fiches/:id`) | Sert le `fiche_html` stocké en BD avec `Content-Type: text/html` natif |
| Secrets | **Doppler / Infisical / Supabase Vault** | Centralisation, rotation possible |
| Hébergement | **Vercel/Fly.io/Railway** (frontend + API) + **Trigger.dev cloud** (jobs) + **Supabase cloud** (BD) | Stack 100% serverless ou semi-serverless, peu d'ops |
| Monorepo | **Turborepo** ou **pnpm workspaces** | `apps/web`, `apps/api`, `apps/jobs`, `packages/db`, `packages/types` |

### Stack B — Python FastAPI (alternative)

| Couche | Choix | Trade-off |
|---|---|---|
| Backend | **FastAPI + Pydantic v2 + SQLModel/SQLAlchemy + Alembic** | Plus naturel pour les équipes Python ; Pydantic = validation top niveau ; mais oblige à **réécrire** les 25 backends TS (logique 1-to-1) et les scripts (extract_pdf, scrape_linkedin, guardrails, etc.) en Python |
| Jobs async | **Inngest (Python SDK)** ou **Celery + Redis** ou **Trigger.dev Python SDK (beta)** | Inngest plus moderne, dashboard équivalent à Trigger.dev |
| ORM | SQLModel ou SQLAlchemy 2.0 | JSONB OK avec `JSONB` type |
| Auth | Supabase Auth via JWT côté API (`python-jose`) | Identique à Stack A |
| Reste | Identique : Vite/React/Tailwind/shadcn, Supabase Postgres, Supabase Storage | — |

**Quand choisir Stack B** :
- L'équipe est 100 % Python et n'a pas envie de monter en compétences TS/Bun.
- Tu prévois d'ajouter beaucoup d'outils data/ML/IA Python connexes (notebooks, LangGraph, embeddings sklearn, etc.).
- Tu veux une stack identique à d'autres projets internes en FastAPI.

**Quand choisir Stack A** :
- Tu veux le portage le plus rapide (les 25 backends et scripts sont déjà en TS).
- Tu veux profiter de l'orchestration Trigger.dev native TS (déjà dans ton écosystème MCP).
- Tu veux une cohérence frontend ↔ backend (mêmes types Zod partagés via `packages/types`).

**Mon avis** : Stack A est nettement plus rapide à livrer pour ce projet précis. Migration estimée 2-3× plus courte. Stack B reste valide si l'équipe a une forte préférence Python.

## 5. Inventaire des composants à migrer (checklist)

### Frontend (1 app React, 5 onglets)
- [ ] Onglet Postes : liste + détail + création + édition + génération fiche HTML + génération formulaire Formbricks
- [ ] Onglet Candidatures : vue cartes/table + filtres statut + détail complet (scoring, comm, notes RH, formulaire, CV, LinkedIn)
- [ ] Onglet Communications : liste filtrable + détail brouillons → envoyés
- [ ] Onglet Analytics : KPI overview + distribution scores + tableau par poste
- [ ] Onglet Prompts IA : liste + édition + versioning + restauration
- [ ] Toast notifications, ErrorBoundary, mode "masquer dates"
- [ ] Design system Lora/Inter/marron/ambre/doré (cf. [07-design-system.md](07-design-system.md))

### Backend API (~30 endpoints)
Cf. [02-api-contracts.md](02-api-contracts.md) pour la liste détaillée.

### Jobs asynchrones
- [ ] Task `intake` (déclenchée par webhook Formbricks)
- [ ] Task `scoring` (déclenchée par intake ou bouton "Re-scorer")
- [ ] Task `communication` (déclenchée par bouton "Valider et envoyer")
- [ ] Cron `notify_errors` (chaque heure, monitoring)

### Endpoints publics (sans auth)
- [ ] `POST /webhooks/formbricks` (réception payload Formbricks)
- [ ] `GET /fiches/:id` (sert le HTML d'une fiche de poste publique)

### Données
- [ ] Schéma : 6 tables Postgres (cf. [01-data-model.md](01-data-model.md))
- [ ] Migration des données existantes depuis le datatable Windmill `project_rh` (`pg_dump` + `pg_restore`)
- [ ] Seed des 6 prompts IA (5 issus de [apply_migration.ts](../../f/rh/app.raw_app/backend/apply_migration.ts) + 1 de [insert_prompt_fiche.bun.ts](../../f/rh/insert_prompt_fiche.bun.ts))

### Secrets à transférer
- [ ] Anthropic API key (Claude)
- [ ] Gmail OAuth token (ou bascule vers Resend)
- [ ] Calendly token
- [ ] Apify API key
- [ ] Formbricks API key + base URL + environment ID

### Intégrations à reconnecter
- [ ] Reconfigurer Formbricks pour pointer le webhook vers la nouvelle URL
- [ ] (Optionnel) Migrer DNS pour les fiches publiques `https://your-domain.example/fiches/:id`

## 6. Roadmap suggérée (ordre d'exécution)

```
Phase 0 — Setup infra (1-2j)
    Supabase project, repo monorepo, CI/CD, secrets manager
        ↓
Phase 1 — Schéma BD + migration data (1-2j)
    DDL Postgres, pg_dump des 6 tables Windmill, import Supabase
        ↓
Phase 2 — Backend API REST (5-8j)
    Les ~30 endpoints, tests d'intégration sur fixtures, seed prompts IA
        ↓
Phase 3 — Frontend SPA (5-8j)
    Vite + auth + 5 onglets + design system, branchement à l'API
        ↓
Phase 4 — Trigger.dev tasks (3-5j)
    3 tasks (intake/scoring/communication) + 1 cron (notify_errors)
        ↓
Phase 5 — Webhook Formbricks public (1j)
    Reconfiguration côté Formbricks → nouvelle URL
        ↓
Phase 6 — Routes publiques fiches (1j)
    Endpoint HTML, redirection DNS éventuelle
        ↓
Phase 7 — Bascule production (1-2j)
    Smoke tests, monitoring, plan de rollback
```

**Estimation totale** : 17-29 jours-homme pour la stack A, soit ~1 mois en équipe de 2 développeurs senior. Stack B : ajouter ~30-50% pour la réécriture TS → Python.

Cf. [08-migration-plan.md](08-migration-plan.md) pour la version détaillée.

## 7. Plan de lecture des documents

| # | Doc | Pour qui | Quand |
|---|---|---|---|
| 00 | overview.md | Tout le monde | À lire en premier |
| 01 | data-model.md | Backend + DBA | Avant Phase 1 |
| 02 | api-contracts.md | Backend + Frontend | Avant Phase 2 et 3 |
| 03 | flows-jobs.md | Backend + Ops | Avant Phase 4 |
| 04 | prompts-ia.md | Backend + Product | Avant Phase 2 (seed) |
| 05 | integrations.md | Backend + Ops | Avant Phase 4 et 5 |
| 06 | frontend-ui.md | Frontend + Designer | Avant Phase 3 |
| 07 | design-system.md | Frontend + Designer | Avant Phase 3 |
| 08 | migration-plan.md | Tech lead + PM | Continu |

## 8. Conventions transverses

- **Nommage des tables / colonnes** : on conserve les noms français actuels (`postes`, `candidatures`, `criteres_scoring`, `notes_rh`, etc.) pour ne pas casser la BD existante. Pas de re-naming opportuniste.
- **Statuts** : strings français en snake_case (`'nouveau'`, `'en_analyse'`, `'score'`, `'brouillon'`, etc.). Voir [01-data-model.md](01-data-model.md) pour la liste exhaustive et un bug connu sur l'incohérence `update_candidature_statut` ↔ flow scoring.
- **UUIDs** : tous les IDs sont des `UUID v4` générés par Postgres (`gen_random_uuid()`).
- **JSONB** : utilisé pour `criteres_scoring`, `reponses_formulaire`, `linkedin_data`, `scores_details`, `variables_disponibles`. L'ORM cible (Drizzle / SQLModel) le gère nativement → pas besoin du workaround CTE Windmill.
- **Dates** : `TIMESTAMP DEFAULT NOW()`. Affichage fr-FR côté frontend.
- **Langue** : tout en français côté UI et prompts IA. Code en anglais.

## 9. Hors scope

- Pas de re-design UX : la spec décrit l'existant, pas une v2.
- Pas d'ajout de fonctionnalités (pas de nouveau onglet, pas de nouveau type d'email, etc.).
- Pas de refonte de l'auth (l'app actuelle est en accès libre dans Windmill, on introduit Supabase Auth comme baseline).
- Pas de migration des autres dossiers Windmill (`f/veille/`, `f/tutorial/`, `u/enzodonati/`).

---

**Suite** : [01-data-model.md](01-data-model.md) — modèle de données complet avec DDL Postgres prêt à exécuter.
