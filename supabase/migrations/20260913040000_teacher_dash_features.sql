-- Teacher dashboard features:
--  1) teacher_questions   – student asks, teacher answers (public once answered)
--  2) messages            – direct student <-> teacher chat
--  3) live_sessions       – add scheduling columns (sessions were never used in UI)
--  4) live_session_bookings – students book a scheduled live session
--  5) teacher_packages    – teacher offers/packages shown on public page

-- ── 1) teacher_questions ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS teacher_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  question text NOT NULL,
  answer text,
  answered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tq_teacher ON teacher_questions(teacher_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tq_student ON teacher_questions(student_id, created_at DESC);

ALTER TABLE teacher_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tq_select ON teacher_questions;
CREATE POLICY tq_select ON teacher_questions FOR SELECT TO anon, authenticated
  USING (answered_at IS NOT NULL OR auth.uid() = teacher_id OR auth.uid() = student_id);
DROP POLICY IF EXISTS tq_insert ON teacher_questions;
CREATE POLICY tq_insert ON teacher_questions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = student_id AND auth.uid() <> teacher_id);
DROP POLICY IF EXISTS tq_update ON teacher_questions;
CREATE POLICY tq_update ON teacher_questions FOR UPDATE TO authenticated
  USING (auth.uid() = teacher_id) WITH CHECK (auth.uid() = teacher_id);
DROP POLICY IF EXISTS tq_delete ON teacher_questions;
CREATE POLICY tq_delete ON teacher_questions FOR DELETE TO authenticated
  USING (auth.uid() = teacher_id OR is_admin());

-- ── 2) messages ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_messages_convo ON messages(sender_id, receiver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id, read_at) WHERE read_at IS NULL;

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS msg_select ON messages;
CREATE POLICY msg_select ON messages FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
DROP POLICY IF EXISTS msg_insert ON messages;
CREATE POLICY msg_insert ON messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id);
DROP POLICY IF EXISTS msg_update ON messages;
CREATE POLICY msg_update ON messages FOR UPDATE TO authenticated
  USING (auth.uid() = receiver_id) WITH CHECK (auth.uid() = receiver_id);
DROP POLICY IF EXISTS msg_delete ON messages;
CREATE POLICY msg_delete ON messages FOR DELETE TO authenticated
  USING (auth.uid() IN (sender_id, receiver_id));

-- ── 3) live_sessions: scheduling ───────────────────────────────────────
ALTER TABLE live_sessions DROP CONSTRAINT IF EXISTS live_sessions_teacher_id_key;
ALTER TABLE live_sessions ADD COLUMN IF NOT EXISTS scheduled_at timestamptz;
ALTER TABLE live_sessions ADD COLUMN IF NOT EXISTS duration_minutes integer NOT NULL DEFAULT 60;
ALTER TABLE live_sessions ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'scheduled';

-- ── 4) live_session_bookings ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS live_session_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(session_id, student_id)
);
CREATE INDEX IF NOT EXISTS idx_lsb_student ON live_session_bookings(student_id, created_at DESC);

ALTER TABLE live_session_bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lsb_select ON live_session_bookings;
CREATE POLICY lsb_select ON live_session_bookings FOR SELECT TO authenticated
  USING (auth.uid() = student_id OR EXISTS (SELECT 1 FROM live_sessions s WHERE s.id = session_id AND s.teacher_id = auth.uid()));
DROP POLICY IF EXISTS lsb_insert ON live_session_bookings;
CREATE POLICY lsb_insert ON live_session_bookings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = student_id);
DROP POLICY IF EXISTS lsb_delete ON live_session_bookings;
CREATE POLICY lsb_delete ON live_session_bookings FOR DELETE TO authenticated
  USING (auth.uid() = student_id OR EXISTS (SELECT 1 FROM live_sessions s WHERE s.id = session_id AND s.teacher_id = auth.uid()));

-- ── 5) teacher_packages ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS teacher_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  price numeric(10,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  duration_days integer NOT NULL DEFAULT 30,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tp_teacher ON teacher_packages(teacher_id, created_at DESC);

ALTER TABLE teacher_packages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tp_select ON teacher_packages;
CREATE POLICY tp_select ON teacher_packages FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS tp_insert ON teacher_packages;
CREATE POLICY tp_insert ON teacher_packages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = teacher_id);
DROP POLICY IF EXISTS tp_update ON teacher_packages;
CREATE POLICY tp_update ON teacher_packages FOR UPDATE TO authenticated
  USING (auth.uid() = teacher_id) WITH CHECK (auth.uid() = teacher_id);
DROP POLICY IF EXISTS tp_delete ON teacher_packages;
CREATE POLICY tp_delete ON teacher_packages FOR DELETE TO authenticated
  USING (auth.uid() = teacher_id);