# Lancer en local uniquement (dev / démo)

Tu veux juste essayer le système sur ta machine sans l'exposer sur Internet.

## Cas d'usage

- Démo à un prospect
- Développement / customisation
- Test avant de payer un cloud

## Limites

- **Tu ne peux pas accepter de vraies candidatures** — Formbricks ne peut pas joindre `localhost:3000` depuis l'Internet (sauf via [ngrok](https://ngrok.com))
- **Pas d'envoi d'emails** réels (sauf si tu donnes ton vrai `RESEND_API_KEY`, mais à éviter en dev)

## Étapes

Voir [parcours-developpeur.md](../02-demarrer/parcours-developpeur.md). En résumé :

```bash
git clone <repo>
cd <repo>
cp .env.example .env
# Édite .env avec une DB Postgres (locale via Docker, ou Supabase Free)
pnpm install
pnpm --filter @rh/db migrate
pnpm --filter @rh/db seed
pnpm dev
```

Ouvre http://localhost:5173 → login magic link → tu es dans le dashboard.

## Tester avec un faux candidat

1. Crée un poste (clique "Nouveau poste" dans `/postes`)
2. Génère les critères + clique "Créer le formulaire" → ça crée un Formbricks survey + webhook (qui pointe vers `localhost:3000`, donc seules les soumissions venant de ton réseau local marcheront)
3. **Pour simuler un webhook** sans Formbricks, tu peux POST direct :
```bash
curl -X POST http://localhost:3000/webhooks/formbricks \
  -H 'Content-Type: application/json' \
  -d '{
    "data": {
      "surveyId": "<ton survey id>",
      "response": {
        "data": {
          "nom": "Test Candidat",
          "email": "test@example.com",
          "cv_upload": "https://lien-public-vers-un-pdf.example/cv.pdf",
          "q1": "Réponse à la question 1"
        }
      }
    }
  }'
```

## Exposer en HTTPS via ngrok (optionnel)

Si tu veux tester avec un vrai Formbricks cloud :

```bash
brew install ngrok
ngrok http 3000
# tu obtiens https://xxxx.ngrok-free.app
```

Configure le webhook Formbricks pour pointer vers `https://xxxx.ngrok-free.app/webhooks/formbricks`. Note : ngrok change l'URL à chaque restart.

## Quand tu es prêt à passer en prod

Voir [matrice-de-choix.md](matrice-de-choix.md).
