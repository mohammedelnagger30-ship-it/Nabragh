-- Track Premium Plus managed-service quotas by calendar month.

CREATE TABLE IF NOT EXISTS teacher_service_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  service_key text NOT NULL CHECK (service_key IN ('managed_video_uploads', 'consultations')),
  used_count integer NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (teacher_id, period_start, service_key)
);

ALTER TABLE teacher_service_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS teacher_service_usage_select_own ON teacher_service_usage;
CREATE POLICY teacher_service_usage_select_own ON teacher_service_usage
  FOR SELECT TO authenticated
  USING (teacher_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS teacher_service_usage_manage_admin ON teacher_service_usage;
CREATE POLICY teacher_service_usage_manage_admin ON teacher_service_usage
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE OR REPLACE FUNCTION get_teacher_service_usage(target_teacher uuid)
RETURNS TABLE(service_key text, used_count integer, monthly_limit integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT service.service_key,
         COALESCE(usage.used_count, 0),
         service.monthly_limit
  FROM (VALUES
    ('managed_video_uploads'::text, 10),
    ('consultations'::text, 1)
  ) AS service(service_key, monthly_limit)
  LEFT JOIN teacher_service_usage usage
    ON usage.teacher_id = target_teacher
   AND usage.period_start = date_trunc('month', current_date)::date
   AND usage.service_key = service.service_key
  JOIN profiles p ON p.id = target_teacher
  WHERE auth.uid() = target_teacher
    AND p.teacher_tier = 'premium_plus';
$$;

CREATE OR REPLACE FUNCTION admin_record_teacher_service_usage(
  target_teacher uuid,
  target_service text,
  increment_by integer DEFAULT 1
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_used integer;
  service_limit integer;
  period date := date_trunc('month', current_date)::date;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'permission denied: not an admin';
  END IF;
  IF target_service NOT IN ('managed_video_uploads', 'consultations') THEN
    RAISE EXCEPTION 'invalid service key';
  END IF;
  IF increment_by < 1 THEN
    RAISE EXCEPTION 'increment must be positive';
  END IF;

  service_limit := CASE target_service WHEN 'managed_video_uploads' THEN 10 WHEN 'consultations' THEN 1 END;

  INSERT INTO teacher_service_usage (teacher_id, period_start, service_key, used_count)
  VALUES (target_teacher, period, target_service, 0)
  ON CONFLICT (teacher_id, period_start, service_key) DO NOTHING;

  SELECT used_count INTO current_used
  FROM teacher_service_usage
  WHERE teacher_id = target_teacher AND period_start = period AND service_key = target_service
  FOR UPDATE;

  IF current_used + increment_by > service_limit THEN
    RAISE EXCEPTION 'service_limit: تم استهلاك الحد الشهري لهذه الخدمة (%/%).', current_used, service_limit;
  END IF;

  UPDATE teacher_service_usage
  SET used_count = current_used + increment_by, updated_at = now()
  WHERE teacher_id = target_teacher AND period_start = period AND service_key = target_service;

  RETURN current_used + increment_by;
END;
$$;

REVOKE ALL ON FUNCTION get_teacher_service_usage(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION admin_record_teacher_service_usage(uuid, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_teacher_service_usage(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_record_teacher_service_usage(uuid, text, integer) TO authenticated;

CREATE INDEX IF NOT EXISTS idx_teacher_service_usage_teacher_period
  ON teacher_service_usage(teacher_id, period_start DESC);
