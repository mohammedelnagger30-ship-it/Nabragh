-- Teacher academies: private/public tenant access with membership-based RLS.

ALTER TABLE teacher_page_settings
  ADD COLUMN IF NOT EXISTS academy_name text NOT NULL DEFAULT 'منصتي التعليمية',
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS access_mode text NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS require_approval boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS allow_free_preview boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT true;

UPDATE teacher_page_settings
SET slug = teacher_id::text
WHERE slug IS NULL OR btrim(slug) = '';

CREATE UNIQUE INDEX IF NOT EXISTS teacher_page_settings_slug_key
  ON teacher_page_settings (lower(slug));

ALTER TABLE teacher_page_settings
  DROP CONSTRAINT IF EXISTS teacher_page_settings_access_mode_check;
ALTER TABLE teacher_page_settings
  ADD CONSTRAINT teacher_page_settings_access_mode_check
  CHECK (access_mode IN ('public', 'private', 'invite'));

CREATE TABLE IF NOT EXISTS academy_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  joined_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  UNIQUE (teacher_id, student_id),
  CHECK (teacher_id <> student_id),
  CHECK (status IN ('pending', 'active', 'rejected', 'blocked'))
);

CREATE INDEX IF NOT EXISTS academy_memberships_teacher_idx ON academy_memberships(teacher_id, status);
CREATE INDEX IF NOT EXISTS academy_memberships_student_idx ON academy_memberships(student_id, status);
ALTER TABLE academy_memberships ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION can_view_teacher_academy(target_teacher_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles p
    LEFT JOIN teacher_page_settings s ON s.teacher_id = p.id
    WHERE p.id = target_teacher_id
      AND p.is_teacher = true
      AND p.is_approved = true
      AND (
        COALESCE(s.is_published, true) = true AND COALESCE(s.access_mode, 'public') = 'public'
        OR auth.uid() = p.id
        OR is_admin()
        OR EXISTS (
          SELECT 1 FROM academy_memberships m
          WHERE m.teacher_id = target_teacher_id
            AND m.student_id = auth.uid()
            AND m.status = 'active'
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION can_manage_teacher_academy(target_teacher_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT auth.uid() = target_teacher_id OR is_admin();
$$;

DROP POLICY IF EXISTS academy_memberships_select ON academy_memberships;
CREATE POLICY academy_memberships_select ON academy_memberships
  FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR teacher_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS academy_memberships_insert ON academy_memberships;
CREATE POLICY academy_memberships_insert ON academy_memberships
  FOR INSERT TO authenticated
  WITH CHECK (
    (student_id = auth.uid() AND status = 'pending')
    OR teacher_id = auth.uid()
    OR is_admin()
  );

DROP POLICY IF EXISTS academy_memberships_update ON academy_memberships;
CREATE POLICY academy_memberships_update ON academy_memberships
  FOR UPDATE TO authenticated
  USING (teacher_id = auth.uid() OR student_id = auth.uid() OR is_admin())
  WITH CHECK (teacher_id = auth.uid() OR student_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS academy_memberships_delete ON academy_memberships;
CREATE POLICY academy_memberships_delete ON academy_memberships
  FOR DELETE TO authenticated
  USING (teacher_id = auth.uid() OR student_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS tps_select ON teacher_page_settings;
CREATE POLICY tps_select ON teacher_page_settings
  FOR SELECT TO anon, authenticated
  USING (
    teacher_id = auth.uid()
    OR is_admin()
    OR (
      is_published = true
      AND (
        access_mode = 'public'
        OR EXISTS (
          SELECT 1 FROM academy_memberships m
          WHERE m.teacher_id = teacher_page_settings.teacher_id
            AND m.student_id = auth.uid()
            AND m.status = 'active'
        )
      )
    )
  );

DROP POLICY IF EXISTS tps_owner ON teacher_page_settings;
CREATE POLICY tps_owner ON teacher_page_settings
  FOR ALL TO authenticated
  USING (can_manage_teacher_academy(teacher_id))
  WITH CHECK (can_manage_teacher_academy(teacher_id));

DROP POLICY IF EXISTS tp_select ON teacher_plans;
CREATE POLICY tp_select ON teacher_plans
  FOR SELECT TO anon, authenticated
  USING (can_view_teacher_academy(teacher_id));

DROP POLICY IF EXISTS tp_owner ON teacher_plans;
CREATE POLICY tp_owner ON teacher_plans
  FOR ALL TO authenticated
  USING (can_manage_teacher_academy(teacher_id))
  WITH CHECK (can_manage_teacher_academy(teacher_id));

DROP POLICY IF EXISTS th_select ON teacher_honors;
CREATE POLICY th_select ON teacher_honors
  FOR SELECT TO anon, authenticated
  USING (can_view_teacher_academy(teacher_id));

DROP POLICY IF EXISTS th_owner ON teacher_honors;
CREATE POLICY th_owner ON teacher_honors
  FOR ALL TO authenticated
  USING (can_manage_teacher_academy(teacher_id))
  WITH CHECK (can_manage_teacher_academy(teacher_id));

DROP POLICY IF EXISTS "videos_select_all" ON videos;
DROP POLICY IF EXISTS "videos_select_academy_access" ON videos;
CREATE POLICY "videos_select_academy_access" ON videos
  FOR SELECT TO anon, authenticated
  USING (can_view_teacher_academy(teacher_id));

DROP POLICY IF EXISTS "courses_select_all" ON courses;
DROP POLICY IF EXISTS "courses_select_academy_access" ON courses;
CREATE POLICY "courses_select_academy_access" ON courses
  FOR SELECT TO anon, authenticated
  USING (can_view_teacher_academy(teacher_id));

GRANT EXECUTE ON FUNCTION can_view_teacher_academy(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION can_manage_teacher_academy(uuid) TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON academy_memberships TO authenticated;
