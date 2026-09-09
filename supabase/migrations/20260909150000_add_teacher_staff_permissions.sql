-- Staff members belong to one teacher workspace and receive explicit permissions.
CREATE TABLE IF NOT EXISTS teacher_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  can_manage_students boolean NOT NULL DEFAULT false,
  can_manage_assessments boolean NOT NULL DEFAULT false,
  can_manage_pricing boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(teacher_id, staff_id),
  CHECK (teacher_id <> staff_id)
);
ALTER TABLE teacher_staff ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION is_teacher_staff(target_teacher_id uuid, permission_name text DEFAULT NULL)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM teacher_staff s
    WHERE s.teacher_id = target_teacher_id AND s.staff_id = auth.uid() AND s.status = 'active'
      AND (
        permission_name IS NULL
        OR (permission_name = 'students' AND s.can_manage_students)
        OR (permission_name = 'assessments' AND s.can_manage_assessments)
        OR (permission_name = 'pricing' AND s.can_manage_pricing)
      )
  );
$$;

DROP POLICY IF EXISTS teacher_staff_select ON teacher_staff;
CREATE POLICY teacher_staff_select ON teacher_staff FOR SELECT TO authenticated
  USING (teacher_id = auth.uid() OR staff_id = auth.uid());
DROP POLICY IF EXISTS teacher_staff_owner_manage ON teacher_staff;
CREATE POLICY teacher_staff_owner_manage ON teacher_staff FOR ALL TO authenticated
  USING (teacher_id = auth.uid() AND is_manager())
  WITH CHECK (teacher_id = auth.uid() AND is_manager());

GRANT EXECUTE ON FUNCTION is_teacher_staff(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION teacher_add_staff_by_email(target_email text, students boolean, assessments boolean, pricing boolean)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE target_staff_id uuid; new_id uuid;
BEGIN
  IF NOT is_manager() THEN RAISE EXCEPTION 'manager access required'; END IF;
  SELECT id INTO target_staff_id FROM profiles WHERE lower(email) = lower(trim(target_email)) AND is_teacher = false LIMIT 1;
  IF target_staff_id IS NULL THEN RAISE EXCEPTION 'student account not found'; END IF;
  INSERT INTO teacher_staff (teacher_id, staff_id, can_manage_students, can_manage_assessments, can_manage_pricing)
  VALUES (auth.uid(), target_staff_id, students, assessments, pricing)
  ON CONFLICT (teacher_id, staff_id) DO UPDATE SET
    can_manage_students = EXCLUDED.can_manage_students,
    can_manage_assessments = EXCLUDED.can_manage_assessments,
    can_manage_pricing = EXCLUDED.can_manage_pricing,
    status = 'active'
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;

CREATE OR REPLACE FUNCTION teacher_list_staff()
RETURNS TABLE(id uuid, staff_id uuid, full_name text, email text, can_manage_students boolean, can_manage_assessments boolean, can_manage_pricing boolean, status text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT s.id, p.id, p.full_name, p.email, s.can_manage_students, s.can_manage_assessments, s.can_manage_pricing, s.status, s.created_at
  FROM teacher_staff s JOIN profiles p ON p.id = s.staff_id
  WHERE s.teacher_id = auth.uid() AND is_manager()
  ORDER BY s.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION teacher_revoke_staff(target_staff_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  UPDATE teacher_staff SET status = 'revoked'
  WHERE teacher_id = auth.uid() AND staff_id = target_staff_id AND is_manager();
$$;
REVOKE ALL ON FUNCTION teacher_add_staff_by_email(text, boolean, boolean, boolean), teacher_list_staff(), teacher_revoke_staff(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION teacher_add_staff_by_email(text, boolean, boolean, boolean), teacher_list_staff(), teacher_revoke_staff(uuid) TO authenticated;

-- Staff can read only their assigned teacher's operational data.
DROP POLICY IF EXISTS enrollments_staff_select ON course_enrollments;
CREATE POLICY enrollments_staff_select ON course_enrollments FOR SELECT TO authenticated
  USING (is_teacher_staff((SELECT teacher_id FROM courses WHERE courses.id = course_enrollments.course_id), 'students'));
DROP POLICY IF EXISTS attempts_staff_select ON quiz_attempts;
CREATE POLICY attempts_staff_select ON quiz_attempts FOR SELECT TO authenticated
  USING (is_teacher_staff((SELECT c.teacher_id FROM quizzes q JOIN courses c ON c.id = q.course_id WHERE q.id = quiz_attempts.quiz_id), 'assessments'));

DROP POLICY IF EXISTS quizzes_staff_manage ON quizzes;
CREATE POLICY quizzes_staff_manage ON quizzes FOR ALL TO authenticated
  USING (is_teacher_staff((SELECT teacher_id FROM courses WHERE courses.id = quizzes.course_id), 'assessments'))
  WITH CHECK (is_teacher_staff((SELECT teacher_id FROM courses WHERE courses.id = quizzes.course_id), 'assessments'));
DROP POLICY IF EXISTS questions_staff_manage ON quiz_questions;
CREATE POLICY questions_staff_manage ON quiz_questions FOR ALL TO authenticated
  USING (is_teacher_staff((SELECT c.teacher_id FROM quizzes q JOIN courses c ON c.id = q.course_id WHERE q.id = quiz_questions.quiz_id), 'assessments'))
  WITH CHECK (is_teacher_staff((SELECT c.teacher_id FROM quizzes q JOIN courses c ON c.id = q.course_id WHERE q.id = quiz_questions.quiz_id), 'assessments'));
DROP POLICY IF EXISTS teacher_plans_staff_manage ON teacher_plans;
CREATE POLICY teacher_plans_staff_manage ON teacher_plans FOR ALL TO authenticated
  USING (is_teacher_staff(teacher_id, 'pricing'))
  WITH CHECK (is_teacher_staff(teacher_id, 'pricing'));