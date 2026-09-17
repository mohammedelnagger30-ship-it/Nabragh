-- Student activity tracking
CREATE TABLE IF NOT EXISTS student_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  activity_type text NOT NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sal_student ON student_activity_log(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sal_type ON student_activity_log(activity_type, created_at DESC);

ALTER TABLE student_activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sal_select ON student_activity_log;
CREATE POLICY sal_select ON student_activity_log FOR SELECT TO authenticated
  USING (
    auth.uid() = student_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

DROP POLICY IF EXISTS sal_insert ON student_activity_log;
CREATE POLICY sal_insert ON student_activity_log FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = student_id);

-- RPC: get student activity (admin only)
CREATE OR REPLACE FUNCTION admin_student_activity(p_student_id uuid, p_limit int DEFAULT 50)
RETURNS TABLE (
  id uuid,
  activity_type text,
  metadata jsonb,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT id, activity_type, metadata, created_at
  FROM student_activity_log
  WHERE student_id = p_student_id
  ORDER BY created_at DESC
  LIMIT p_limit;
$$;

-- RPC: get last activity for all students (admin only)
CREATE OR REPLACE FUNCTION admin_student_stats_enhanced()
RETURNS TABLE (
  id uuid,
  full_name text,
  email text,
  created_at timestamptz,
  enrollment_count bigint,
  total_spent numeric,
  last_activity_at timestamptz,
  last_activity_type text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    p.id,
    p.full_name,
    p.email,
    p.created_at,
    COALESCE(e.enrollment_count, 0) AS enrollment_count,
    COALESCE(p.total_spent, 0) AS total_spent,
    sal.last_activity_at,
    sal.last_activity_type
  FROM profiles p
  LEFT JOIN (
    SELECT student_id, COUNT(*) AS enrollment_count
    FROM enrollments
    GROUP BY student_id
  ) e ON e.student_id = p.id
  LEFT JOIN LATERAL (
    SELECT created_at AS last_activity_at, activity_type AS last_activity_type
    FROM student_activity_log
    WHERE student_id = p.id
    ORDER BY created_at DESC
    LIMIT 1
  ) sal ON true
  WHERE p.is_teacher = false
  ORDER BY p.created_at DESC;
$$;
