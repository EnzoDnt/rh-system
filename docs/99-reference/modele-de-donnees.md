# 01 — Modèle de données

> **Source** : déduit en lisant toutes les requêtes SQL des 25 backends ([f/rh/app.raw_app/backend/](../../f/rh/app.raw_app/backend/)) et des inline scripts des 3 flows. Le DDL fourni ici est **prêt à exécuter sur Postgres ≥ 14**.

---

## 1. Vue d'ensemble

6 tables, toutes dans le schéma public d'une seule base Postgres :

```
postes ─────┬──< candidatures ─┬──< scores (1-1)
            │                  └──< communications
            │
            └─── (lien via formbricks_survey_id, pas de FK)

prompts ──< prompts_history
```

Conventions :
- Tous les IDs : `UUID DEFAULT gen_random_uuid()`
- Toutes les dates : `TIMESTAMP DEFAULT NOW()` (sans timezone — l'app affiche en `fr-FR`)
- 5 colonnes JSONB : `criteres_scoring`, `reponses_formulaire`, `linkedin_data`, `scores_details`, `variables_disponibles`

## 2. DDL Postgres (à exécuter dans l'ordre)

### Extension requise

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- pour gen_random_uuid()
```

### Table `postes`

```sql
CREATE TABLE postes (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titre                 TEXT NOT NULL,
  description           TEXT,
  criteres_scoring      JSONB NOT NULL DEFAULT '{}'::jsonb,
  formbricks_survey_id  TEXT,
  calendly_event_type   TEXT,
  fiche_html            TEXT,        -- HTML complet servi sur /fiches/:id
  fiche_brief           TEXT,        -- brief utilisateur pour génération IA
  statut                TEXT NOT NULL DEFAULT 'ouvert'
                          CHECK (statut IN ('ouvert', 'en_cours', 'ferme')),
  created_at            TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_postes_statut          ON postes(statut);
CREATE INDEX idx_postes_formbricks      ON postes(formbricks_survey_id) WHERE formbricks_survey_id IS NOT NULL;
CREATE INDEX idx_postes_created_at      ON postes(created_at DESC);
```

**Format `criteres_scoring`** :
```json
{
  "competences_techniques": { "poids": 8, "description": "Maîtrise des technologies requises" },
  "experience": { "poids": 7, "description": "Années et pertinence de l'expérience" },
  "formation": { "poids": 5, "description": "Diplômes et certifications" },
  "soft_skills": { "poids": 6, "description": "Communication, équipe, adaptabilité" }
}
```
Clés : `snake_case` libre (généré par Claude). Valeurs : `{ poids: number, description: string }`. Le total des `poids` doit faire 100 d'après le prompt scoring (cf. [04-prompts-ia.md](04-prompts-ia.md)).

### Table `candidatures`

```sql
CREATE TABLE candidatures (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poste_id              UUID NOT NULL REFERENCES postes(id) ON DELETE CASCADE,
  nom                   TEXT NOT NULL,
  email                 TEXT NOT NULL,
  telephone             TEXT,
  cv_url                TEXT,
  cv_texte_extrait      TEXT,        -- texte brut extrait du PDF (par unpdf)
  linkedin_url          TEXT,
  linkedin_data         JSONB DEFAULT '{}'::jsonb,
  reponses_formulaire   JSONB NOT NULL DEFAULT '{}'::jsonb,
  flagged               BOOLEAN NOT NULL DEFAULT false,
  flag_motif            TEXT,
  notes_rh              TEXT,
  statut                TEXT NOT NULL DEFAULT 'nouveau'
                          CHECK (statut IN (
                            'nouveau','en_analyse','score',
                            'en_cours','entretien','offre',
                            'accepte','refuse','archive'
                          )),
  created_at            TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cand_poste_id   ON candidatures(poste_id);
CREATE INDEX idx_cand_statut     ON candidatures(statut);
CREATE INDEX idx_cand_flagged    ON candidatures(flagged) WHERE flagged = true;
CREATE INDEX idx_cand_email      ON candidatures(email);
CREATE INDEX idx_cand_created_at ON candidatures(created_at DESC);
```

> **⚠️ BUG CONNU À CORRIGER** : Le backend [update_candidature_statut.ts](../../f/rh/app.raw_app/backend/update_candidature_statut.ts) liste 7 statuts valides (`nouveau`, `en_cours`, `entretien`, `offre`, `accepte`, `refuse`, `archive`) **mais** les flows utilisent aussi `en_analyse` et `score` (set par `scoring.flow` étape `load_data` et `save_score`). Le CHECK ci-dessus accepte les 9. À aligner côté API : soit étendre la whitelist (recommandé), soit retirer `en_analyse`/`score` (mauvaise idée — perd de l'info).

**Format `reponses_formulaire`** : objet plat `{ "question_id": "réponse", ... }`. Les IDs sont définis par Formbricks (`q1`, `q2`, ...) ou par le label si Formbricks fallback. Voir le mapping dans le step `validate_payload` du flow intake (cf. [03-flows-jobs.md](03-flows-jobs.md#validate_payload)).

**Format `linkedin_data`** : objet retourné par le scraper Apify, normalisé :
```json
{
  "name": "...",
  "headline": "...",
  "summary": "...",
  "location": "...",
  "experience": [...],
  "education": [...],
  "skills": [...],
  "languages": [...],
  "certifications": [...],
  "profileUrl": "...",
  "profilePicture": "...",
  "connectionCount": 500
}
```
Cf. [scrape_linkedin.ts](../../f/rh/scrape_linkedin.ts) pour la liste exhaustive des champs et leurs fallbacks Apify.

### Table `scores`

```sql
CREATE TABLE scores (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidature_id  UUID NOT NULL UNIQUE REFERENCES candidatures(id) ON DELETE CASCADE,
  score_global    INTEGER CHECK (score_global >= 0 AND score_global <= 100),
  scores_details  JSONB NOT NULL DEFAULT '{}'::jsonb,
  rapport_ia      TEXT,
  recommandation  TEXT CHECK (recommandation IN ('retenir', 'a_voir', 'refuser')),
  action_proposee JSONB,            -- réservé pour usage futur, actuellement NULL
  model_version   TEXT,             -- ex: "claude-sonnet-4-6"
  created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_scores_candidature ON scores(candidature_id);
CREATE INDEX idx_scores_recommandation ON scores(recommandation);
CREATE INDEX idx_scores_score_global ON scores(score_global DESC);
```

**Note `UNIQUE candidature_id`** : un seul score par candidature. Le flow scoring fait un `INSERT ... ON CONFLICT (candidature_id) DO UPDATE` (cf. [scoring.flow inline `save_score`](../../f/rh/scoring.flow/sauvegarder_le_score_et_mettre_à_jour_le_statut.inline_script.ts)).

**Format `scores_details`** : `{ "<nom_critere>": <number 0-100>, ... }`. Une clé par critère défini dans `postes.criteres_scoring`. Exemple :
```json
{ "competences_techniques": 78, "experience": 62, "formation": 85, "soft_skills": 70 }
```

### Table `communications`

```sql
CREATE TABLE communications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidature_id  UUID NOT NULL REFERENCES candidatures(id) ON DELETE CASCADE,
  type            TEXT NOT NULL
                    CHECK (type IN ('invitation','refus','relance','accuse_reception')),
  sujet           TEXT NOT NULL,
  contenu         TEXT NOT NULL,
  statut          TEXT NOT NULL DEFAULT 'brouillon'
                    CHECK (statut IN ('brouillon','valide','envoye','erreur')),
  calendly_link   TEXT,             -- URL Calendly injectée par flow communication si type='invitation'
  envoye_at       TIMESTAMP,
  created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_comm_candidature ON communications(candidature_id);
CREATE INDEX idx_comm_statut      ON communications(statut);
CREATE INDEX idx_comm_type        ON communications(type);
CREATE INDEX idx_comm_created_at  ON communications(created_at DESC);
```

### Table `prompts`

```sql
CREATE TABLE prompts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom                   TEXT NOT NULL,
  type                  TEXT NOT NULL UNIQUE,
  system_prompt         TEXT NOT NULL,
  model                 TEXT NOT NULL DEFAULT 'claude-sonnet-4-6',
  variables_disponibles JSONB NOT NULL DEFAULT '[]'::jsonb,
  version               INTEGER NOT NULL DEFAULT 1,
  updated_at            TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at            TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_prompts_type ON prompts(type);
```

**Types de prompts attendus** (cf. [04-prompts-ia.md](04-prompts-ia.md) pour le contenu complet) :
- `scoring_candidat`
- `generation_email`
- `generation_formulaire`
- `guardrails`
- `generation_criteres`
- `generation_fiche_poste`

**Format `variables_disponibles`** : array `[{ "nom": "...", "description": "..." }]` — utilisé uniquement pour affichage UI dans l'onglet Prompts (aide à la rédaction du system prompt par l'utilisateur). Pas de validation runtime.

### Table `prompts_history`

```sql
CREATE TABLE prompts_history (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id     UUID NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
  system_prompt TEXT NOT NULL,
  model         TEXT NOT NULL,
  version       INTEGER NOT NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_history_prompt_id ON prompts_history(prompt_id, version DESC);
```

**Comportement versioning** :
- À chaque `update_prompt`, on `INSERT` l'ancienne version dans `prompts_history` puis on met à jour `prompts.version = current.version + 1`
- À chaque `restore_prompt`, on archive la version actuelle dans `prompts_history` (préserve l'historique linéaire), puis on remplace `prompts` par la version restaurée + nouveau numéro de version

Logique exacte : voir [update_prompt.ts](../../f/rh/app.raw_app/backend/update_prompt.ts) et [restore_prompt.ts](../../f/rh/app.raw_app/backend/restore_prompt.ts).

## 3. Triggers `updated_at` (recommandé)

Les backends Windmill mettent `updated_at = NOW()` manuellement à chaque UPDATE, ce qui est fragile. Mieux : un trigger global.

```sql
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_postes_updated_at
  BEFORE UPDATE ON postes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_cand_updated_at
  BEFORE UPDATE ON candidatures
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_scores_updated_at
  BEFORE UPDATE ON scores
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_comm_updated_at
  BEFORE UPDATE ON communications
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_prompts_updated_at
  BEFORE UPDATE ON prompts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

## 4. Stratégie Supabase (RLS, schémas)

Si on utilise Supabase comme cible :

- **Schéma** : tout dans `public` (par défaut). Pas d'isolation multi-tenant nécessaire (un seul cabinet RH = <Votre Marque>).
- **RLS (Row Level Security)** : recommandé d'activer mais avec policy permissive si l'app a un seul rôle utilisateur.
  ```sql
  ALTER TABLE postes ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "authenticated read/write" ON postes
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
  -- Idem pour les 5 autres tables
  ```
  Si plusieurs rôles plus tard (ex: `admin` vs `recruteur` vs `manager`), affiner via `auth.jwt()->>'role'`.
- **Endpoints publics** (`/fiches/:id`, `/webhooks/formbricks`) : ne passent PAS par Supabase RLS, ils tapent directement la BD via la clé `service_role` côté API.
- **Realtime** : utile potentiellement pour les changements de statut de candidatures en temps réel multi-utilisateur. Pas utilisé actuellement, à laisser de côté pour la v1.
- **Storage** : si on veut héberger les CV PDF directement (au lieu de liens Drive externes), créer un bucket `cvs` avec policy authenticated upload/read.

## 5. Migration des données depuis Windmill

L'instance Windmill expose un Postgres interne au datatable `project_rh`. Le user n'a probablement pas d'accès direct mais Windmill propose un export.

### Option A : via UI Windmill (recommandé pour ce volume)
1. Dans l'UI Windmill, datatable `project_rh` → exporter chaque table en CSV
2. Importer les CSV dans Supabase via l'UI ou via `\copy`
3. Vérifier les types (UUIDs, JSONB) — possible besoin de cast manuels

### Option B : via `pg_dump` (si accès direct au Postgres Windmill)
```bash
# Depuis l'instance Windmill (ou via tunnel)
pg_dump -h <host> -U <user> -d <db> \
  --schema=project_rh \
  --data-only \
  --table=postes --table=candidatures --table=scores \
  --table=communications --table=prompts --table=prompts_history \
  --column-inserts \
  > project_rh_export.sql

# Adapter le schéma dans le fichier (rechercher/remplacer `project_rh.` par ``)
sed -i '' 's/project_rh\.//g' project_rh_export.sql

# Importer dans Supabase
psql -h db.xxx.supabase.co -U postgres -d postgres < project_rh_export.sql
```

### Option C : script Node de copie ligne par ligne
Si volume faible et accès Windmill via API, écrire un script Node qui :
1. SELECT * sur chaque table via Windmill API (ou via un script Windmill `export_table.bun.ts`)
2. INSERT en lot vers Supabase via Drizzle

### Vérifications post-migration
```sql
SELECT 'postes' AS table, COUNT(*) FROM postes
UNION ALL SELECT 'candidatures', COUNT(*) FROM candidatures
UNION ALL SELECT 'scores', COUNT(*) FROM scores
UNION ALL SELECT 'communications', COUNT(*) FROM communications
UNION ALL SELECT 'prompts', COUNT(*) FROM prompts
UNION ALL SELECT 'prompts_history', COUNT(*) FROM prompts_history;

-- Validation FK
SELECT COUNT(*) FROM candidatures c LEFT JOIN postes p ON c.poste_id = p.id WHERE p.id IS NULL;
SELECT COUNT(*) FROM scores s LEFT JOIN candidatures c ON s.candidature_id = c.id WHERE c.id IS NULL;
SELECT COUNT(*) FROM communications co LEFT JOIN candidatures c ON co.candidature_id = c.id WHERE c.id IS NULL;
-- Tous doivent retourner 0
```

## 6. Seed des prompts IA (post-migration)

Les 6 prompts système doivent être insérés dans la table `prompts`. Le contenu exact des system prompts est dans [04-prompts-ia.md](04-prompts-ia.md).

5 prompts sont seedés par [apply_migration.ts](../../f/rh/app.raw_app/backend/apply_migration.ts) (déjà exécuté en production), le 6ème par [insert_prompt_fiche.bun.ts](../../f/rh/insert_prompt_fiche.bun.ts).

**À faire après migration de la BD** :
- Si tu fais un `pg_dump` complet, les 6 prompts seront déjà présents → vérifier avec `SELECT type FROM prompts;` (doit retourner 6 lignes)
- Sinon : exécuter le script de seed équivalent (cf. [04-prompts-ia.md §6](04-prompts-ia.md))

## 7. Migration historique `005_add_fiche_poste.sql`

Le fichier [sql_to_apply/005_add_fiche_poste.sql](../../f/rh/app.raw_app/sql_to_apply/005_add_fiche_poste.sql) contient :
```sql
ALTER TABLE postes ADD COLUMN IF NOT EXISTS fiche_html TEXT;
ALTER TABLE postes ADD COLUMN IF NOT EXISTS fiche_brief TEXT;
```
Ces deux colonnes sont déjà incluses dans le DDL ci-dessus (§2). Pas besoin de rejouer si on part d'une BD vierge.

## 8. Volumétrie attendue (sizing)

| Table | Volume actuel | Croissance annuelle estimée | 5 ans |
|---|---|---|---|
| postes | ~10 | +5-10/an | ~60 |
| candidatures | ~50-200 | +50-200/an | ~1000 |
| scores | = candidatures | | ~1000 |
| communications | ~100-400 (2× candidatures) | | ~2000 |
| prompts | 6 | 0 (juste version qui monte) | 6 |
| prompts_history | ~10 (10 updates) | +20/an | ~100 |

**Conclusion** : très petite BD. Le plan free de Supabase (500 MB) est largement suffisant pendant des années. Pas besoin d'index avancés ni de partitioning. La principale optimisation est sur les requêtes JOIN avec FILTER (cf. analytics).

## 9. Checklist DBA pour la migration

- [ ] Exécuter le DDL §2 sur la BD cible
- [ ] Activer l'extension `pgcrypto`
- [ ] Créer les triggers `updated_at` §3
- [ ] (Si Supabase) Activer RLS + policies §4
- [ ] Migrer les données existantes §5
- [ ] Seeder les 6 prompts §6 + [04-prompts-ia.md](04-prompts-ia.md)
- [ ] Lancer les vérifications de FK §5
- [ ] Tester un INSERT/UPDATE de chaque table avec un client SQL
- [ ] Documenter les credentials dans Doppler/Infisical

---

**Suivant** : [02-api-contracts.md](02-api-contracts.md) — contrats des ~30 endpoints REST avec mapping vers les backends Windmill source.
