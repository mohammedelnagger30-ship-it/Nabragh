-- Close privilege-escalation paths in subscriptions, academy memberships, and private media.

-- Students may create pending requests, but cannot alter entitlement fields.
DROP POLICY IF EXISTS "subs_update_own" ON subscriptions;
DROP POLICY IF EXISTS "subs_update_admin_or_teacher" ON subscriptions;
CREATE POLICY "subs_update_admin_or_teacher" ON subscriptions
  FOR UPDATE TO authenticated
  USING (is_admin() OR auth.uid() = teacher_id)
  WITH CHECK (is_admin() OR auth.uid() = teacher_id);

-- Only the academy owner or an administrator may approve/reject/block memberships.
DROP POLICY IF EXISTS academy_memberships_update ON academy_memberships;
CREATE POLICY academy_memberships_update ON academy_memberships
  FOR UPDATE TO authenticated
  USING (teacher_id = auth.uid() OR is_admin())
  WITH CHECK (teacher_id = auth.uid() OR is_admin());

-- Students can cancel their own pending request, but cannot alter approved memberships.
DROP POLICY IF EXISTS academy_memberships_delete ON academy_memberships;
CREATE POLICY academy_memberships_delete ON academy_memberships
  FOR DELETE TO authenticated
  USING ((student_id = auth.uid() AND status = 'pending') OR teacher_id = auth.uid() OR is_admin());

-- Video and CV objects must be private. Access is granted through signed URLs/RPCs.
UPDATE storage.buckets SET public = false WHERE id IN ('videos', 'cvs');
DROP POLICY IF EXISTS "videos_read" ON storage.objects;
DROP POLICY IF EXISTS "cvs_read" ON storage.objects;

-- Resolve a video only after entitlement checks. Return its storage path, never a public URL.
CREATE OR REPLACE FUNCTION get_video_playback_url(target_video_id uuid)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT CASE
    WHEN v.video_url LIKE '%/storage/v1/object/public/videos/%'
      THEN regexp_replace(v.video_url, '^.*/storage/v1/object/public/videos/', '')
    ELSE v.video_url
  END
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

-- Contact details are private: only the teacher, an admin, or an active member
-- of that teacher's academy may request them.
CREATE OR REPLACE FUNCTION get_teacher_contact(target_teacher_id uuid)
RETURNS TABLE(email text, phone text, cv_url text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.email, p.phone, p.cv_url
  FROM profiles p
  WHERE p.id = target_teacher_id
    AND p.is_teacher = true
    AND p.is_approved = true
    AND (
      auth.uid() = p.id
      OR is_admin()
      OR EXISTS (
        SELECT 1 FROM academy_memberships m
        WHERE m.teacher_id = p.id AND m.student_id = auth.uid() AND m.status = 'active'
      )
    );
$$;

REVOKE ALL ON FUNCTION get_teacher_contact(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_teacher_contact(uuid) TO authenticated;
