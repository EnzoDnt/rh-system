# Installation guidée par ton agent IA

> **Pour l'utilisateur** : ce fichier est juste un alias de la procédure expliquée dans le [README](README.md). Si tu veux la version courte, va sur le README. Si tu es là c'est probablement parce que ton agent IA t'a redirigé ici pour avoir le contexte complet.

> **Pour l'agent IA** : ce fichier est ta référence. Lis-le entièrement avant de poser la première question à l'utilisateur.

---

## Brief que l'utilisateur t'a probablement collé

> "Lis AGENTS.md et fais le setup complet pour moi."

Ou une variante : "Installe ce projet pour moi", "On déploie ce truc ensemble", etc.

## Ta mission en 1 phrase

Faire passer l'utilisateur de **"j'ai cloné le repo"** à **"j'ai un dashboard fonctionnel sur une URL publique avec ma marque"**, en posant le minimum de questions et sans qu'il ait à coder une ligne.

## Ce que tu dois faire dans cet ordre

1. Lire ces 3 fichiers (en parallèle, c'est ton contexte) :
   - [AGENTS.md](AGENTS.md) — règles de comportement + conventions critiques du codebase
   - [docs/agent-setup/personnalisation.md](docs/agent-setup/personnalisation.md) — la **checklist exhaustive** des 18 questions à poser, regroupées en 6 groupes
   - [docs/02-demarrer/prerequis.md](docs/02-demarrer/prerequis.md) — les comptes externes nécessaires

2. Saluer l'utilisateur en 1 phrase. Pas de blabla.

3. Demander :
   > *"Avant qu'on commence : tu veux personnaliser le système (nom, couleurs, prompts, intégrations), ou on garde tout par défaut et on passe direct au déploiement ? Si tu hésites, perso je recommande de garder les défauts pour la première install — tu pourras tout adapter après dans le dashboard `/prompts` et via les fichiers de config."*

4. Selon sa réponse :
   - **"tout par défaut"** → saute aux Groupes 5 (déploiement) + 6 (credentials) de la checklist
   - **"personnaliser"** → traverse les Groupes 1 → 5 dans l'ordre, applique au fur et à mesure
   - **"j'hésite / explique-moi"** → liste-lui les 5 groupes de personnalisation en 1 ligne chacun, qu'il choisisse

5. Pour chaque groupe :
   - Affiche les éléments du groupe avec leur valeur par défaut
   - Demande **une seule question synthétique** : "Tu veux changer lesquels ?"
   - Pour chaque élément à changer, demande la nouvelle valeur (1 question = 1 réponse)

6. Avant d'écrire quoi que ce soit, fais un récap :
   > *"Récap de ce qu'on va faire : [liste]. OK pour appliquer ?"*

7. Une fois validé, applique TOUS les changements en une fois :
   - Édits de fichiers (TS, CSS, prompts)
   - Création du `.env`
   - `pnpm install`
   - Migrations Supabase (3 fichiers SQL dans `packages/db/migrations/`)
   - `pnpm --filter @rh/db seed`
   - `pnpm typecheck` (doit passer sinon tu as cassé un truc)

8. Phase de déploiement (Groupe 5 de la checklist) :
   Selon le choix de l'utilisateur, lis le runbook correspondant dans `docs/03-deployer/` et exécute. Demande les credentials de l'hébergeur en cours de route.

9. Vérification finale :
   - `curl PUBLIC_API_URL/api/health` → `{"ok":true}`
   - Demande à l'utilisateur de se logger sur PUBLIC_WEB_URL via magic link
   - Demande-lui de créer un poste de test
   - Vérifie qu'il voit le dashboard avec sa marque/couleurs

10. Clôture en 4 lignes :
    - Les 3 URLs (web, api, fiches)
    - Les 3 credentials critiques à garder en sécurité (Supabase service_role, Anthropic key, FORMBRICKS_WEBHOOK_SECRET)
    - Lien vers `docs/05-operer/runbook-incidents.md` pour les bugs connus
    - Lien vers `docs/04-personnaliser/` s'il veut aller plus loin

## Tu n'as pas le droit de…

- Demander à l'utilisateur d'ouvrir un terminal pour faire des commandes que tu peux faire toi-même
- Faire 10 questions d'un coup ("Donne-moi ces 12 valeurs maintenant")
- Afficher les credentials de l'utilisateur dans tes messages après les avoir reçus (utilise `<REDACTED>` ou les premiers/derniers chars)
- Force-pousser sur main, écraser des changements existants sans demander, ou skip la validation utilisateur
- Skipper la phase de personnalisation sans demander à l'utilisateur ce qu'il veut

## Tu dois absolument…

- Commit après chaque étape majeure (titre clair, conventional commits)
- Faire des messages courts (sois concis, l'utilisateur veut avancer pas lire des essais)
- Confirmer avant chaque action irréversible (delete BD, redeploy prod, push force)
- Si une commande échoue : montrer l'erreur exacte + 2-3 hypothèses + demander à l'utilisateur de tester
- Répondre en français

## Si l'utilisateur veut juste faire un test sans déployer

Choix de déploiement : `local` (Groupe 5.1). Setup en 15 min :
- Postgres local via Docker (`docker run -d -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16`)
- Pas besoin de Resend, Formbricks ou Calendly
- Web sur `localhost:5173`, API sur `localhost:3000`
- Pour tester avec un faux candidat sans Formbricks : POST direct sur le webhook (cf. `docs/03-deployer/local-only.md`)

## Si l'utilisateur bloque

Symptômes typiques + solutions dans [docs/05-operer/runbook-incidents.md](docs/05-operer/runbook-incidents.md). Si tu ne trouves pas, demande à l'utilisateur de partager le contexte exact + les logs dans Skool/Discord de la communauté.

---

Bon courage. Tu peux commencer maintenant.
