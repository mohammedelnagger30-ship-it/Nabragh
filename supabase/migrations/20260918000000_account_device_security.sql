-- Account Security: Device Lock System
-- Prevents account sharing: one student = one device
-- Protects course subscriptions from being distributed

-- 1. user_devices table — tracks registered devices per user
CREATE TABLE IF NOT EXISTS user_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  fingerprint TEXT NOT NULL,
  device_name TEXT NOT NULL DEFAULT 'جهاز غير معروف',
  user_agent TEXT,
  is_current BOOLEAN DEFAULT true,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, fingerprint)
);

ALTER TABLE user_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own devices"
  ON user_devices FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own devices"
  ON user_devices FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own devices"
  ON user_devices FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins manage all devices"
  ON user_devices FOR ALL
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_user_devices_user ON user_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_fingerprint ON user_devices(fingerprint);

-- 2. Add device lock columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS locked_device_fingerprint TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS device_lock_enabled BOOLEAN DEFAULT false;

-- 3. Add device_fingerprint to course_enrollments for per-course device binding
ALTER TABLE course_enrollments ADD COLUMN IF NOT EXISTS device_fingerprint TEXT;

-- 4. RPC: register a device and check if access is allowed
-- Returns: { allowed: boolean, reason: text, needs_registration: boolean }
CREATE OR REPLACE FUNCTION register_and_check_device(
  p_fingerprint TEXT,
  p_device_name TEXT,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_profile RECORD;
  v_existing_device RECORD;
  v_device_count INT;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'غير مسجل الدخول', 'needs_registration', false);
  END IF;

  -- Get profile lock info
  SELECT locked_device_fingerprint, device_lock_enabled INTO v_profile
  FROM profiles WHERE id = v_user_id;

  -- If device lock is not enabled yet, this is the first login → lock to this device
  IF NOT v_profile.device_lock_enabled THEN
    UPDATE profiles
    SET locked_device_fingerprint = p_fingerprint,
        device_lock_enabled = true
    WHERE id = v_user_id;

    INSERT INTO user_devices (user_id, fingerprint, device_name, user_agent, is_current)
    VALUES (v_user_id, p_fingerprint, p_device_name, p_user_agent, true)
    ON CONFLICT (user_id, fingerprint) DO UPDATE
    SET last_seen_at = now(), device_name = p_device_name, user_agent = p_user_agent, is_current = true;

    RETURN jsonb_build_object('allowed', true, 'reason', 'تم تقييد الحساب على هذا الجهاز', 'needs_registration', false);
  END IF;

  -- Device lock is enabled — check if current device matches
  IF v_profile.locked_device_fingerprint = p_fingerprint THEN
    -- Allowed — update last seen
    INSERT INTO user_devices (user_id, fingerprint, device_name, user_agent, is_current)
    VALUES (v_user_id, p_fingerprint, p_device_name, p_user_agent, true)
    ON CONFLICT (user_id, fingerprint) DO UPDATE
    SET last_seen_at = now(), device_name = p_device_name, user_agent = p_user_agent, is_current = true;

    -- Mark other devices as not current
    UPDATE user_devices SET is_current = false
    WHERE user_id = v_user_id AND fingerprint != p_fingerprint;

    RETURN jsonb_build_object('allowed', true, 'reason', 'جهاز معتمد', 'needs_registration', false);
  END IF;

  -- Device does NOT match — BLOCK access
  INSERT INTO user_devices (user_id, fingerprint, device_name, user_agent, is_current)
  VALUES (v_user_id, p_fingerprint, p_device_name, p_user_agent, false)
  ON CONFLICT (user_id, fingerprint) DO UPDATE
  SET last_seen_at = now();

  SELECT COUNT(*) INTO v_device_count FROM user_devices WHERE user_id = v_user_id AND is_current = true;

  RETURN jsonb_build_object(
    'allowed', false,
    'reason', 'هذا الحساب مقيد بجهاز آخر. لا يجوز مشاركة الحساب بين أكثر من جهاز واحد.',
    'needs_registration', false,
    'locked_device_count', v_device_count
  );
END;
$$;

-- 5. RPC: Admin reset device lock (allows student to re-register from a new device)
CREATE OR REPLACE FUNCTION admin_reset_device_lock(p_user_id UUID)
RETURNS VOID
LANGUAGE sql SECURITY DEFINER
AS $$
  UPDATE profiles
  SET locked_device_fingerprint = NULL,
      device_lock_enabled = false
  WHERE id = p_user_id;

  DELETE FROM user_devices WHERE user_id = p_user_id;
$$;

-- 6. RPC: Get all devices for a user (admin or self)
CREATE OR REPLACE FUNCTION get_user_devices(p_user_id UUID)
RETURNS TABLE (
  device_id UUID,
  fingerprint TEXT,
  device_name TEXT,
  user_agent TEXT,
  is_current BOOLEAN,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT id, fingerprint, device_name, user_agent, is_current, last_seen_at, created_at
  FROM user_devices
  WHERE user_id = p_user_id
  ORDER BY last_seen_at DESC;
$$;

-- 7. RPC: Admin view all locked accounts
CREATE OR REPLACE FUNCTION admin_get_locked_accounts()
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  email TEXT,
  locked_device_fingerprint TEXT,
  device_lock_enabled BOOLEAN,
  device_count BIGINT,
  last_seen TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    p.id, p.full_name, p.email,
    p.locked_device_fingerprint, p.device_lock_enabled,
    (SELECT COUNT(*) FROM user_devices WHERE user_id = p.id),
    (SELECT MAX(last_seen_at) FROM user_devices WHERE user_id = p.id)
  FROM profiles p
  WHERE p.device_lock_enabled = true
    AND p.is_teacher = false
  ORDER BY (SELECT MAX(last_seen_at) FROM user_devices WHERE user_id = p.id) DESC NULLS LAST;
$$;

-- 8. RPC: Admin view device details for a specific user
CREATE OR REPLACE FUNCTION admin_get_user_device_details(p_user_id UUID)
RETURNS TABLE (
  device_id UUID,
  fingerprint TEXT,
  device_name TEXT,
  user_agent TEXT,
  is_current BOOLEAN,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT id, fingerprint, device_name, user_agent, is_current, last_seen_at, created_at
  FROM user_devices
  WHERE user_id = p_user_id
  ORDER BY last_seen_at DESC;
$$;

-- 9. RPC: Check enrollment device integrity
-- Called when student accesses course content to verify device matches
CREATE OR REPLACE FUNCTION check_enrollment_device(p_course_id UUID, p_fingerprint TEXT)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM course_enrollments
    WHERE student_id = auth.uid()
      AND course_id = p_course_id
      AND (device_fingerprint IS NULL OR device_fingerprint = p_fingerprint)
  )
$$;

-- 10. RPC: Bind device to enrollment (called on first course access)
CREATE OR REPLACE FUNCTION bind_enrollment_device(p_course_id UUID, p_fingerprint TEXT)
RETURNS VOID
LANGUAGE sql SECURITY DEFINER
AS $$
  UPDATE course_enrollments
  SET device_fingerprint = p_fingerprint
  WHERE student_id = auth.uid()
    AND course_id = p_course_id
    AND device_fingerprint IS NULL;
$$;
