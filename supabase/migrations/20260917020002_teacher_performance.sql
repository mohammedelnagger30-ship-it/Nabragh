-- Teacher performance scoring system
CREATE TABLE IF NOT EXISTS teacher_performance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  score numeric NOT NULL DEFAULT 0,
  rating_avg numeric,
  rating_count bigint DEFAULT 0,
  student_count bigint DEFAULT 0,
  course_count bigint DEFAULT 0,
  revenue_total numeric DEFAULT 0,
  response_time_hours numeric,
  completion_rate numeric DEFAULT 100,
  calculated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE teacher_performance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tp_select ON teacher_performance;
CREATE POLICY tp_select ON teacher_performance FOR SELECT TO anon, authenticated USING (true);

-- RPC: recalculate all teacher scores (admin only)
CREATE OR REPLACE FUNCTION admin_recalculate_teacher_scores()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Upsert from live data
  INSERT INTO teacher_performance (teacher_id, score, rating_avg, rating_count, student_count, course_count, revenue_total, calculated_at)
  SELECT
    p.id,
    -- Score formula: rating * 20 + (students/10) + (courses * 5) + (revenue/1000), clamped 0-100
    LEAST(100, GREATEST(0,
      COALESCE(r.rating_avg, 0) * 20
      + LEAST(COALESCE(s.student_count, 0) / 10.0, 25)
      + LEAST(COALESCE(c.course_count, 0) * 5, 25)
      + LEAST(COALESCE(p.total_spent, 0) / 1000.0, 25)
    )),
    r.rating_avg,
    COALESCE(r.rating_count, 0),
    COALESCE(s.student_count, 0),
    COALESCE(c.course_count, 0),
    COALESCE(p.total_spent, 0),
    now()
  FROM profiles p
  LEFT JOIN LATERAL (
    SELECT AVG(rating)::numeric AS rating_avg, COUNT(*)::bigint AS rating_count
    FROM course_reviews cr
    JOIN courses co ON co.id = cr.course_id
    WHERE co.teacher_id = p.id
  ) r ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(DISTINCT e.student_id)::bigint AS student_count
    FROM enrollments e
    JOIN courses co ON co.id = e.course_id
    WHERE co.teacher_id = p.id
  ) s ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::bigint AS course_count
    FROM courses co
    WHERE co.teacher_id = p.id
  ) c ON true
  WHERE p.is_teacher = true
  ON CONFLICT (teacher_id) DO UPDATE SET
    score = EXCLUDED.score,
    rating_avg = EXCLUDED.rating_avg,
    rating_count = EXCLUDED.rating_count,
    student_count = EXCLUDED.student_count,
    course_count = EXCLUDED.course_count,
    revenue_total = EXCLUDED.revenue_total,
    calculated_at = now();
END;
$$;

-- RPC: list teacher performance (admin only)
CREATE OR REPLACE FUNCTION admin_teacher_performance_list()
RETURNS TABLE (
  teacher_id uuid,
  full_name text,
  email text,
  score numeric,
  rating_avg numeric,
  rating_count bigint,
  student_count bigint,
  course_count bigint,
  revenue_total numeric,
  calculated_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    tp.teacher_id,
    p.full_name,
    p.email,
    tp.score,
    tp.rating_avg,
    tp.rating_count,
    tp.student_count,
    tp.course_count,
    tp.revenue_total,
    tp.calculated_at
  FROM teacher_performance tp
  JOIN profiles p ON p.id = tp.teacher_id
  ORDER BY tp.score DESC;
$$;
