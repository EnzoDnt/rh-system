# Checklist de personnalisation — pour l'agent IA

> **Pour l'agent qui pilote l'onboarding.** Ce document liste les **18 questions** que tu dois poser à l'utilisateur, dans l'ordre, pendant la phase de setup. Chaque question a une valeur par défaut. L'utilisateur répond soit `garder` (par défaut) soit `personnaliser` (et fournit la nouvelle valeur).
>
> **Comportement attendu** :
> - Pose les questions par groupes (5 groupes), pas une par une
> - Pour chaque groupe, montre les valeurs par défaut, demande ce qu'il veut changer
> - Une fois validé, applique tous les changements en parallèle
> - Confirme à l'utilisateur ce qui a été modifié

---

## Groupe 1 — Identité de marque (3 questions)

| # | Question | Default | Où c'est utilisé |
|---|---|---|---|
| 1.1 | **Nom de l'app** affiché dans le header et le titre du navigateur | `Recrutement` | `apps/web/index.html` (`<title>`), `apps/web/src/components/layout/Header.tsx`, `apps/web/src/routes/login.tsx` |
| 1.2 | **Nom expéditeur des emails** | `L'équipe Recrutement` | `apps/jobs/src/services/email.ts` (default) + var `RESEND_FROM` |
| 1.3 | **Domaine de tes emails** (ex: `acme.com` → from `recrutement@acme.com`) | `your-domain.example` | Variable `RESEND_FROM` |

**Action si personnalisation** :
- Remplace `Recrutement` par `<nouveau-nom>` dans les 3 fichiers Web
- Génère le `RESEND_FROM=L'équipe <NewName> <recrutement@<domaine>>` dans `.env`

---

## Groupe 2 — Apparence visuelle (3 questions)

| # | Question | Default | Où c'est utilisé |
|---|---|---|---|
| 2.1 | **Couleur principale** (boutons, badges, accents) | `#5C3A1E` (marron) | `apps/web/src/styles/globals.css` → `--color-primary` |
| 2.2 | **Couleur de hover** sur la couleur principale | `#4a2f18` | `--color-primary-hover` |
| 2.3 | **Logo personnalisé** (chemin vers fichier SVG/PNG) | Aucun (texte seul) | À ajouter dans `apps/web/public/logo.svg` + import dans `Header.tsx` et `login.tsx` |

**Conseil agent** : si l'utilisateur fournit une couleur, calcule automatiquement le hover en assombrissant de ~10%.

---

## Groupe 3 — Prompts IA (3 questions)

Le système utilise 6 prompts Claude éditables depuis `/prompts`. Tu peux soit utiliser les prompts génériques par défaut, soit charger un template spécialisé.

| # | Question | Options |
|---|---|---|
| 3.1 | **Industrie ciblée** | `generique` (défaut) / `tech` / `medical` / `retail` / `finance` / `design` |
| 3.2 | **Ton des emails au candidat** | `professionnel` (défaut) / `chaleureux` / `corporate` / `startup` |
| 3.3 | **Niveau d'exigence du scoring** | `equilibre` (défaut, 75=retenir, 50=a_voir) / `strict` (85/60) / `inclusif` (65/40) |

**Action si personnalisation** :
- Si `industrie != generique` : modifier `packages/db/scripts/seed-prompts.ts` ou les fichiers `.txt` dans `packages/db/scripts/prompts/` pour préfixer chaque prompt avec un glossaire de l'industrie (voir `docs/04-personnaliser/criteres-scoring.md` pour les exemples)
- Si `ton != professionnel` : ajouter une instruction de ton dans `packages/db/scripts/prompts/generation_email.txt`
- Si `niveau != equilibre` : modifier les seuils dans `packages/db/scripts/prompts/scoring_candidat.txt`

⚠️ **Important** : ces fichiers sont seedés en BD au premier `pnpm db:seed`. Si l'utilisateur change la BD plus tard via le dashboard `/prompts`, ces modifications de fichiers sont sans effet sur les prompts existants.

---

## Groupe 4 — Intégrations tierces (5 questions)

Pour chaque intégration, demande si l'utilisateur veut l'utiliser ou la désactiver.

