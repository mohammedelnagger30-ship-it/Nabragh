-- Course-level paid access, controlled entirely by the teacher.
--
-- Each course can offer:
--   * a monthly subscription (subscription_price + subscription_duration_months), and/or
--   * a one-time purchase (courses.price).
-- Students request access; access stays locked until a subscription row is
-- confirmed (status='active', payment_status='paid') by admin or the course teacher.
-- Locked videos remain gated in the playback RPC and in storage policies.

ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS subscription_price numeric(10,2) NOT NULL DEFAULT 0 CHECK (subscription_price >= 0),
  ADD COLUMN IF NOT EXISTS subscription_duration_months integer NOT NULL DEFAULT 1 CHECK (subscription_duration_months > 0);

ALTER TABLE subscriptions
  ALTER COLUMN end_date DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS course_id uuid REFERENCES courses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS access_type text NOT NULL DEFAULT 'subscription' CHECK (access_type IN ('subscription', 'purchase'));

CREATE INDEX IF NOT EXISTS idx_subscriptions_course_student ON subscriptions(course_id, student_id, status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_course_teacher ON subscriptions(course_id, teacher_id);

-- Single source of truth for "can this student access this course now?".
-- Free courses: always. Paid courses: owner/admin/enrolled student/paid access.
CREATE OR REPLACE FUNCTION has_course_access(target_course_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT exists(
    SELECT 1 FROM courses c
    WHERE c.id = target_course_id
      AND (
        (c.price = 0 AND c.subscription_price = 0)
        OR c.teacher_id = auth.uid()
        OR public.is_admin()
        OR exists(
          SELECT 1 FROM course_enrollments e
          WHERE e.course_id = c.id AND e.student_id = auth.uid()
            AND e.status IN ('active', 'completed')
        )
        OR exists(
          SELECT 1 FROM subscriptions s
          WHERE s.student_id = auth.uid()
            AND (
              s.course_id = c.id
              OR (s.course_id IS NULL AND (s.teacher_id = c.teacher_id OR s.teacher_id IS NULL))
            )
            AND s.status = 'active' AND s.payment_status = 'paid'
            AND (s.end_date IS NULL OR s.end_date > now())
        )
      )
  );
$$;
REVOKE ALL ON FUNCTION has_course_access(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION has_course_access(uuid) TO anon, authenticated;

-- Video playback gate now also honors course-level subscriptions/purchases.
CREATE OR REPLACE FUNCTION get_video_playback_url(target_video_id uuid)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT v.video_url
  FROM videos v
  WHERE v.id = target_video_id
    AND (
      v.is_free
      OR v.teacher_id = auth.uid()
      OR public.is_admin()
      OR EXISTS (
        SELECT 1 FROM course_enrollments e
        WHERE e.course_id = v.course_id AND e.student_id = auth.uid()
          AND e.status IN ('active', 'completed')
      )
      OR EXISTS (
        SELECT 1 FROM subscriptions s
        WHERE s.student_id = auth.uid()
          AND (
            s.course_id = v.course_id
            OR (s.course_id IS NULL AND (s.teacher_id = v.teacher_id OR s.teacher_id IS NULL))
          )
          AND s.status = 'active' AND s.payment_status = 'paid'
          AND (s.end_date IS NULL OR s.end_date > now())
      )
    );
$$;
REVOKE ALL ON FUNCTION get_video_playback_url(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_video_playback_url(uuid) TO anon, authenticated;

-- Enrollment still requires real entitlement (course-level OR teacher-level paid access).
DROP POLICY IF EXISTS "enrollments_insert_entitled" ON course_enrollments;
CREATE POLICY "enrollments_insert_entitled" ON course_enrollments
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = student_id
    AND EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = course_id AND (
        (c.price = 0 AND c.subscription_price = 0)
        OR EXISTS (
          SELECT 1 FROM subscriptions s
          WHERE s.student_id = auth.uid()
            AND (
              s.course_id = c.id
              OR (s.course_id IS NULL AND (s.teacher_id = c.teacher_id OR s.teacher_id IS NULL))
            )
            AND s.status = 'active' AND s.payment_status = 'paid'
            AND (s.end_date IS NULL OR s.end_date > now())
        )
      )
    )
  );

-- Private media reads resolve through the same course-level entitlement.
DROP POLICY IF EXISTS "videos_signed_read_entitled" ON storage.objects;
CREATE POLICY "videos_signed_read_entitled" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (
    bucket_id = 'videos'
    AND EXISTS (
      SELECT 1
      FROM public.videos v
      WHERE (
        v.video_url = name
        OR v.video_url LIKE '%/storage/v1/object/public/videos/' || name
      )
      AND (
        v.is_free
        OR v.teacher_id = auth.uid()
        OR public.is_admin()
        OR EXISTS (
          SELECT 1 FROM public.course_enrollments e
          WHERE e.course_id = v.course_id
            AND e.student_id = auth.uid()
            AND e.status IN ('active', 'completed')
        )
        OR EXISTS (
          SELECT 1 FROM public.subscriptions s
          WHERE s.student_id = auth.uid()
            AND (
              s.course_id = v.course_id
              OR (s.course_id IS NULL AND (s.teacher_id = v.teacher_id OR s.teacher_id IS NULL))
            )
            AND s.status = 'active'
            AND s.payment_status = 'paid'
            AND (s.end_date IS NULL OR s.end_date > now())
        )
      )
    )
  );