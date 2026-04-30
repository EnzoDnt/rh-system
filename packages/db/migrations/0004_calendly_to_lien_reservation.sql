-- Rename Calendly-specific column to a generic "lien_reservation_url"
-- so users can paste any scheduling URL (Calendly, Cal.com, Notion, Google Form, etc.)
ALTER TABLE postes RENAME COLUMN calendly_event_type TO lien_reservation_url;
COMMENT ON COLUMN postes.lien_reservation_url IS
  'URL publique de réservation (Calendly, Cal.com, Notion, Google Form, etc.). Insérée telle quelle dans les emails.';
