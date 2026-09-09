-- Harden paid access, assessment grading, certificates, and manager permissions.

-- Keep public catalog/profile queries useful without exposing private fields or paid URLs.
REVOKE SELECT ON videos FROM anon, authenticated;
REVOKE SELECT (video_url) ON videos FROM anon, authenticated;
GRANT SELECT (id, teacher_id, title, description, thumbnail_url, category_id,
  course_id, duration_seconds, views_count, is_free, education_stage, curriculum,
  created_at) ON videos TO anon, authenticated;
REVOKE SELECT ON profiles FROM anon, authenticated;
REVOKE SELECT (email, phone, cv_url) ON profiles FROM anon, authenticated;
GRANT SELECT (id, full_name, bio, avatar_url, location, website, specialization,
  years_experience, is_teacher, is_approved, is_manager, education_stage,
  curriculum, teaching_stages, teaching_curricula, created_at, updated_at)
  ON profiles TO anon, authenticated;

CREATE OR REPLACE FUNCTION get_video_playback_url(target_video_id uuid)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT v.video_url
  FROM videos v
  WHERE v.id = target_video_id
    AND (
      v.is_free
      OR EXISTS (
        SELECT 1 FROM course_enrollments e
        WHERE e.course_id = v.course_id AND e.student_id = auth.uid()
          AND e.status IN ('active', 'completed')
      )
      OR EXISTS (
        SELECT 1 FROM subscriptions s
        WHERE s.student_id = auth.uid()
          AND (s.teacher_id = v.teacher_id OR s.teacher_id IS NULL)
          AND s.status = 'active' AND s.payment_status = 'paid'
          AND s.end_date > now()
      )
    );
