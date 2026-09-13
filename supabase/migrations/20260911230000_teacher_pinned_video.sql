-- Teacher pinned/intro video shown on their public profile page.
-- The teacher picks one of their own videos to feature ("فيديو مميز / تعريفي").

ALTER TABLE videos ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false;

-- At most one pinned video per teacher.
UPDATE videos SET is_pinned = false;
CREATE UNIQUE INDEX IF NOT EXISTS one_pinned_video_per_teacher ON videos (teacher_id) WHERE is_pinned;

GRANT SELECT (is_pinned) ON videos TO anon, authenticated;

-- Pin one of the caller's own videos (unpins any other pinned video of theirs).
CREATE OR REPLACE FUNCTION teacher_set_pinned_video(p_video_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_teacher uuid;
BEGIN
  SELECT teacher_id INTO v_teacher FROM videos WHERE id = p_video_id;
  IF v_teacher IS NULL OR v_teacher <> auth.uid() THEN
    RAISE EXCEPTION 'permission denied: not your video';
  END IF;
  UPDATE videos SET is_pinned = false WHERE teacher_id = v_teacher AND is_pinned = true;
  UPDATE videos SET is_pinned = true WHERE id = p_video_id;
END;
$$;
REVOKE ALL ON FUNCTION teacher_set_pinned_video(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION teacher_set_pinned_video(uuid) TO authenticated;

-- Remove the pinned/intro video for the caller's own account.
CREATE OR REPLACE FUNCTION teacher_unpin_video(p_teacher_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() <> p_teacher_id THEN
    RAISE EXCEPTION 'permission denied';
  END IF;
  UPDATE videos SET is_pinned = false WHERE teacher_id = p_teacher_id;
END;
$$;
REVOKE ALL ON FUNCTION teacher_unpin_video(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION teacher_unpin_video(uuid) TO authenticated;

-- Public followers count (RLS on teacher_follows hides rows for anon).
CREATE OR REPLACE FUNCTION get_teacher_followers_count(p_teacher_id uuid)
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT count(*)::int FROM teacher_follows WHERE teacher_id = p_teacher_id;
$$;
REVOKE ALL ON FUNCTION get_teacher_followers_count(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_teacher_followers_count(uuid) TO anon, authenticated;