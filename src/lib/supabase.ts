import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export const PROFILE_PUBLIC_COLUMNS =
  'id, full_name, bio, avatar_url, location, website, specialization, years_experience, is_teacher, is_approved, is_manager, education_stage, curriculum, teaching_stages, teaching_curricula, created_at, updated_at';

export const VIDEO_PUBLIC_COLUMNS =
  'id, teacher_id, title, description, thumbnail_url, category_id, course_id, duration_seconds, views_count, is_free, education_stage, curriculum, created_at';
