# Personnaliser les intégrations tierces

Comment swap chaque service externe pour un autre.

## Vue d'ensemble

| Brique | Service par défaut | Alternatives | Difficulté |
|---|---|---|---|
| Form candidature | Formulaire intégré natif (`/postuler/:slug`) | Tally, Typeform, formulaire custom | 🟢 Facile (webhook) |
| Email | Resend | Postmark, Mailgun, SES, SendGrid | 🟢 Facile |
| Auth | Supabase | Clerk, Auth0, NextAuth | 🔴 Complexe |
| DB | Postgres (Supabase) | Postgres self-host, Neon, Vercel Postgres | 🟢 Facile |
| Hosting CV | Supabase Storage (upload direct) | S3, R2, B2 | 🟡 Moyen |
| Scheduling | URL générique (Calendly, Cal.com…) | Tout provider | 🟢 Facile |
| LinkedIn scraping | Apify (opt-in via APIFY_API_KEY) | ProxyCurl, manual/none | 🟢 Facile (skip) |
| Notifications | Dashboard /notifications | ntfy, Slack, Discord (opt-in) | 🟢 Facile |

## Formulaire de candidature

### Par défaut — formulaire intégré natif

Le système inclut un formulaire de candidature React hébergé sur `/postuler/:slug` (page publique, sans auth). Le recruteur partage l'URL depuis le dashboard (onglet "Formulaire de candidature" sur un poste).

**Flow** :
1. Le candidat ouvre `/postuler/<slug>` → charge le titre + questions via `GET /api/public/postes/:slug`
2. Upload du CV directement vers Supabase Storage via URL signée (`POST /api/public/upload-url/:slug`)
3. Soumission du formulaire → `POST /api/public/applications/:slug`
4. Page "Merci" affichée

Les questions sont générées par IA selon les critères du poste. Le RH peut régénérer les questions depuis le dashboard (bouton "Régénérer les questions").

### Utiliser un form provider externe (Tally, Typeform, etc.)

Si tu préfères un provider externe pour l'UX du formulaire, c'est possible. Les 3 étapes :

1. **Créer un handler de webhook** dans `apps/api/src/routes/webhooks/` pour parser le format du provider :
   ```typescript
   // apps/api/src/routes/webhooks/tally.ts
   import { Hono } from "hono";
   import { enqueueScoring } from "../../services/queue-client.js";
   import { getDb, postes, candidatures } from "@rh/db";
   import { eq } from "drizzle-orm";

   export const tallyWebhookRouter = new Hono()
     .post("/", async (c) => {
       const payload = await c.req.json();
       // Adapter le format Tally → fields extraits par clé
       const fields = Object.fromEntries(
         (payload.data?.fields ?? []).map((f: any) => [f.key, f.value])
       );
       const slug = /* extraire depuis le form title ou un champ caché */;
       const [poste] = await db.select().from(postes).where(eq(postes.slug, slug));
       const [cand] = await db.insert(candidatures).values({
         poste_id: poste.id, nom: fields.nom, email: fields.email, ...
       }).returning();
       await enqueueScoring(cand.id);
       return c.json({ ok: true }, 201);
     });
   ```

2. **Monter la route** dans `apps/api/src/routes/index.ts` :
   ```typescript
   import { tallyWebhookRouter } from "./webhooks/tally.js";
   // ...
   app.route("/webhooks/tally", tallyWebhookRouter);
   ```

3. **Configurer le webhook** dans Tally → Settings → Webhooks → `https://api.your-domain.example/webhooks/tally`

La fonctionnalité "Régénérer les questions" du dashboard ne s'appliquera pas au form Tally (les questions sont gérées dans Tally). Tu peux la masquer ou l'ignorer.

## Email

### Flux par défaut — mailto (aucune configuration requise)

Par défaut, **Resend n'est pas nécessaire**. Le recruteur envoie les emails depuis son propre client mail (Gmail, Outlook, etc.) :

1. Le worker génère le brouillon (sujet + contenu) et le stocke en BD avec `statut: brouillon`
2. Dans le dashboard, 4 boutons apparaissent sur chaque brouillon :
   - **Copier** — copie sujet + contenu dans le presse-papier
   - **Ouvrir dans mon mail** — ouvre le client mail par défaut via `mailto:` avec sujet + corps pré-remplis
   - **Marquer comme envoyé** — passe le statut en `marque_envoye` sans passer par Resend
   - **Envoyer via Resend** — visible uniquement si `RESEND_API_KEY` est configuré côté serveur

Ce flux convient à la plupart des petites équipes RH.

### Activer Resend — envoi automatique

Pour envoyer les emails directement depuis le dashboard sans ouvrir ton client mail :

