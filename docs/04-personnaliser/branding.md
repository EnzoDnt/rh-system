# Personnaliser le branding

Tout le branding visible côté utilisateur (nom de l'app, couleur primaire, logo, signature des emails) se règle via des **variables d'environnement** dans `.env`. Pas besoin de toucher au code.

## En 30 secondes

Édite ton `.env` à la racine :

```env
# Backend (worker, prompts IA, emails)
BRAND_NAME=Acme Recrutement
BRAND_FROM_EMAIL=L'équipe Acme <recrutement@acme.com>

# Frontend (header, page login, onglet navigateur, couleur primaire)
VITE_BRAND_NAME=Acme Recrutement
VITE_BRAND_PRIMARY_COLOR="#1f6feb"
VITE_BRAND_PRIMARY_COLOR_HOVER="#1858c4"
VITE_BRAND_LOGO_URL=https://acme.com/logo.svg
```

Redémarre Vite (les vars `VITE_*` sont lues au boot du serveur de dev / au build) et le worker (les vars backend sont lues au boot Node).

⚠️ **Hex codes** : entoure les valeurs commençant par `#` de guillemets dans `.env`, sinon le parseur dotenv considère le reste comme un commentaire et la couleur reste à la valeur par défaut.

## Ce que chaque variable contrôle

| Variable | Effet |
|---|---|
| `BRAND_NAME` | Substitué dans les prompts IA (placeholder `<Votre Marque>`) → influence les emails générés, le rapport IA. Utilisé aussi dans les notifications Slack/ntfy et la signature email. |
| `BRAND_FROM_EMAIL` | Champ `From` quand Resend est activé. Format RFC : `"Nom Affiché <adresse@domaine>"`. Si vide, fallback `L'équipe ${BRAND_NAME} <recrutement@your-domain.example>`. |
| `VITE_BRAND_NAME` | Texte du `<h1>` dans le header dashboard, sur la page login, et titre de l'onglet navigateur. |
| `VITE_BRAND_PRIMARY_COLOR` | Couleur primaire des boutons / accents. Hex CSS valide. |
| `VITE_BRAND_PRIMARY_COLOR_HOVER` | Couleur du hover des boutons primaires. Si non défini, le hover par défaut s'applique. |
| `VITE_BRAND_LOGO_URL` | URL absolue du logo (SVG ou PNG). Affiché à gauche du nom dans le header et au-dessus du titre sur la page login. Si vide, pas de logo. |

## Limites connues

- Les `VITE_*` sont **bakées au build**. Si tu changes la couleur après un déploiement, il faut **rebuild** le frontend (`pnpm --filter @rh/web build`). Le backend (`BRAND_NAME`) lit ses vars au boot du worker, donc un simple restart suffit.
- Les fiches de poste **déjà générées** (cachées en `postes.fiche_html`) ne changent pas automatiquement. Pour les régénérer : page détail du poste → "Régénérer" avec un brief court ("respecter la nouvelle charte").
- Le **favicon** n'est pas paramétré via env var. Place `apps/web/public/favicon.ico` (16x16 ou 32x32 px) si tu veux le changer ; Vite l'inclura automatiquement.
- Pas de mode sombre, pas de pages "À propos" / "Politique de confidentialité" pré-câblées — c'est du code à ajouter.

## Couleurs : où ça se passe sous le capot

Au boot du frontend, `apps/web/src/main.tsx` lit `VITE_BRAND_PRIMARY_COLOR` et override `--color-primary` sur `document.documentElement` via `style.setProperty`. Tailwind v4 (`@theme` dans `globals.css`) consomme cette variable, donc tous les `bg-primary` / `text-primary` / etc. suivent la nouvelle couleur sans rebuild des classes.

Les autres tokens (`--color-bg`, `--color-surface`, `--color-success`, etc.) **restent figés** dans `globals.css`. Si tu veux changer ces nuances secondaires, édite directement le fichier — c'est une décision rare et pas encore exposée en env var.

## Fiche de poste publique (HTML statique généré par IA)

Le HTML des fiches `/fiches/<id>` est **généré par Claude** au moment de la création du poste, à partir du prompt `Génération fiche de poste` (table `prompts`, dashboard `/prompts`). Le placeholder `<Votre Marque>` y est substitué runtime à `BRAND_NAME` côté worker, mais d'autres détails de charte (couleur du CTA, footer year) sont **dans le texte du prompt lui-même**.

Pour adapter : `/prompts` → édite le system prompt « Génération fiche de poste » → précise ta charte (hex code, footer year, max-width…) → la prochaine fiche générée l'utilisera. Pour régénérer une fiche existante : page détail du poste → "Régénérer" avec un brief.

## Conseil : démarre simple

Avant de te plonger dans la personnalisation, **fais tourner le système avec le branding par défaut** pour valider que tout marche. Puis défini `BRAND_NAME` (5 min), puis la couleur (2 min), puis le logo (15 min — il faut héberger l'image quelque part). Pas plus pour la v1.
