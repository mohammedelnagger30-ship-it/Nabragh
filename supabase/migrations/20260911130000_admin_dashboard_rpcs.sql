-- Admin dashboard RPCs (SECURITY DEFINER, caller must be admin).
-- Centralize all admin reads/stats so the frontend never depends on
-- fragile joins / column grants and always sees the real schema.

-- Snapshot for the admin overview tab.
CREATE OR REPLACE FUNCTION admin_dashboard_snapshot()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'permission denied: not an admin';
  END IF;

  SELECT jsonb_build_object(
    'counts', jsonb_build_object(
      'students', (SELECT count(*) FROM profiles WHERE is_teacher = false),
      'teachers', (SELECT count(*) FROM profiles WHERE is_teacher = true),
      'courses', (SELECT count(*) FROM courses),
      'videos', (SELECT count(*) FROM videos),
      'revenue', COALESCE((SELECT sum(amount) FROM payments WHERE status = 'paid'), 0),
      'pending_payments', (SELECT count(*) FROM payments WHERE status = 'pending'),
      'active_subscriptions', (SELECT count(*) FROM subscriptions WHERE status = 'active' AND payment_status = 'paid'),
      'total_views', (SELECT count(*) FROM watch_history)
    ),
    'recent_subscriptions', COALESCE((
      SELECT jsonb_agg(x) FROM (
        SELECT jsonb_build_object(
          'student_name', p.full_name,
          'course_title', c.title,
          'amount', sp.price,
          'status', s.status,
          'created_at', s.created_at
        ) AS x
        FROM subscriptions s
        LEFT JOIN profiles p ON p.id = s.student_id
        LEFT JOIN courses c ON c.id = s.course_id
        LEFT JOIN subscription_plans sp ON sp.id = s.plan_id
        ORDER BY s.created_at DESC
        LIMIT 10
      ) sub
    ), '[]'::jsonb),
    'recent_payments', COALESCE((
      SELECT jsonb_agg(x) FROM (
        SELECT jsonb_build_object(
          'student_name', p.full_name,
          'amount', pay.amount,
          'status', pay.status,
          'created_at', pay.created_at
        ) AS x
        FROM payments pay
        LEFT JOIN profiles p ON p.id = pay.student_id
        ORDER BY pay.created_at DESC
        LIMIT 10
      ) sub
    ), '[]'::jsonb),
    'top_courses', COALESCE((
      SELECT jsonb_agg(x) FROM (
        SELECT jsonb_build_object(
          'title', c.title,
          'enrollments', cnt.cnt,
          'revenue', cnt.cnt * c.price
        ) AS x
        FROM (
          SELECT course_id, count(*) AS cnt FROM course_enrollments GROUP BY course_id
        ) cnt
        JOIN courses c ON c.id = cnt.course_id
        ORDER BY cnt.cnt DESC
        LIMIT 5
      ) sub
    ), '[]'::jsonb),
    'top_teachers', COALESCE((
      SELECT jsonb_agg(x) FROM (
        SELECT jsonb_build_object(
          'name', t.name,
          'courses', t.courses,
          'students', t.students,
          'revenue', t.revenue
        ) AS x
        FROM (
          SELECT p.full_name AS name,
                 count(DISTINCT c.id) AS courses,
                 count(DISTINCT e.student_id) AS students,
                 COALESCE((SELECT sum(pay.amount) FROM payments pay WHERE pay.teacher_id = p.id AND pay.status = 'paid'), 0) AS revenue
          FROM profiles p
          LEFT JOIN courses c ON c.teacher_id = p.id
          LEFT JOIN course_enrollments e ON e.course_id = c.id
          WHERE p.is_teacher = true AND p.is_approved = true
          GROUP BY p.id, p.full_name
        ) t
        ORDER BY t.revenue DESC
        LIMIT 5
      ) sub
    ), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION admin_dashboard_snapshot() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_dashboard_snapshot() TO authenticated;

-- All subscriptions with related names, for the subscriptions tab.
CREATE OR REPLACE FUNCTION admin_subscriptions_list()
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
    'id', s.id,
    'student_name', p.full_name,
    'course_title', c.title,
    'access_type', s.access_type,
    'plan_name', sp.name_ar,
    'price', COALESCE(sp.price, c.price, 0),
    'status', s.status,
    'payment_status', s.payment_status,
    'end_date', s.end_date,
    'created_at', s.created_at
  ) ORDER BY s.created_at DESC), '[]'::jsonb)
  INTO result
  FROM subscriptions s
  LEFT JOIN profiles p ON p.id = s.student_id
  LEFT JOIN courses c ON c.id = s.course_id
  LEFT JOIN subscription_plans sp ON sp.id = s.plan_id;

  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION admin_subscriptions_list() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_subscriptions_list() TO authenticated;

-- Approve or reject a subscription request (also flips payment status).
CREATE OR REPLACE FUNCTION admin_set_subscription_status(target_id uuid, new_status text, paid boolean)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'permission denied: not an admin';
  END IF;
  UPDATE subscriptions
  SET status = new_status, payment_status = CASE WHEN paid THEN 'paid' ELSE payment_status END
  WHERE id = target_id;
END;
$$;
REVOKE ALL ON FUNCTION admin_set_subscription_status(uuid, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_set_subscription_status(uuid, text, boolean) TO authenticated;

-- Teachers with per-teacher stats for the teachers tab.
CREATE OR REPLACE FUNCTION admin_teacher_stats()
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
    'specialization', p.specialization,
    'is_approved', p.is_approved,
    'is_verified', p.is_verified,
    'created_at', p.created_at,
    'course_count', (SELECT count(*) FROM courses c WHERE c.teacher_id = p.id),
    'student_count', (SELECT count(DISTINCT e.student_id) FROM course_enrollments e JOIN courses c ON c.id = e.course_id WHERE c.teacher_id = p.id),
    'revenue', (SELECT COALESCE(sum(pay.amount), 0) FROM payments pay WHERE pay.teacher_id = p.id AND pay.status = 'paid')
  ) ORDER BY (SELECT COALESCE(sum(pay.amount), 0) FROM payments pay WHERE pay.teacher_id = p.id AND pay.status = 'paid') DESC NULLS LAST), '[]'::jsonb)
  INTO result
  FROM profiles p
  WHERE p.is_teacher = true;

  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION admin_teacher_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_teacher_stats() TO authenticated;

-- Students with per-student stats for the students tab.
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
  WHERE p.is_teacher = false;

  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION admin_student_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_student_stats() TO authenticated;

-- Courses with per-course stats for the courses tab (views come from watch_history).
CREATE OR REPLACE FUNCTION admin_course_stats()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'permission denied: not an admin';
  END IF;

  SELECT COALESCE(jsonb_agg(x ORDER BY x->>'created_at' DESC), '[]'::jsonb)
  INTO result
  FROM (
    SELECT jsonb_build_object(
      'id', c.id,
      'title', c.title,
      'price', c.price,
      'is_published', c.is_published,
      'is_featured', c.is_featured,
      'education_stage', c.education_stage,
      'teacher_name', t.full_name,
      'enrollment_count', COUNT(e.id),
      'revenue', COUNT(e.id) * c.price,
      'views_count', (SELECT count(*) FROM watch_history w JOIN videos v ON v.id = w.video_id WHERE v.course_id = c.id),
      'created_at', c.created_at
    ) AS x
    FROM courses c
    LEFT JOIN profiles t ON t.id = c.teacher_id
    LEFT JOIN course_enrollments e ON e.course_id = c.id
    GROUP BY c.id, t.full_name
  ) sub;

  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION admin_course_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_course_stats() TO authenticated;