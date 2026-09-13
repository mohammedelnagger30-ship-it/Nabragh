-- Fix the admin overview "views" statistic to use the real watch_history table.
-- video_views was never created; watch_history is the video-view log.

DROP POLICY IF EXISTS history_admin_select ON watch_history;
CREATE POLICY history_admin_select ON watch_history
  FOR SELECT TO authenticated USING (is_admin());