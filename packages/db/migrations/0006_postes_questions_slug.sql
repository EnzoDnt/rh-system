ALTER TABLE postes ADD COLUMN IF NOT EXISTS slug text UNIQUE;
ALTER TABLE postes ADD COLUMN IF NOT EXISTS questions_json jsonb;

-- Backfill slug pour les postes existants à partir du titre
UPDATE postes
SET slug = lower(regexp_replace(regexp_replace(titre, '[^a-zA-Z0-9\s]', '', 'g'), '\s+', '-', 'g')) || '-' || substr(id::text, 1, 8)
WHERE slug IS NULL;

-- Garder formbricks_survey_id pour rétro-compat (sera dropé en Phase 5B après bascule UI)
COMMENT ON COLUMN postes.questions_json IS
  'Array of question definitions: [{id, type, label, required, options?, placeholder?, help_text?}]. Replaces Formbricks surveys.';
COMMENT ON COLUMN postes.slug IS
  'URL-friendly identifier for the public application form (/postuler/:slug)';
