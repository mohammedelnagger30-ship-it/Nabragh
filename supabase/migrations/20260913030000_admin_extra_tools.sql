-- Admin extra tools: broadcast, admin list/find, analytics, exam & competition
-- management, course review deletion.
DROP POLICY IF EXISTS course_reviews_admin_delete ON course_reviews;
CREATE POLICY course_reviews_admin_delete ON course_reviews FOR DELETE TO authenticated USING (is_admin());

-- Competitions: give admins full reach (read everything, manage any competition).
DROP POLICY IF EXISTS competitions_admin_select ON competitions;
CREATE POLICY competitions_admin_select ON competitions FOR SELECT TO authenticated USING (is_admin());
DROP POLICY IF EXISTS competitions_admin_update ON competitions;
CREATE POLICY competitions_admin_update ON competitions FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
DROP POLICY IF EXISTS competitions_admin_delete ON competitions;
CREATE POLICY competitions_admin_delete ON competitions FOR DELETE TO authenticated USING (is_admin());

-- ── Broadcast a notification to every user ────────────────────────────
CREATE OR REPLACE FUNCTION admin_broadcast_notification(p_title text, p_body text DEFAULT NULL, p_link text DEFAULT NULL, p_type text DEFAULT 'broadcast')
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'permission denied: not an admin';
  END IF;
  INSERT INTO notifications (user_id, type, title, body, link)
  SELECT id, p_type, p_title, p_body, p_link FROM profiles;
END;
$$;
REVOKE ALL ON FUNCTION admin_broadcast_notification(text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_broadcast_notification(text, text, text, text) TO authenticated;

-- ── List admins with their profile info ───────────────────────────────
CREATE OR REPLACE FUNCTION admin_list_admins()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'permission denied: not an admin';
  END IF;
  SELECT COALESCE(
    jsonb_agg(jsonb_build_object(
      'user_id', a.user_id,
      'email', p.email,
      'full_name', p.full_name,
      'created_at', p.created_at
    ) ORDER BY p.created_at ASC),
    '[]'::jsonb
  ) INTO result
  FROM admin_users a
  LEFT JOIN profiles p ON p.id = a.user_id;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION admin_list_admins() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_list_admins() TO authenticated;

-- ── Find a user profile by email for adding admins ────────────────────
CREATE OR REPLACE FUNCTION admin_find_user_by_email(p_email text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'permission denied: not an admin';
  END IF;
  SELECT jsonb_build_object('id', p.id, 'email', p.email, 'full_name', p.full_name)
  INTO result
  FROM profiles p
  WHERE p.email = p_email
  LIMIT 1;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION admin_find_user_by_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_find_user_by_email(text) TO authenticated;

-- ── Daily analytics for the last 30 days ──────────────────────────────
CREATE OR REPLACE FUNCTION admin_analytics_daily()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  result jsonb;
  s date := CURRENT_DATE - 29;
  today date := CURRENT_DATE;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'permission denied: not an admin';
  END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'date', to_char(day::date, 'YYYY-MM-DD'),
    'signups', (SELECT count(*) FROM profiles p WHERE (p.created_at AT TIME ZONE 'UTC')::date = day::date),
    'subscriptions', (SELECT count(*) FROM subscriptions su WHERE (su.created_at AT TIME ZONE 'UTC')::date = day::date),
    'revenue', (SELECT COALESCE(sum(pay.amount), 0) FROM payments pay WHERE pay.status = 'paid' AND (COALESCE(pay.paid_at, pay.created_at) AT TIME ZONE 'UTC')::date = day::date)
  ) ORDER BY day), '[]'::jsonb)
  INTO result
  FROM generate_series(s, today, interval '1 day') AS day;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION admin_analytics_daily() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_analytics_daily() TO authenticated;

-- ── Delete quiz + its questions and attempts, cascade-safe for admins ──
CREATE OR REPLACE FUNCTION admin_delete_quiz(p_quiz_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'permission denied: not an admin';
  END IF;
  DELETE FROM quiz_attempts WHERE quiz_id = p_quiz_id;
  DELETE FROM quiz_questions WHERE quiz_id = p_quiz_id;
  DELETE FROM quizzes WHERE id = p_quiz_id;
END;
$$;
REVOKE ALL ON FUNCTION admin_delete_quiz(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_delete_quiz(uuid) TO authenticated;

-- ── Delete competition + its questions and attempts ───────────────────
CREATE OR REPLACE FUNCTION admin_delete_competition(p_competition_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'permission denied: not an admin';
  END IF;
  DELETE FROM competition_attempts WHERE competition_id = p_competition_id;
  DELETE FROM competition_questions WHERE competition_id = p_competition_id;
  DELETE FROM competitions WHERE id = p_competition_id;
END;
$$;
REVOKE ALL ON FUNCTION admin_delete_competition(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_delete_competition(uuid) TO authenticated;

-- ── Set competition publish status ────────────────────────────────────
CREATE OR REPLACE FUNCTION admin_set_competition_status(p_competition_id uuid, p_status text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'permission denied: not an admin';
  END IF;
  IF p_status NOT IN ('draft', 'published', 'archived') THEN
    RAISE EXCEPTION 'invalid status';
  END IF;
  UPDATE competitions SET status = p_status WHERE id = p_competition_id;
END;
$$;
REVOKE ALL ON FUNCTION admin_set_competition_status(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_set_competition_status(uuid, text) TO authenticated;

-- ── Payments report ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION admin_payments_list()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'permission denied: not an admin';
  END IF;
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', pay.id,
      'student_name', s.full_name,
      'teacher_name', t.full_name,
      'subscription_id', pay.subscription_id,
      'amount', pay.amount,
      'currency', pay.currency,
      'method', pay.method,
      'status', pay.status,
      'created_at', pay.created_at,
      'paid_at', pay.paid_at
    ) ORDER BY COALESCE(pay.paid_at, pay.created_at) DESC), '[]'::jsonb)
  INTO result
  FROM payments pay
  LEFT JOIN profiles s ON s.id = pay.student_id
  LEFT JOIN profiles t ON t.id = pay.teacher_id;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION admin_payments_list() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_payments_list() TO authenticated;