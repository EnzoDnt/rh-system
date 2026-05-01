-- Auto-generate postes.slug on INSERT when null.
-- Fixes a bug where POST /api/postes left slug=NULL, breaking the public
-- application URL /postuler/<slug>. Same logic as the backfill in 0006.

CREATE OR REPLACE FUNCTION generate_poste_slug() RETURNS trigger AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := lower(regexp_replace(regexp_replace(NEW.titre, '[^a-zA-Z0-9\s]', '', 'g'), '\s+', '-', 'g')) || '-' || substr(NEW.id::text, 1, 8);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_poste_slug ON postes;
CREATE TRIGGER trg_generate_poste_slug
BEFORE INSERT ON postes
FOR EACH ROW
EXECUTE FUNCTION generate_poste_slug();

-- Backfill any rows that still have NULL/empty slug (idempotent — same as 0006)
UPDATE postes
SET slug = lower(regexp_replace(regexp_replace(titre, '[^a-zA-Z0-9\s]', '', 'g'), '\s+', '-', 'g')) || '-' || substr(id::text, 1, 8)
WHERE slug IS NULL OR slug = '';
