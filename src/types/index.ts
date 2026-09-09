export interface Profile {
  id: string;
  full_name: string;
  email: string;
  bio: string | null;
  avatar_url: string | null;
  phone: string | null;
  location: string | null;
  website: string | null;
  specialization: string | null;
  years_experience: number;
  cv_url: string | null;
  is_teacher: boolean;
  is_approved: boolean;
  is_manager: boolean;
  education_stage: string | null;
  curriculum: string | null;
  teaching_stages: string[] | null;
  teaching_curricula: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  name_ar: string;
  description: string | null;
  icon_name: string;
  color: string;
  sort_order: number;
}

export interface Video {
  id: string;
  teacher_id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  category_id: string | null;
  course_id: string | null;
  duration_seconds: number;
  views_count: number;
  is_free: boolean;
  education_stage: string | null;
  curriculum: string | null;
  created_at: string;
  category?: Category;
  teacher?: Profile;
  course?: Course;
}

export interface Course {
  id: string;
  teacher_id: string;
  category_id: string | null;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  level: 'beginner' | 'intermediate' | 'advanced';
  price: number;
  is_published: boolean;
  education_stage: string | null;
  curriculum: string | null;
  created_at: string;
  updated_at: string;
  live_url?: string | null;
  category?: Category;
  teacher?: Profile;
  videos?: Video[];
  enrollment_count?: number;
}

export interface CourseEnrollment {
  id: string;
  student_id: string;
  course_id: string;
  enrolled_at: string;
  completed_at: string | null;
  progress_percent: number;
  status: 'active' | 'completed';
  course?: Course;
}

export interface VideoProgress {
  id: string;
  student_id: string;
  video_id: string;
  watched_seconds: number;
  total_seconds: number;
  is_completed: boolean;
  last_watched_at: string;
}

export interface Comment {
  id: string;
  comment: string;
  video_id: string;
  student_id: string;
  parent_id: string | null;
  created_at: string;
  student?: Profile;
  replies?: Comment[];
}

export interface Favorite {
  id: string;
  student_id: string;
  video_id: string;
  created_at: string;
  video?: Video;
}

export interface WatchHistoryItem {
  id: string;
  student_id: string;
  video_id: string;
  watched_at: string;
  video?: Video;
}

export interface Review {
  id: string;
  teacher_id: string;
  student_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  student?: Profile;
}

export interface CourseReview {
  id: string;
  course_id: string;
  student_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  student?: Profile;
  course?: Course;
}

export interface TeacherFollow {
  id: string;
  teacher_id: string;
  student_id: string;
  created_at: string;
  teacher?: Profile;
  student?: Profile;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  student_id: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  student?: Profile;
  playlist_videos?: PlaylistVideo[];
}

export interface PlaylistVideo {
  id: string;
  playlist_id: string;
  video_id: string;
  sort_order: number;
  added_at: string;
  video?: Video;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  name_ar: string;
  price: number;
  duration_months: number;
  features: string[];
  is_active: boolean;
  sort_order: number;
}

export interface Subscription {
  id: string;
  student_id: string;
  teacher_id: string | null;
  plan_id: string | null;
  start_date: string;
  end_date: string;
  status: string;
  payment_status?: string;
  notes?: string | null;
  plan?: SubscriptionPlan;
  teacher?: Profile;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export interface Quiz {
  id: string;
  course_id: string;
  title: string;
  passing_score: number;
  created_at: string;
  questions?: QuizQuestion[];
}

export interface QuizQuestion {
  id: string;
  quiz_id: string;
  question: string;
  options: string[];
  correct_option: number;
  sort_order: number;
}

export interface QuizAttempt {
  id: string;
  quiz_id: string;
  student_id: string;
  score: number;
  answers: Record<string, number>;
  passed: boolean;
  created_at: string;
}

export interface Certificate {
  id: string;
  student_id: string;
  course_id: string;
  certificate_number: string;
  issued_at: string;
}

export interface Competition {
  id: string;
  teacher_id: string;
  title: string;
  description: string | null;
  category_id: string | null;
  education_stage: string | null;
  curriculum: string | null;
  starts_at: string | null;
  ends_at: string | null;
  status: 'draft' | 'published' | 'archived';
  created_at: string;
  questions?: CompetitionQuestion[];
}

export interface CompetitionQuestion {
  id: string;
  competition_id: string;
  question: string;
  options: string[];
  correct_option: number;
  sort_order: number;
}

export interface CompetitionAttempt {
  id: string;
  competition_id: string;
  student_id: string;
  answers: Record<string, number>;
  score: number;
  points: number;
  duration_seconds: number;
  submitted_at: string;
}

export interface StudentStageLeaderboard {
  student_id: string;
  full_name: string;
  avatar_url: string | null;
  education_stage: string;
  points: number;
  competitions_played: number;
  stage_rank: number;
}

export interface TeacherPageSettings {
  teacher_id: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  show_competitions: boolean;
  show_leaderboard: boolean;
  updated_at: string;
}

export interface TeacherPlan {
  id: string;
  teacher_id: string;
  name_ar: string;
  price: number;
  duration_months: number;
  features: string[];
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface TeacherHonor {
  id: string;
  teacher_id: string;
  student_id: string;
  title: string;
  description: string | null;
  created_at: string;
  student?: Profile;
}

export interface CompetitionLeaderboardRow {
  competition_id: string;
  student_id: string;
  full_name: string;
  avatar_url: string | null;
  score: number;
  points: number;
  submitted_at: string;
  rank: number;
}

export interface TeacherTopStudent {
  teacher_id: string;
  student_id: string;
  full_name: string;
  avatar_url: string | null;
  total_points: number;
  competitions_played: number;
  rank: number;
}

export interface StudentSubjectLeaderboard {
  student_id: string;
  full_name: string;
  avatar_url: string | null;
  education_stage: string;
  category_id: string;
  subject_name: string;
  points: number;
  competitions_played: number;
  subject_rank: number;
}
