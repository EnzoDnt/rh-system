# Recrutement OS

> Système de recrutement automatisé : un candidat soumet sa candidature → l'IA score son profil → un email personnalisé est envoyé automatiquement.

```
┌─────────────┐     ┌──────────┐     ┌──────────┐     ┌─────────┐
│ Formulaire  │ ──▶ │ Webhook  │ ──▶ │ Worker   │ ──▶ │  Email  │
│ (candidat)  │     │ + intake │     │ scoring  │     │ + Cal.  │
└─────────────┘     └──────────┘     └──────────┘     └─────────┘
                          │                │                │
                          ▼                ▼                ▼
                    ┌──────────────────────────────────────────┐
                    │       Dashboard RH (validation manuelle) │
                    └──────────────────────────────────────────┘
```

## Pour qui ?

- **Recruteurs / DRH** qui veulent automatiser le tri des CVs sans perdre la personnalisation des emails
- **Cabinets de recrutement** qui industrialisent leur process pour des dizaines de postes simultanés
- **Solos / consultants RH** qui veulent un outil interne sans payer un SaaS coûteux
- **Devs / agences** qui veulent un kit de base à customiser pour leurs clients

## Choisis ton parcours

| Profil | Lien |
|---|---|
| 🧠 **Curieux**, je veux comprendre ce que ça fait | [docs/01-comprendre/vue-d-ensemble.md](docs/01-comprendre/vue-d-ensemble.md) |
| 💻 **Développeur**, je veux le lancer en local | [docs/02-demarrer/parcours-developpeur.md](docs/02-demarrer/parcours-developpeur.md) |
| 🖱️ **Non-tech**, je veux le déployer en cliquant | [docs/02-demarrer/parcours-clic-a-clic.md](docs/02-demarrer/parcours-clic-a-clic.md) |
| 🤖 **Avec mon agent IA** (Claude Code, Cursor) | [docs/02-demarrer/parcours-avec-agent-ia.md](docs/02-demarrer/parcours-avec-agent-ia.md) |
| 🚀 **Prêt à déployer**, je choisis l'option d'hébergement | [docs/03-deployer/matrice-de-choix.md](docs/03-deployer/matrice-de-choix.md) |
| 🎨 **Je veux adapter** prompts, branding, intégrations | [docs/04-personnaliser/](docs/04-personnaliser/) |
| 🔧 **C'est en prod**, je gère les incidents | [docs/05-operer/runbook-incidents.md](docs/05-operer/runbook-incidents.md) |

## Stack technique

- **Frontend** : React 19 + Vite + TanStack Router/Query
- **Backend** : Hono (Node) + Drizzle ORM + Zod
- **Worker** : pg-boss (queues persistées en Postgres, pas de Redis)
- **DB + Auth** : Supabase (Postgres + magic link)
- **IA** : Anthropic Claude Sonnet (scoring, génération emails, fiches, formulaires)
- **Form builder** : Formbricks (self-hostable)
- **Email** : Resend
- **Scheduling** : Calendly (optionnel)

Pour les pourquoi de ces choix : [docs/01-comprendre/pourquoi-ces-choix.md](docs/01-comprendre/pourquoi-ces-choix.md).

## En 2 minutes

```bash
git clone <ce-repo>
cd recruit-os
cp .env.example .env  # remplis tes credentials (voir docs/02-demarrer/prerequis.md)
pnpm install
pnpm --filter @rh/db migrate    # applique le schéma
pnpm --filter @rh/db seed       # seed les 6 prompts IA
pnpm dev                        # web :5173, api :3000
```

Login par magic link sur ton email → dashboard sur `localhost:5173/postes` → "Nouveau poste".

## Conditions d'utilisation

⚠️ **Ce code n'est pas open-source au sens classique.** Il est distribué exclusivement aux membres de l'écosystème ZénithIA (formation IA et automatisation). Tu peux :

- ✅ **Forker** et adapter à tes besoins
- ✅ **Déployer** pour ton activité ou celle de tes clients
- ✅ **Vendre des prestations** basées sur ce système
- ❌ **Redistribuer** publiquement (mirror, ZIP partagé, repo public miroir)
- ❌ **Revendre** comme produit autonome

Voir [CONDITIONS.md](CONDITIONS.md) pour le détail.

## Documentation pour les agents IA

[AGENTS.md](AGENTS.md) — guide pour Claude Code / Cursor / autres agents qui adapteraient ce repo.

## Contributing

C'est un projet à code partagé restreint, pas un OSS classique — donc **pas de PR de l'extérieur**. Si tu es membre de l'écosystème et que tu veux remonter un bug ou suggérer une amélioration : ouvre une issue sur le canal Skool, ou un GitHub Issue avec template (voir `.github/ISSUE_TEMPLATE/`).

## Crédits

Conçu et maintenu pour l'écosystème ZénithIA.
