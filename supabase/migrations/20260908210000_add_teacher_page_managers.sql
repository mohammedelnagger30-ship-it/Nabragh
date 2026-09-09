-- Teacher "page manager" system: site manager grants teacher-admins who own their public page.
-- Adds: manager flag, per-teacher page settings/plans/honors, and scoped leaderboards.

-- 1) Manager flag on teacher profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_manager boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_profiles_manager ON profiles(is_manager) WHERE is_manager;

CREATE OR REPLACE FUNCTION is_manager() RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_manager AND is_teacher);
$$;

-- 2) Site admin grants/revokes manager status (only for teachers, only by super admin)
CREATE OR REPLACE FUNCTION admin_set_manager(target_id uuid, value boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'requires admin';
  END IF;
  UPDATE profiles SET is_manager = value, updated_at = now()
  WHERE id = target_id AND is_teacher = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'teacher not found';
  END IF;
END;
$$;

-- 3) Per-teacher page design settings
CREATE TABLE IF NOT EXISTS teacher_page_settings (
  teacher_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  primary_color text NOT NULL DEFAULT '#2563eb',
  secondary_color text NOT NULL DEFAULT '#06b6d4',
  accent_color text NOT NULL DEFAULT '#f59e0b',
  show_competitions boolean NOT NULL DEFAULT true,
  show_leaderboard boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE teacher_page_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tps_select ON teacher_page_settings;
CREATE POLICY tps_select ON teacher_page_settings FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS tps_owner ON teacher_page_settings;
CREATE POLICY tps_owner ON teacher_page_settings FOR ALL TO authenticated USING (teacher_id = auth.uid()) WITH CHECK (teacher_id = auth.uid());

-- 4) Per-teacher subscription plans (the teacher's own pricing)
CREATE TABLE IF NOT EXISTS teacher_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name_ar text NOT NULL,
  price numeric(10,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  duration_months integer NOT NULL DEFAULT 1 CHECK (duration_months > 0),
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE teacher_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tp_select ON teacher_plans;
CREATE POLICY tp_select ON teacher_plans FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS tp_owner ON teacher_plans;
CREATE POLICY tp_owner ON teacher_plans FOR ALL TO authenticated USING (teacher_id = auth.uid()) WITH CHECK (teacher_id = auth.uid());

-- 5) Honors the teacher awards to his students
CREATE TABLE IF NOT EXISTS teacher_honors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_honors_teacher ON teacher_honors(teacher_id, created_at DESC);
ALTER TABLE teacher_honors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS th_select ON teacher_honors;
CREATE POLICY th_select ON teacher_honors FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS th_owner ON teacher_honors;
CREATE POLICY th_owner ON teacher_honors FOR ALL TO authenticated USING (teacher_id = auth.uid()) WITH CHECK (teacher_id = auth.uid());

-- 6) Public leaderboards scoped to the teacher's own competitions
CREATE OR REPLACE VIEW competition_leaderboard AS
SELECT
  a.competition_id,
  p.id AS student_id,
  p.full_name,
  p.avatar_url,
  a.score,
  a.points,
  a.submitted_at,
  RANK() OVER (PARTITION BY a.competition_id ORDER BY a.points DESC, a.submitted_at ASC)::integer AS rank
FROM competition_attempts a
JOIN profiles p ON p.id = a.student_id
WHERE p.is_teacher = false;

CREATE OR REPLACE VIEW teacher_top_students AS
SELECT
  comp.teacher_id,
  p.id AS student_id,
  p.full_name,
  p.avatar_url,
  COALESCE(SUM(a.points), 0)::integer AS total_points,
  COUNT(a.id)::integer AS competitions_played,
  RANK() OVER (PARTITION BY comp.teacher_id ORDER BY COALESCE(SUM(a.points), 0) DESC, MIN(a.submitted_at) ASC)::integer AS rank
FROM competitions comp
JOIN competition_attempts a ON a.competition_id = comp.id
JOIN profiles p ON p.id = a.student_id
WHERE comp.status = 'published' AND p.is_teacher = false
GROUP BY comp.teacher_id, p.id, p.full_name, p.avatar_url;

GRANT SELECT ON competition_leaderboard TO anon, authenticated;
GRANT SELECT ON teacher_top_students TO anon, authenticated;