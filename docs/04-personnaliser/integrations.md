# Personnaliser les intégrations tierces

Comment swap chaque service externe pour un autre.

## Vue d'ensemble

| Brique | Service par défaut | Alternatives | Difficulté |
|---|---|---|---|
| Form builder | Formbricks | Tally, Typeform, formulaire React custom | 🟡 Moyen |
| Email | Resend | Postmark, Mailgun, SES, SendGrid | 🟢 Facile |
| Auth | Supabase | Clerk, Auth0, NextAuth | 🔴 Complexe |
| DB | Postgres (Supabase) | Postgres self-host, Neon, Vercel Postgres | 🟢 Facile |
| Hosting CV | Drive/Dropbox (URL externe) | Supabase Storage, S3, R2 | 🟡 Moyen |
| Scheduling | Calendly | Cal.com, Doodle, none | 🟢 Facile |
| LinkedIn scraping | Apify | Manual / none | 🟢 Facile (skip) |
| Notifications | ntfy | Slack, Discord webhook, Telegram | 🟢 Facile |

## Form builder

### Garder Formbricks ?

✅ Oui si :
- Tu veux du self-hosted (RGPD)
- Tu veux générer les surveys par programmation depuis le code
- Tu acceptes la friction setup (un peu plus que Tally)

### Remplacer par Tally

1. Tally a une UI plus jolie et zéro setup
2. Crée le formulaire à la main dans Tally avec les champs : `nom`, `email`, `telephone`, `linkedin_url`, `cv_upload` (URL), + tes questions IA
3. Configure le webhook Tally → `https://api.your-domain.example/webhooks/formbricks?token=<secret>`
4. Modifie l'extraction dans `apps/api/src/routes/webhooks/formbricks.ts` pour matcher le format Tally :
   - Tally envoie `{ data: { fields: [{ key, value }, ...] } }` au lieu de Formbricks
   - Soit tu modifies `extractSurveyId` + `extractResponseData` dans `intake.ts`, soit tu crées une nouvelle route `/webhooks/tally`
