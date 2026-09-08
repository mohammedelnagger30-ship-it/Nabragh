/*
# Create Educational Platform Schema

## Overview
This migration creates the complete database schema for a professional educational platform
where teachers can register, create profiles with CVs, upload videos, and manage subscriptions.
Students can browse teachers, watch videos, subscribe, and leave reviews.

## New Tables

1. **profiles** - Extends auth.users with teacher/student information
   - id (uuid, PK, FK to auth.users)
   - full_name, bio, avatar_url, phone, location, website
   - specialization, years_experience, cv_url
   - is_teacher (boolean, default false)
   - created_at, updated_at

2. **categories** - Subject categories (Math, Science, Languages, etc.)
   - id (uuid, PK)
   - name, name_ar, description, icon_name
   - color (for UI theming)
   - sort_order

3. **videos** - Teacher video lessons
   - id (uuid, PK)
   - teacher_id (FK to profiles)
   - title, description, video_url, thumbnail_url
   - category_id (FK to categories)
   - duration_seconds, views_count
   - is_free (boolean - free preview or subscription-only)
   - created_at

4. **reviews** - Student reviews of teachers
   - id (uuid, PK)
   - teacher_id, student_id (FK to profiles)
   - rating (1-5), comment
   - created_at

5. **subscription_plans** - Available subscription tiers
   - id (uuid, PK)
   - name, name_ar, price, duration_months
   - features (JSON array)
   - is_active

6. **subscriptions** - Student subscriptions to teachers
   - id (uuid, PK)
   - student_id, teacher_id (FK to profiles)
   - plan_id (FK to subscription_plans)
   - start_date, end_date, status

## Security
- RLS enabled on ALL tables
- Profiles: users can read all profiles, update only their own
- Categories: public read, admin write (anon+authenticated for demo)
- Videos: public read, only teacher owner can insert/update/delete
- Reviews: public read, students can create/update/delete their own
- Subscription plans: public read
- Subscriptions: owner can read/create their subscriptions, teachers can read their subscribers
*/

-- =====================
-- PROFILES TABLE
-- =====================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  bio text,
  avatar_url text,
  phone text,
  location text,
  website text,
  specialization text,
  years_experience integer DEFAULT 0,
  cv_url text,
  is_teacher boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_all" ON profiles;
CREATE POLICY "profiles_select_all" ON profiles FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_delete_own" ON profiles;
CREATE POLICY "profiles_delete_own" ON profiles FOR DELETE
  TO authenticated USING (auth.uid() = id);

-- =====================
-- CATEGORIES TABLE
-- =====================
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_ar text NOT NULL,
  description text,
  icon_name text DEFAULT 'BookOpen',
  color text DEFAULT 'blue',
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "categories_select_all" ON categories;
CREATE POLICY "categories_select_all" ON categories FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "categories_insert_any" ON categories;
CREATE POLICY "categories_insert_admin" ON categories FOR INSERT
  TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "categories_update_any" ON categories;
CREATE POLICY "categories_update_admin" ON categories FOR UPDATE
  TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "categories_delete_any" ON categories;
CREATE POLICY "categories_delete_admin" ON categories FOR DELETE
  TO service_role USING (true);

-- =====================
-- VIDEOS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  video_url text NOT NULL,
  thumbnail_url text,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  duration_seconds integer DEFAULT 0,
  views_count integer DEFAULT 0,
  is_free boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "videos_select_all" ON videos;
CREATE POLICY "videos_select_all" ON videos FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "videos_insert_own" ON videos;
CREATE POLICY "videos_insert_own" ON videos FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = teacher_id);

DROP POLICY IF EXISTS "videos_update_own" ON videos;
CREATE POLICY "videos_update_own" ON videos FOR UPDATE
  TO authenticated USING (auth.uid() = teacher_id) WITH CHECK (auth.uid() = teacher_id);

DROP POLICY IF EXISTS "videos_delete_own" ON videos;
CREATE POLICY "videos_delete_own" ON videos FOR DELETE
  TO authenticated USING (auth.uid() = teacher_id);

-- =====================
-- REVIEWS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(teacher_id, student_id)
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reviews_select_all" ON reviews;
CREATE POLICY "reviews_select_all" ON reviews FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "reviews_insert_own" ON reviews;
CREATE POLICY "reviews_insert_own" ON reviews FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "reviews_update_own" ON reviews;
CREATE POLICY "reviews_update_own" ON reviews FOR UPDATE
  TO authenticated USING (auth.uid() = student_id) WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "reviews_delete_own" ON reviews;
CREATE POLICY "reviews_delete_own" ON reviews FOR DELETE
  TO authenticated USING (auth.uid() = student_id);

