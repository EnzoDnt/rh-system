# Parcours avec un agent IA

Tu n'es pas développeur, mais tu as un agent IA (Claude Code, Cursor, Devin, Replit Agent, etc.). Tu veux qu'il fasse l'install pour toi.

⏱️ **Temps estimé pour TOI** : 30-45 min (le temps de récupérer les credentials + valider à chaque étape).
⏱️ **Temps total** : ~2h (l'agent fait le boulot pendant que tu fais autre chose).

## Comment ça marche

Tu donnes à ton agent un brief structuré. L'agent :
1. Lit la doc du repo
2. Te demande les credentials nécessaires (il s'arrête à chaque étape)
3. Configure tout
4. Lance les tests pour valider
5. Te montre l'URL finale

Tu **fournis les credentials**, lui fait le reste. Tu ne touches jamais au code.

## Le brief à coller à ton agent

Copie-colle ce brief intégralement dans ta conversation avec l'agent. Adapte la première ligne avec ton choix de déploiement.

```
Tu vas m'aider à déployer le système de recrutement automatisé qui se trouve dans le repo
local que je vais cloner. Mon objectif final : que je puisse aller sur l'URL du dashboard
RH et créer mon premier poste.

CHOIX DE DÉPLOIEMENT (à adapter) :
- Option A: Railway (paiement ~20€/mois, le plus simple)
- Option B: Vercel + Railway + Supabase (~50€/mois, plus performant)
- Option C: Mon VPS Hetzner via Coolify (~6€/mois, plus DIY)

Procède dans cet ordre :

1. Lis le README.md, AGENTS.md, et docs/01-comprendre/architecture.md
   pour comprendre le système.

2. Lis docs/02-demarrer/prerequis.md et liste-moi les comptes que je dois créer.
   Pour chaque compte, donne-moi :
   - Le lien d'inscription
   - Ce que je dois copier-coller comme credentials
   - Le format attendu (longueur, préfixe, etc.)
   ATTENDS que je te fournisse les credentials avant de continuer.

3. Une fois les credentials reçus, crée un fichier .env dans le repo avec ces valeurs.
   Vérifie avec packages/config/src/env.ts que toutes les variables requises sont bien là.

4. Applique les migrations Supabase :
   - Soit via la CLI Supabase si tu peux l'installer
   - Soit via le SQL Editor de Supabase (donne-moi le SQL exact à coller)
   Ordre : 0000_tough_skrulls.sql, puis 0001_triggers_and_rls.sql, puis 0002_ai_calls_table.sql.

5. Lance localement pour vérifier :
   pnpm install
   pnpm typecheck     # doit passer
   pnpm --filter @rh/db seed   # seede les 6 prompts IA
   pnpm dev           # web sur :5173, api sur :3000

6. Demande-moi de tester en local en ouvrant http://localhost:5173, login par magic link
   sur mon email. Si ça marche, on continue. Sinon, debug avec moi.

7. Déploiement (selon mon choix d'option) :
   - Si Option A (Railway) : suis docs/03-deployer/deployments.md adapté pour Railway.
     Crée le projet Railway via leur CLI ou demande-moi de le créer en clic.
   - Si Option B : suis docs/03-deployer/vercel-railway.md
   - Si Option C : suis docs/03-deployer/deployments.md

8. Une fois déployé, donne-moi :
   - L'URL du dashboard RH (PUBLIC_WEB_URL)
   - L'URL de l'API (PUBLIC_API_URL)
   - L'URL des fiches publiques (PUBLIC_FICHES_URL)
   Vérifie que je peux me logger et créer un poste.

CONTRAINTES :
- Tu DOIS t'arrêter à chaque étape pour me demander confirmation ou credentials
- Tu DOIS faire un commit Git après chaque étape réussie (titre clair)
- Si une commande échoue, montre-moi l'erreur et propose 2-3 hypothèses avant de bouger
- Tu NE DOIS PAS exposer mes credentials dans tes messages (utilise des placeholders <REDACTED>)
- Tu NE DOIS PAS modifier la logique métier du code (services Claude, prompts, scoring) — seulement la config
```

## Pendant que l'agent travaille

L'agent va te demander :
- **Step 2** : "Voici les comptes à créer, valide-moi que tu les as crédités, puis donne-moi les credentials"
- **Step 4** : "Voici les SQL à coller dans Supabase SQL Editor, fais-le et confirme"
- **Step 6** : "Va sur http://localhost:5173, login, dis-moi si ça marche"
- **Step 7** : "Quelle option de déploiement tu choisis ?" (sauf si tu l'as déjà précisé)
- **Step 8** : "Voici les URLs finales, teste et confirme"

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
| "Je n'arrive pas à appliquer la migration Supabase" | Donne-lui les credentials du **service_role** key (pas la `anon` key) |
| "Le webhook Formbricks ne fire pas" | Vérifie que le secret webhook est bien le même côté Coolify ET côté Formbricks (voir [05-operer/runbook-incidents.md](../05-operer/runbook-incidents.md)) |
| "Tests api passent localement mais fail en CI" | Le CI a besoin du fix `pre-create Supabase pseudo-roles` (voir `.github/workflows/ci.yml`, déjà inclus) |
| "Je ne reçois pas le magic link" | Vérifie Supabase Auth → URL configuration → site URL = ton `PUBLIC_WEB_URL` |

Si bloqué profond, demande à l'agent de **synthétiser le problème + 2 hypothèses** et partage le tout dans Skool/Discord pour qu'on t'aide.
