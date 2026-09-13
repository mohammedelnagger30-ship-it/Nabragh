/*
# Create storage buckets (avatars, videos, cvs)

## Overview
The storage object policies already existed, but the buckets themselves were
never created (storage.buckets was empty), so avatar/CV/video uploads failed
with "bucket not found". This migration creates the buckets that the app uses:

- avatars (public, 5 MB, images only) — teacher & student profile pictures
- videos (private, 100 MB, mp4/webm/ogg) — teachers' uploaded lessons
- cvs (private, 10 MB, pdf/images) — teachers' CV documents

Already applied to the linked project via `supabase db query`.
*/

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('videos', 'videos', false, 104857600, ARRAY['video/mp4', 'video/webm', 'video/ogg']),
  ('cvs', 'cvs', false, 10485760, ARRAY['application/pdf', 'image/jpeg', 'image/png'])
ON CONFLICT (id) DO NOTHING;

-- Avatars: public read, owner write
CREATE POLICY "Public read access for avatars"
  ON storage.objects FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (string_to_array(name, '/'))[1]);

CREATE POLICY "Users can delete own avatar"
  ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (string_to_array(name, '/'))[1]);

-- Videos: owner read/write only (accessed via signed URLs)
CREATE POLICY "Owner read access for videos"
  ON storage.objects FOR SELECT USING (bucket_id = 'videos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Owner upload videos"
  ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'videos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Owner delete own videos"
  ON storage.objects FOR DELETE USING (bucket_id = 'videos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- CVs: owner read/write only
CREATE POLICY "Owner read access for cvs"
  ON storage.objects FOR SELECT USING (bucket_id = 'cvs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Owner upload cvs"
  ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'cvs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Owner delete own cvs"
  ON storage.objects FOR DELETE USING (bucket_id = 'cvs' AND (storage.foldername(name))[1] = auth.uid()::text);