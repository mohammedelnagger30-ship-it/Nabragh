-- Fix storage object authorization for the videos bucket.
-- The storage policy "videos_signed_read_entitled" subquery reference videos.video_url
-- as anon/authenticated, but those roles only hold column-level grants (video_url excluded),
-- so signing/list/reading objects failed with "permission denied for table videos".
-- Move the entitlement check into a SECURITY DEFINER function so it runs as the owner.

CREATE OR REPLACE FUNCTION public.storage_read_video_entitled(object_name text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM videos v
    WHERE (v.video_url = object_name
           OR v.video_url ~~ ('%/storage/v1/object/public/videos/'::text || object_name))
      AND (
        v.is_free
        OR v.teacher_id = auth.uid()
        OR is_admin()
        OR EXISTS (
          SELECT 1 FROM course_enrollments e
          WHERE e.course_id = v.course_id AND e.student_id = auth.uid()
            AND e.status IN ('active', 'completed')
        )
        OR EXISTS (
          SELECT 1 FROM subscriptions s
          WHERE s.student_id = auth.uid()
            AND (s.course_id = v.course_id
                 OR ((s.course_id IS NULL) AND ((s.teacher_id = v.teacher_id) OR (s.teacher_id IS NULL))))
            AND s.status = 'active' AND s.payment_status = 'paid'
            AND (s.end_date IS NULL OR s.end_date > now())
        )
      )
  );
$$;
REVOKE ALL ON FUNCTION public.storage_read_video_entitled(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.storage_read_video_entitled(text) TO anon, authenticated;

DROP POLICY IF EXISTS videos_signed_read_entitled ON storage.objects;
CREATE POLICY videos_signed_read_entitled ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'videos'::text AND public.storage_read_video_entitled(name));

-- Same problem affects CVs: cvs_signed_read_authorized subqueried profiles.cv_url,
-- a column hidden from anon/authenticated, which aborts every storage SELECT at plan time.
CREATE OR REPLACE FUNCTION public.storage_read_cv_entitled(object_name text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles p
    WHERE (p.cv_url = object_name
           OR p.cv_url ~~ ('%/storage/v1/object/public/cvs/'::text || object_name))
      AND (
        p.id = auth.uid()
        OR is_admin()
        OR EXISTS (
          SELECT 1 FROM academy_memberships m
          WHERE m.teacher_id = p.id AND m.student_id = auth.uid() AND m.status = 'active'
        )
      )
  );
$$;
REVOKE ALL ON FUNCTION public.storage_read_cv_entitled(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.storage_read_cv_entitled(text) TO authenticated;

DROP POLICY IF EXISTS cvs_signed_read_authorized ON storage.objects;
CREATE POLICY cvs_signed_read_authorized ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'cvs'::text AND public.storage_read_cv_entitled(name));