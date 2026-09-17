-- Single Active Device: one account = one active session at a time
-- If student logs in from Device B, Device A gets kicked out automatically

-- 1. user_devices table — tracks all devices ever used
CREATE TABLE IF NOT EXISTS user_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  fingerprint TEXT NOT NULL,
  device_name TEXT NOT NULL DEFAULT 'جهاز غير معروف',
  user_agent TEXT,
  is_active BOOLEAN DEFAULT true,
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

-- 2. Add active_device to profiles (the ONE currently active device)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS active_device_fingerprint TEXT;

-- 3. RPC: login from a device — makes it the ONLY active device
-- Returns the old device fingerprint if there was one (so frontend can detect kick)
CREATE OR REPLACE FUNCTION activate_device(
  p_fingerprint TEXT,
  p_device_name TEXT,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_old_fingerprint TEXT;
  v_is_teacher BOOLEAN;
  v_is_guardian BOOLEAN;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'غير مسجل الدخول');
  END IF;

  -- Teachers and guardians are not restricted
  SELECT is_teacher, is_guardian INTO v_is_teacher, v_is_guardian
  FROM profiles WHERE id = v_user_id;

  IF v_is_teacher OR v_is_guardian THEN
    -- Just track the device, no active-device logic
    INSERT INTO user_devices (user_id, fingerprint, device_name, user_agent, is_active)
    VALUES (v_user_id, p_fingerprint, p_device_name, p_user_agent, true)
    ON CONFLICT (user_id, fingerprint) DO UPDATE
    SET last_seen_at = now(), device_name = p_device_name, user_agent = p_user_agent, is_active = true;

    RETURN jsonb_build_object('ok', true, 'kicked', false, 'restricted', false);
  END IF;

  -- Student: get the current active device
  SELECT active_device_fingerprint INTO v_old_fingerprint
  FROM profiles WHERE id = v_user_id;

  -- If same device → just update last seen
  IF v_old_fingerprint = p_fingerprint THEN
    UPDATE user_devices
    SET last_seen_at = now(), device_name = p_device_name, user_agent = p_user_agent, is_active = true
    WHERE user_id = v_user_id AND fingerprint = p_fingerprint;

    RETURN jsonb_build_object('ok', true, 'kicked', false, 'restricted', true);
  END IF;

  -- Different device → kick the old one, activate this one
  -- Mark old device as inactive
  UPDATE user_devices SET is_active = false
  WHERE user_id = v_user_id AND is_active = true;

  -- Set new active device on profile
  UPDATE profiles SET active_device_fingerprint = p_fingerprint
  WHERE id = v_user_id;

  -- Register new device
  INSERT INTO user_devices (user_id, fingerprint, device_name, user_agent, is_active)
  VALUES (v_user_id, p_fingerprint, p_device_name, p_user_agent, true)
  ON CONFLICT (user_id, fingerprint) DO UPDATE
  SET last_seen_at = now(), device_name = p_device_name, user_agent = p_user_agent, is_active = true;

  RETURN jsonb_build_object(
    'ok', true,
    'kicked', v_old_fingerprint IS NOT NULL AND v_old_fingerprint != p_fingerprint,
    'old_device', v_old_fingerprint,
    'restricted', true
  );
END;
$$;

-- 4. RPC: check if this device is still the active one (for realtime polling)
CREATE OR REPLACE FUNCTION is_device_active(p_fingerprint TEXT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND (active_device_fingerprint = p_fingerprint OR is_teacher = true OR is_guardian = true)
  )
$$;

-- 5. RPC: get device info for current user
CREATE OR REPLACE FUNCTION get_my_devices()
RETURNS TABLE (
  device_id UUID,
  fingerprint TEXT,
  device_name TEXT,
  is_active BOOLEAN,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT id, fingerprint, device_name, is_active, last_seen_at, created_at
  FROM user_devices
  WHERE user_id = auth.uid()
  ORDER BY last_seen_at DESC;
$$;

-- 6. RPC: Admin view all active sessions
CREATE OR REPLACE FUNCTION admin_get_active_sessions()
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  email TEXT,
  active_fingerprint TEXT,
  device_name TEXT,
  last_seen TIMESTAMPTZ,
  total_devices BIGINT
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    p.id, p.full_name, p.email,
    p.active_device_fingerprint,
    d.device_name,
    d.last_seen_at,
    (SELECT COUNT(*) FROM user_devices WHERE user_id = p.id)
  FROM profiles p
  LEFT JOIN user_devices d ON d.user_id = p.id AND d.fingerprint = p.active_device_fingerprint
  WHERE p.active_device_fingerprint IS NOT NULL
    AND p.is_teacher = false
    AND p.is_guardian = false
  ORDER BY d.last_seen_at DESC NULLS LAST;
$$;

-- 7. RPC: Admin kick a user (force logout from all devices)
CREATE OR REPLACE FUNCTION admin_kick_user(p_user_id UUID)
RETURNS VOID
LANGUAGE sql SECURITY DEFINER
AS $$
  UPDATE profiles SET active_device_fingerprint = NULL WHERE id = p_user_id;
  UPDATE user_devices SET is_active = false WHERE user_id = p_user_id;
$$;

-- 8. RPC: Admin view device details for a user
CREATE OR REPLACE FUNCTION admin_get_user_devices(p_user_id UUID)
RETURNS TABLE (
  device_id UUID,
  fingerprint TEXT,
  device_name TEXT,
  user_agent TEXT,
  is_active BOOLEAN,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT id, fingerprint, device_name, user_agent, is_active, last_seen_at, created_at
  FROM user_devices
  WHERE user_id = p_user_id
  ORDER BY last_seen_at DESC;
$$;
