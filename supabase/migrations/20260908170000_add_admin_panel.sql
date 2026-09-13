-- Admin panel support
-- 1) Admin membership table (no direct public access)
CREATE TABLE IF NOT EXISTS admin_users (
  user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- 2) is_admin() helper (SECURITY DEFINER; reads only admin_users)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid());
END;
$$;

-- 3) Teacher approval flag on profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_approved boolean NOT NULL DEFAULT true;

-- 4) Admins can list admin membership
DROP POLICY IF EXISTS admin_users_select ON admin_users;
CREATE POLICY admin_users_select ON admin_users
  FOR SELECT TO authenticated
  USING (is_admin());

-- 5) Admin can update any profile row (approve / block teachers)
DROP POLICY IF EXISTS profiles_admin_update ON profiles;
CREATE POLICY profiles_admin_update ON profiles
  FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- 6) Admin moderation rights on content tables
DROP POLICY IF EXISTS videos_admin_delete ON videos;
CREATE POLICY videos_admin_delete ON videos FOR DELETE TO authenticated USING (is_admin());

DROP POLICY IF EXISTS videos_admin_update ON videos;
CREATE POLICY videos_admin_update ON videos FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS courses_admin_delete ON courses;
CREATE POLICY courses_admin_delete ON courses FOR DELETE TO authenticated USING (is_admin());

DROP POLICY IF EXISTS courses_admin_update ON courses;
CREATE POLICY courses_admin_update ON courses FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS comments_admin_delete ON comments;
CREATE POLICY comments_admin_delete ON comments FOR DELETE TO authenticated USING (is_admin());

DROP POLICY IF EXISTS reviews_admin_delete ON reviews;
CREATE POLICY reviews_admin_delete ON reviews FOR DELETE TO authenticated USING (is_admin());

-- 7) RPCs: admin actions (SECURITY DEFINER, caller verified)
CREATE OR REPLACE FUNCTION admin_set_approved(target_id uuid, approved boolean)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'permission denied: not an admin';
  END IF;
  UPDATE profiles SET is_approved = approved WHERE id = target_id;
  IF approved THEN
    INSERT INTO notifications (user_id, type, title, body, link)
    VALUES (target_id, 'teacher_approved', 'تم تفعيل حسابك كمدرس', 'حسابك كمدرس قد تمت مراجعته وتمت الموافقة عليه. يمكنك الآن الوصول إلى لوحة تحكم المدرس.', '/admin/teacher');
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION admin_set_admin(target_id uuid, value boolean)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'permission denied: not an admin';
  END IF;
  IF value THEN
    INSERT INTO admin_users (user_id) VALUES (target_id) ON CONFLICT (user_id) DO NOTHING;
  ELSE
    DELETE FROM admin_users WHERE user_id = target_id;
  END IF;
END;
$$;