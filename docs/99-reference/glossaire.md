# Glossaire

Vocabulaire métier et technique du système. Pour ne pas se perdre dans les conventions.

## Métier (RH)

| Terme | Définition |
|---|---|
| **Poste** | Une offre d'emploi : titre, description, critères de scoring, statut (`ouvert`/`en_cours`/`ferme`). Stocké dans la table `postes`. |
| **Candidature** | La soumission d'un candidat sur un poste. Contient nom, email, CV (URL), réponses au formulaire, statut (`nouveau`/`en_analyse`/`score`/`entretien`/`refuse`/`accepte`/`archive`). Table `candidatures`. |
| **Score** | L'évaluation IA d'une candidature : `score_global` (0-100), `scores_details` (par critère, JSON), `rapport_ia` (texte français), `recommandation` (`retenir`/`a_voir`/`refuser`). Table `scores`, 1 score par candidature (UPSERT). |
| **Communication** | Un email envoyé (ou à envoyer) à un candidat. Type `invitation`/`refus`/`relance`/`accuse_reception`. Statut `brouillon`/`valide`/`envoye`/`erreur`. Table `communications`. |
| **Critères de scoring** | Pondération d'évaluation par poste : `{competence: {poids: 30, description: "..."}, ...}`. Total ≠ 100 obligatoire mais conseillé. JSON dans `postes.criteres_scoring`. |
| **Fiche de poste publique** | HTML statique généré par IA, servi par l'API à `https://fiches.your-domain.example/fiches/<poste-id>`. Permet de partager le poste publiquement. |
| **Flagged** | Une candidature suspectée d'être une tentative d'injection LLM (CV ou réponse contient des patterns malicieux comme "ignore previous", `[SYSTEM]`, etc.). `flagged=true` + `flag_motif=...` set par les guardrails. |

## Technique

| Terme | Définition |
|---|---|
| **Worker** | Processus Node long-running qui poll les queues pg-boss et exécute les jobs (intake, scoring, communication, heartbeat). Un seul process suffit (single instance). |
| **Queue** | File de jobs persistée dans Postgres via pg-boss. Une queue par type de job. |
| **Job** | Une unité de travail : `{ data: ..., retryLimit: 3, retryBackoff: true }`. pg-boss gère retry, expiration, idempotence. |
| **Tool use** | Mécanisme Claude pour forcer un format de sortie JSON validé (vs. parser du texte libre). Utilisé pour scoring, email, criteres, guardrails. |
| **Prompt caching** | Optimisation Anthropic : le system prompt long est caché côté Anthropic, réduit le coût input des calls répétés de ~90%. Activé via `cache_control: { type: 'ephemeral' }`. |
| **Magic link** | Méthode d'authentification Supabase : tu entres ton email, tu reçois un lien à usage unique, tu cliques → tu es loggé. Pas de mot de passe. |
| **RLS** | Row-Level Security Postgres. Les policies `authenticated all` permettent aux users authentifiés de tout faire ; le service-role key bypass RLS pour les jobs serveur. |

## Stack

| Terme | Définition |
|---|---|
| **Hono** | Framework web léger pour Node/Bun/Deno/Workers. Style Express mais Web Standards. |
| **Drizzle** | ORM TypeScript. Le schéma EST du TS. Pas de runtime engine. |
| **pg-boss** | Queue jobs en Postgres. Pas besoin de Redis. |
| **Vite** | Bundler frontend. Build ultra-rapide. |
| **TanStack Router** | Router React file-based, type-safe. |
| **TanStack Query** | Cache + synchro de queries serveur dans React. |
| **Sonner** | Lib de toasts (notifications UI). |
| **Zod** | Validation runtime + génération de types. |
| **Drizzle Kit** | CLI pour générer migrations à partir du schéma TS. |
| **unpdf** | Lib d'extraction de texte de PDF. Pas besoin de Java/poppler. |

## Outils externes

| Terme | Définition |
|---|---|
| **Supabase** | Postgres + Auth + Storage managed. |
| **Anthropic** | Fournisseur de Claude (LLM). |
| **Resend** | Email delivery. |
| **Formbricks** | Form builder open-source (alternative à Typeform). Self-hostable. |
| **Calendly** | Outil de planning de rendez-vous. |
| **Apify** | Plateforme de web scraping (utilisée pour LinkedIn). |
| **Coolify** | PaaS open-source self-hostable. Alternative à Heroku/Railway. |
| **Hetzner** | Hébergeur cloud allemand. VPS pas chers. |
| **Traefik** | Reverse proxy moderne. Configuration auto via labels Docker. |
| **ntfy** | Service de push notifications via HTTP simple. |

## Termes du repo

| Terme | Définition |
|---|---|