1. Crée un compte sur [resend.com](https://resend.com)
2. Vérifie ton domaine (DNS : enregistrements SPF + DKIM dans ton registrar)
3. Génère une clé API dans Resend
4. Configure dans ton `.env` (ou dans Coolify/Railway) :
   ```env
   RESEND_API_KEY=re_xxxxxxxx
   RESEND_FROM=L'équipe RH <recrutement@ton-domaine.example>
   ```
5. Redémarre l'API. Le bouton **"Envoyer via Resend"** apparaît automatiquement dans le dashboard.

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

Par défaut, le candidat **upload son CV directement** depuis le formulaire (`/postuler/:slug`) vers Supabase Storage (bucket `cvs`). L'upload passe par une URL signée générée par l'API — le PDF ne transite pas par l'API.

### Alternative — S3 / R2 / B2

Idem que Supabase Storage mais avec ton fournisseur. Modifie `apps/api/src/routes/public/upload-url.ts` pour générer une presigned URL S3 au lieu de Supabase.

Utilise `@aws-sdk/client-s3` (compatible R2/B2 via endpoint custom).

## Scheduling — lien de réservation générique

Il n'y a pas d'intégration API Calendly. Le champ `lien_reservation_url` sur chaque poste accueille **n'importe quelle URL de réservation**.

### URLs supportées

- **Calendly** : `https://calendly.com/votre-username/30min`
- **Cal.com** : `https://cal.com/votre-username/entretien`
- **Notion** : une page Notion publique avec un formulaire
- **Google Forms** : `https://forms.gle/...`
- **Autre** : n'importe quelle URL — elle est insérée telle quelle dans les emails, avec `?name=Prénom&email=email@candidat.fr` ajouté automatiquement (accepté par la plupart des providers, ignoré par les autres).

### Configurer dans le dashboard

Ouvre un poste → champ **"Lien de réservation entretien"** → colle l'URL.

### Désactiver le scheduling

Laisse le champ vide. Le placeholder `[LIEN_CALENDLY]` doit alors être **absent** du template email pour que l'envoi réussisse. Adapte le prompt de génération d'email pour demander "merci de répondre à ce mail pour proposer un créneau".

## LinkedIn scraping — Apify (optionnel)

Par défaut, **Apify n'est pas activé**. Le worker score les candidats avec le CV + les réponses formulaire seulement — les tests ont montré une qualité équivalente sans LinkedIn.

### Activer l'enrichissement LinkedIn

1. Crée un compte sur [apify.com](https://apify.com)
2. Génère une clé API dans Apify → Settings → Integrations
3. Configure dans ton `.env` (ou Coolify/Railway) :
   ```env
   APIFY_API_KEY=apify_api_xxxxxxxx
   ```
4. Redémarre le worker. Les prochaines candidatures avec un `linkedin_url` verront leur profil scrappé automatiquement.

**Coût estimé :** ~0.05€ par candidature (acteur `dev_fusion~Linkedin-Profile-Scraper`).

Si la clé n'est pas définie, `linkedin_data` reste vide en BD et le scoring fonctionne normalement.

### Alternative : ProxyCurl

Plus cher mais API stable et meilleure qualité de data. Modifier `apps/jobs/src/services/linkedin.ts`.

## Notifications — dashboard inbox + push externe (optionnel)

Toutes les alertes worker sont stockées en base de données et visibles dans le dashboard à `/notifications`. Un badge dans le header indique les alertes non-lues.

### Dashboard inbox (par défaut, aucune config requise)

- Défaillances de job → apparaissent en rouge dans `/notifications`
- Heartbeat horaire → visible dans `/notifications`
- Click sur une alerte → marque comme lue + affiche le contexte JSON

### Push externe — ntfy (optionnel)

Pour recevoir une notification push **en plus** du dashboard :

```env
NTFY_TOPIC=mon-topic-unguessable-abc123
```

Gratuit, pas de compte. Choisis un topic unguessable (8+ chars random). App mobile [ntfy.sh](https://ntfy.sh) disponible sur iOS/Android.

### Push externe — Slack (optionnel)

```env
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T.../B.../...
```

Override ntfy si les deux sont définis. Crée le webhook dans Slack → Apps → Incoming Webhooks.

### Push externe — Discord (recette)

Discord webhooks attendent `{ content: "..." }`. Modifie `apps/jobs/src/services/notifier.ts`, fonction `postExternal` :

```typescript
if (process.env.DISCORD_WEBHOOK_URL?.trim()) {
  await fetch(process.env.DISCORD_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: message }),
  });
}
```

## Audit

Quand tu remplaces une intégration, **lance les tests** avant de pousser :
```bash
pnpm test
```

Et fais un E2E manuel (créer poste → ouvrir /postuler/:slug → soumettre une candidature de test → email envoyé) pour valider la chaîne complète.
