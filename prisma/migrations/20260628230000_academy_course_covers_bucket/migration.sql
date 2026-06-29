-- Public bucket for Academy course cover images (admin upload via service role)

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'academy-courses',
  'academy-courses',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Public read academy course covers'
  ) THEN
    CREATE POLICY "Public read academy course covers"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'academy-courses');
  END IF;
END $$;
