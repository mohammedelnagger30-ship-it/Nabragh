-- Course visibility (hide from public areas, keep on the teacher's page)
-- and manual display ordering for the admin course panel.
ALTER TABLE courses ADD COLUMN IF NOT EXISTS is_visible boolean NOT NULL DEFAULT true;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

-- Include the new fields in the admin course stats output and sort by display order.
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

  SELECT COALESCE(jsonb_agg(x ORDER BY x->>'sort_order' ASC, x->>'created_at' DESC), '[]'::jsonb)
  INTO result
  FROM (
    SELECT jsonb_build_object(
      'id', c.id,
      'title', c.title,
      'price', c.price,
      'is_published', c.is_published,
      'is_featured', c.is_featured,
      'is_visible', c.is_visible,
      'sort_order', c.sort_order,
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