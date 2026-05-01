# Checklist de personnalisation — pour l'agent IA

> **Pour l'agent qui pilote l'onboarding.** Ce document liste les questions que tu dois poser à l'utilisateur, dans l'ordre, pendant la phase de setup. Chaque question a une valeur par défaut. L'utilisateur répond soit `garder` (par défaut) soit `personnaliser` (et fournit la nouvelle valeur).
>
> **Comportement attendu** :
> - Pose les questions par groupes, pas une par une
> - Pour chaque groupe, montre les valeurs par défaut, demande ce qu'il veut changer
> - Une fois validé, applique tous les changements en parallèle
> - Confirme à l'utilisateur ce qui a été modifié

---

## Groupe 1 — Identité de marque (3 questions)

Tout passe par des **variables d'environnement**. Aucune édition de code requise.

| # | Question | Default | Variable .env |
|---|---|---|---|
| 1.1 | **Nom de la marque** affiché dans le header, la page login, le titre du navigateur, et substitué dans les prompts IA | `Recrutement` | `BRAND_NAME` (backend) + `VITE_BRAND_NAME` (frontend) |
| 1.2 | **Adresse expéditeur des emails** (format `Nom Affiché <email@domaine>`) | `L'équipe Recrutement <recrutement@your-domain.example>` | `BRAND_FROM_EMAIL` |
| 1.3 | **URL d'un logo** (SVG ou PNG hébergé quelque part — affiché dans le header et page login) | Aucun (texte du nom seul) | `VITE_BRAND_LOGO_URL` |

