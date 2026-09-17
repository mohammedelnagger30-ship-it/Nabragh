-- Soft delete support for profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_blocked boolean NOT NULL DEFAULT false;

-- RPC: soft delete user (admin only)
CREATE OR REPLACE FUNCTION admin_soft_delete_user(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE profiles SET deleted_at = now(), is_blocked = true WHERE id = p_user_id;
  PERFORM admin_log_action('soft_delete', 'user', p_user_id, jsonb_build_object('method', 'soft_delete'));
END;
$$;

-- RPC: restore deleted user (admin only)
CREATE OR REPLACE FUNCTION admin_restore_user(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE profiles SET deleted_at = NULL, is_blocked = false WHERE id = p_user_id;
  PERFORM admin_log_action('restore', 'user', p_user_id, jsonb_build_object('method', 'restore'));
END;
$$;

-- Update admin_set_blocked to also update is_blocked
CREATE OR REPLACE FUNCTION admin_set_blocked(p_user_id uuid, p_blocked boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE profiles SET is_blocked = p_blocked WHERE id = p_user_id;
  PERFORM admin_log_action(
    CASE WHEN p_blocked THEN 'block' ELSE 'unblock' END,
    'user',
    p_user_id,
    jsonb_build_object('blocked', p_blocked)
  );
END;
$$;
