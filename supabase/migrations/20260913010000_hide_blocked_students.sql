-- Hide blocked/rejected students (is_approved = false) from the admin students list,
-- mirroring how rejected teachers disappear from the teachers list.
CREATE OR REPLACE FUNCTION admin_student_stats()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'permission denied: not an admin';
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', p.id,
    'full_name', p.full_name,
    'email', p.email,
    'created_at', p.created_at,
    'enrollment_count', (SELECT count(*) FROM course_enrollments e WHERE e.student_id = p.id),
    'total_spent', (SELECT COALESCE(sum(pay.amount), 0) FROM payments pay WHERE pay.student_id = p.id AND pay.status = 'paid')
  ) ORDER BY p.created_at DESC), '[]'::jsonb)
  INTO result
  FROM profiles p
  WHERE p.is_teacher = false AND p.is_approved = true;

  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION admin_student_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_student_stats() TO authenticated;