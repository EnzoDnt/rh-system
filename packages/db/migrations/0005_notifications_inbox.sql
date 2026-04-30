CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('info', 'warn', 'error')),
  titre text NOT NULL,
  message text NOT NULL,
  contexte jsonb,
  lue_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifications_unread_idx ON notifications (created_at DESC) WHERE lue_at IS NULL;
