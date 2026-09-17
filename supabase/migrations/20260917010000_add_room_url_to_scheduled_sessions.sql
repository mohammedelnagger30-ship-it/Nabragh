-- Add room_url to scheduled_sessions so teachers can share a join link
ALTER TABLE scheduled_sessions ADD COLUMN IF NOT EXISTS room_url text;
