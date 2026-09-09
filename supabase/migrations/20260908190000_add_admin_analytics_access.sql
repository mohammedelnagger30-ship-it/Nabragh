-- Allow administrators to inspect academic analytics and student progress.
-- All policies are restricted through the existing is_admin() helper.

DROP POLICY IF EXISTS enrollments_admin_select ON course_enrollments;
CREATE POLICY enrollments_admin_select ON course_enrollments
  FOR SELECT TO authenticated USING (is_admin());

DROP POLICY IF EXISTS progress_admin_select ON video_progress;
CREATE POLICY progress_admin_select ON video_progress
  FOR SELECT TO authenticated USING (is_admin());

DROP POLICY IF EXISTS attempts_admin_select ON quiz_attempts;
CREATE POLICY attempts_admin_select ON quiz_attempts
  FOR SELECT TO authenticated USING (is_admin());

DROP POLICY IF EXISTS quizzes_admin_select ON quizzes;
CREATE POLICY quizzes_admin_select ON quizzes
  FOR SELECT TO authenticated USING (is_admin());

DROP POLICY IF EXISTS questions_admin_select ON quiz_questions;
CREATE POLICY questions_admin_select ON quiz_questions
  FOR SELECT TO authenticated USING (is_admin());

DROP POLICY IF EXISTS certificates_admin_select ON certificates;
CREATE POLICY certificates_admin_select ON certificates
  FOR SELECT TO authenticated USING (is_admin());
