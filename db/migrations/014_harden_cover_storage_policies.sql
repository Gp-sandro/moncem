-- Remove older duplicate/broad cover policies so ownership is enforced by path.
-- Required upload path: {auth.uid()}/{uuid}/cover.{ext}

DROP POLICY IF EXISTS "authenticated users can upload covers" ON storage.objects;
DROP POLICY IF EXISTS "public can read covers" ON storage.objects;
DROP POLICY IF EXISTS "users can delete own covers" ON storage.objects;
DROP POLICY IF EXISTS "covers_select_public" ON storage.objects;
DROP POLICY IF EXISTS "covers_insert_own_path" ON storage.objects;
DROP POLICY IF EXISTS "covers_update_own_path" ON storage.objects;
DROP POLICY IF EXISTS "covers_delete_own_path" ON storage.objects;

CREATE POLICY "covers_select_public"
ON storage.objects
FOR SELECT
USING (bucket_id = 'covers');

CREATE POLICY "covers_insert_own_path"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'covers'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "covers_update_own_path"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'covers'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'covers'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "covers_delete_own_path"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'covers'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
