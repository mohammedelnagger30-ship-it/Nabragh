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
  created_at: string;
  updated_at: string;
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
  video_id: string;
  student_id: string;
  comment: string;
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
  teacher_id: string;
  plan_id: string | null;
  start_date: string;
  end_date: string;
  status: string;
  plan?: SubscriptionPlan;
  teacher?: Profile;
}

export interface TeacherFollow {
  id: string;
  student_id: string;
  teacher_id: string;
  created_at: string;
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
