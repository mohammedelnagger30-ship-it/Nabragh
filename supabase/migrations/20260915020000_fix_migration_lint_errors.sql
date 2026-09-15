-- Fix functions reported by Supabase database lint.

DROP FUNCTION IF EXISTS admin_set_featured(text, uuid, boolean, integer);

CREATE OR REPLACE FUNCTION admin_set_featured(
  target_table text,
  target_id uuid,
  featured boolean,
  sort_order integer DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'permission denied: not an admin';
  END IF;

  IF target_table = 'profiles' THEN
    UPDATE profiles AS profile
    SET is_featured = $3,
      featured_order = $4
    WHERE profile.id = $2;
  ELSIF target_table = 'courses' THEN
    UPDATE courses AS course
    SET is_featured = $3,
      featured_order = $4
    WHERE course.id = $2;
  ELSIF target_table = 'videos' THEN
    UPDATE videos AS video
    SET is_featured = $3,
      featured_order = $4
    WHERE video.id = $2;
  ELSE
    RAISE EXCEPTION 'invalid target table: %', target_table;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION admin_create_teacher_account(
  p_email text,
  p_password text,
  p_full_name text,
  p_specialization text DEFAULT NULL,
  p_location text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_bio text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_is_admin boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = auth.uid()
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RETURN json_build_object('error', 'Admin access required');
  END IF;

  IF EXISTS (SELECT 1 FROM profiles WHERE email = p_email) THEN
    RETURN json_build_object('error', 'البريد الإلكتروني مسجل بالفعل في النظام');
  END IF;

  v_user_id := gen_random_uuid();

  INSERT INTO profiles (
    id, email, full_name, is_teacher, is_manager, is_approved,
    specialization, location, phone, bio, created_at, updated_at
  ) VALUES (
    v_user_id, p_email, p_full_name, true, false, true,
    p_specialization, p_location, p_phone, p_bio, now(), now()
  );

  RETURN json_build_object(
    'success', true,
    'user_id', v_user_id,
    'message', 'تم إنشاء الملف الشخصي بنجاح',
    'note', 'يجب إنشاء المستخدم في Auth يدوياً باستخدام service role key'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION admin_set_featured(text, uuid, boolean, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_create_teacher_account(text, text, text, text, text, text, text) TO authenticated;