# Personnaliser les prompts IA

Le système utilise **6 prompts Claude** stockés en BD (table `prompts`) avec versioning + historique. Tu peux les éditer **directement depuis le dashboard `/prompts`** sans toucher au code ni redéployer.

## Les 6 prompts

| Type DB | Affiché comme | Quand il fire | Ce qu'il génère |
|---|---|---|---|
| `scoring_candidat` | Scoring candidat | Worker scoring, après intake | JSON `{score_global, scores_details, rapport_ia, recommandation}` |
| `generation_email` | Génération email | Worker communication + bouton "Générer brouillon" RH | JSON `{sujet, contenu}` |
| `generation_formulaire` | Génération formulaire | Bouton "Créer le formulaire" sur un poste | Array de questions Formbricks (5-8) |
| `generation_criteres` | Génération critères | Bouton "Générer critères avec l'IA" sur création poste | JSON `{<critere>: {poids, description}, ...}` |
| `generation_fiche_poste` | Génération fiche de poste | Bouton "Générer" / "Régénérer" sur la fiche publique | HTML statique (`<!DOCTYPE html>...`) |
| `guardrails` | Détection injection | Worker scoring (avant le scoring lui-même) | JSON `{flagged, motif, suspicious_segments}` |

## Workflow de modification

1. Dashboard `/prompts` → sélectionne le prompt à gauche
2. Édite le `system_prompt` à droite (textarea)
3. Toggle **Preview** pour voir le markdown rendu
4. Clique **Enregistrer** → nouvelle version `vN+1`, l'ancienne va dans l'historique
5. Si tu te plantes → bouton **Restaurer** sur n'importe quelle version dans l'historique

**⚠️ Test avant de prendre en main** : crée une candidature de test après chaque modif majeure pour vérifier le rendu.

## Variables disponibles

Chaque prompt a accès à des variables interpolées dans le **user prompt** (le system prompt ne change pas, seul le user prompt varie selon la candidature/poste). Voir [99-reference/prompts-catalogue.md](../99-reference/prompts-catalogue.md) pour la liste exacte.

Exemples :
- `scoring_candidat` reçoit : `cv_text`, `reponses` (JSON formulaire), `criteres` (JSON pondéré), `linkedin_data`
- `generation_email` reçoit : `candidat_nom`, `poste_titre`, `score_global`, `recommandation`, `rapport_ia`, `emailType`
- `generation_fiche_poste` reçoit : `titre`, `description`, `brief` (optionnel), `feedback` (pour régénération)

Le mapping variable → user prompt est dans `apps/api/src/services/claude-prompts.ts`. Pour ajouter une variable, modifie la fonction qui construit le user prompt + le système d'interpolation.

## Les 5 prompts à ajuster en priorité quand tu adaptes à ton industrie

### 1. `scoring_candidat`
- Adapte le **ton** du `rapport_ia` à ton public (sec et factuel pour finance, plus chaleureux pour design)
- Ajoute des règles **anti-bias** spécifiques (ex : "Ne pénalise pas un candidat sans diplôme spécifique si l'expérience prouve la compétence")
- Précise les **seuils de recommandation** : par défaut, score ≥75 → retenir, ≥50 → a_voir, sinon refuser. Tu peux ajuster.

### 2. `generation_email`
- Le **plus visible** côté candidat. Investis du temps.
- Personnalise le ton selon ta marque (chaleureux / professionnel / startup / corporate)
- Ajoute systématiquement le lien Calendly via `[LIEN_CALENDLY]` (auto-remplacé par worker)
- Mentionne explicitement ce qui a été apprécié dans le profil (référence au `rapport_ia`)

### 3. `generation_criteres`
- Préfixe avec un **glossaire** des compétences typiques de ton industrie (ex: pour santé : "DPC, FFP, RGPD santé, secret médical, …")
- Force des poids cohérents : "L'expérience minimale exigée doit avoir un poids ≥30/100"

### 4. `guardrails`
- Ajoute des patterns spécifiques à ton contexte (ex : pour BTP, des mentions de certifications truquées)
- Ne sois pas paranoïaque : un faux positif sur un vrai candidat = email d'invitation jamais envoyé

### 5. `generation_fiche_poste`
- Plus simple : surtout du HTML statique
- Personnalise les couleurs CSS, les sections (À propos, Missions, Profil, Process, Avantages…)

## Tester un prompt sans casser la prod

Tu n'as pas d'environnement de staging par défaut. Stratégies :

### Option A : créer un poste de test dédié
- Crée un poste "TEST — ne pas utiliser"
- Soumets-y des candidatures de test (CV bidons sur Drive)
- Si la nouvelle version du prompt ne te plait pas → Restaurer

### Option B : Prompt Override (à coder)
Pas implémenté. À ajouter : un champ `is_draft: true` sur les prompts → utilisé seulement si le poste a un flag `use_draft_prompts`. Permettrait de tester sans impact prod.

## Internationalisation

Les prompts sont actuellement en français. Pour les traduire en EN/ES/etc :
1. Dupliquer le prompt dans la table `prompts` avec un suffixe (`scoring_candidat_en`)
2. Modifier `loadPrompt(type)` pour accepter une langue → charge le bon prompt selon la langue du poste/candidat
3. Ajouter une colonne `langue` sur `postes` ou un setting global

## Coûts

Plus le prompt est long → plus c'est cher (input tokens). Le cache Anthropic (`cache_control: ephemeral`) compense pour les calls répétés mais pas pour les premiers.

Voir [05-operer/monitoring.md](../05-operer/monitoring.md) pour le tracking de coût en temps réel.

## Bonnes pratiques

- **Versionne chaque modification** : si tu changes 3 trucs en même temps, tu ne sauras pas lequel a fait baisser le score moyen
- **Lis `prompts_history`** : tu peux requêter directement la BD pour comparer 2 versions
- **Garde des exemples de bons CVs et de mauvais CVs** : pour valider qu'un changement ne casse pas le scoring
- **Ne demande jamais à Claude d'inventer des informations** : "Si tu ne sais pas, dis-le explicitement dans le rapport"
