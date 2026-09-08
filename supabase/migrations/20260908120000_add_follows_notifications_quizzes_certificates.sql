-- Social learning, assessment, notifications, and certificates

CREATE TABLE IF NOT EXISTS teacher_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(student_id, teacher_id),
  CHECK (student_id <> teacher_id)
);
ALTER TABLE teacher_follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "follows_select_own" ON teacher_follows FOR SELECT TO authenticated USING (auth.uid() = student_id OR auth.uid() = teacher_id);
CREATE POLICY "follows_insert_own" ON teacher_follows FOR INSERT TO authenticated WITH CHECK (auth.uid() = student_id);
CREATE POLICY "follows_delete_own" ON teacher_follows FOR DELETE TO authenticated USING (auth.uid() = student_id);

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_select_own" ON notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "notifications_update_own" ON notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "notifications_delete_own" ON notifications FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  passing_score integer NOT NULL DEFAULT 70 CHECK (passing_score BETWEEN 1 AND 100),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quizzes_select_published" ON quizzes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "quizzes_manage_teacher" ON quizzes FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM courses WHERE courses.id = quizzes.course_id AND courses.teacher_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM courses WHERE courses.id = quizzes.course_id AND courses.teacher_id = auth.uid()));

CREATE TABLE IF NOT EXISTS quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question text NOT NULL,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  correct_option integer NOT NULL CHECK (correct_option >= 0),
  sort_order integer NOT NULL DEFAULT 0
);
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quiz_questions_select" ON quiz_questions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "quiz_questions_manage_teacher" ON quiz_questions FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM quizzes JOIN courses ON courses.id = quizzes.course_id WHERE quizzes.id = quiz_questions.quiz_id AND courses.teacher_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM quizzes JOIN courses ON courses.id = quizzes.course_id WHERE quizzes.id = quiz_questions.quiz_id AND courses.teacher_id = auth.uid()));

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  score integer NOT NULL CHECK (score BETWEEN 0 AND 100),
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  passed boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "attempts_select_own" ON quiz_attempts FOR SELECT TO authenticated USING (auth.uid() = student_id);
CREATE POLICY "attempts_insert_own" ON quiz_attempts FOR INSERT TO authenticated WITH CHECK (auth.uid() = student_id);

CREATE TABLE IF NOT EXISTS certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  certificate_number text NOT NULL UNIQUE,
  issued_at timestamptz DEFAULT now(),
  UNIQUE(student_id, course_id)
);
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "certificates_select_public" ON certificates FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "certificates_insert_student" ON certificates FOR INSERT TO authenticated WITH CHECK (auth.uid() = student_id);
CREATE POLICY "certificates_update_student" ON certificates FOR UPDATE TO authenticated USING (auth.uid() = student_id) WITH CHECK (auth.uid() = student_id);

CREATE INDEX IF NOT EXISTS idx_follows_student ON teacher_follows(student_id);
CREATE INDEX IF NOT EXISTS idx_follows_teacher ON teacher_follows(teacher_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quizzes_course ON quizzes(course_id);
CREATE INDEX IF NOT EXISTS idx_questions_quiz ON quiz_questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_attempts_student ON quiz_attempts(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_certificates_student ON certificates(student_id);

-- Notify followers when a teacher publishes a new video.
CREATE OR REPLACE FUNCTION notify_teacher_followers_on_video()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO notifications (user_id, type, title, body, link)
  SELECT student_id,
         'new_video',
         'درس جديد من مدرس تتابعه',
         NEW.title,
         '/video/' || NEW.id
  FROM teacher_follows
  WHERE teacher_id = NEW.teacher_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_followers_on_video ON videos;
CREATE TRIGGER notify_followers_on_video
AFTER INSERT ON videos
FOR EACH ROW EXECUTE FUNCTION notify_teacher_followers_on_video();