**Action si personnalisation** : ajoute les valeurs dans `.env` (et dans les vars de l'hébergeur au déploiement).

> ⚠️ Pour `VITE_BRAND_PRIMARY_COLOR`, **quote** la valeur dans le fichier `.env` (`"#1f6feb"`) sinon dotenv interprète le `#` comme un commentaire. Sur les UI Railway/Coolify, pas besoin de quotes.

---

## Groupe 2 — Apparence visuelle (2 questions)

| # | Question | Default | Variable .env |
|---|---|---|---|
| 2.1 | **Couleur principale** (hex CSS) | `#c4841d` (ambre) | `VITE_BRAND_PRIMARY_COLOR` |
| 2.2 | **Couleur de hover** (hex CSS) | `#a06b15` | `VITE_BRAND_PRIMARY_COLOR_HOVER` |

**Conseil agent** : si l'utilisateur fournit la couleur primaire seule, calcule automatiquement le hover en assombrissant de ~10% et propose-la-lui.

Doc complète : [04-personnaliser/branding.md](../04-personnaliser/branding.md).

---

## Groupe 3 — Prompts IA (3 questions)

Le système utilise 6 prompts Claude éditables depuis `/prompts` (interface web) ou seedés depuis `packages/db/scripts/prompts/*.txt`.

| # | Question | Options |
|---|---|---|
| 3.1 | **Industrie ciblée** | `generique` (défaut) / `tech` / `medical` / `retail` / `finance` / `design` |
| 3.2 | **Ton des emails au candidat** | `professionnel` (défaut) / `chaleureux` / `corporate` / `startup` |
| 3.3 | **Niveau d'exigence du scoring** | `equilibre` (défaut, 75=retenir, 50=a_voir) / `strict` (85/60) / `inclusif` (65/40) |

**Action si personnalisation** :
- Si `industrie != generique` : modifier les fichiers `.txt` dans `packages/db/scripts/prompts/` pour préfixer chaque prompt avec un glossaire de l'industrie (voir `docs/04-personnaliser/criteres-scoring.md` pour les exemples)
- Si `ton != professionnel` : ajouter une instruction de ton dans `packages/db/scripts/prompts/generation_email.txt`
- Si `niveau != equilibre` : modifier les seuils dans `packages/db/scripts/prompts/scoring_candidat.txt`

⚠️ **Important** : ces fichiers sont seedés en BD au premier `pnpm db:seed`. Si l'utilisateur change la BD plus tard via le dashboard `/prompts`, ces modifications de fichiers sont sans effet sur les prompts existants. Le placeholder `<Votre Marque>` dans les prompts est substitué automatiquement à `BRAND_NAME` au runtime côté worker.

---

## Groupe 4 — Intégrations tierces (3 questions)

Pour chaque intégration, demande si l'utilisateur veut l'utiliser ou la désactiver.

| # | Question | Default | Action si "non" |
|---|---|---|---|
| 4.1 | **Resend** pour l'envoi d'emails automatique | Non (mailto: par défaut) | Si non : `RESEND_API_KEY=` vide. Le dashboard offrira "Ouvrir dans mon mail" + "Marquer comme envoyé" au lieu de "Envoyer via Resend". |
| 4.2 | **Apify** pour scraper LinkedIn des candidats | Non | `APIFY_API_KEY=` vide. Le scoring ne tiendra compte que du CV + réponses formulaire. |
| 4.3 | **ntfy ou Slack** pour push notifs externes | Non (dashboard `/notifications` suffit) | Si oui : demander `NTFY_TOPIC` ou `SLACK_WEBHOOK_URL`. Sinon : les notifs restent uniquement en BD (visibles via la cloche du dashboard). |

> Le formulaire candidat est **intégré nativement** au repo (pas d'outil externe type Formbricks/Tally/Typeform à configurer). La page publique `/postuler/<slug>` est servie par le frontend `web` et soumet à `POST /api/public/applications/<slug>`.

---

## Groupe 5 — Déploiement (2 questions)

| # | Question | Options | Lien doc |
|---|---|---|---|
| 5.1 | **Où déployer ?** | `local` (dev seul) / `railway` (le plus simple) / `coolify` (VPS perso) / `vercel-fly` (perf web max) / `docker` (DIY) | [03-deployer/matrice-de-choix.md](../03-deployer/matrice-de-choix.md) |
| 5.2 | **Domaine custom** | Aucun (sous-domaines auto-générés du fournisseur) | Si oui : demander le domaine racine, l'agent configure les 2 sous-domaines (`rh.` pour le web, `api.` pour l'API) côté DNS + côté hébergeur |

Recipes par hébergeur :
- Railway → [03-deployer/host-railway.md](../03-deployer/host-railway.md)
- Coolify → [03-deployer/host-coolify.md](../03-deployer/host-coolify.md)
- Vercel + Fly / Docker → [03-deployer/host-generic.md](../03-deployer/host-generic.md)

---

## Groupe 6 — Comptes externes & credentials

L'agent doit collecter ces valeurs auprès de l'utilisateur (cf. [03-deployer/cloud-setup.md](../03-deployer/cloud-setup.md) pour les détails).

**Obligatoires** :
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL` — depuis le dashboard Supabase Cloud (Settings → API + Settings → Database)
- `ANTHROPIC_API_KEY` — depuis console.anthropic.com (carte de paiement requise)

**Optionnelles selon Groupe 4** :
- `RESEND_API_KEY` (si 4.1 oui)
- `APIFY_API_KEY` (si 4.2 oui)
- `NTFY_TOPIC` ou `SLACK_WEBHOOK_URL` (si 4.3 oui)

**Frontend** (à dupliquer dans les build vars de l'hébergeur web) :
- `VITE_SUPABASE_URL` = `SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` = `SUPABASE_ANON_KEY`
- `VITE_API_URL` = `PUBLIC_API_URL`
- `VITE_BRAND_*` (si Groupes 1–2 personnalisés)

⚠️ **Sécurité** : ne jamais afficher les credentials dans la conversation après les avoir reçus. Utiliser des `<REDACTED>` quand on les mentionne.

---

## Workflow recommandé pour l'agent

```
1. Saluer l'utilisateur, expliquer en 2 phrases ce qu'on va faire
2. Lire docs/01-comprendre/vue-d-ensemble.md pour avoir le contexte
3. Demander : "Tu veux personnaliser quoi ? Tu veux qu'on traverse les groupes
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
8. Lancer pnpm install + pnpm typecheck + pnpm test pour valider
9. Procéder au déploiement selon le choix Groupe 5
10. Donner les URLs finales à l'utilisateur
```

---

## Checklist pour l'agent (avant de marquer "setup terminé")

- [ ] Le fichier `.env` existe à la racine et passe la validation Zod (`pnpm typecheck` OK + l'API démarre sans crash)
- [ ] `pnpm install` est passé sans erreur
- [ ] Les migrations Supabase sont appliquées (tous les fichiers `packages/db/migrations/*.sql` dans l'ordre)
- [ ] `pnpm --filter @rh/db seed` est passé (les 6 prompts sont en BD)
- [ ] `pnpm test` passe (76 tests)
- [ ] Si déploiement choisi : les 3 services tournent et répondent (curl `/api/health` → `{"ok":true}`)
- [ ] L'utilisateur peut se logger sur l'URL web finale (magic link ou password)
- [ ] L'utilisateur a créé un poste de test et la génération IA des questions a fonctionné

---

## Si l'utilisateur dit "tout par défaut, je m'en fous"

Réponse rapide : zéro changement de code, on saute direct au Groupe 5 (déploiement) puis Groupe 6 (credentials). Setup en ~30 min total.

L'utilisateur pourra toujours personnaliser plus tard :
- Via le dashboard `/prompts` (édition des prompts en BD, sans redéploiement)
- En modifiant les vars `BRAND_*` côté hébergeur (redémarrage suffit pour le backend, rebuild pour le frontend)
