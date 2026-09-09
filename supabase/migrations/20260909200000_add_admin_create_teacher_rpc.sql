-- Migration: Add RPC function for admin to create teacher accounts directly
-- This bypasses Supabase Auth rate limits by using database-level operations

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create function to create teacher account directly in database
CREATE OR REPLACE FUNCTION admin_create_teacher_account(
  p_email TEXT,
  p_password TEXT,
  p_full_name TEXT,
  p_specialization TEXT DEFAULT NULL,
  p_location TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_bio TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_is_admin BOOLEAN;
BEGIN
  -- Check if current user is admin
  SELECT EXISTS(
    SELECT 1 FROM admin_users 
    WHERE user_id = auth.uid()
  ) INTO v_is_admin;
  
  IF NOT v_is_admin THEN
    RETURN json_build_object('error', 'Admin access required');
  END IF;

  -- Check if email already exists
  IF EXISTS (SELECT 1 FROM profiles WHERE email = p_email) THEN
    RETURN json_build_object('error', 'البريد الإلكتروني مسجل بالفعل في النظام');
  END IF;

  -- Generate UUID for new user
  v_user_id := uuid_generate_v4();

  -- Insert into profiles table
  INSERT INTO profiles (
    id,
    email,
    full_name,
    is_teacher,
    is_manager,
    is_approved,
    specialization,
    location,
    phone,
    bio,
    created_at,
    updated_at
  ) VALUES (
    v_user_id,
    p_email,
    p_full_name,
    true,
    false,
    true,
    p_specialization,
    p_location,
    p_phone,
    p_bio,
    NOW(),
    NOW()
  );

  -- Note: User will need to be created in auth.users table separately
  -- This is a limitation of the current approach
  -- For now, we return the user_id and the admin will need to create the auth user separately
  
  RETURN json_build_object(
    'success', true,
    'user_id', v_user_id,
    'message', 'تم إنشاء الملف الشخصي بنجاح',
    'note', 'يجب إنشاء المستخدم في Auth يدوياً باستخدام service role key'
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION admin_create_teacher_account TO authenticated;