-- Required extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- CHECK constraints (DDL parity with docs/migration/01-data-model.md §2)
ALTER TABLE postes ADD CONSTRAINT postes_statut_check
  CHECK (statut IN ('ouvert', 'en_cours', 'ferme'));

ALTER TABLE candidatures ADD CONSTRAINT candidatures_statut_check
  CHECK (statut IN (
    'nouveau','en_analyse','score',
    'en_cours','entretien','offre',
    'accepte','refuse','archive'
  ));

ALTER TABLE scores ADD CONSTRAINT scores_score_global_check
  CHECK (score_global IS NULL OR (score_global >= 0 AND score_global <= 100));
ALTER TABLE scores ADD CONSTRAINT scores_recommandation_check
  CHECK (recommandation IS NULL OR recommandation IN ('retenir','a_voir','refuser'));

ALTER TABLE communications ADD CONSTRAINT communications_type_check
  CHECK (type IN ('invitation','refus','relance','accuse_reception'));
ALTER TABLE communications ADD CONSTRAINT communications_statut_check
  CHECK (statut IN ('brouillon','valide','envoye','erreur'));

-- updated_at triggers (avoid manual NOW() in every UPDATE)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_postes_updated_at         BEFORE UPDATE ON postes         FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_candidatures_updated_at   BEFORE UPDATE ON candidatures   FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_scores_updated_at         BEFORE UPDATE ON scores         FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_communications_updated_at BEFORE UPDATE ON communications FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_prompts_updated_at        BEFORE UPDATE ON prompts        FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS — permissive policy for the single 'authenticated' role (single-tenant cabinet)
ALTER TABLE postes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidatures   ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores         ENABLE ROW LEVEL SECURITY;
ALTER TABLE communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompts_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated all" ON postes         FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated all" ON candidatures   FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated all" ON scores         FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated all" ON communications FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated all" ON prompts        FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated all" ON prompts_history FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Note: backend/jobs use the service_role key which bypasses RLS by design.