5. La fonctionnalité "Créer le formulaire" depuis le dashboard ne marchera plus (pas d'API Tally pour créer un form). Désactive-la ou crée les forms à la main.

### Remplacer par formulaire React custom

Si tu veux tout maîtriser : crée une route publique `apps/web/src/routes/postuler/$slug.tsx` avec un form React → POST direct vers `/webhooks/formbricks?token=<secret>` avec un body JSON identique au format Formbricks.

Avantage : zéro dépendance externe, contrôle total UX. Inconvénient : tu codes + maintiens le formulaire.

## Email

### Resend → Postmark / Mailgun / SES

Ces services exposent une API REST très similaire. Le code à modifier : `apps/jobs/src/services/email.ts`.

Pour Postmark :
```typescript
const r = await fetch("https://api.postmarkapp.com/email", {
  method: "POST",
  headers: { "X-Postmark-Server-Token": process.env.POSTMARK_TOKEN, "Accept": "application/json", "Content-Type": "application/json" },
  body: JSON.stringify({ From: env.RESEND_FROM, To: to, Subject: subject, HtmlBody: html, TextBody: text }),
});
```

Renomme aussi `RESEND_API_KEY` → `POSTMARK_TOKEN` dans `.env.example` et `packages/config/src/env.ts`.

Pour SES : utilise `@aws-sdk/client-ses`, plus verbeux mais beaucoup moins cher en haut volume.

### Désactiver l'envoi (mode dry-run)

Dans `email.ts` :
```typescript
if (!process.env.RESEND_API_KEY) {
  console.log(`[email dry-run] would send to ${to}: ${subject}`);
  return { id: "dry-run" };
}
```

Utile en dev / staging.

## Auth

### Supabase → autre

Dépendance profonde (RLS, magic links). À considérer seulement si tu as une vraie raison (compliance entreprise, SSO interne).

Pour switcher :
1. Remplace `apps/web/src/lib/supabase.ts` par le client de ton fournisseur (Clerk, Auth0…)
2. Modifie `apps/api/src/middleware/auth.ts` qui valide le JWT via JWKS Supabase → adapte le JWKS endpoint
3. Schéma Postgres : enlève les RLS policies `authenticated all` (sauf si ton fournisseur peut générer des JWT compatibles `authenticated` role)

Pour un cabinet de recrutement de < 10 RH internes, **Supabase magic link reste le choix le plus simple**.

## DB

### Supabase Postgres → Neon / Vercel Postgres / self-host

Plug & play. Change juste `DATABASE_URL`. Drizzle marche partout.

⚠️ **Attention RLS** : si tu pars sur un Postgres pur (sans Supabase Auth), les policies `TO authenticated` ne marchent plus (le rôle n'existe pas). Soit tu crées le rôle, soit tu désactives RLS et gères les permissions au niveau API.

## Hosting CV

Par défaut, le candidat fournit une **URL publique** dans le champ `cv_upload` (Drive partagé, Dropbox, son site perso). Le worker fetch via `extractPdfText()`.

### Alternative 1 — Supabase Storage privé

Modifier la chaîne d'intake pour :
1. Frontend Formbricks demande un upload de fichier (pas une URL) — Formbricks v3 supporte ça
2. Le webhook reçoit un lien Formbricks vers le fichier uploadé
3. Le worker télécharge et upload vers ton bucket Supabase privé
4. La candidature stocke l'URL Supabase + un endpoint API `/api/candidatures/:id/cv-signed-url` génère un signed URL pour le RH

C'est ~200 lignes de code à ajouter (cf. plan original [03-04-Phase 4 (deferred)]).

### Alternative 2 — S3 / R2 / B2

Idem que Supabase Storage mais avec ton fournisseur. Utilise `@aws-sdk/client-s3` (compatible R2/B2 via endpoint custom).

### Garder l'URL externe (par défaut, le plus simple)

Tant que tu fais confiance aux candidats pour fournir un PDF accessible, c'est OK. Le worker rejette les URLs qui ne retournent pas `application/pdf`.

## Scheduling

### Calendly → Cal.com

Cal.com est open-source, équivalent fonctionnel. Modifier `apps/jobs/src/lib/calendly-from-api.ts` pour utiliser l'API Cal.com :

```typescript
// API Cal.com : POST /api/v1/event-types/{id}/scheduling-link
const r = await fetch(`https://api.cal.com/v1/event-types/${eventTypeId}/scheduling-link?apiKey=${CAL_API_KEY}`, ...);
```

### Désactiver scheduling

Dans `email.ts`, si `[LIEN_CALENDLY]` n'est pas remplacé, le worker continue. Le candidat reçoit un email sans lien — ajoute "merci de répondre à ce mail pour proposer un créneau" dans le prompt.

## LinkedIn scraping

### Garder Apify

Coûte ~0.01€ par profil scrappé. Utile pour enrichir les candidatures.

### Désactiver

```env
APIFY_API_KEY=
```

Vide → `scrapeLinkedin()` retourne null → `linkedin_data` reste vide en BD. Le scoring fonctionne avec juste CV + réponses formulaire.

### Alternative : ProxyCurl

Plus cher mais API stable et meilleure qualité de data. Modifier `apps/jobs/src/services/linkedin.ts`.

## Notifications

### ntfy par défaut

Gratuit, pas de compte. Choisis un topic unguessable (8+ chars random).

### Slack

```env
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T.../B.../...
```

Override ntfy. Crée le webhook dans Slack → Apps → Incoming Webhooks.

### Discord

Pas supporté nativement. Discord webhooks attendent un format différent (`{ content: "..." }`). Modifie `apps/jobs/src/services/notifier.ts` :

```typescript
async function postDiscord(message: string) {
  await fetch(process.env.DISCORD_WEBHOOK_URL!, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: message }),
  });
}
```

### Telegram

Bot Telegram + chat_id. ~10 lignes de code, voir [docs Telegram bot API](https://core.telegram.org/bots/api).

## Audit

Quand tu remplaces une intégration, **lance les tests** avant de pousser :
```bash
pnpm test
```

Et fais un E2E manuel (créer poste → soumission Formbricks → email envoyé) pour valider la chaîne complète.
