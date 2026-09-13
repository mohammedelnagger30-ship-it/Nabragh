-- Add cover image support to teacher profiles.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cover_url text;

-- Extend public SELECT on profiles to include the new cover image column.
GRANT SELECT (cover_url) ON profiles TO anon, authenticated;