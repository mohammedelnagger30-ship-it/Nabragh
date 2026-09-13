-- Correction: keep live_sessions as the single live-room row (page relies on
-- teacher_id being unique + upsert onConflict). Move scheduled bookable
-- sessions into a dedicated table.
ALTER TABLE live_sessions ADD CONSTRAINT live_sessions_teacher_id_key UNIQUE (teacher_id);
ALTER TABLE live_sessions DROP COLUMN IF EXISTS scheduled_at;
ALTER TABLE live_sessions DROP COLUMN IF EXISTS duration_minutes;
ALTER TABLE live_sessions DROP COLUMN IF EXISTS status;

DROP TABLE IF EXISTS live_session_bookings;

CREATE TABLE IF NOT EXISTS scheduled_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  scheduled_at timestamptz NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 60,
  status text NOT NULL DEFAULT 'scheduled',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ss_teacher ON scheduled_sessions(teacher_id, scheduled_at DESC);

ALTER TABLE scheduled_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ss_select ON scheduled_sessions;
CREATE POLICY ss_select ON scheduled_sessions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS ss_insert ON scheduled_sessions;
CREATE POLICY ss_insert ON scheduled_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = teacher_id);
DROP POLICY IF EXISTS ss_update ON scheduled_sessions;
CREATE POLICY ss_update ON scheduled_sessions FOR UPDATE TO authenticated USING (auth.uid() = teacher_id) WITH CHECK (auth.uid() = teacher_id);
DROP POLICY IF EXISTS ss_delete ON scheduled_sessions;
CREATE POLICY ss_delete ON scheduled_sessions FOR DELETE TO authenticated USING (auth.uid() = teacher_id);

CREATE TABLE IF NOT EXISTS live_session_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES scheduled_sessions(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(session_id, student_id)
);
CREATE INDEX IF NOT EXISTS idx_lsb_student ON live_session_bookings(student_id, created_at DESC);

ALTER TABLE live_session_bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lsb_select ON live_session_bookings;
CREATE POLICY lsb_select ON live_session_bookings FOR SELECT TO authenticated
  USING (auth.uid() = student_id OR EXISTS (SELECT 1 FROM scheduled_sessions s WHERE s.id = session_id AND s.teacher_id = auth.uid()));
DROP POLICY IF EXISTS lsb_insert ON live_session_bookings;
CREATE POLICY lsb_insert ON live_session_bookings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = student_id);
DROP POLICY IF EXISTS lsb_delete ON live_session_bookings;
CREATE POLICY lsb_delete ON live_session_bookings FOR DELETE TO authenticated
  USING (auth.uid() = student_id OR EXISTS (SELECT 1 FROM scheduled_sessions s WHERE s.id = session_id AND s.teacher_id = auth.uid()));