$$;
REVOKE ALL ON FUNCTION get_video_playback_url(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_video_playback_url(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION update_course_progress(target_video_id uuid)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  target_course_id uuid;
  total_videos integer;
  completed_videos integer;
  calculated_progress integer;
BEGIN
  SELECT course_id INTO target_course_id FROM videos WHERE id = target_video_id;
  IF target_course_id IS NULL THEN RETURN 0; END IF;
  SELECT count(*) INTO total_videos FROM videos WHERE course_id = target_course_id;
  SELECT count(*) INTO completed_videos
  FROM videos v
  JOIN video_progress p ON p.video_id = v.id
  WHERE v.course_id = target_course_id AND p.student_id = auth.uid() AND p.is_completed;
  calculated_progress := CASE WHEN total_videos = 0 THEN 0 ELSE round((completed_videos::numeric / total_videos::numeric) * 100) END;
  UPDATE course_enrollments
  SET progress_percent = calculated_progress,
      status = CASE WHEN calculated_progress = 100 THEN 'completed' ELSE 'active' END,
      completed_at = CASE WHEN calculated_progress = 100 THEN COALESCE(completed_at, now()) ELSE NULL END
  WHERE course_id = target_course_id AND student_id = auth.uid();
  RETURN calculated_progress;
END;
$$;
REVOKE ALL ON FUNCTION update_course_progress(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION update_course_progress(uuid) TO authenticated;

-- Students must never receive answer keys from the public API.
DROP POLICY IF EXISTS "quiz_questions_select" ON quiz_questions;
CREATE POLICY "quiz_questions_select_teacher" ON quiz_questions
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM quizzes
    JOIN courses ON courses.id = quizzes.course_id
    WHERE quizzes.id = quiz_questions.quiz_id
      AND courses.teacher_id = auth.uid()
  ));

-- Return only quiz content needed to render the assessment.
CREATE OR REPLACE FUNCTION get_quiz_questions(target_quiz_id uuid)
RETURNS TABLE(id uuid, quiz_id uuid, question text, options jsonb, sort_order integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT q.id, q.quiz_id, q.question, q.options, q.sort_order
  FROM quiz_questions q
  JOIN quizzes z ON z.id = q.quiz_id
  JOIN course_enrollments e ON e.course_id = z.course_id
  WHERE q.quiz_id = target_quiz_id
    AND e.student_id = auth.uid()
    AND e.status IN ('active', 'completed')
  ORDER BY q.sort_order;
$$;

REVOKE ALL ON FUNCTION get_quiz_questions(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_quiz_questions(uuid) TO authenticated;

DROP POLICY IF EXISTS "attempts_insert_own" ON quiz_attempts;
CREATE POLICY "attempts_insert_none" ON quiz_attempts
  FOR INSERT TO authenticated WITH CHECK (false);

DROP POLICY IF EXISTS "certificates_insert_student" ON certificates;
DROP POLICY IF EXISTS "certificates_update_student" ON certificates;
CREATE POLICY "certificates_insert_none" ON certificates
  FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY "certificates_update_none" ON certificates
  FOR UPDATE TO authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "enrollments_insert_own" ON course_enrollments;
CREATE POLICY "enrollments_insert_entitled" ON course_enrollments
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = student_id
    AND EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = course_id AND (
        c.price = 0 OR EXISTS (
          SELECT 1 FROM subscriptions s
          WHERE s.student_id = auth.uid()
            AND (s.teacher_id = c.teacher_id OR s.teacher_id IS NULL)
            AND s.status = 'active' AND s.payment_status = 'paid'
            AND s.end_date > now()
        )
      )
    )
  );

CREATE OR REPLACE FUNCTION submit_quiz_attempt(target_quiz_id uuid, submitted_answers jsonb)
RETURNS TABLE(score integer, passed boolean, certificate_number text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  target_course_id uuid;
  passing integer;
  total integer;
  correct integer;
  calculated_score integer;
  calculated_passed boolean;
  new_certificate text;
BEGIN
  SELECT course_id, passing_score INTO target_course_id, passing
  FROM quizzes WHERE id = target_quiz_id;
  IF target_course_id IS NULL THEN RAISE EXCEPTION 'quiz not found'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM course_enrollments
    WHERE course_id = target_course_id AND student_id = auth.uid()
      AND status IN ('active', 'completed')
  ) THEN RAISE EXCEPTION 'enrollment required'; END IF;
  IF EXISTS (SELECT 1 FROM videos WHERE course_id = target_course_id)
     AND EXISTS (
       SELECT 1 FROM videos v
       WHERE v.course_id = target_course_id
         AND NOT EXISTS (
           SELECT 1 FROM video_progress p
           WHERE p.video_id = v.id AND p.student_id = auth.uid() AND p.is_completed
         )
     ) THEN
    RAISE EXCEPTION 'course completion required';
  END IF;

  SELECT count(*), count(*) FILTER (
    WHERE (submitted_answers ->> id::text)::integer = correct_option
  ) INTO total, correct FROM quiz_questions WHERE quiz_id = target_quiz_id;
  IF total = 0 THEN RAISE EXCEPTION 'quiz has no questions'; END IF;
  calculated_score := round((correct::numeric / total::numeric) * 100);
  calculated_passed := calculated_score >= passing;

  INSERT INTO quiz_attempts (quiz_id, student_id, score, answers, passed)
  VALUES (target_quiz_id, auth.uid(), calculated_score, submitted_answers, calculated_passed);

  IF calculated_passed AND NOT EXISTS (
    SELECT 1 FROM certificates WHERE student_id = auth.uid() AND course_id = target_course_id
  ) THEN
    new_certificate := 'ILM-' || left(target_course_id::text, 6) || '-' || upper(substr(md5(random()::text), 1, 8));
    INSERT INTO certificates (student_id, course_id, certificate_number)
    VALUES (auth.uid(), target_course_id, new_certificate);
  ELSE
    SELECT c.certificate_number INTO new_certificate
    FROM certificates c WHERE c.student_id = auth.uid() AND c.course_id = target_course_id;
  END IF;
  RETURN QUERY SELECT calculated_score, calculated_passed, new_certificate;
END;
$$;

REVOKE ALL ON FUNCTION submit_quiz_attempt(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION submit_quiz_attempt(uuid, jsonb) TO authenticated;

-- Client-submitted payment requests can never activate an entitlement.
DROP POLICY IF EXISTS "subs_insert_own" ON subscriptions;
CREATE POLICY "subs_insert_pending" ON subscriptions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = student_id AND status = 'pending' AND payment_status = 'pending');

DROP POLICY IF EXISTS tps_owner ON teacher_page_settings;
CREATE POLICY tps_owner ON teacher_page_settings FOR ALL TO authenticated
  USING (teacher_id = auth.uid() AND is_manager())
  WITH CHECK (teacher_id = auth.uid() AND is_manager());
DROP POLICY IF EXISTS tp_owner ON teacher_plans;
CREATE POLICY tp_owner ON teacher_plans FOR ALL TO authenticated
  USING (teacher_id = auth.uid() AND is_manager())
  WITH CHECK (teacher_id = auth.uid() AND is_manager());
DROP POLICY IF EXISTS th_owner ON teacher_honors;
CREATE POLICY th_owner ON teacher_honors FOR ALL TO authenticated
  USING (teacher_id = auth.uid() AND is_manager())
  WITH CHECK (teacher_id = auth.uid() AND is_manager());