-- Reviews and Ratings System
-- This migration adds a comprehensive reviews system for courses and teachers

-- 1) Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('course', 'teacher')),
  target_id uuid NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title text,
  comment text,
  is_verified boolean DEFAULT false,
  helpful_count integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, target_type, target_id)
);

-- 2) Create helpful votes table
CREATE TABLE IF NOT EXISTS review_helpful_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(review_id, user_id)
);

-- The base schema already has a teacher/student reviews table. Add the
-- generalized review fields without replacing the existing columns or data.
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS target_type text;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS target_id uuid;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS helpful_count integer DEFAULT 0;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

UPDATE reviews
SET user_id = student_id,
    target_type = COALESCE(target_type, 'teacher'),
    target_id = COALESCE(target_id, teacher_id)
WHERE user_id IS NULL OR target_type IS NULL OR target_id IS NULL;

-- 3) Add indexes
CREATE INDEX IF NOT EXISTS idx_reviews_target ON reviews(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);
CREATE INDEX IF NOT EXISTS idx_reviews_created ON reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_review_votes_review ON review_helpful_votes(review_id);
CREATE INDEX IF NOT EXISTS idx_review_votes_user ON review_helpful_votes(user_id);

-- 4) Enable RLS
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_helpful_votes ENABLE ROW LEVEL SECURITY;

-- 5) RLS policies for reviews
CREATE POLICY "Anyone can view reviews" ON reviews
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert reviews" ON reviews
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reviews" ON reviews
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reviews" ON reviews
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 6) RLS policies for helpful votes
CREATE POLICY "Anyone can view helpful votes" ON review_helpful_votes
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert helpful votes" ON review_helpful_votes
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own helpful votes" ON review_helpful_votes
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 7) Function to calculate average rating
CREATE OR REPLACE FUNCTION get_average_rating(p_target_type text, p_target_id uuid)
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  avg_rating numeric;
BEGIN
  SELECT COALESCE(AVG(rating), 0) INTO avg_rating
  FROM reviews
  WHERE target_type = p_target_type
    AND target_id = p_target_id;
  RETURN ROUND(avg_rating::numeric, 1);
END;
$$;

-- 8) Function to get review count
CREATE OR REPLACE FUNCTION get_review_count(p_target_type text, p_target_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  count_val integer;
BEGIN
  SELECT COUNT(*) INTO count_val
  FROM reviews
  WHERE target_type = p_target_type
    AND target_id = p_target_id;
  RETURN count_val;
END;
$$;

-- 9) Function to get rating distribution
CREATE OR REPLACE FUNCTION get_rating_distribution(p_target_type text, p_target_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    '5', COUNT(*) FILTER (WHERE rating = 5),
    '4', COUNT(*) FILTER (WHERE rating = 4),
    '3', COUNT(*) FILTER (WHERE rating = 3),
    '2', COUNT(*) FILTER (WHERE rating = 2),
    '1', COUNT(*) FILTER (WHERE rating = 1)
  ) INTO result
  FROM reviews
  WHERE target_type = p_target_type
    AND target_id = p_target_id;
  RETURN result;
END;
$$;

-- 10) Trigger to update helpful count
CREATE OR REPLACE FUNCTION update_helpful_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE reviews SET helpful_count = helpful_count + 1 WHERE id = NEW.review_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE reviews SET helpful_count = helpful_count - 1 WHERE id = OLD.review_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS helpful_count_trigger ON review_helpful_votes;
CREATE TRIGGER helpful_count_trigger
  AFTER INSERT OR DELETE ON review_helpful_votes
  FOR EACH ROW EXECUTE FUNCTION update_helpful_count();

-- 11) Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_review_timestamp()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS review_timestamp_trigger ON reviews;
CREATE TRIGGER review_timestamp_trigger
  BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_review_timestamp();

-- 12) Add rating columns to courses table if they don't exist
ALTER TABLE courses ADD COLUMN IF NOT EXISTS average_rating numeric DEFAULT 0;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS review_count integer DEFAULT 0;

-- 13) Add rating columns to profiles table if they don't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS average_rating numeric DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS review_count integer DEFAULT 0;

-- 14) Function to update course ratings
CREATE OR REPLACE FUNCTION update_course_rating()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  review_target_type text;
  review_target_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    review_target_type := OLD.target_type;
    review_target_id := OLD.target_id;
  ELSE
    review_target_type := NEW.target_type;
    review_target_id := NEW.target_id;
  END IF;

  IF review_target_type = 'course' THEN
    UPDATE courses
    SET average_rating = get_average_rating('course', review_target_id),
        review_count = get_review_count('course', review_target_id)
    WHERE id = review_target_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS course_rating_trigger ON reviews;
CREATE TRIGGER course_rating_trigger
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_course_rating();

-- 15) Function to update teacher ratings
CREATE OR REPLACE FUNCTION update_teacher_rating()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  review_target_type text;
  review_target_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    review_target_type := OLD.target_type;
    review_target_id := OLD.target_id;
  ELSE
    review_target_type := NEW.target_type;
    review_target_id := NEW.target_id;
  END IF;

  IF review_target_type = 'teacher' THEN
    UPDATE profiles
    SET average_rating = get_average_rating('teacher', review_target_id),
        review_count = get_review_count('teacher', review_target_id)
    WHERE id = review_target_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS teacher_rating_trigger ON reviews;
CREATE TRIGGER teacher_rating_trigger
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_teacher_rating();
