-- غرف البث المباشر لكل مدرس (تدور داخل صفحة المدرس)
CREATE TABLE IF NOT EXISTS live_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  title text,
  room_url text,
  is_live boolean NOT NULL DEFAULT false,
  started_at timestamptz,
  viewers_count integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE live_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS live_sessions_select ON live_sessions;
CREATE POLICY live_sessions_select ON live_sessions FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS live_sessions_insert ON live_sessions;
CREATE POLICY live_sessions_insert ON live_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = teacher_id);

DROP POLICY IF EXISTS live_sessions_update ON live_sessions;
CREATE POLICY live_sessions_update ON live_sessions FOR UPDATE TO authenticated USING (auth.uid() = teacher_id) WITH CHECK (auth.uid() = teacher_id);

DROP POLICY IF EXISTS live_sessions_delete ON live_sessions;
CREATE POLICY live_sessions_delete ON live_sessions FOR DELETE TO authenticated USING (auth.uid() = teacher_id);