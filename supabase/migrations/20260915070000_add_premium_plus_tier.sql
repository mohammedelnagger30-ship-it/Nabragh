-- Premium Plus tier: unlimited publishing plus bounded managed services.

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_teacher_tier_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_teacher_tier_check
  CHECK (teacher_tier IN ('free', 'premium', 'premium_plus'));

CREATE OR REPLACE FUNCTION admin_set_teacher_tier(target_id uuid, tier text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'permission denied: not an admin';
  END IF;
  IF tier NOT IN ('free', 'premium', 'premium_plus') THEN
    RAISE EXCEPTION 'invalid tier: %', tier;
  END IF;
  UPDATE profiles SET teacher_tier = tier WHERE id = target_id;
END;
$$;

CREATE OR REPLACE FUNCTION get_teacher_usage_stats(target_teacher uuid)
RETURNS TABLE (
  tier text,
  videos_used bigint,
  courses_used bigint,
  videos_limit integer,
  courses_limit integer,
  academy_published boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.teacher_tier,
    (SELECT count(*) FROM videos WHERE teacher_id = p.id),
    (SELECT count(*) FROM courses WHERE teacher_id = p.id),
    CASE WHEN p.teacher_tier IN ('premium', 'premium_plus') THEN -1 ELSE 5 END::integer,
    CASE WHEN p.teacher_tier IN ('premium', 'premium_plus') THEN -1 ELSE 2 END::integer,
    COALESCE((SELECT is_published FROM teacher_page_settings WHERE teacher_id = p.id), false)
  FROM profiles p
  WHERE p.id = target_teacher AND auth.uid() = target_teacher;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_teacher_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tier text;
  cnt bigint;
BEGIN
  SELECT p.teacher_tier INTO tier FROM profiles p WHERE p.id = NEW.teacher_id;

  IF TG_TABLE_NAME = 'videos' THEN
    IF tier IN ('premium', 'premium_plus') THEN RETURN NEW; END IF;
    SELECT count(*) INTO cnt FROM videos WHERE teacher_id = NEW.teacher_id;
    IF cnt >= 5 THEN
      RAISE EXCEPTION 'usage_limit: لقد وصلت للحد المجاني من الفيديوهات (%. الترقية إلى Premium لرفع غير محدود.', cnt;
    END IF;
  ELSIF TG_TABLE_NAME = 'courses' THEN
    IF tier IN ('premium', 'premium_plus') THEN RETURN NEW; END IF;
    SELECT count(*) INTO cnt FROM courses WHERE teacher_id = NEW.teacher_id;
    IF cnt >= 2 THEN
      RAISE EXCEPTION 'usage_limit: لقد وصلت للحد المجاني من الدورات. الترقية إلى Premium لإنشاء غير محدود.';
    END IF;
  ELSIF TG_TABLE_NAME = 'teacher_page_settings' THEN
    IF NEW.is_published AND tier NOT IN ('premium', 'premium_plus') THEN
      RAISE EXCEPTION 'usage_limit: نشر الأكاديمية متاح لخطتي Premium وPremium Plus فقط.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION admin_set_teacher_tier(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION get_teacher_usage_stats(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_set_teacher_tier(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_teacher_usage_stats(uuid) TO authenticated;
