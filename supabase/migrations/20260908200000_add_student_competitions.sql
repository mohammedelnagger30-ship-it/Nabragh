-- Competitive learning: teacher-owned competitions, questions, attempts, and public stage leaderboards.

CREATE TABLE IF NOT EXISTS competitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  education_stage text,
  curriculum text,
  starts_at timestamptz,
  ends_at timestamptz,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE competitions ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES categories(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS competition_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id uuid NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  question text NOT NULL,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  correct_option integer NOT NULL DEFAULT 0 CHECK (correct_option >= 0),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS competition_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id uuid NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  score integer NOT NULL DEFAULT 0 CHECK (score >= 0),
  points integer NOT NULL DEFAULT 0 CHECK (points >= 0),
  duration_seconds integer NOT NULL DEFAULT 0,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(competition_id, student_id)
);

ALTER TABLE competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE competition_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE competition_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS competitions_public_read ON competitions;
CREATE POLICY competitions_public_read ON competitions FOR SELECT TO anon, authenticated USING (status = 'published' OR teacher_id = auth.uid());
DROP POLICY IF EXISTS competitions_teacher_manage ON competitions;
CREATE POLICY competitions_teacher_manage ON competitions FOR ALL TO authenticated USING (teacher_id = auth.uid()) WITH CHECK (teacher_id = auth.uid());

DROP POLICY IF EXISTS competition_questions_public_read ON competition_questions;
CREATE POLICY competition_questions_public_read ON competition_questions FOR SELECT TO anon, authenticated USING (EXISTS (SELECT 1 FROM competitions WHERE competitions.id = competition_questions.competition_id AND (competitions.status = 'published' OR competitions.teacher_id = auth.uid())));
DROP POLICY IF EXISTS competition_questions_teacher_manage ON competition_questions;
CREATE POLICY competition_questions_teacher_manage ON competition_questions FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM competitions WHERE competitions.id = competition_questions.competition_id AND competitions.teacher_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM competitions WHERE competitions.id = competition_questions.competition_id AND competitions.teacher_id = auth.uid()));

DROP POLICY IF EXISTS competition_attempts_own_read ON competition_attempts;
CREATE POLICY competition_attempts_own_read ON competition_attempts FOR SELECT TO authenticated USING (student_id = auth.uid());
DROP POLICY IF EXISTS competition_attempts_own_insert ON competition_attempts;
CREATE POLICY competition_attempts_own_insert ON competition_attempts FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_competitions_stage_status ON competitions(education_stage, status, starts_at);
CREATE INDEX IF NOT EXISTS idx_competition_questions_competition ON competition_questions(competition_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_competition_attempts_leaderboard ON competition_attempts(competition_id, points DESC, submitted_at);

CREATE OR REPLACE VIEW student_stage_leaderboard AS
SELECT
  p.id AS student_id,
  p.full_name,
  p.avatar_url,
  p.education_stage,
  COALESCE(SUM(a.points), 0)::integer AS points,
  COUNT(a.id)::integer AS competitions_played,
  RANK() OVER (PARTITION BY p.education_stage ORDER BY COALESCE(SUM(a.points), 0) DESC)::integer AS stage_rank
FROM profiles p
LEFT JOIN competition_attempts a ON a.student_id = p.id
WHERE p.is_teacher = false AND p.education_stage IS NOT NULL
GROUP BY p.id, p.full_name, p.avatar_url, p.education_stage;

GRANT SELECT ON student_stage_leaderboard TO anon, authenticated;

CREATE OR REPLACE VIEW student_subject_leaderboard AS
SELECT
  p.id AS student_id,
  p.full_name,
  p.avatar_url,
  p.education_stage,
  c.id AS category_id,
  c.name_ar AS subject_name,
  COALESCE(SUM(a.points), 0)::integer AS points,
  COUNT(a.id)::integer AS competitions_played,
  RANK() OVER (PARTITION BY c.id ORDER BY COALESCE(SUM(a.points), 0) DESC)::integer AS subject_rank
FROM profiles p
JOIN competition_attempts a ON a.student_id = p.id
JOIN competitions cp ON cp.id = a.competition_id
JOIN categories c ON c.id = cp.category_id
WHERE p.is_teacher = false
GROUP BY p.id, p.full_name, p.avatar_url, p.education_stage, c.id, c.name_ar;

GRANT SELECT ON student_subject_leaderboard TO anon, authenticated;

CREATE OR REPLACE VIEW competition_questions_public AS
SELECT id, competition_id, question, options, sort_order
FROM competition_questions
WHERE EXISTS (SELECT 1 FROM competitions WHERE competitions.id = competition_questions.competition_id AND competitions.status = 'published');

GRANT SELECT ON competition_questions_public TO anon, authenticated;

CREATE OR REPLACE FUNCTION submit_competition_attempt(target_competition_id uuid, submitted_answers jsonb, duration integer DEFAULT 0)
RETURNS TABLE(score integer, points integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  question_count integer;
  correct_count integer;
  calculated_score integer;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (SELECT 1 FROM competitions WHERE id = target_competition_id AND status = 'published') THEN
    RAISE EXCEPTION 'competition is not available';
  END IF;
  SELECT COUNT(*)::integer, COUNT(*) FILTER (WHERE (submitted_answers ->> competition_questions.id::text)::integer = correct_option)::integer
    INTO question_count, correct_count
  FROM competition_questions
  WHERE competition_id = target_competition_id;
  calculated_score := CASE WHEN question_count = 0 THEN 0 ELSE round((correct_count::numeric / question_count) * 100)::integer END;
  INSERT INTO competition_attempts (competition_id, student_id, answers, score, points, duration_seconds)
  VALUES (target_competition_id, auth.uid(), submitted_answers, calculated_score, correct_count * 10, greatest(duration, 0))
  ON CONFLICT (competition_id, student_id) DO UPDATE SET answers = excluded.answers, score = excluded.score, points = excluded.points, duration_seconds = excluded.duration_seconds, submitted_at = now();
  RETURN QUERY SELECT calculated_score, correct_count * 10;
END;
$$;
