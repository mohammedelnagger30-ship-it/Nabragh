/*
# Storage bucket policies for videos, avatars, thumbnails, CVs

## Overview
Sets up RLS policies on storage.objects so authenticated users can upload files
to the appropriate buckets, and anyone can read them (public buckets).
Update/Delete are restricted to the file owner (identified by the first path
segment matching auth.uid()).

## Policies
- videos bucket: authenticated can upload, all can read
- avatars bucket: authenticated can upload, all can read
- thumbnails bucket: authenticated can upload, all can read
- cvs bucket: authenticated can upload, all can read
*/

-- Allow anyone to list buckets
DROP POLICY IF EXISTS "public_bucket_list" ON storage.buckets;
CREATE POLICY "public_bucket_list" ON storage.buckets FOR SELECT
  TO anon, authenticated USING (true);

-- Videos bucket policies
DROP POLICY IF EXISTS "videos_read" ON storage.objects;
CREATE POLICY "videos_read" ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id = 'videos');

DROP POLICY IF EXISTS "videos_insert" ON storage.objects;
CREATE POLICY "videos_insert" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'videos' AND name LIKE auth.uid()::text || '/%');

DROP POLICY IF EXISTS "videos_update" ON storage.objects;
CREATE POLICY "videos_update" ON storage.objects FOR UPDATE
  TO authenticated USING (bucket_id = 'videos' AND name LIKE auth.uid()::text || '/%');

DROP POLICY IF EXISTS "videos_delete" ON storage.objects;
CREATE POLICY "videos_delete" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'videos' AND name LIKE auth.uid()::text || '/%');

-- Avatars bucket policies
DROP POLICY IF EXISTS "avatars_read" ON storage.objects;
CREATE POLICY "avatars_read" ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_insert" ON storage.objects;
CREATE POLICY "avatars_insert" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'avatars' AND name LIKE auth.uid()::text || '/%');

DROP POLICY IF EXISTS "avatars_update" ON storage.objects;
CREATE POLICY "avatars_update" ON storage.objects FOR UPDATE
  TO authenticated USING (bucket_id = 'avatars' AND name LIKE auth.uid()::text || '/%');

DROP POLICY IF EXISTS "avatars_delete" ON storage.objects;
CREATE POLICY "avatars_delete" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'avatars' AND name LIKE auth.uid()::text || '/%');

-- Thumbnails bucket policies
DROP POLICY IF EXISTS "thumbnails_read" ON storage.objects;
CREATE POLICY "thumbnails_read" ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id = 'thumbnails');

DROP POLICY IF EXISTS "thumbnails_insert" ON storage.objects;
CREATE POLICY "thumbnails_insert" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'thumbnails' AND name LIKE auth.uid()::text || '/%');

DROP POLICY IF EXISTS "thumbnails_update" ON storage.objects;
CREATE POLICY "thumbnails_update" ON storage.objects FOR UPDATE
  TO authenticated USING (bucket_id = 'thumbnails' AND name LIKE auth.uid()::text || '/%');

DROP POLICY IF EXISTS "thumbnails_delete" ON storage.objects;
CREATE POLICY "thumbnails_delete" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'thumbnails' AND name LIKE auth.uid()::text || '/%');

-- CVs bucket policies
DROP POLICY IF EXISTS "cvs_read" ON storage.objects;
CREATE POLICY "cvs_read" ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id = 'cvs');

DROP POLICY IF EXISTS "cvs_insert" ON storage.objects;
CREATE POLICY "cvs_insert" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'cvs' AND name LIKE auth.uid()::text || '/%');

DROP POLICY IF EXISTS "cvs_update" ON storage.objects;
CREATE POLICY "cvs_update" ON storage.objects FOR UPDATE
  TO authenticated USING (bucket_id = 'cvs' AND name LIKE auth.uid()::text || '/%');

DROP POLICY IF EXISTS "cvs_delete" ON storage.objects;
CREATE POLICY "cvs_delete" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'cvs' AND name LIKE auth.uid()::text || '/%');