-- =====================
-- SUBSCRIPTION PLANS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_ar text NOT NULL,
  price numeric(10,2) NOT NULL DEFAULT 0,
  duration_months integer NOT NULL DEFAULT 1,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "plans_select_all" ON subscription_plans;
CREATE POLICY "plans_select_all" ON subscription_plans FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "plans_insert_any" ON subscription_plans;
CREATE POLICY "plans_insert_admin" ON subscription_plans FOR INSERT
  TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "plans_update_any" ON subscription_plans;
CREATE POLICY "plans_update_admin" ON subscription_plans FOR UPDATE
  TO service_role USING (true) WITH CHECK (true);

-- =====================
-- SUBSCRIPTIONS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES subscription_plans(id) ON DELETE SET NULL,
  start_date timestamptz NOT NULL DEFAULT now(),
  end_date timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subs_select_own" ON subscriptions;
CREATE POLICY "subs_select_own" ON subscriptions FOR SELECT
  TO authenticated USING (auth.uid() = student_id OR auth.uid() = teacher_id);

DROP POLICY IF EXISTS "subs_insert_own" ON subscriptions;
CREATE POLICY "subs_insert_own" ON subscriptions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "subs_update_own" ON subscriptions;
CREATE POLICY "subs_update_own" ON subscriptions FOR UPDATE
  TO authenticated USING (auth.uid() = student_id) WITH CHECK (auth.uid() = student_id);

-- =====================
-- INDEXES
-- =====================
CREATE INDEX IF NOT EXISTS idx_videos_teacher_id ON videos(teacher_id);
CREATE INDEX IF NOT EXISTS idx_videos_category_id ON videos(category_id);
CREATE INDEX IF NOT EXISTS idx_reviews_teacher_id ON reviews(teacher_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_student_id ON subscriptions(student_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_teacher_id ON subscriptions(teacher_id);
CREATE INDEX IF NOT EXISTS idx_profiles_is_teacher ON profiles(is_teacher);

-- =====================
-- SEED DATA: Categories
-- =====================
INSERT INTO categories (name, name_ar, description, icon_name, color, sort_order) VALUES
  ('Mathematics', 'الرياضيات', 'الجبر، الهندسة، التفاضل والتكامل، الإحصاء', 'Calculator', 'blue', 1),
  ('Physics', 'الفيزياء', 'الميكانيكا، الكهرباء، المغناطيسية، الفيزياء الحديثة', 'Atom', 'cyan', 2),
  ('Chemistry', 'الكيمياء', 'الكيمياء العضوية وغير العضوية', 'FlaskConical', 'teal', 3),
  ('Biology', 'الأحياء', 'علم الأحياء، الوراثة، التشريح', 'Dna', 'green', 4),
  ('Computer Science', 'علوم الحاسب', 'البرمجة، الخوارزميات، الذكاء الاصطناعي', 'Code', 'indigo', 5),
  ('Languages', 'اللغات', 'الإنجليزية، الفرنسية، الألمانية، العربية', 'Languages', 'amber', 6),
  ('History', 'التاريخ', 'التاريخ القديم والحديث', 'Landmark', 'orange', 7),
  ('Geography', 'الجغرافيا', 'الجغرافيا الطبيعية والبشرية', 'Globe', 'sky', 8),
  ('Economics', 'الاقتصاد', 'الاقتصاد، المحاسبة، إدارة الأعمال', 'TrendingUp', 'emerald', 9),
  ('Philosophy', 'الفلسفة', 'الفلسفة، المنطق، علم الأخلاق', 'Lightbulb', 'rose', 10)
ON CONFLICT DO NOTHING;

-- =====================
-- SEED DATA: Subscription Plans
-- =====================
INSERT INTO subscription_plans (name, name_ar, price, duration_months, features, is_active, sort_order) VALUES
  ('Free', 'مجاني', 0, 0,
    '["تصفح جميع المدرسين", "مشاهدة الفيديوهات المجانية", "إنشاء حساب", "تقييم المدرسين"]'::jsonb,
    true, 1),
  ('Monthly', 'اشتراك شهري', 49, 1,
    '["كل مزايا الباقة المجانية", "وصول كامل لجميع الفيديوهات", "تحميل الفيديوهات للمشاهدة لاحقاً", "دعم فني مباشر", "شهادات إتمام الدورات"]'::jsonb,
    true, 2),
  ('Annual', 'اشتراك سنوي', 399, 12,
    '["كل مزايا الاشتراك الشهري", "خصم 33% على السعر السنوي", "جلسات مباشرة مع المدرسين", "مجموعة دراسية خاصة", "أولوية في الدعم الفني", "وصول للمحتوى الحصري"]'::jsonb,
    true, 3)
ON CONFLICT DO NOTHING;