-- Create the 'cvs' storage bucket (public read, authenticated write via signed URL).
-- Wrapped in a DO block to skip silently in CI where Supabase Storage schema doesn't exist.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'storage' AND table_name = 'buckets'
  ) THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES ('cvs', 'cvs', true, 5242880, ARRAY['application/pdf'])
    ON CONFLICT (id) DO UPDATE SET
      public = true,
      file_size_limit = 5242880,
      allowed_mime_types = ARRAY['application/pdf'];

    -- Public read policy
    DROP POLICY IF EXISTS "Public read access on cvs" ON storage.objects;
    CREATE POLICY "Public read access on cvs" ON storage.objects
      FOR SELECT TO public
      USING (bucket_id = 'cvs');

    -- Public write via signed URL (Supabase generates time-limited tokens)
    DROP POLICY IF EXISTS "Public write via signed URL on cvs" ON storage.objects;
    CREATE POLICY "Public write via signed URL on cvs" ON storage.objects
      FOR INSERT TO public
      WITH CHECK (bucket_id = 'cvs');
  ELSE
    RAISE NOTICE 'storage.buckets does not exist, skipping cvs bucket setup (run on Supabase only)';
  END IF;
END $$;
