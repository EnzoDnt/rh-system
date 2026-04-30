# Architecture du système

> Tu lis ça pour comprendre comment les morceaux s'assemblent. Si tu cherches juste "à quoi ça sert", reviens à [vue-d-ensemble.md](vue-d-ensemble.md).

## Vue d'ensemble en 1 schéma

```mermaid
flowchart LR
    Candidat([👤 Candidat])
    RH([🧑‍💼 Recruteur RH])

    subgraph Externe["Services externes (SaaS)"]
        Formbricks[📝 Formbricks<br/>Formulaires]
        Resend[✉️ Resend<br/>Envoi emails]
        Anthropic[🧠 Claude Sonnet<br/>Anthropic]
        Calendly[📅 Calendly<br/>RDV]
        Apify[🔍 Apify<br/>LinkedIn scraper]
    end

    subgraph App["Système (3 services)"]
        Web[🖥️ Web<br/>React + Vite]
        API[⚙️ API<br/>Hono / Node]
        Worker[⏱️ Worker<br/>pg-boss / Node]
    end

    subgraph Data["Données + Auth (Supabase)"]
        Postgres[(🗄️ Postgres<br/>+ Storage<br/>+ Auth)]
    end

    Candidat -->|Remplit le<br/>formulaire| Formbricks
    Formbricks -->|webhook<br/>signé| API
    API -.->|enqueue| Worker
    Worker -->|score CV +<br/>génère email| Anthropic
    Worker -->|envoie email<br/>à candidat| Resend
    Worker -->|insère lien| Calendly
    Worker -.->|scrape| Apify

    RH -->|magic link| Web
    Web -->|REST + auth| API
    API <-->|read/write| Postgres
    Worker <-->|read/write| Postgres

    Resend -->|email final| Candidat
    Candidat -->|réserve un RDV| Calendly
```

3 services applicatifs (web, api, worker), une base Supabase, une poignée de SaaS externes. Tout est lié par des **événements** : un webhook Formbricks déclenche un job, qui enchaîne des appels Claude, qui finit par un email Resend.

---

## Les 3 services applicatifs

Tous écrits en **TypeScript**, déployés via Docker. Chacun est isolé : il peut crasher sans entraîner les autres.

### `web` — interface du recruteur

- **Stack** : React 19 + Vite + TanStack Router + TanStack Query + Tailwind
- **Rôle** : un dashboard interne, accessible uniquement après magic-link Supabase. 5 onglets (Postes, Candidatures, Communications, Analytics, Prompts IA).
- **Authentification** : Supabase Auth, JWT envoyé en `Authorization: Bearer <token>` à l'API. Aucune session côté serveur web.
- **Pas de SSR** : SPA pure servie par nginx.

### `api` — REST backend

- **Stack** : Hono sur Node.js, Drizzle ORM, Zod
- **Rôle** : 30+ endpoints REST. CRUD postes/candidatures/communications, génération synchrone (fiche de poste, email, critères, formulaire), enqueue de jobs asynchrones.
- **Authentification** : middleware qui vérifie le JWT Supabase via JWKS (ES256). CORS configuré pour le domaine web. Webhook Formbricks signé via `?token=<secret>`.
- **Persistence** : connexion directe à Postgres Supabase via Drizzle. Pas de cache.

### `worker` — exécuteur de jobs

