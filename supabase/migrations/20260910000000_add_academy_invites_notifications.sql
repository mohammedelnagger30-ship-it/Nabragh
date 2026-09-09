-- Academy invitations and notifications for membership workflows.

CREATE TABLE IF NOT EXISTS academy_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  max_uses integer NOT NULL DEFAULT 1 CHECK (max_uses > 0),
  used_count integer NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS academy_invites_teacher_idx ON academy_invites(teacher_id, created_at DESC);
ALTER TABLE academy_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS academy_invites_select_owner ON academy_invites;
CREATE POLICY academy_invites_select_owner ON academy_invites FOR SELECT TO authenticated
  USING (teacher_id = auth.uid() OR is_admin());
DROP POLICY IF EXISTS academy_invites_insert_owner ON academy_invites;
CREATE POLICY academy_invites_insert_owner ON academy_invites FOR INSERT TO authenticated
  WITH CHECK (teacher_id = auth.uid() OR is_admin());
DROP POLICY IF EXISTS academy_invites_update_owner ON academy_invites;
CREATE POLICY academy_invites_update_owner ON academy_invites FOR UPDATE TO authenticated
  USING (teacher_id = auth.uid() OR is_admin()) WITH CHECK (teacher_id = auth.uid() OR is_admin());

CREATE OR REPLACE FUNCTION redeem_academy_invite(invite_code text)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  invite academy_invites;
  new_status text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'login required'; END IF;
  SELECT * INTO invite FROM academy_invites
  WHERE upper(code) = upper(trim(invite_code)) AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
    AND used_count < max_uses
  FOR UPDATE;
  IF invite.id IS NULL THEN RAISE EXCEPTION 'invite invalid or expired'; END IF;

  SELECT CASE WHEN COALESCE(s.require_approval, false) THEN 'pending' ELSE 'active' END INTO new_status
  FROM teacher_page_settings s WHERE s.teacher_id = invite.teacher_id;
  new_status := COALESCE(new_status, 'active');

  INSERT INTO academy_memberships (teacher_id, student_id, status, reviewed_at)
  VALUES (invite.teacher_id, auth.uid(), new_status, CASE WHEN new_status = 'active' THEN now() ELSE NULL END)
  ON CONFLICT (teacher_id, student_id) DO UPDATE SET status = EXCLUDED.status, reviewed_at = EXCLUDED.reviewed_at;
  UPDATE academy_invites SET used_count = used_count + 1 WHERE id = invite.id;
  RETURN new_status;
END;
$$;
REVOKE ALL ON FUNCTION redeem_academy_invite(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION redeem_academy_invite(text) TO authenticated;

CREATE OR REPLACE FUNCTION notify_academy_membership_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO notifications (user_id, type, title, body, link)
    VALUES (NEW.teacher_id, 'academy_membership', 'طلب انضمام جديد', 'يوجد طالب جديد يريد الانضمام إلى منصتك.', '/admin/teacher?tab=members');
  ELSIF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('active', 'rejected', 'blocked') THEN
    INSERT INTO notifications (user_id, type, title, body, link)
    VALUES (NEW.student_id, 'academy_membership', CASE WHEN NEW.status = 'active' THEN 'تم قبولك في المنصة' ELSE 'تم تحديث طلب المنصة' END, 'تم تحديث حالة عضويتك في منصة المدرس.', '/academy');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS academy_membership_notifications ON academy_memberships;
CREATE TRIGGER academy_membership_notifications
  AFTER INSERT OR UPDATE OF status ON academy_memberships
  FOR EACH ROW EXECUTE FUNCTION notify_academy_membership_change();
