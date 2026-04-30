-- Migration 0008: Drop Formbricks survey ID column
-- Safe to run: no code reads formbricks_survey_id after Phase 5B merge.
-- The native form (Phase 5A) uses postes.slug + questions_json instead.

DROP INDEX IF EXISTS idx_postes_formbricks;
ALTER TABLE postes DROP COLUMN IF EXISTS formbricks_survey_id;
