-- Advanced Analytics System
-- This migration adds comprehensive analytics for teachers and platform

-- 1) Create analytics_events table
CREATE TABLE IF NOT EXISTS analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id text NOT NULL,
  event_type text NOT NULL CHECK (event_type IN (
    'page_view', 'video_play', 'video_pause', 'video_complete', 
    'course_enroll', 'course_complete', 'quiz_start', 'quiz_complete',
    'search', 'filter', 'share', 'download', 'comment', 'like'
  )),
  event_data jsonb DEFAULT '{}',
  page_url text,
  referrer text,
  user_agent text,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2) Create daily_analytics table
CREATE TABLE IF NOT EXISTS daily_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  date date NOT NULL,
  video_views integer DEFAULT 0,
  unique_viewers integer DEFAULT 0,
  course_enrollments integer DEFAULT 0,
  course_completions integer DEFAULT 0,
  quiz_attempts integer DEFAULT 0,
  quiz_completions integer DEFAULT 0,
  average_watch_time numeric DEFAULT 0,
  engagement_rate numeric DEFAULT 0,
  revenue numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(teacher_id, date)
);

-- 3) Create funnel_analytics table
CREATE TABLE IF NOT EXISTS funnel_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE,
  funnel_step text NOT NULL CHECK (funnel_step IN (
    'course_view', 'enroll_click', 'enroll_complete', 'first_video', 
    'quiz_start', 'quiz_complete', 'certificate_earned'
  )),
  count integer DEFAULT 0,
  date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(teacher_id, course_id, funnel_step, date)
);

-- 4) Add indexes
CREATE INDEX IF NOT EXISTS idx_analytics_events_user ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session ON analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_daily_analytics_teacher ON daily_analytics(teacher_id);
CREATE INDEX IF NOT EXISTS idx_daily_analytics_date ON daily_analytics(date DESC);
CREATE INDEX IF NOT EXISTS idx_funnel_analytics_teacher ON funnel_analytics(teacher_id);
CREATE INDEX IF NOT EXISTS idx_funnel_analytics_course ON funnel_analytics(course_id);

-- 5) Enable RLS
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE funnel_analytics ENABLE ROW LEVEL SECURITY;

-- 6) RLS policies
CREATE POLICY "Admins can view all analytics" ON analytics_events
  FOR SELECT TO authenticated
  USING (is_admin());

CREATE POLICY "Teachers can view their own analytics" ON analytics_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_teacher = true
    )
  );

CREATE POLICY "System can insert analytics" ON analytics_events
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can view all daily analytics" ON daily_analytics
  FOR SELECT TO authenticated
  USING (is_admin());

CREATE POLICY "Teachers can view their own daily analytics" ON daily_analytics
  FOR SELECT TO authenticated
  USING (auth.uid() = teacher_id);

CREATE POLICY "System can insert daily analytics" ON daily_analytics
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can view all funnel analytics" ON funnel_analytics
  FOR SELECT TO authenticated
  USING (is_admin());

CREATE POLICY "Teachers can view their own funnel analytics" ON funnel_analytics
  FOR SELECT TO authenticated
  USING (auth.uid() = teacher_id);

CREATE POLICY "System can insert funnel analytics" ON funnel_analytics
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- 7) Function to aggregate daily analytics
CREATE OR REPLACE FUNCTION aggregate_daily_analytics()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  teacher_record RECORD;
  date_val date := CURRENT_DATE;
