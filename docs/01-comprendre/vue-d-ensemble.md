# Vue d'ensemble

## En une phrase

Un système de recrutement automatisé : **un candidat soumet sa candidature → l'IA score son profil → un email personnalisé est envoyé automatiquement** (invitation à un entretien si profil retenu, refus respectueux sinon).

## Le pipeline candidat (vu de loin)

```
1. Candidat remplit le formulaire public servi par le frontend
   (page /postuler/<slug>, no auth, layout minimal). Les questions sont
   générées par l'IA à la création du poste : nom, email, CV PDF, LinkedIn,
   + 3-8 questions spécifiques au poste.
                       │
                       ▼
2. POST /api/public/applications/<slug> → API persiste la candidature
   et enqueue intake job (pg-boss)
                       │
                       ▼
3. Worker intake : récupère le CV PDF, extrait le texte, scrape LinkedIn
   (si APIFY_API_KEY configurée, sinon skip)
                       │
                       ▼
4. Worker scoring (Claude Sonnet) : applique les guardrails anti-injection,
   note chaque critère (sur 100), génère un rapport en français
                       │
                       ▼
5. Worker communication (Claude Sonnet) : génère un brouillon d'email adapté
   (invitation / refus / relance), pré-sélectionné selon la recommandation IA
                       │
                       ▼
6. RH valide ou édite l'email dans le dashboard /candidatures/<id>,
   choisit l'action : Copier / Ouvrir dans son client mail / Marquer envoyé /
   Envoyer via Resend (si RESEND_API_KEY configurée)
                       │
                       ▼
7. Le candidat reçoit l'email et répond directement à l'expéditeur.
```

Tout est piloté depuis un **dashboard React** privé (`https://rh.your-domain.example`), accessible aux RH par lien magique Supabase.

## Ce qui est inclus

- 🤖 **Scoring IA** par critères pondérés (configurables par poste)
- 🛡️ **Guardrails** : détection automatique des tentatives d'injection LLM dans les CV
- ✉️ **Génération d'emails** (invitation, refus, relance) avec ton respectueux
- 📄 **Génération de fiches de poste publiques** (HTML statique servi par l'API)
- 📊 **Dashboard analytics** : KPIs, distribution des scores, coût Anthropic en temps réel
- 🔔 **Monitoring** : heartbeat horaire + alertes ntfy/Slack en cas de jobs en échec
- 🔐 **Sécurité** : webhooks signés (HMAC ou token), authentification Supabase magic link

## Ce qui n'est PAS inclus (et qu'il faut brancher)

- Le compte **Supabase Cloud** (Auth + Postgres + Storage) — obligatoire
- Le compte **Anthropic** (Claude Sonnet 4.6+ recommandé) — obligatoire
- Un hébergeur pour les 3 services (Railway, Coolify, Vercel + Fly, Docker pur…) — voir [`03-deployer/`](../03-deployer/)
- Le compte **Resend** (email delivery automatique) — optionnel, fallback `mailto:` dans le client mail de l'utilisateur
- Le compte **Apify** (scraping LinkedIn pour enrichir le scoring) — optionnel

## Pour qui c'est fait

- **Recruteurs / DRH** qui veulent automatiser le tri des CVs sans perdre la personnalisation des emails
- **Cabinets de recrutement** qui veulent industrialiser leur process pour des dizaines de postes
- **Solos / consultants RH** qui veulent un outil interne sans dépendre d'un SaaS coûteux
- **Devs / agences** qui veulent un kit de base à customiser pour leurs clients

## Prochaine étape

→ [01-comprendre/architecture.md](architecture.md) pour le détail technique
→ [02-demarrer/parcours-developpeur.md](../02-demarrer/parcours-developpeur.md) pour lancer en local
→ [02-demarrer/parcours-clic-a-clic.md](../02-demarrer/parcours-clic-a-clic.md) pour déployer sans ouvrir le code
