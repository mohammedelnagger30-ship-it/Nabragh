-- Teacher usage limits: free tier (limited) vs premium (paid, unlimited).
-- Free teachers: max 5 videos, max 2 courses, cannot publish their academy.
-- Enforced server-side (BEFORE INSERT triggers) so the UI cannot be bypassed.

-- 1) Tier column on profiles (public so teacher tiers are visible on cards).
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS teacher_tier text NOT NULL DEFAULT 'free'
  CHECK (teacher_tier IN ('free', 'premium'));

GRANT SELECT (teacher_tier) ON profiles TO anon, authenticated;

-- 2) Admin RPC to upgrade/downgrade a teacher tier.
CREATE OR REPLACE FUNCTION admin_set_teacher_tier(target_id uuid, tier text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'permission denied: not an admin';
  END IF;
  IF tier NOT IN ('free', 'premium') THEN
    RAISE EXCEPTION 'invalid tier: %', tier;
  END IF;
  UPDATE profiles SET teacher_tier = tier WHERE id = target_id;
END;
$$;
REVOKE ALL ON FUNCTION admin_set_teacher_tier(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_set_teacher_tier(uuid, text) TO authenticated;

-- 3) Usage stats RPC (used in the teacher workspace UI).
CREATE OR REPLACE FUNCTION get_teacher_usage_stats(target_teacher uuid)
RETURNS TABLE (
  tier text,
  videos_used bigint,
  courses_used bigint,
  videos_limit integer,
  courses_limit integer,
  academy_published boolean
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.teacher_tier,
    (SELECT count(*) FROM videos WHERE teacher_id = p.id),
    (SELECT count(*) FROM courses WHERE teacher_id = p.id),
    CASE WHEN p.teacher_tier = 'premium' THEN -1 ELSE 5 END::integer,
    CASE WHEN p.teacher_tier = 'premium' THEN -1 ELSE 2 END::integer,
    COALESCE((SELECT is_published FROM teacher_page_settings WHERE teacher_id = p.id), false)
  FROM profiles p
  WHERE p.id = target_teacher AND auth.uid() = target_teacher;
END;
$$;
REVOKE ALL ON FUNCTION get_teacher_usage_stats(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_teacher_usage_stats(uuid) TO authenticated;

-- 4) Enforcement triggers.
CREATE OR REPLACE FUNCTION enforce_teacher_limits()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  tier text;
  cnt bigint;
  limit_videos constant integer := 5;
  limit_courses constant integer := 2;
BEGIN
  SELECT p.teacher_tier INTO tier FROM profiles p WHERE p.id = NEW.teacher_id;

  IF TG_TABLE_NAME = 'videos' THEN
    IF tier = 'premium' THEN RETURN NEW; END IF;
    SELECT count(*) INTO cnt FROM videos WHERE teacher_id = NEW.teacher_id;
    IF cnt >= limit_videos THEN
      RAISE EXCEPTION 'usage_limit: لقد وصلت للحد المجاني من الفيديوهات (%/%). الترقية إلى بريميوم لرفع غير محدود.', cnt, limit_videos;
    END IF;
  ELSIF TG_TABLE_NAME = 'courses' THEN
    IF tier = 'premium' THEN RETURN NEW; END IF;
    SELECT count(*) INTO cnt FROM courses WHERE teacher_id = NEW.teacher_id;
    IF cnt >= limit_courses THEN
      RAISE EXCEPTION 'usage_limit: لقد وصلت للحد المجاني من الدورات (%). الترقية إلى بريميوم لإنشاء غير محدود.', limit_courses;
    END IF;
  ELSIF TG_TABLE_NAME = 'teacher_page_settings' THEN
    IF NEW.is_published AND tier <> 'premium' THEN
      RAISE EXCEPTION 'usage_limit: نشر المنصة (الأكاديمية) ميزة متاحة للبريميوم فقط.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_video_limits ON videos;
CREATE TRIGGER trg_enforce_video_limits BEFORE INSERT OR UPDATE OF teacher_id ON videos
  FOR EACH ROW WHEN (NEW.teacher_id IS NOT NULL) EXECUTE FUNCTION enforce_teacher_limits();

DROP TRIGGER IF EXISTS trg_enforce_course_limits ON courses;
CREATE TRIGGER trg_enforce_course_limits BEFORE INSERT OR UPDATE OF teacher_id ON courses
  FOR EACH ROW WHEN (NEW.teacher_id IS NOT NULL) EXECUTE FUNCTION enforce_teacher_limits();

DROP TRIGGER IF EXISTS trg_enforce_academy_publish ON teacher_page_settings;
CREATE TRIGGER trg_enforce_academy_publish BEFORE INSERT OR UPDATE ON teacher_page_settings
  FOR EACH ROW EXECUTE FUNCTION enforce_teacher_limits();