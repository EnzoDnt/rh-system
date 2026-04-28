# Personnaliser le branding

## Ce qui est facilement customisable

| Élément | Fichier | Comment |
|---|---|---|
| Nom de l'app dans le header | `apps/web/src/components/layout/Header.tsx` | Cherche `<h1>Recrutement</h1>`, remplace |
| Titre onglet navigateur | `apps/web/index.html` | Cherche `<title>Recrutement</title>` |
| Logo (si tu veux en mettre un) | À créer | Place ton logo dans `apps/web/public/logo.svg`, import dans Header |
| Couleurs principales | `apps/web/src/styles/globals.css` | Variables CSS `--color-*` en haut du fichier |
| Police | `apps/web/index.html` + `globals.css` | Lien Google Fonts dans index.html, `font-family` dans CSS |
| Texte des emails (signature) | Prompts `/prompts` (BD, pas le code) | Édite `Génération email` |
| Nom expéditeur emails | `.env` `RESEND_FROM` | `RESEND_FROM=L'équipe Acme <recrutement@acme.com>` |

## Couleurs (design tokens)

Le design tokens sont définis comme variables CSS dans [`apps/web/src/styles/globals.css`](../../apps/web/src/styles/globals.css). Cherche le bloc `:root { --color-... }` :

```css
:root {
  --color-primary: #5C3A1E;        /* Marron — boutons principaux, badges */
  --color-primary-hover: #4a2f18;
  --color-bg: #FAFAF8;             /* Background page */
  --color-surface: #FFFFFF;        /* Cards, surfaces */
  --color-border: #eceae6;         /* Bordures */
  --color-text-dark: #1a1a1a;
  --color-text-muted: #a39e96;
  --color-success: #2D8A4E;        /* Vert — score >75 */
  --color-warning: #C0892B;        /* Ambre — score 50-75 */
  --color-error: #C0392B;          /* Rouge — score <50 */
}
```

**Pour adapter à ta marque** : remplace les hex codes. Tailwind est configuré pour utiliser ces variables (`bg-primary`, `text-primary` etc.).

## Police

Par défaut le projet utilise **Inter** (sans-serif) + une police serif pour les titres. Pour changer :

1. `apps/web/index.html` :
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=TaPolice:wght@400;500;600&display=swap" rel="stylesheet">
```

2. `apps/web/src/styles/globals.css` :
```css
:root {
  --font-sans: 'TaPolice', system-ui, sans-serif;
  --font-serif: 'TaPoliceSerif', Georgia, serif;
}
```

3. Vérifie que les classes `font-sans` et `font-serif` sont bien appliquées dans tes composants (déjà le cas dans le projet).

## Logo

Si tu veux mettre un logo en plus du texte :

1. Place `apps/web/public/logo.svg` (idéal SVG, sinon PNG 2x retina)
2. Dans `apps/web/src/components/layout/Header.tsx`, ajoute :
```tsx
<div className="flex items-center gap-2">
  <img src="/logo.svg" alt="Mon Cabinet" className="h-8" />
  <h1 className="font-serif text-2xl">Recrutement</h1>
</div>
```

Et le même dans `apps/web/src/routes/login.tsx` pour la page login.

## Fiche de poste publique

Les fiches publiques (`/fiches/<id>`) sont **du HTML statique généré par IA**. Le branding est dans le **prompt** `Génération fiche de poste` (table `prompts`, dashboard `/prompts`).

Cherche dans le system prompt :
```
- Couleurs : marron foncé #5C3A1E pour les titres et le bouton CTA
- Police : Inter pour le texte, max-width 720px
- Footer : "Recrutement - 2026"
```

Remplace par ta charte. La prochaine fiche générée utilisera tes couleurs.

⚠️ Les fiches **déjà générées** (cachées en `postes.fiche_html`) ne changent pas automatiquement. Pour régénérer : ouvre la page détail du poste, écris un brief court ("respecter la nouvelle charte"), clique "Régénérer".

## Texte des emails

Tu n'édites **pas le code** pour ça. Le texte des emails est généré par Claude via le prompt `Génération email`. Va dans `/prompts` → édite le system prompt → précise ton ton :

```
- Adresse-toi au candidat avec "vous"
- Style : chaleureux mais professionnel
- Signature : "L'équipe Acme Recrutement"
- Toujours inclure le lien Calendly via le placeholder [LIEN_CALENDLY]
- Mentionne explicitement 1-2 éléments du rapport_ia qui ont été appréciés
```

Sauvegarde → la prochaine génération utilisera le nouveau ton.

## Nom et adresse expéditeur

Dans ton `.env` :
```env
RESEND_FROM=L'équipe Recrutement Acme <recrutement@acme.com>
```

⚠️ L'adresse doit être sur un **domaine vérifié** dans ton compte Resend (records DKIM/SPF configurés sur le DNS).

## Icône (favicon)

Place `apps/web/public/favicon.ico` (16x16 ou 32x32 px). Vite l'inclura automatiquement dans le HTML servi.

## Limites du système actuel

- ❌ Pas de mode sombre
- ❌ Pas de paramétrage du nom d'app via env var (hardcodé dans Header.tsx + login.tsx + index.html)
- ❌ Pas de pages "À propos" / "Politique de confidentialité" pré-câblées

Pour ajouter ces éléments : édite le code (composants React + routes TanStack).

## Conseil : démarre simple

Avant de te plonger dans la personnalisation, **fais tourner le système avec le branding par défaut** pour valider que tout marche. Puis remplace les couleurs (5 min), puis le nom (5 min), puis le logo (15 min). Pas plus pour la v1.
