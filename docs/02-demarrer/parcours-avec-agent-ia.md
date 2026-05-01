# Parcours avec un agent IA

Tu n'es pas développeur, mais tu as un agent IA (Claude Code, Cursor, Devin, Replit Agent, etc.). Tu veux qu'il fasse l'install pour toi.

⏱️ **Temps estimé pour TOI** : 30-45 min (le temps de récupérer les credentials + valider à chaque étape).
⏱️ **Temps total** : ~1h30 (l'agent fait le boulot pendant que tu fais autre chose).

## Comment ça marche

Tu donnes à ton agent un brief structuré. L'agent :
1. Détecte ce qui manque sur ta machine (Node, pnpm, Supabase CLI…) et l'installe
2. Lit la doc du repo
3. Te demande les credentials nécessaires (il s'arrête à chaque étape)
4. Configure tout
5. Lance les tests pour valider en local
6. Te guide pour le déploiement chez ton hébergeur

Tu **fournis les credentials**, lui fait le reste. Tu ne touches jamais au code.

## Le brief à coller à ton agent

Copie-colle ce brief intégralement dans ta conversation avec l'agent. Adapte la première section avec ton choix de déploiement.

```
Tu vas m'aider à déployer le système de recrutement automatisé qui se trouve dans le repo
local que je vais cloner. Mon objectif final : que je puisse aller sur l'URL du dashboard
RH et créer mon premier poste.

CHOIX DE DÉPLOIEMENT (à adapter) :
- Option A: Railway (paiement ~20€/mois, le plus simple, pas besoin de VPS)
- Option B: Vercel + Fly.io / Render (~25€/mois, meilleure perf web)
- Option C: Mon Coolify auto-hébergé (~6€/mois VPS, plus DIY)
- Option D: Local seulement (gratuit, juste pour tester)

Procède dans cet ordre :

1. INSTALL DES DÉPENDANCES MACHINE
   - Vérifie que Node 20+, pnpm 9+, Supabase CLI sont installés
   - S'ils manquent, installe-les via le gestionnaire de paquets de mon OS :
     - macOS : brew install node pnpm supabase/tap/supabase
     - Linux : suis les docs respectives
     - Windows : winget ou choco
   - Vérifie avec node -v, pnpm -v, supabase --version

2. LECTURE DE LA DOC
   Lis dans cet ordre :
   - README.md
   - AGENTS.md (les conventions critiques du codebase)
   - docs/01-comprendre/architecture.md
   - docs/03-deployer/cloud-setup.md (la doc principale d'install)

3. COMPTES EXTERNES
   Liste-moi les comptes que je dois créer, en m'expliquant pourquoi chaque var est nécessaire.
   Pour chaque compte, donne-moi :
   - Le lien d'inscription
   - Ce que je dois copier-coller comme credentials
   - Le format attendu (longueur, préfixe, etc.)
   ATTENDS que je te fournisse les credentials avant de continuer.

4. CRÉATION DU .env
   Une fois les credentials reçus, crée un fichier .env à la racine du repo avec ces valeurs.
   Vérifie avec packages/config/src/env.ts que toutes les vars requises sont bien là.
   ⚠️ Quote les valeurs hex (couleur) avec des guillemets : VITE_BRAND_PRIMARY_COLOR="#1f6feb"

5. MIGRATIONS SUPABASE CLOUD
   Applique tous les fichiers packages/db/migrations/*.sql dans l'ordre numérique
   sur la BD Supabase Cloud. Méthode au choix :
   - psql "$DATABASE_URL" -f packages/db/migrations/XXXX.sql (le plus rapide)
   - supabase db push (si tu as fait supabase link)
   - copier-coller dans le SQL Editor (en dernier recours)

6. SEED DES PROMPTS IA
   pnpm install
   pnpm --filter @rh/db seed
   Doit afficher : "✓ upserted 6 prompts"

7. VÉRIFICATION LOCAL
   pnpm typecheck     # 6 packages, doit passer
   pnpm test          # 76 tests, doit passer
   pnpm dev           # api :3000, web :5173, worker en background

   Demande-moi d'ouvrir http://localhost:5173, de me logger via le user que j'ai
   créé sur Supabase, et de tester la création d'un poste avec génération IA.
   Si ça marche → continue. Sinon → debug avec moi.

8. DÉPLOIEMENT (selon mon choix)
   - Option A : suis docs/03-deployer/host-railway.md
   - Option B : suis docs/03-deployer/host-generic.md (section Vercel + Fly)
   - Option C : suis docs/03-deployer/host-coolify.md
   - Option D : skip, on reste en local

   Pour chaque hébergeur, l'agent prépare les variables d'environnement
   à coller, te guide sur la création du projet, et configure les domaines.

9. URLs FINALES + TEST E2E
   - URL du dashboard (PUBLIC_WEB_URL)
   - URL de l'API (PUBLIC_API_URL)
   - URL formulaire candidature (un poste de test : /postuler/<slug>)
   Vérifie que :
   - curl <api>/api/health → {"ok":true}
   - login marche
   - création poste + génération questions IA marche
   - soumission candidat depuis la page publique marche
   - scoring + brouillon email auto-généré apparaît dans /candidatures

CONTRAINTES :
- Tu DOIS t'arrêter à chaque étape pour me demander confirmation ou credentials
- Tu DOIS faire un commit Git après chaque étape réussie (conventional commits)
- Si une commande échoue, montre-moi l'erreur exacte et propose 2-3 hypothèses avant de bouger
- Tu NE DOIS PAS exposer mes credentials dans tes messages (utilise <REDACTED>)
- Tu NE DOIS PAS modifier la logique métier du code (services Claude, prompts, scoring) — seulement la config
- Tu DOIS répondre en français
```

## Pendant que l'agent travaille

L'agent va te demander :
- **Step 1** : "Voici les outils manquants, je peux les installer ?" — réponds OK
- **Step 3** : "Voici les comptes à créer, valide-moi que tu les as crédités, puis donne-moi les credentials"
- **Step 5** : "Tu préfères que j'applique les migrations via psql, supabase CLI, ou SQL Editor ?"
- **Step 7** : "Va sur http://localhost:5173, login, dis-moi si ça marche"
- **Step 8** : "Quelle option de déploiement tu choisis ?" (sauf si tu l'as déjà précisé)
- **Step 9** : "Voici les URLs finales, teste et confirme"

À chaque demande, prends 5 min pour faire ce qui est demandé et valide.

## Après l'install

L'agent peut continuer à t'aider :
- "Crée mon premier poste pour un Backend Developer Senior"
- "Personnalise les prompts pour mon industrie : santé / e-commerce / finance"
- "Modifie les couleurs pour matcher ma marque (couleur primaire #ABC123)"

Voir [04-personnaliser/](../04-personnaliser/) pour des recettes prêtes à copier dans ta conversation.

## Si l'agent bloque

Symptômes typiques + solutions :

| Symptôme | Solution |
|---|---|
| "Je n'arrive pas à appliquer la migration Supabase" | Donne-lui le **DATABASE_URL** (pas la service_role key) — c'est avec ça que `psql` se connecte |
| "Worker crash : `ANTHROPIC_API_KEY: String must contain at least 1 character(s)`" | Le shell exporte la var vide. Voir [parcours-developpeur.md](parcours-developpeur.md#worker-boot-fails) |
| "Tests api passent localement mais fail en CI" | Le CI a besoin du fix `pre-create Supabase pseudo-roles` (voir `.github/workflows/ci.yml`, déjà inclus) |
| "Je ne reçois pas le magic link" | Vérifie Supabase Auth → URL configuration → Site URL = ton `PUBLIC_WEB_URL` |
| "Bouton primaire reste ambré au lieu de ma couleur" | `VITE_BRAND_PRIMARY_COLOR` doit être quotée si tu remplis un .env (`"#1f6feb"`). Sur Railway/Coolify UI, pas besoin |

Si bloqué profond, demande à l'agent de **synthétiser le problème + 2 hypothèses** et partage le tout dans Skool/Discord pour qu'on t'aide.
