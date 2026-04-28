-- 0002_ai_calls_table.sql
-- Track every Anthropic API call for cost visibility + analytics.

CREATE TABLE IF NOT EXISTS ai_calls (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_type           text NOT NULL,
  model                 text NOT NULL,
  input_tokens          integer NOT NULL DEFAULT 0,
  output_tokens         integer NOT NULL DEFAULT 0,
  cache_creation_tokens integer NOT NULL DEFAULT 0,
  cache_read_tokens     integer NOT NULL DEFAULT 0,
  cost_eur              numeric(10,6) NOT NULL DEFAULT 0,
  candidature_id        uuid REFERENCES candidatures(id) ON DELETE SET NULL,
  poste_id              uuid REFERENCES postes(id) ON DELETE SET NULL,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_calls_created_at ON ai_calls (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_calls_prompt_type ON ai_calls (prompt_type);

ALTER TABLE ai_calls ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'CREATE POLICY "authenticated all" ON ai_calls FOR ALL TO authenticated USING (true) WITH CHECK (true)';
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
