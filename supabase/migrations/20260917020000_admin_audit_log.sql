-- Audit log for all admin actions
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id uuid,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_aal_admin ON admin_audit_log(admin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_aal_target ON admin_audit_log(target_type, target_id);

ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS aal_select ON admin_audit_log;
CREATE POLICY aal_select ON admin_audit_log FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS aal_insert ON admin_audit_log;
CREATE POLICY aal_insert ON admin_audit_log FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- RPC: log an admin action
CREATE OR REPLACE FUNCTION admin_log_action(
  p_action text,
  p_target_type text,
  p_target_id uuid DEFAULT NULL,
  p_details jsonb DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, details)
  VALUES (auth.uid(), p_action, p_target_type, p_target_id, p_details);
END;
$$;

-- RPC: list audit log entries
CREATE OR REPLACE FUNCTION admin_audit_log_list(p_limit int DEFAULT 100)
RETURNS TABLE (
  id uuid,
  admin_name text,
  action text,
  target_type text,
  target_id uuid,
  details jsonb,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    l.id,
    p.full_name AS admin_name,
    l.action,
    l.target_type,
    l.target_id,
    l.details,
    l.created_at
  FROM admin_audit_log l
  LEFT JOIN profiles p ON p.id = l.admin_id
  ORDER BY l.created_at DESC
  LIMIT p_limit;
$$;
