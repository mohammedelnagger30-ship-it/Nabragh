-- Featured content and site settings for admin control

-- 1) Featured columns on core tables
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS featured_order integer DEFAULT 0;

ALTER TABLE courses ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS featured_order integer DEFAULT 0;

ALTER TABLE videos ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS featured_order integer DEFAULT 0;

-- 2) Site settings table
CREATE TABLE IF NOT EXISTS site_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS site_settings_select ON site_settings;
CREATE POLICY site_settings_select ON site_settings FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS site_settings_admin ON site_settings;
CREATE POLICY site_settings_admin ON site_settings FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Seed default settings
INSERT INTO site_settings (key, value) VALUES
  ('site_name', '"Noona"'::jsonb),
  ('site_description', '"منصة تعليمية متكاملة"'::jsonb),
  ('homepage_sections', '{"teachers": true, "courses": true, "videos": true, "categories": true, "champions": true}'::jsonb),
  ('default_teacher_limit', '12'::jsonb),
  ('default_course_limit', '6'::jsonb),
  ('default_video_limit', '6'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 3) RPCs for featured management
CREATE OR REPLACE FUNCTION admin_set_featured(target_table text, target_id uuid, featured boolean, sort_order integer DEFAULT 0)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'permission denied: not an admin';
  END IF;
  IF target_table = 'profiles' THEN
    UPDATE profiles SET is_featured = featured, featured_order = sort_order WHERE id = target_id;
  ELSIF target_table = 'courses' THEN
    UPDATE courses SET is_featured = featured, featured_order = sort_order WHERE id = target_id;
  ELSIF target_table = 'videos' THEN
    UPDATE videos SET is_featured = featured, featured_order = sort_order WHERE id = target_id;
  ELSE
    RAISE EXCEPTION 'invalid target table: %', target_table;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION admin_update_site_setting(p_key text, p_value jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'permission denied: not an admin';
  END IF;
  INSERT INTO site_settings (key, value, updated_at) VALUES (p_key, p_value, now())
  ON CONFLICT (key) DO UPDATE SET value = p_value, updated_at = now();
END;
$$;

-- 4) Admin can update featured columns
DROP POLICY IF EXISTS featured_update_admin ON profiles;
CREATE POLICY featured_update_admin ON profiles FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS featured_update_admin ON courses;
CREATE POLICY featured_update_admin ON courses FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS featured_update_admin ON videos;
CREATE POLICY featured_update_admin ON videos FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
