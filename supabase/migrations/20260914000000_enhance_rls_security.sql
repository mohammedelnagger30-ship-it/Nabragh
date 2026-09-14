-- Enhanced RLS Security Policies
-- This migration adds additional security layers to protect sensitive data

-- 1) Add rate limiting tracking table
CREATE TABLE IF NOT EXISTS rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  request_count integer DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now(),
  window_end timestamptz NOT NULL DEFAULT (now() + interval '1 minute'),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2) Add audit log table for sensitive operations
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3) Add index for better performance
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_endpoint ON rate_limits(user_id, endpoint);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits(window_start, window_end);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

-- 4) Enable RLS on new tables
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 5) RLS policies for rate_limits
CREATE POLICY "Users can view their own rate limits" ON rate_limits
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert rate limits" ON rate_limits
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "System can update rate limits" ON rate_limits
  FOR UPDATE TO authenticated
  WITH CHECK (true);

-- 6) RLS policies for audit_logs
CREATE POLICY "Admins can view all audit logs" ON audit_logs
  FOR SELECT TO authenticated
  USING (is_admin());

CREATE POLICY "Users can view their own audit logs" ON audit_logs
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert audit logs" ON audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- 7) Function to check rate limit
CREATE OR REPLACE FUNCTION check_rate_limit(p_user_id uuid, p_endpoint text, p_max_requests integer DEFAULT 60)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  current_count integer;
BEGIN
  -- Clean old records
  DELETE FROM rate_limits
  WHERE window_end < now();
  
  -- Get current count
  SELECT COALESCE(SUM(request_count), 0) INTO current_count
  FROM rate_limits
  WHERE user_id = p_user_id
    AND endpoint = p_endpoint
    AND window_start >= now() - interval '1 minute';
  
  -- If under limit, increment
  IF current_count < p_max_requests THEN
    INSERT INTO rate_limits (user_id, endpoint, request_count, window_start, window_end)
    VALUES (p_user_id, p_endpoint, 1, now(), now() + interval '1 minute')
    ON CONFLICT (user_id, endpoint, window_start) DO UPDATE
    SET request_count = rate_limits.request_count + 1;
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- 8) Function to log audit events
CREATE OR REPLACE FUNCTION log_audit_event(
  p_action text,
  p_table_name text,
  p_record_id uuid DEFAULT NULL,
  p_old_data jsonb DEFAULT NULL,
  p_new_data jsonb DEFAULT NULL
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO audit_logs (user_id, action, table_name, record_id, old_data, new_data, ip_address, user_agent)
  VALUES (
    auth.uid(),
    p_action,
    p_table_name,
    p_record_id,
    p_old_data,
    p_new_data,
    inet_client_addr()::text,
    current_setting('request.headers')::json->>'user-agent'
  );
END;
$$;

-- 9) Add trigger for automatic audit logging on profiles
CREATE OR REPLACE FUNCTION trigger_profile_audit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_audit_event('INSERT', 'profiles', NEW.id, NULL, to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM log_audit_event('UPDATE', 'profiles', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_audit_event('DELETE', 'profiles', OLD.id, to_jsonb(OLD), NULL);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS profile_audit_trigger ON profiles;
CREATE TRIGGER profile_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON profiles
  FOR EACH ROW EXECUTE FUNCTION trigger_profile_audit();

-- 10) Add trigger for automatic audit logging on videos
CREATE OR REPLACE FUNCTION trigger_video_audit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_audit_event('INSERT', 'videos', NEW.id, NULL, to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM log_audit_event('UPDATE', 'videos', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_audit_event('DELETE', 'videos', OLD.id, to_jsonb(OLD), NULL);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS video_audit_trigger ON videos;
CREATE TRIGGER video_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON videos
  FOR EACH ROW EXECUTE FUNCTION trigger_video_audit();

-- 11) Add trigger for automatic audit logging on courses
CREATE OR REPLACE FUNCTION trigger_course_audit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_audit_event('INSERT', 'courses', NEW.id, NULL, to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM log_audit_event('UPDATE', 'courses', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_audit_event('DELETE', 'courses', OLD.id, to_jsonb(OLD), NULL);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS course_audit_trigger ON courses;
CREATE TRIGGER course_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON courses
  FOR EACH ROW EXECUTE FUNCTION trigger_course_audit();
