-- Guardian workspace with explicit student consent.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_guardian boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS guardian_student_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guardian_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'rejected')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  UNIQUE (guardian_id, student_id),
  CHECK (guardian_id <> student_id)
);

ALTER TABLE guardian_student_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS guardian_links_select_own ON guardian_student_links;
CREATE POLICY guardian_links_select_own ON guardian_student_links
  FOR SELECT TO authenticated
  USING (guardian_id = auth.uid() OR student_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS guardian_links_insert_guardian ON guardian_student_links;
CREATE POLICY guardian_links_insert_guardian ON guardian_student_links
  FOR INSERT TO authenticated
  WITH CHECK (
    guardian_id = auth.uid()
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_guardian = true)
    AND EXISTS (SELECT 1 FROM profiles WHERE id = student_id AND is_teacher = false AND is_guardian = false)
  );

DROP POLICY IF EXISTS guardian_links_update_participant ON guardian_student_links;
CREATE POLICY guardian_links_update_participant ON guardian_student_links
  FOR UPDATE TO authenticated
  USING (guardian_id = auth.uid() OR student_id = auth.uid() OR is_admin())
  WITH CHECK (guardian_id = auth.uid() OR student_id = auth.uid() OR is_admin());

CREATE OR REPLACE FUNCTION guardian_request_student(p_student_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  student_record profiles%ROWTYPE;
  link_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_guardian = true) THEN
    RAISE EXCEPTION 'guardian account required';
  END IF;

  SELECT * INTO student_record
  FROM profiles
  WHERE lower(email) = lower(trim(p_student_email))
    AND is_teacher = false
    AND is_guardian = false;

  IF student_record.id IS NULL THEN
    RAISE EXCEPTION 'student not found';
  END IF;

  INSERT INTO guardian_student_links (guardian_id, student_id, status)
  VALUES (auth.uid(), student_record.id, 'pending')
  ON CONFLICT (guardian_id, student_id) DO UPDATE
  SET status = CASE WHEN guardian_student_links.status = 'rejected' THEN 'pending' ELSE guardian_student_links.status END,
      requested_at = CASE WHEN guardian_student_links.status = 'rejected' THEN now() ELSE guardian_student_links.requested_at END,
      responded_at = CASE WHEN guardian_student_links.status = 'rejected' THEN NULL ELSE guardian_student_links.responded_at END
  RETURNING id INTO link_id;

  RETURN jsonb_build_object('id', link_id, 'student_id', student_record.id, 'status', 'pending');
END;
$$;

CREATE OR REPLACE FUNCTION student_guardian_requests()
RETURNS TABLE(id uuid, guardian_id uuid, guardian_name text, guardian_email text, requested_at timestamptz)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT l.id, l.guardian_id, p.full_name, p.email, l.requested_at
  FROM guardian_student_links l
  JOIN profiles p ON p.id = l.guardian_id
  WHERE l.student_id = auth.uid() AND l.status = 'pending';
$$;

CREATE OR REPLACE FUNCTION student_respond_guardian_request(p_link_id uuid, p_approve boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE guardian_student_links
  SET status = CASE WHEN p_approve THEN 'active' ELSE 'rejected' END,
      responded_at = now()
  WHERE id = p_link_id AND student_id = auth.uid() AND status = 'pending';
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION guardian_children_summary()
RETURNS TABLE(
  link_id uuid,
  student_id uuid,
  student_name text,
  student_email text,
  avatar_url text,
  education_stage text,
  link_status text,
  courses_count bigint,
  completed_courses bigint,
  average_progress numeric,
  exams_count bigint,
  average_score numeric,
  passed_exams bigint,
  certificates_count bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    l.id,
    s.id,
    s.full_name,
    s.email,
    s.avatar_url,
    s.education_stage,
    l.status,
    (SELECT count(*) FROM course_enrollments e WHERE e.student_id = s.id),
    (SELECT count(*) FROM course_enrollments e WHERE e.student_id = s.id AND e.status = 'completed'),
    COALESCE((SELECT round(avg(e.progress_percent)::numeric, 1) FROM course_enrollments e WHERE e.student_id = s.id), 0),
    (SELECT count(*) FROM quiz_attempts a WHERE a.student_id = s.id),
    COALESCE((SELECT round(avg(a.score)::numeric, 1) FROM quiz_attempts a WHERE a.student_id = s.id), 0),
    (SELECT count(*) FROM quiz_attempts a WHERE a.student_id = s.id AND a.passed = true),
    (SELECT count(*) FROM certificates c WHERE c.student_id = s.id)
  FROM guardian_student_links l
  JOIN profiles s ON s.id = l.student_id
  WHERE l.guardian_id = auth.uid() AND l.status = 'active'
  ORDER BY s.full_name;
$$;

REVOKE ALL ON FUNCTION guardian_request_student(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION student_guardian_requests() FROM PUBLIC;
REVOKE ALL ON FUNCTION student_respond_guardian_request(uuid, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION guardian_children_summary() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION guardian_request_student(text) TO authenticated;
GRANT EXECUTE ON FUNCTION student_guardian_requests() TO authenticated;
GRANT EXECUTE ON FUNCTION student_respond_guardian_request(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION guardian_children_summary() TO authenticated;

CREATE INDEX IF NOT EXISTS idx_guardian_links_guardian ON guardian_student_links(guardian_id, status);
CREATE INDEX IF NOT EXISTS idx_guardian_links_student ON guardian_student_links(student_id, status);
