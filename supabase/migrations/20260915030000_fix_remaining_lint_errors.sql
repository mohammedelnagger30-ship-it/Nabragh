-- Fix remaining database lint errors in rate limiting and analytics aggregation.

CREATE OR REPLACE FUNCTION check_rate_limit(
  p_user_id uuid,
  p_endpoint text,
  p_max_requests integer DEFAULT 60
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count integer;
  current_window_id uuid;
BEGIN
  DELETE FROM rate_limits WHERE window_end < now();

  SELECT COALESCE(SUM(request_count), 0)
  INTO current_count
  FROM rate_limits
  WHERE user_id = p_user_id
    AND endpoint = p_endpoint
    AND window_start >= now() - interval '1 minute';

  IF current_count >= p_max_requests THEN
    RETURN false;
  END IF;

  SELECT id
  INTO current_window_id
  FROM rate_limits
  WHERE user_id = p_user_id
    AND endpoint = p_endpoint
    AND window_start >= now() - interval '1 minute'
  ORDER BY window_start DESC
  LIMIT 1;

  IF current_window_id IS NULL THEN
    INSERT INTO rate_limits (user_id, endpoint, request_count, window_start, window_end)
    VALUES (p_user_id, p_endpoint, 1, now(), now() + interval '1 minute');
  ELSE
    UPDATE rate_limits
    SET request_count = request_count + 1
    WHERE id = current_window_id;
  END IF;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION get_teacher_analytics_summary(
  p_teacher_id uuid,
  p_days integer DEFAULT 30
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'total_views', COALESCE(SUM(video_views), 0),
    'unique_viewers', COALESCE(SUM(unique_viewers), 0),
    'total_enrollments', COALESCE(SUM(course_enrollments), 0),
    'total_completions', COALESCE(SUM(course_completions), 0),
    'average_engagement', COALESCE(AVG(engagement_rate), 0),
    'total_revenue', COALESCE(SUM(revenue), 0),
    'daily_data', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'date', daily.date,
          'views', daily.video_views,
          'enrollments', daily.course_enrollments,
          'revenue', daily.revenue
        ) ORDER BY daily.date DESC
      ), '[]'::json)
      FROM daily_analytics AS daily
      WHERE daily.teacher_id = p_teacher_id
        AND daily.date >= CURRENT_DATE - (p_days || ' days')::interval
    )
  ) INTO result
  FROM daily_analytics
  WHERE teacher_id = p_teacher_id
    AND date >= CURRENT_DATE - (p_days || ' days')::interval;

  RETURN COALESCE(result, '{}'::json);
END;
$$;
