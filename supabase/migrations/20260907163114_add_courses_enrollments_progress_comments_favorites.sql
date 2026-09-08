/*
# Add Courses, Enrollments, Progress, Comments, Favorites, Watch History

## Overview
Adds deep platform features: structured courses, enrollments, per-video progress tracking,
comments, favorites, and watch history. Transforms the platform into a full LMS.

## New Tables
1. courses - Structured course containers grouping videos by topic
2. course_enrollments - Student enrollment in courses
3. video_progress - Per-student per-video progress tracking
4. comments - Comments on videos with reply support
5. favorites - Student favorite videos
6. watch_history - Student watch history log

## Modified Tables
- videos: added course_id column (FK to courses, nullable)

## Security
- RLS enabled on all new tables with ownership-scoped policies
*/

-- =====================
-- COURSES TABLE (must come before ALTER TABLE videos)
-- =====================
CREATE TABLE IF NOT EXISTS courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  thumbnail_url text,
  level text DEFAULT 'beginner' CHECK (level IN ('beginner', 'intermediate', 'advanced')),
  price numeric(10,2) DEFAULT 0,
  is_published boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "courses_select_all" ON courses;
CREATE POLICY "courses_select_all" ON courses FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "courses_insert_own" ON courses;
CREATE POLICY "courses_insert_own" ON courses FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = teacher_id);

DROP POLICY IF EXISTS "courses_update_own" ON courses;
CREATE POLICY "courses_update_own" ON courses FOR UPDATE
  TO authenticated USING (auth.uid() = teacher_id) WITH CHECK (auth.uid() = teacher_id);

DROP POLICY IF EXISTS "courses_delete_own" ON courses;
CREATE POLICY "courses_delete_own" ON courses FOR DELETE
  TO authenticated USING (auth.uid() = teacher_id);

-- Add course_id to videos (after courses table exists)
ALTER TABLE videos ADD COLUMN IF NOT EXISTS course_id uuid REFERENCES courses(id) ON DELETE SET NULL;

-- =====================
-- COURSE_ENROLLMENTS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS course_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  enrolled_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  progress_percent integer DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  status text DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  UNIQUE(student_id, course_id)
);

ALTER TABLE course_enrollments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "enrollments_select_own" ON course_enrollments;
CREATE POLICY "enrollments_select_own" ON course_enrollments FOR SELECT
  TO authenticated USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "enrollments_insert_own" ON course_enrollments;
CREATE POLICY "enrollments_insert_own" ON course_enrollments FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "enrollments_update_own" ON course_enrollments;
CREATE POLICY "enrollments_update_own" ON course_enrollments FOR UPDATE
  TO authenticated USING (auth.uid() = student_id) WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "enrollments_delete_own" ON course_enrollments;
CREATE POLICY "enrollments_delete_own" ON course_enrollments FOR DELETE
  TO authenticated USING (auth.uid() = student_id);

-- =====================
-- VIDEO_PROGRESS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS video_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  video_id uuid NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  watched_seconds integer DEFAULT 0,
  total_seconds integer DEFAULT 0,
  is_completed boolean DEFAULT false,
  last_watched_at timestamptz DEFAULT now(),
  UNIQUE(student_id, video_id)
);

ALTER TABLE video_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "progress_select_own" ON video_progress;
CREATE POLICY "progress_select_own" ON video_progress FOR SELECT
  TO authenticated USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "progress_insert_own" ON video_progress;
CREATE POLICY "progress_insert_own" ON video_progress FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "progress_update_own" ON video_progress;
CREATE POLICY "progress_update_own" ON video_progress FOR UPDATE
  TO authenticated USING (auth.uid() = student_id) WITH CHECK (auth.uid() = student_id);

-- =====================
-- COMMENTS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  comment text NOT NULL,
  parent_id uuid REFERENCES comments(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "comments_select_all" ON comments;
CREATE POLICY "comments_select_all" ON comments FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "comments_insert_own" ON comments;
CREATE POLICY "comments_insert_own" ON comments FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "comments_delete_own" ON comments;
CREATE POLICY "comments_delete_own" ON comments FOR DELETE
  TO authenticated USING (auth.uid() = student_id);

-- =====================
-- FAVORITES TABLE
-- =====================
CREATE TABLE IF NOT EXISTS favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  video_id uuid NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(student_id, video_id)
);

ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "favorites_select_own" ON favorites;
CREATE POLICY "favorites_select_own" ON favorites FOR SELECT
  TO authenticated USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "favorites_insert_own" ON favorites;
CREATE POLICY "favorites_insert_own" ON favorites FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "favorites_delete_own" ON favorites;
CREATE POLICY "favorites_delete_own" ON favorites FOR DELETE
  TO authenticated USING (auth.uid() = student_id);

-- =====================
-- WATCH_HISTORY TABLE
-- =====================
CREATE TABLE IF NOT EXISTS watch_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  video_id uuid NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  watched_at timestamptz DEFAULT now()
);

ALTER TABLE watch_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "history_select_own" ON watch_history;
CREATE POLICY "history_select_own" ON watch_history FOR SELECT
  TO authenticated USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "history_insert_own" ON watch_history;
CREATE POLICY "history_insert_own" ON watch_history FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "history_delete_own" ON watch_history;
CREATE POLICY "history_delete_own" ON watch_history FOR DELETE
  TO authenticated USING (auth.uid() = student_id);

-- =====================
-- INDEXES
-- =====================
CREATE INDEX IF NOT EXISTS idx_courses_teacher_id ON courses(teacher_id);
CREATE INDEX IF NOT EXISTS idx_courses_category_id ON courses(category_id);
CREATE INDEX IF NOT EXISTS idx_videos_course_id ON videos(course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student_id ON course_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course_id ON course_enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_progress_student_id ON video_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_progress_video_id ON video_progress(video_id);
CREATE INDEX IF NOT EXISTS idx_comments_video_id ON comments(video_id);
CREATE INDEX IF NOT EXISTS idx_favorites_student_id ON favorites(student_id);
CREATE INDEX IF NOT EXISTS idx_history_student_id ON watch_history(student_id);