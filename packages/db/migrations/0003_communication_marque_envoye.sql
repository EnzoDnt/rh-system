-- Add column for tracking when user manually marked as sent via their own mail client
ALTER TABLE communications ADD COLUMN IF NOT EXISTS marque_envoye_at timestamptz;

-- Extend the statut check constraint to include the new 'marque_envoye' value.
-- statut is stored as text and validated by Zod on the API layer; the DB constraint
-- must match the Zod enum.
ALTER TABLE communications DROP CONSTRAINT IF EXISTS communications_statut_check;
ALTER TABLE communications ADD CONSTRAINT communications_statut_check
  CHECK (statut = ANY (ARRAY['brouillon'::text, 'valide'::text, 'envoye'::text, 'erreur'::text, 'marque_envoye'::text]));