BEGIN
  FOR teacher_record IN 
    SELECT id FROM profiles WHERE is_teacher = true
  LOOP
    INSERT INTO daily_analytics (
      teacher_id, date, video_views, unique_viewers, 
      course_enrollments, course_completions, quiz_attempts, quiz_completions
    )
    SELECT
      teacher_record.id,
      date_val,
      COUNT(DISTINCT CASE WHEN event_type = 'video_play' THEN user_id END) as video_views,
      COUNT(DISTINCT user_id) as unique_viewers,
      COUNT(DISTINCT CASE WHEN event_type = 'course_enroll' THEN user_id END) as course_enrollments,
      COUNT(DISTINCT CASE WHEN event_type = 'course_complete' THEN user_id END) as course_completions,
      COUNT(DISTINCT CASE WHEN event_type = 'quiz_start' THEN user_id END) as quiz_attempts,
      COUNT(DISTINCT CASE WHEN event_type = 'quiz_complete' THEN user_id END) as quiz_completions
    FROM analytics_events
    WHERE created_at >= date_val
      AND created_at < date_val + interval '1 day'
      AND event_type IN ('video_play', 'course_enroll', 'course_complete', 'quiz_start', 'quiz_complete')
    ON CONFLICT (teacher_id, date) DO UPDATE SET
      video_views = EXCLUDED.video_views,
      unique_viewers = EXCLUDED.unique_viewers,
      course_enrollments = EXCLUDED.course_enrollments,
      course_completions = EXCLUDED.course_completions,
      quiz_attempts = EXCLUDED.quiz_attempts,
      quiz_completions = EXCLUDED.quiz_completions,
      updated_at = now();
  END LOOP;
END;
$$;

-- 8) Function to get teacher analytics summary
CREATE OR REPLACE FUNCTION get_teacher_analytics_summary(p_teacher_id uuid, p_days integer DEFAULT 30)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
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
      SELECT json_agg(json_build_object(
        'date', date,
        'views', video_views,
        'enrollments', course_enrollments,
        'revenue', revenue
      ))
      FROM daily_analytics
      WHERE teacher_id = p_teacher_id
        AND date >= CURRENT_DATE - (p_days || ' days')::interval
      ORDER BY date DESC
    )
  ) INTO result
  FROM daily_analytics
  WHERE teacher_id = p_teacher_id
    AND date >= CURRENT_DATE - (p_days || ' days')::interval;
  
  RETURN COALESCE(result, '{}'::json);
END;
$$;

-- 9) Function to track funnel events
CREATE OR REPLACE FUNCTION track_funnel_event(
  p_teacher_id uuid,
  p_course_id uuid,
  p_funnel_step text
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO funnel_analytics (teacher_id, course_id, funnel_step, count, date)
  VALUES (p_teacher_id, p_course_id, p_funnel_step, 1, CURRENT_DATE)
  ON CONFLICT (teacher_id, course_id, funnel_step, date) DO UPDATE
  SET count = funnel_analytics.count + 1;
END;
$$;

-- 10) Function to get funnel conversion rates
CREATE OR REPLACE FUNCTION get_funnel_conversion(p_course_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  result json;
BEGIN
  WITH funnel_data AS (
    SELECT 
      funnel_step,
      SUM(count) as total_count
    FROM funnel_analytics
    WHERE course_id = p_course_id
      AND date >= CURRENT_DATE - interval '30 days'
    GROUP BY funnel_step
  )
  SELECT json_build_object(
    'course_view', COALESCE((SELECT total_count FROM funnel_data WHERE funnel_step = 'course_view'), 0),
    'enroll_click', COALESCE((SELECT total_count FROM funnel_data WHERE funnel_step = 'enroll_click'), 0),
    'enroll_complete', COALESCE((SELECT total_count FROM funnel_data WHERE funnel_step = 'enroll_complete'), 0),
    'first_video', COALESCE((SELECT total_count FROM funnel_data WHERE funnel_step = 'first_video'), 0),
    'quiz_start', COALESCE((SELECT total_count FROM funnel_data WHERE funnel_step = 'quiz_start'), 0),
    'quiz_complete', COALESCE((SELECT total_count FROM funnel_data WHERE funnel_step = 'quiz_complete'), 0),
    'certificate_earned', COALESCE((SELECT total_count FROM funnel_data WHERE funnel_step = 'certificate_earned'), 0)
  ) INTO result;
  
  RETURN result;
END;
$$;

-- 11) Update timestamp trigger
CREATE OR REPLACE FUNCTION update_analytics_timestamp()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS analytics_timestamp_trigger ON daily_analytics;
CREATE TRIGGER analytics_timestamp_trigger
  BEFORE UPDATE ON daily_analytics
  FOR EACH ROW EXECUTE FUNCTION update_analytics_timestamp();
