-- Storage read policies for private videos and CVs.

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
            AND (s.teacher_id = v.teacher_id OR s.teacher_id IS NULL)
            AND s.status = 'active'
            AND s.payment_status = 'paid'
            AND s.end_date > now()
        )
      )
    )
  );

DROP POLICY IF EXISTS "cvs_signed_read_authorized" ON storage.objects;
CREATE POLICY "cvs_signed_read_authorized" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'cvs'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE (
        p.cv_url = name
        OR p.cv_url LIKE '%/storage/v1/object/public/cvs/' || name
      )
      AND (
        p.id = auth.uid()
        OR public.is_admin()
        OR EXISTS (
          SELECT 1 FROM public.academy_memberships m
          WHERE m.teacher_id = p.id AND m.student_id = auth.uid() AND m.status = 'active'
        )
      )
    )
  );
