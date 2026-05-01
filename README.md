# Recrutement automatisé

Système complet pour recevoir des candidatures, les scorer avec Claude (IA), et envoyer des emails personnalisés au candidat.

```
Candidat remplit un formulaire
        │
        ▼
   Score IA + flag injection
        │
        ▼
   Brouillon d'email généré
        │
        ▼
   Tu valides et envoies (1 clic)
```

---

## La méthode recommandée : avec ton agent IA

Ce projet est conçu pour que **ton agent IA fasse l'install pour toi**. Tu n'as besoin de rien coder.

### En 3 étapes

1. **Clone le repo** sur ta machine :
   ```bash
   git clone https://github.com/ecosysteme-zia/rh-system.git
   cd rh-system
   ```

2. **Ouvre le repo dans ton agent IA** (Claude Code, Cursor, Devin, Replit Agent, Aider…)

3. **Colle ce message** :
   > "Lis [AGENTS.md](AGENTS.md) et fais le setup complet pour moi."

L'agent va :
- Te poser 5-10 questions sur la personnalisation (nom, couleurs, ton des emails, industrie)
- Te demander où tu veux déployer (Railway, Vercel, Coolify, ou local pour tester)
- Te guider pour créer les comptes externes (Supabase, Anthropic, Resend, Formbricks)
- Tout configurer dans le code et le déployer

Pour chaque question, tu peux répondre **"garde par défaut"** ou personnaliser. **Tu n'écris pas une ligne de code.**

---

## Si tu es développeur et tu veux faire ça à la main

Pas de souci, va sur [docs/02-demarrer/parcours-developpeur.md](docs/02-demarrer/parcours-developpeur.md). Setup en 30 min sans agent IA.

---

## Si tu es non-tech et tu n'as pas d'agent IA de code

Tu peux quand même faire le setup en clic-à-clic, c'est juste plus long et plus fastidieux. Va sur [docs/02-demarrer/parcours-clic-a-clic.md](docs/02-demarrer/parcours-clic-a-clic.md). Compte 2h.

⚠️ **Mais sérieusement je te re commande de passer par un agent ** : Cursor, Codex, Claude Code ou autre.

---

## Documentation

| Tu cherches… | Où aller |
|---|---|
| Comprendre ce que ça fait, en détail | [docs/01-comprendre/](docs/01-comprendre/) |
| Adapter à ta marque ou ton industrie | [docs/04-personnaliser/](docs/04-personnaliser/) |
| Déployer (5 options détaillées) | [docs/03-deployer/matrice-de-choix.md](docs/03-deployer/matrice-de-choix.md) |
| Faire tourner ça en prod | [docs/05-operer/](docs/05-operer/) |
| Référence technique (API, schéma BD…) | [docs/99-reference/](docs/99-reference/) |

---

## Conditions d'utilisation

⚠️ Ce code n'est **pas** open-source au sens classique. Il est distribué exclusivement aux membres de l'écosystème ZénithIA. Tu peux le forker, le déployer chez toi, le vendre comme prestation à tes clients. Tu ne peux **pas** le redistribuer publiquement ni le revendre comme produit.

→ [CONDITIONS.md](CONDITIONS.md) pour le détail.

---

## Stack

React 19 + Vite + Hono + Drizzle + pg-boss + Supabase + Claude Sonnet + Formbricks + Resend.

Pour les pourquoi de ces choix : [docs/01-comprendre/pourquoi-ces-choix.md](docs/01-comprendre/pourquoi-ces-choix.md).
