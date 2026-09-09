ALTER TABLE subscriptions ALTER COLUMN teacher_id DROP NOT NULL;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'paid';
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS notes text;

ALTER TABLE courses ADD COLUMN IF NOT EXISTS live_url text;

CREATE TABLE IF NOT EXISTS course_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(course_id, student_id)
);
ALTER TABLE course_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS course_reviews_select ON course_reviews;
CREATE POLICY course_reviews_select ON course_reviews FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS course_reviews_insert ON course_reviews;
CREATE POLICY course_reviews_insert ON course_reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = student_id);
DROP POLICY IF EXISTS course_reviews_update ON course_reviews;
CREATE POLICY course_reviews_update ON course_reviews FOR UPDATE TO authenticated USING (auth.uid() = student_id) WITH CHECK (auth.uid() = student_id);
DROP POLICY IF EXISTS course_reviews_delete ON course_reviews;
CREATE POLICY course_reviews_delete ON course_reviews FOR DELETE TO authenticated USING (auth.uid() = student_id);

CREATE TABLE IF NOT EXISTS playlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_public boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY playlists_select ON playlists FOR SELECT TO authenticated USING (auth.uid() = student_id OR is_public);
CREATE POLICY playlists_insert ON playlists FOR INSERT TO authenticated WITH CHECK (auth.uid() = student_id);
CREATE POLICY playlists_update ON playlists FOR UPDATE TO authenticated USING (auth.uid() = student_id) WITH CHECK (auth.uid() = student_id);
CREATE POLICY playlists_delete ON playlists FOR DELETE TO authenticated USING (auth.uid() = student_id);

CREATE TABLE IF NOT EXISTS playlist_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id uuid NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  video_id uuid NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  added_at timestamptz DEFAULT now(),
  UNIQUE(playlist_id, video_id)
);
ALTER TABLE playlist_videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY playlist_videos_select ON playlist_videos FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM playlists WHERE playlists.id = playlist_videos.playlist_id AND (playlists.student_id = auth.uid() OR playlists.is_public))
);
CREATE POLICY playlist_videos_manage ON playlist_videos FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM playlists WHERE playlists.id = playlist_videos.playlist_id AND playlists.student_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM playlists WHERE playlists.id = playlist_videos.playlist_id AND playlists.student_id = auth.uid())
);