| # | Question | Default | Action si "non" |
|---|---|---|---|
| 4.1 | **Resend** pour l'envoi d'emails | Oui | Documenter qu'il faudra coder un autre provider (Postmark/Mailgun/SES) — voir `docs/04-personnaliser/integrations.md`. Pour le moment, mettre `RESEND_API_KEY=` vide. |
| 4.2 | **Calendly** pour les liens d'entretien automatiques | Oui (si fourni) | Si non : `CALENDLY_TOKEN=` vide. Les emails partiront sans lien Calendly. Recommander d'éditer le prompt email pour proposer la prise de RDV manuelle. |
| 4.3 | **Apify** pour scraper LinkedIn des candidats | Non (par défaut) | `APIFY_API_KEY=` vide. Le scoring ne tiendra compte que du CV + réponses formulaire. |
| 4.4 | **ntfy ou Slack** pour les alertes worker | ntfy.sh (gratuit) | Si Slack : demander le `SLACK_WEBHOOK_URL`. Si rien : pas d'alerte temps réel sur les jobs en échec. |
| 4.5 | **Formbricks self-hosted ou cloud** | Cloud (https://app.formbricks.com) | Si self-host : demander `FORMBRICKS_BASE_URL`, expliquer qu'il faut le déployer séparément (voir doc Formbricks). |

---

## Groupe 5 — Déploiement (3 questions)

| # | Question | Options | Lien doc |
|---|---|---|---|
| 5.1 | **Où déployer ?** | `local` (dev seul) / `railway` (le plus simple) / `vercel-railway-supabase` (meilleure perf) / `coolify-vps` (le moins cher) / `self-hosted-docker` (DIY) | `docs/03-deployer/matrice-de-choix.md` |
| 5.2 | **Domaine custom** | Aucun (sous-domaines auto-générés du fournisseur) | Si oui : demander le domaine racine, l'agent configure les 3 sous-domaines (`rh.`, `api.`, `fiches.`) selon le fournisseur |
| 5.3 | **Configurer DKIM/SPF Resend maintenant** | Oui (recommandé pour ne pas atterrir en spam) | L'agent affiche les 3 records DNS Resend et attend confirmation de la propagation |

---

## Groupe 6 — Comptes externes (1 question, mais l'agent doit collecter beaucoup)

| # | Question | À collecter |
|---|---|---|
| 6.1 | **Tu as déjà tes comptes ?** | Oui : l'agent demande les credentials un par un (voir liste). Non : l'agent ouvre les liens d'inscription dans l'ordre, attend la confirmation. |

**Credentials à collecter** :
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`
- `ANTHROPIC_API_KEY`
- `RESEND_API_KEY` (si Groupe 4 dit oui)
- `FORMBRICKS_API_KEY`, `FORMBRICKS_ENVIRONMENT_ID` (si Groupe 4 dit oui)
- `FORMBRICKS_WEBHOOK_SECRET` (générer avec `openssl rand -hex 32`)
- `CALENDLY_TOKEN` (optionnel)
- `APIFY_API_KEY` (optionnel)
- `NTFY_TOPIC` ou `SLACK_WEBHOOK_URL` (selon choix Groupe 4)

⚠️ **Sécurité** : ne jamais afficher les credentials dans la conversation après les avoir reçus. Utiliser des `<REDACTED>` quand on les mentionne.

---

## Workflow recommandé pour l'agent

```
1. Saluer l'utilisateur, expliquer en 2 phrases ce qu'on va faire
2. Lire docs/01-comprendre/vue-d-ensemble.md pour avoir le contexte
3. Demander : "Tu veux personnaliser quoi ? Tu veux qu'on traverse les 5 groupes
   de questions, ou tu préfères que je garde tout par défaut et on passe direct
   au déploiement ?"
4. Selon réponse :
   a. Si "tout par défaut" → sauter aux Groupes 5 + 6
   b. Si "personnaliser" → Groupes 1 → 5 dans l'ordre
5. Pour chaque groupe :
   - Afficher la liste des éléments avec leurs defaults
   - Demander : "Lesquels tu veux changer ?"
   - Pour chaque élément à changer, demander la nouvelle valeur
6. Une fois tous les groupes traversés, faire un récap et confirmer
7. Appliquer tous les changements (édits de fichiers + .env)
8. Lancer pnpm install + pnpm typecheck pour valider
9. Procéder au déploiement selon le choix Groupe 5
10. Donner les URLs finales à l'utilisateur
```

---

## Checklist pour l'agent (avant de marquer "setup terminé")

- [ ] Le fichier `.env` existe à la racine, et passe la validation Zod (`pnpm typecheck` ne crashe pas au démarrage de l'API)
- [ ] `pnpm install` est passé sans erreur
- [ ] Les migrations Supabase sont appliquées (3 fichiers SQL dans `packages/db/migrations/`)
- [ ] `pnpm --filter @rh/db seed` est passé (les 6 prompts sont en BD)
- [ ] Si déploiement choisi : les 3 services tournent et répondent (curl `/api/health` → `{"ok":true}`)
- [ ] Si Formbricks configuré : `FORMBRICKS_WEBHOOK_SECRET` est dans Coolify/Railway env ET dans l'URL du webhook côté Formbricks UI
- [ ] L'utilisateur peut se logger via magic link sur l'URL web finale

---

## Si l'utilisateur dit "tout par défaut, je m'en fous"

Réponse rapide : zéro changement de code, on saute direct au Groupe 5 (déploiement) puis Groupe 6 (credentials). Setup en ~30 min total.

L'utilisateur pourra toujours personnaliser plus tard via :
- Le dashboard `/prompts` (édition des prompts en BD, sans redéploiement)
- L'édition de fichiers TS/CSS (relancer ce setup avec une nouvelle convo agent)
