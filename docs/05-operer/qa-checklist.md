# QA checklist — pre-cutover

Walk every item against `https://rh.your-domain.example`. Use a real RH email (Supabase magic link). Mark each ✓ ou note un défaut.

## A. Auth & layout
- [ ] Magic link reçu, login OK, accès aux 5 onglets
- [ ] Logout fonctionne
- [ ] Bouton "Masquer dates" remplace toutes les dates par "•••"
- [ ] Bandeau d'erreur (ErrorBoundary) ne s'affiche pas en navigation normale

## B. Onglet Postes (4 postes seedés)
- [ ] Liste affiche 4 cards avec statuts variés (ouvert, en_cours, ferme) et compte de candidatures (5)
- [ ] Click sur "Backend Developer Senior" → détail
  - [ ] Statistiques correctes (5 cand., 5 scorées, score moyen ≈ 57, 1 flagged)
  - [ ] Section "Critères de scoring" éditable
  - [ ] Section "Fiche publique" affiche un iframe avec la fiche pré-générée
  - [ ] Click "Copier le lien public" → toast OK
  - [ ] Ouvrir le lien public dans un onglet privé → fiche s'affiche correctement
- [ ] Click sur "UX Designer Mid" (sans fiche)
  - [ ] Saisir un brief court ("Designer senior, sensibilité éditoriale, mention du télétravail")
  - [ ] Click "Générer" → la fiche apparaît dans l'iframe en < 30s
  - [ ] Vérifier visuellement : marron #5C3A1E, max-width 720px, bouton CTA, footer <Votre Marque>
  - [ ] Saisir un feedback ("Ajouter une section 'Process de recrutement' avec 4 étapes")
  - [ ] Click "Régénérer" → la nouvelle version contient la section demandée
- [ ] **Création poste IA bout en bout** :
  - [ ] Bouton "+ Nouveau poste"
  - [ ] Titre "QA Test — Product Manager", description riche (5 lignes)
  - [ ] Click "Générer critères avec l'IA" → 4-8 critères apparaissent, poids cohérents
  - [ ] Modifier 1 critère manuellement (changer poids et description)
  - [ ] Click "Créer" → redirection détail
- [ ] **Création formulaire Formbricks** sur le poste fraîchement créé :
  - [ ] Click "Créer le formulaire"
  - [ ] Lien Formbricks affiché, ouvre un survey valide avec les 5 questions standard + ~5 IA
  - [ ] Soumettre une candidature de test sur le survey → vérifier en BD que la candidature apparaît avec statut=`score` (worker a tourné)
- [ ] Modifier le statut du poste à "ferme" → enregistré

## C. Onglet Candidatures
- [ ] Liste affiche les 20 candidatures + la candidature test du B
- [ ] Vue cards : couleur de bord gauche varie selon score (vert/ambre/rouge)
- [ ] Vue table : tri par défaut score DESC NULLS LAST
- [ ] Filtres statut : "Tous", "Score" (~20), "Entretien" (vide), etc.
- [ ] Une candidature flaggée (P1-5) a un fond ambre + warning visible
- [ ] Détail d'une candidature avec score 88 :
  - [ ] Score IA s'affiche, recommandation "retenir" (badge vert)
  - [ ] Rapport markdown rendu correctement (titres, listes, gras)
  - [ ] CV link OK, "Texte extrait" se déplie
  - [ ] LinkedIn data se déplie (sur les candidatures avec linkedin_data)
  - [ ] Réponses formulaire affichées
  - [ ] Modifier le score manuel (passer de 88 à 92), enregistrer → toast OK
  - [ ] Modifier statut à "entretien" → propagé en BD
  - [ ] Notes RH : taper du texte, vérifier que "Auto-sauvegarde activée" change pendant 1s puis revient
  - [ ] Click "Re-scorer" → toast "Re-scoring lancé" ; ouvrir Coolify logs worker → voir le job tourner ; rafraîchir la page → score recalculé

## D. Onglet Communications
- [ ] Liste affiche 20 communications de la seed (4 brouillon, 4 valide, 12 envoyé)
- [ ] Filtres "Brouillon", "Envoyé" filtrent correctement
- [ ] Click sur une comm → "Voir candidature" navigue vers le détail
- [ ] **Test envoi réel** :
  - [ ] Sur une candidature avec brouillon, modifier le sujet/contenu
  - [ ] Click "Valider et envoyer" → toast "Email validé et envoi déclenché"
  - [ ] Vérifier l'arrivée de l'email dans la boîte (`example.test` ou ta boîte perso)
  - [ ] Vérifier que `[LIEN_CALENDLY]` a été remplacé par un vrai lien
  - [ ] Click sur le lien Calendly → page de réservation s'ouvre
  - [ ] En BD : statut comm = `envoye`, statut candidature = `entretien`
- [ ] **Génération nouveau brouillon** :
  - [ ] Sur une candidature : section "Générer un brouillon" → type "refus" → click
  - [ ] Nouveau brouillon apparaît dans la section Communications, ton respectueux

## E. Onglet Analytics
- [ ] KPI cards : postes ouverts ≥ 2, candidatures ≥ 20, score moyen ≈ 57, emails envoyés ≥ 12
- [ ] Distribution : 4 barres avec hauteurs cohérentes (excellent/bon/moyen/faible)
- [ ] Tableau par poste : 5 lignes (4 seedés + le QA Test du B)
- [ ] Toutes les valeurs cohérentes avec une query SQL directe (`SELECT COUNT(*) ...`)

## F. Onglet Prompts IA
- [ ] Sidebar liste les 6 prompts (scoring, email, formulaire, guardrails, criteres, fiche)
- [ ] Click sur "Scoring candidat" → editor + variables_disponibles affichées
- [ ] Modifier le system prompt (ex: ajouter une ligne "Sois concis dans le rapport.")
- [ ] Toggle Preview ↔ Source fonctionne
- [ ] Click "Enregistrer" → version v2 apparaît
- [ ] Section Historique → v1 listé → click "Restaurer" → v3 créée avec contenu de v1
- [ ] Re-scorer une candidature → vérifier que la nouvelle version est utilisée (changement subtil dans le rapport)
- [ ] Changer le modèle à `claude-haiku-4-5` → enregistrer → re-scorer → vérifier dans `scores.model_version` que c'est appliqué (note: le model_version est hardcodé pour l'instant ; à vérifier post-merge)

## G. Webhook Formbricks bout en bout (test E2E réel)
- [ ] Sur le poste QA Test du B, lien le formulaire au worker (`formbricks_survey_id` OK en BD)
- [ ] Soumettre une candidature de test sur le formulaire Formbricks
- [ ] Coolify logs API → voir `POST /webhooks/formbricks` → 202
- [ ] Coolify logs worker → `intake` puis `scoring` runs successfully
- [ ] En BD : nouvelle candidature, score, brouillon présents en < 60s

## H. Système & monitoring
- [ ] Heartbeat ntfy/Slack reçu à l'heure pile suivante
- [ ] Forcer un échec : modifier temporairement le prompt scoring pour générer un JSON invalide → re-scorer → vérifier que l'alerte ntfy/Slack arrive (puis remettre le prompt OK)

## Critères "go cutover"
- [ ] 100 % des items A-H ✓
- [ ] 0 erreur 5xx dans les logs API sur les 24h précédant la QA
- [ ] 0 job en `failed` (ou seulement les volontaires de H)
