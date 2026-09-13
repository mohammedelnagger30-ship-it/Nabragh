-- Reject a teacher registration: remove from every teacher list
-- (is_teacher=false) while keeping the profile usable as a student.
CREATE OR REPLACE FUNCTION admin_reject_teacher(target_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'permission denied: not an admin';
  END IF;
  UPDATE profiles SET is_teacher = false, is_approved = false WHERE id = target_id;
  INSERT INTO notifications (user_id, type, title, body, link)
  VALUES (target_id, 'teacher_rejected', 'لم يتم اعتماد طلبك كمدرس', 'تم رفض طلب انضمامك كمدرس. استكمل المنصة كطالب أول تواصل مع الإدارة.', '/settings');
END;
$$;
REVOKE ALL ON FUNCTION admin_reject_teacher(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_reject_teacher(uuid) TO authenticated;