- **Stack** : pg-boss v10 (file d'attente sur Postgres), Node.js
- **Rôle** : 4 queues (`intake`, `scoring`, `communication`, `heartbeat`). Reçoit des jobs depuis l'API ou via le scheduler interne (cron pg-boss), les exécute, retry automatique sur échec.
- **Particularité** : pg-boss utilise Postgres lui-même comme broker → zéro infrastructure additionnelle (pas de Redis).

### Pourquoi 3 services et pas 1 monolithe ?

- **Isoler les failures** : si Claude est down, le worker accumule des jobs en attente, mais l'API et le web continuent de servir le dashboard.
- **Scaler indépendamment** : un burst de candidatures Formbricks ne charge pas le web ; on multiplie les workers sans toucher à l'API.
- **Déploiement séparé** : on peut redéployer le worker sans interrompre les utilisateurs RH connectés.

---

## La base de données (Supabase)

Une seule instance Postgres hébergée par Supabase. Schéma piloté par Drizzle.

### Tables principales

| Table | Rôle |
|---|---|
| `postes` | Les offres de recrutement (titre, description, critères, fiche HTML générée, lien Formbricks) |
| `candidatures` | Les candidats reçus (nom, email, CV, statut, notes RH) |
| `scores` | Une ligne par candidature : score IA + détails par critère + rapport markdown généré |
| `communications` | Brouillons et emails envoyés (sujet, contenu, statut, lien Calendly intégré) |
| `prompts` | Les 6 prompts IA en BD (éditables depuis l'UI, sans redéploiement) |
| `prompts_history` | Historique de toutes les versions de chaque prompt |
| `ai_calls` | Log de chaque appel Claude (tokens, coût EUR, type de prompt) |

### Schéma simplifié

```mermaid
erDiagram
    postes ||--o{ candidatures : "a des"
    candidatures ||--|| scores : "a un"
    candidatures ||--o{ communications : "a"
    prompts ||--o{ prompts_history : "versionné dans"
    candidatures ||--o{ ai_calls : "trackée par"
    postes ||--o{ ai_calls : "trackée par"
```

Détail complet du modèle : [99-reference/modele-de-donnees.md](../99-reference/modele-de-donnees.md).

### Authentification + Storage

Supabase apporte 3 services en un :
- **Postgres** pour les données métier
- **Auth** pour les magic links recruteur (table `auth.users` séparée)
- **Storage** pour héberger des fichiers (PDFs, logos) si tu veux

L'usage de Storage est optionnel : par défaut les CVs sont des URLs externes (Drive, Dropbox) que les candidats fournissent eux-mêmes via Formbricks.

---

## Pipeline d'une candidature (vue technique)

```mermaid
sequenceDiagram
    autonumber
    participant C as Candidat
    participant FB as Formbricks
    participant API as API (Hono)
    participant Q as pg-boss queue
    participant W as Worker
    participant Cl as Claude
    participant DB as Postgres
    participant R as Resend

    C->>FB: Remplit le formulaire
    FB->>API: POST /webhooks/formbricks?token=<secret>
    API->>API: Vérifie signature
    API->>Q: enqueue intake
    API-->>FB: 202 OK
    Q->>W: dequeue intake
    W->>W: Extrait CV (PDF text), scrape LinkedIn (optionnel)
    W->>DB: INSERT candidature
    W->>Cl: prompt guardrails (détection injection)
    Cl-->>W: flagged true/false
    W->>Cl: prompt scoring
    Cl-->>W: score + rapport
    W->>DB: INSERT scores
    W->>Cl: prompt génération email
    Cl-->>W: brouillon email
    W->>DB: INSERT communications (statut=brouillon)
    Note over W,DB: Le RH valide le brouillon depuis le dashboard
    W->>R: send email validé
    R-->>C: Email d'invitation
```

7 étapes principales, chacune indépendante et retry-able. Si Claude échoue à l'étape 5, le worker retry 3 fois ; après échec final, une notification ntfy/Slack alerte le RH.

Détails par flow : [pipeline-candidat.md](pipeline-candidat.md).

---

## Les services externes utilisés

Le système n'est pas autosuffisant. Il s'appuie sur 6 SaaS, chacun jouant un rôle précis.

```mermaid
mindmap
  root((Recrutement OS))
    Auth + Données
      Supabase
        Postgres
        Auth magic link
        Storage CVs
    Intelligence
      Anthropic Claude
        Scoring CV
        Génération emails
        Génération fiches
        Guardrails
    Réception candidatures
      Formbricks
        Formulaires personnalisables
        Webhook signé
    Communication
      Resend
        Envoi emails transactionnels
        DKIM/SPF
      Calendly
        Liens entretien
    Enrichissement
      Apify
        Scrape LinkedIn
    Monitoring
      ntfy.sh
        Alertes worker
      Slack webhook
        Alternative ntfy
```

Tous ces services peuvent être **swap** par d'autres équivalents. Voir [04-personnaliser/integrations.md](../04-personnaliser/integrations.md).

---

## Ce qui se passe quand un recruteur utilise l'app

```mermaid
flowchart TD
    Login[Recruteur reçoit<br/>magic link par email] --> Dashboard
    Dashboard[Dashboard 5 onglets] --> Postes
    Dashboard --> Cand[Candidatures]
    Dashboard --> Comm[Communications]
    Dashboard --> Ana[Analytics]
    Dashboard --> Prompts[Prompts IA]

    Postes --> NewPoste[Nouveau poste]
    NewPoste --> AIcrit[L'IA génère<br/>5-8 critères]
    AIcrit --> AIfiche[L'IA génère<br/>une fiche de poste HTML]
    AIfiche --> Form[Crée formulaire<br/>Formbricks auto]
    Form --> Live[Lien public<br/>partageable]

    Cand --> Detail[Détail candidat]
    Detail --> Score[Voir score IA<br/>+ rapport]
    Detail --> Email[Brouillon email<br/>déjà rédigé]
    Email --> SendBtn[1 clic =<br/>email envoyé]
```

Le recruteur n'écrit quasiment rien : il valide ce que l'IA a déjà préparé.

---

## Conventions techniques importantes

Pour que tu (ou ton agent IA) ne sois pas surpris :

- **Workspace TS via tsx** : les packages `packages/*` exportent du TypeScript source, pas du `dist/`. En prod, on lance les apps avec `node --import tsx src/index.ts`.
- **CORS avant auth** : dans Hono, l'ordre des middlewares compte. CORS doit s'exécuter avant le check auth, sinon les preflights OPTIONS sont rejetés en 401.
- **pg-boss v10** : il faut appeler `boss.createQueue(name)` avant tout `send()` ou `work()`, sinon `send()` retourne `null` silencieusement.
- **Webhook Formbricks signé via query param** : `?token=<secret>` dans l'URL (Formbricks self-hosted ne supporte pas HMAC headers).
- **Radix Select** : `<SelectItem value="">` est interdit (utiliser un sentinel `"__none__"`).

Liste exhaustive des conventions : [AGENTS.md](../../AGENTS.md) à la racine du repo.

---

## Pour aller plus loin

- **Le détail du pipeline** : [pipeline-candidat.md](pipeline-candidat.md)
- **Pourquoi avoir choisi cette stack** : [pourquoi-ces-choix.md](pourquoi-ces-choix.md)
- **Le modèle de données complet** : [../99-reference/modele-de-donnees.md](../99-reference/modele-de-donnees.md)
- **Les endpoints API disponibles** : [../99-reference/api-endpoints.md](../99-reference/api-endpoints.md)
