-- Notify all admins when a new teacher registers (is_approved = false).
CREATE OR REPLACE FUNCTION notify_admins_on_teacher_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_teacher = true AND NEW.is_approved = false THEN
    INSERT INTO notifications (user_id, type, title, body, link)
    SELECT au.user_id,
           'teacher_signup',
           'طلب تسجيل مدرس جديد',
           NEW.full_name || ' (' || NEW.email || ') يطلب تسجيل كمدرس.',
           '/admin'
    FROM admin_users au
    WHERE au.user_id <> NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_admins_on_teacher_signup ON profiles;
CREATE TRIGGER notify_admins_on_teacher_signup
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION notify_admins_on_teacher_signup();
