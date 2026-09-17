-- Assignments table (teacher creates homework)
CREATE TABLE IF NOT EXISTS assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  file_url text,
  deadline timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers manage own assignments" ON assignments
  FOR ALL USING (auth.uid() = teacher_id);

CREATE POLICY "Students see assignments for enrolled courses" ON assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM course_enrollments ce
      WHERE ce.student_id = auth.uid() AND ce.course_id = assignments.course_id
    )
  );

-- Assignment submissions table (student submits homework)
CREATE TABLE IF NOT EXISTS assignment_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL DEFAULT '',
  file_url text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  grade integer CHECK (grade >= 0 AND grade <= 100),
  feedback text,
  graded_at timestamptz,
  UNIQUE(assignment_id, student_id)
);

ALTER TABLE assignment_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students manage own submissions" ON assignment_submissions
  FOR ALL USING (auth.uid() = student_id);

CREATE POLICY "Teachers view submissions for their assignments" ON assignment_submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM assignments a WHERE a.id = assignment_submissions.assignment_id AND a.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers grade submissions for their assignments" ON assignment_submissions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM assignments a WHERE a.id = assignment_submissions.assignment_id AND a.teacher_id = auth.uid()
    )
  );

-- RPC: Submit assignment
CREATE OR REPLACE FUNCTION submit_assignment(
  p_assignment_id uuid,
  p_content text DEFAULT '',
  p_file_url text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_assignment record;
  v_enrolled boolean;
  v_result jsonb;
BEGIN
  SELECT * INTO v_assignment FROM assignments WHERE id = p_assignment_id;
  IF v_assignment IS NULL THEN
    RETURN jsonb_build_object('error', 'الواجب غير موجود');
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM course_enrollments
    WHERE student_id = auth.uid() AND course_id = v_assignment.course_id AND status IN ('active', 'completed')
  ) INTO v_enrolled;

  IF NOT v_enrolled THEN
    RETURN jsonb_build_object('error', 'غير مسجل في هذه الدورة');
  END IF;

  INSERT INTO assignment_submissions (assignment_id, student_id, content, file_url)
  VALUES (p_assignment_id, auth.uid(), p_content, p_file_url)
  ON CONFLICT (assignment_id, student_id) DO UPDATE SET
    content = EXCLUDED.content,
    file_url = EXCLUDED.file_url,
    submitted_at = now(),
    grade = NULL,
    feedback = NULL,
    graded_at = NULL
  RETURNING jsonb_build_object('id', id, 'submitted_at', submitted_at) INTO v_result;

  RETURN v_result;
END;
$$;

-- RPC: Get student assignments (all assignments for enrolled courses)
CREATE OR REPLACE FUNCTION get_student_assignments()
RETURNS TABLE (
  assignment_id uuid,
  title text,
  description text,
  file_url text,
  deadline timestamptz,
  created_at timestamptz,
  course_id uuid,
  course_title text,
  submission_id uuid,
  submission_content text,
  submission_file_url text,
  submitted_at timestamptz,
  grade integer,
  feedback text,
  graded_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id AS assignment_id,
    a.title,
    a.description,
    a.file_url,
    a.deadline,
    a.created_at,
    c.id AS course_id,
    c.title AS course_title,
    s.id AS submission_id,
    s.content AS submission_content,
    s.file_url AS submission_file_url,
    s.submitted_at,
    s.grade,
    s.feedback,
    s.graded_at
  FROM assignments a
  JOIN courses c ON c.id = a.course_id
  LEFT JOIN assignment_submissions s ON s.assignment_id = a.id AND s.student_id = auth.uid()
  WHERE EXISTS (
    SELECT 1 FROM course_enrollments ce
    WHERE ce.student_id = auth.uid() AND ce.course_id = a.course_id
  )
  ORDER BY a.deadline ASC;
END;
$$;
