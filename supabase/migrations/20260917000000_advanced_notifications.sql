-- Advanced Notifications System
-- Adds: categories, preferences, priorities, grouping, archiving

-- 1. Add new columns to notifications table
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'system';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'normal';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS icon text;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS action_label text;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS action_url text;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS group_key text;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS meta jsonb DEFAULT '{}';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS archived_at timestamptz;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS expires_at timestamptz;

-- 2. Create notification_preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category text NOT NULL,
  channel_in_app boolean NOT NULL DEFAULT true,
  channel_push boolean NOT NULL DEFAULT false,
  channel_email boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, category)
);

-- 3. Create notification_categories enum-like reference
CREATE TABLE IF NOT EXISTS notification_categories (
  key text PRIMARY KEY,
  label_ar text NOT NULL,
  label_en text NOT NULL,
  icon text,
  color text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0
);

-- Seed default categories
INSERT INTO notification_categories (key, label_ar, label_en, icon, color, sort_order) VALUES
  ('enrollment', 'التسجيل', 'Enrollment', 'BookOpen', 'blue', 1),
  ('achievement', 'الإنجازات', 'Achievements', 'Trophy', 'amber', 2),
  ('course', 'الدورات', 'Courses', 'GraduationCap', 'violet', 3),
  ('competition', 'المنافسات', 'Competitions', 'Gamepad2', 'cyan', 4),
  ('payment', 'المدفوعات', 'Payments', 'CreditCard', 'emerald', 5),
  ('system', 'النظام', 'System', 'Bell', 'slate', 6),
  ('social', 'التواصل', 'Social', 'Users', 'rose', 7),
  ('reminder', 'التذكيرات', 'Reminders', 'Clock', 'orange', 8),
  ('security', 'الأمان', 'Security', 'ShieldCheck', 'red', 9)
ON CONFLICT (key) DO NOTHING;

-- 4. Seed default notification preferences for existing users
INSERT INTO notification_preferences (user_id, category, channel_in_app, channel_push)
SELECT p.id, nc.key, true, (nc.key IN ('enrollment', 'achievement', 'payment', 'security'))
FROM profiles p
CROSS JOIN notification_categories nc
WHERE nc.is_active = true
ON CONFLICT (user_id, category) DO NOTHING;

-- 5. Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_category ON notifications(category);
CREATE INDEX IF NOT EXISTS idx_notifications_group ON notifications(group_key);
CREATE INDEX IF NOT EXISTS idx_notification_prefs_user ON notification_preferences(user_id);

-- 6. RPC: Mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE notifications SET is_read = true WHERE id = p_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. RPC: Mark all notifications as read
CREATE OR REPLACE FUNCTION mark_all_notifications_read(p_user_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE notifications SET is_read = true WHERE user_id = p_user_id AND is_read = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. RPC: Archive notification
CREATE OR REPLACE FUNCTION archive_notification(p_notification_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE notifications SET archived_at = now() WHERE id = p_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. RPC: Delete notification
CREATE OR REPLACE FUNCTION delete_notification(p_notification_id uuid)
RETURNS void AS $$
BEGIN
  DELETE FROM notifications WHERE id = p_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. RPC: Get notification counts by category
CREATE OR REPLACE FUNCTION get_notification_counts(p_user_id uuid)
RETURNS TABLE(category text, total_count bigint, unread_count bigint) AS $$
BEGIN
  RETURN QUERY
  SELECT
    n.category,
    COUNT(*)::bigint AS total_count,
    COUNT(*) FILTER (WHERE NOT n.is_read)::bigint AS unread_count
  FROM notifications n
  WHERE n.user_id = p_user_id
    AND (n.archived_at IS NULL)
    AND (n.expires_at IS NULL OR n.expires_at > now())
  GROUP BY n.category;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. RPC: Update notification preferences
CREATE OR REPLACE FUNCTION update_notification_preference(
  p_user_id uuid,
  p_category text,
  p_channel_in_app boolean,
  p_channel_push boolean,
  p_channel_email boolean
)
RETURNS void AS $$
BEGIN
  INSERT INTO notification_preferences (user_id, category, channel_in_app, channel_push, channel_email, updated_at)
  VALUES (p_user_id, p_category, p_channel_in_app, p_channel_push, p_channel_email, now())
  ON CONFLICT (user_id, category)
  DO UPDATE SET
    channel_in_app = p_channel_in_app,
    channel_push = p_channel_push,
    channel_email = p_channel_email,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. RPC: Send targeted notification to specific users
CREATE OR REPLACE FUNCTION send_notification_to_users(
  p_user_ids uuid[],
  p_title text,
  p_body text,
  p_category text DEFAULT 'system',
  p_priority text DEFAULT 'normal',
  p_link text DEFAULT NULL,
  p_icon text DEFAULT NULL,
  p_group_key text DEFAULT NULL,
  p_expires_at timestamptz DEFAULT NULL
)
RETURNS int AS $$
DECLARE
  inserted_count int := 0;
  uid uuid;
BEGIN
  FOREACH uid IN ARRAY p_user_ids LOOP
    INSERT INTO notifications (user_id, title, body, category, priority, link, icon, group_key, expires_at)
    VALUES (uid, p_title, p_body, p_category, p_priority, p_link, p_icon, p_group_key, p_expires_at);
    inserted_count := inserted_count + 1;
  END LOOP;
  RETURN inserted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. RLS policies for notification_preferences
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferences"
  ON notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON notification_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 14. RLS policies for notification_categories
ALTER TABLE notification_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view notification categories"
  ON notification_categories FOR SELECT
  USING (true);

-- 15. Update notification read policies
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;
CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  USING (auth.uid() = user_id);
