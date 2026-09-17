import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  LayoutDashboard, User, Video as VideoIcon, Upload, Eye, Trash2,
  Image as ImageIcon, Plus, Save, Loader2, FileText, Calendar, Crown, Play, BookOpen,
  TrendingUp, Heart, Clock, Award, Bell, MessageCircle,
  BarChart3, FolderPlus, Settings, Palette, Medal, Users as UsersIcon
  , Gamepad2, ListPlus, ClipboardCheck,
  Send, CheckCircle, 
  Edit, ExternalLink, MessageSquare, X,
  Banknote, ShieldCheck, Check, Smartphone, LogOut, Mail,
  Sun, Moon, Pin, Package as PackageIcon, HelpCircle, CalendarDays, Sparkles
} from 'lucide-react';
import { supabase, PROFILE_PUBLIC_COLUMNS, VIDEO_PUBLIC_COLUMNS } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useTheme } from '@/context/ThemeContext';
import { roleLabel } from '@/lib/roles';
import { LockKeyhole } from 'lucide-react';
import { emptyUsage, getTeacherLimits, isFreeAtLimit, parseUsageError, usagePercent } from '@/lib/limits';
import { uploadFile, uploadPrivateFile } from '@/lib/storage';
import { whatsappLink } from '@/lib/contact';
import MetaTags from '@/components/MetaTags';
import { curricula, educationStages } from '@/lib/education';
import { TeacherPageSettings as TeacherPageSettingsPanel, TeacherHonors, TeacherLeaderboards, TeacherAssistants } from '@/components/TeacherManagerTools';
import { TeacherQA, TeacherLiveSessions, TeacherMessages, TeacherPackages, TeacherCertificates } from '@/components/TeacherFeaturePanels';
import AcademyMembersPanel from '@/components/AcademyMembersPanel';
import StreakWidget from '@/components/StreakWidget';
import FlashcardsModal from '@/components/FlashcardsModal';
import NotificationCenter from '@/components/NotificationCenter';
import { calculateCommissionBreakdown, formatCurrency } from '@/lib/commission';
import type { Profile, Video, Subscription, Category, Course, CourseEnrollment, Favorite, WatchHistoryItem, Competition, CompetitionQuestion, TeacherUsageStats } from '@/types';

type Tab = 'overview' | 'profile' | 'videos' | 'courses' | 'competitions' | 'page' | 'students' | 'members' | 'exams' | 'analytics' | 'payouts' | 'children' | 'honors' | 'assistants' | 'qa' | 'sessions' | 'messages' | 'packages' | 'certificates' | 'codes' | 'homework' | 'subscriptions' | 'favorites' | 'history' | 'notifications' | 'account' | 'security' | 'appearance';

const ALL_TABS: Tab[] = ['overview', 'profile', 'videos', 'courses', 'competitions', 'page', 'students', 'members', 'exams', 'analytics', 'payouts', 'children', 'honors', 'assistants', 'qa', 'sessions', 'messages', 'packages', 'certificates', 'codes', 'homework', 'subscriptions', 'favorites', 'history', 'notifications', 'account', 'security', 'appearance'];

type TeacherPayoutRecord = {
  id: string;
  teacher_id: string;
  period_start: string;
  period_end: string;
  total_gross: number;
  total_discounts: number;
  total_refunds: number;
  total_platform_fee: number;
  total_teacher_payout: number;
  status: 'pending' | 'approved' | 'processing' | 'paid' | 'failed';
  payment_method: string;
  paid_at?: string | null;
  created_at: string;
  updated_at?: string;
};

type TeacherPayoutTransactionRecord = {
  id: string;
  payout_id: string;
  teacher_id: string;
  payment_id?: string | null;
  amount: number;
  method: string;
  reference?: string | null;
  status: 'pending' | 'processing' | 'paid' | 'failed';
  created_at: string;
};

type TeacherServiceUsage = {
  service_key: 'managed_video_uploads' | 'consultations';
  used_count: number;
  monthly_limit: number;
};

type StudentRow = Profile & {
  enrollment_count?: number;
  total_spent?: number;
  courses?: Course[];
};

type QuizRow = Quiz & {
  course?: Course;
};

type QuizAttemptRow = {
  id: string;
  quiz_id: string;
  student_id: string;
  score: number;
  passed: boolean;
  answers?: Record<string, number>;
  created_at: string;
  student?: Profile;
  quiz?: Quiz;
};

type TeacherAnalytics = {
  totalViews: number;
  totalEnrollments: number;
  avgProgress: number;
  avgScore: number;
  totalExams: number;
  totalAttempts: number;
  passedExams: number;
} | null;

export default function DashboardPage({ teacherWorkspace = false }: { teacherWorkspace?: boolean }) {
  const { user, profile, isAdmin, loading, refreshProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') as Tab | null;
  const [activeTab, setActiveTab] = useState<Tab>(initialTab && ALL_TABS.includes(initialTab) ? initialTab as Tab : 'overview');
  const [videos, setVideos] = useState<Video[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [enrollments, setEnrollments] = useState<CourseEnrollment[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [history, setHistory] = useState<WatchHistoryItem[]>([]);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [showVideoForm, setShowVideoForm] = useState(false);
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // New states for enhanced features
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [studentProgress, setStudentProgress] = useState<Record<string, VideoProgress[]>>({});
  const [exams, setExams] = useState<QuizRow[]>([]);
  const [examResults, setExamResults] = useState<QuizAttemptRow[]>([]);
  const [analytics, setAnalytics] = useState<TeacherAnalytics>(null);
  const [teacherPayouts, setTeacherPayouts] = useState<TeacherPayoutRecord[]>([]);
  const [teacherPayoutTransactions, setTeacherPayoutTransactions] = useState<TeacherPayoutTransactionRecord[]>([]);
  const [serviceUsage, setServiceUsage] = useState<TeacherServiceUsage[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Profile | null>(null);
  const [examForm, setExamForm] = useState({ title: '', course_id: '', passing_score: 70, questions: [] as { question: string; options: string[]; correct_option: number }[] });
  const [showExamForm, setShowExamForm] = useState(false);
  const [editingExam, setEditingExam] = useState<QuizRow | null>(null);
  const [showFlashcards, setShowFlashcards] = useState(false);
  const [usage, setUsage] = useState<TeacherUsageStats>(() => emptyUsage(profile?.teacher_tier));

  // Profile form state
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [yearsExp, setYearsExp] = useState(0);
  const [phone, setPhone] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [location, setLocation] = useState('');
  const [website, setWebsite] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [cvUrl, setCvUrl] = useState('');
  const [profileStage, setProfileStage] = useState('');
  const [profileCurriculum, setProfileCurriculum] = useState('');

  // Settings state (account/security/appearance)
  const { actualTheme, setTheme } = useTheme();
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  // Video form state
  const [videoTitle, setVideoTitle] = useState('');
  const [videoDesc, setVideoDesc] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoThumb, setVideoThumb] = useState('');
  const [videoCategory, setVideoCategory] = useState<string | null>(null);
  const [videoCourse, setVideoCourse] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoIsFree, setVideoIsFree] = useState(true);
  const [videoStage, setVideoStage] = useState('');
  const [videoCurriculum, setVideoCurriculum] = useState('');

  // Course form state
  const [courseTitle, setCourseTitle] = useState('');
  const [courseDesc, setCourseDesc] = useState('');
  const [courseCategory, setCourseCategory] = useState<string | null>(null);
  const [courseLevel, setCourseLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [coursePrice, setCoursePrice] = useState(0);
  const [courseSubPrice, setCourseSubPrice] = useState(0);
  const [courseSubMonths, setCourseSubMonths] = useState(1);
  const [editingPricingCourse, setEditingPricingCourse] = useState<string | null>(null);
  const [editBuyPrice, setEditBuyPrice] = useState(0);
  const [editSubPrice, setEditSubPrice] = useState(0);
  const [editSubMonths, setEditSubMonths] = useState(1);
  const [courseThumb, setCourseThumb] = useState('');
  const [courseStage, setCourseStage] = useState('');
  const [courseCurriculum, setCourseCurriculum] = useState('');

  useEffect(() => {
    if (!loading && !user) navigate('/signin');
    if (!loading && user && isAdmin && !teacherWorkspace) navigate('/admin', { replace: true });
    if (!loading && user && profile && profile.is_teacher && !teacherWorkspace) navigate('/admin/teacher', { replace: true });
  }, [user, loading, navigate, profile?.is_teacher, teacherWorkspace, isAdmin, profile]);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? '');
      setBio(profile.bio ?? '');
      setSpecialization(profile.specialization ?? '');
      setYearsExp(profile.years_experience ?? 0);
      setPhone(profile.phone ?? '');
      setGuardianPhone(profile.guardian_phone ?? '');
      setLocation(profile.location ?? '');
      setWebsite(profile.website ?? '');
      setAvatarUrl(profile.avatar_url ?? '');
      setCoverUrl(profile.cover_url ?? '');
      setCvUrl(profile.cv_url ?? '');
      setProfileStage(profile.education_stage ?? profile.teaching_stages?.[0] ?? '');
      setProfileCurriculum(profile.curriculum ?? profile.teaching_curricula?.[0] ?? '');
    }
  }, [profile]);

  useEffect(() => {
    if (user) setEmail(user.email ?? '');
  }, [user]);

  const updateEmail = async () => {
    if (!email || email === user?.email) return;
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ email });
    setSaving(false);
    toast(error ? 'تعذر تحديث البريد الإلكتروني' : 'تم إرسال رسالة تأكيد إلى بريدك الجديد', error ? 'error' : 'success');
  };

  const changePassword = async () => {
    if (newPassword.length < 6) { toast('كلمة السر يجب أن تكون 6 أحرف على الأقل', 'error'); return; }
    if (newPassword !== confirmPassword) { toast('كلمتا السر غير متطابقتين', 'error'); return; }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSaving(false);
    if (error) { toast('تعذر تغيير كلمة السر', 'error'); return; }
    setNewPassword(''); setConfirmPassword('');
    toast('تم تغيير كلمة السر بنجاح', 'success');
  };

  const signOutAll = async () => {
    await supabase.auth.signOut({ scope: 'global' });
    navigate('/');
  };

  const isTeacher = !!profile?.is_teacher;
  const teacherTier = profile?.teacher_tier;

  const fetchDashboardData = useCallback(async () => {
    if (!user) return;
    const { data: catData } = await supabase.from('categories').select('*').order('sort_order', { ascending: true });
    setCategories(catData as Category[] ?? []);

    if (isTeacher) {
      const { data: vidData } = await supabase
        .from('videos')
        .select(`${VIDEO_PUBLIC_COLUMNS}, category:categories(*), course:courses(*)`)
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false });
      setVideos(vidData as unknown as Video[] ?? []);

      const { data: courseData } = await supabase
        .from('courses')
        .select('*, category:categories(*)')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false });
      setCourses(courseData as Course[] ?? []);

      // Load students data
      const { data: enrollData } = await supabase
        .from('course_enrollments')
        .select('*, student:profiles(*), course:courses(*)')
        .in('course_id', (courseData as Course[]).map(c => c.id));
      setStudents(enrollData ?? []);

      // Load student progress (single query instead of N+1 loop)
      const progressMap: Record<string, VideoProgress[]> = {};
      const studentIds = [...new Set((enrollData as StudentRow[] ?? []).map((enrollment) => enrollment.student_id))];
      if (studentIds.length) {
        const { data: progressData } = await supabase
          .from('video_progress')
          .select('*, video:videos(*)')
          .in('student_id', studentIds);
        const rows = (progressData ?? []) as VideoProgress[];
        for (const row of rows) {
          if (!progressMap[row.student_id]) progressMap[row.student_id] = [];
          progressMap[row.student_id].push(row);
        }
      }
      setStudentProgress(progressMap);

      // Load exams
      const { data: examData } = await supabase
        .from('quizzes')
        .select('*, course:courses(*)')
        .in('course_id', (courseData ?? []).map(c => c.id))
        .order('created_at', { ascending: false });
      setExams(examData ?? []);

      // Load exam results
      const { data: resultsData } = await supabase
        .from('quiz_attempts')
        .select('*, student:profiles(*), quiz:quizzes(*)')
        .in('quiz_id', (examData ?? []).map(e => e.id));
      setExamResults(resultsData ?? []);

      // Load analytics
      const totalViews = (vidData as unknown as Video[]).reduce((sum, v) => sum + (v.views_count || 0), 0);
      const totalEnrollments = (enrollData ?? []).length;
      const avgProgress = Object.values(progressMap).flat().length > 0
        ? Object.values(progressMap).flat().reduce((sum: number, p: VideoProgress) => sum + (p.progress_percent || 0), 0) / Object.values(progressMap).flat().length
        : 0;
      const avgScore = (resultsData ?? []).length > 0
        ? (resultsData as QuizAttemptRow[]).reduce((sum, r) => sum + (r.score || 0), 0) / (resultsData as QuizAttemptRow[]).length
        : 0;

      setAnalytics({
        totalViews,
        totalEnrollments,
        avgProgress,
        avgScore,
        totalExams: (examData ?? []).length,
        totalAttempts: (resultsData ?? []).length,
        passedExams: (resultsData as QuizAttemptRow[]).filter(r => r.passed).length,
      });

      const { count } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('teacher_id', user.id)
        .eq('status', 'active');
      setSubscriberCount(count ?? 0);

      const { data: usageData } = await supabase.rpc('get_teacher_usage_stats', { target_teacher: user.id });
      setUsage((usageData ?? [])[0] ?? emptyUsage(teacherTier));

      const { data: serviceUsageData } = await supabase.rpc('get_teacher_service_usage', { target_teacher: user.id });
      setServiceUsage((serviceUsageData ?? []) as TeacherServiceUsage[]);

      const { data: payoutData } = await supabase
        .from('teacher_payouts')
        .select('*')
        .eq('teacher_id', user.id)
        .order('period_end', { ascending: false })
        .limit(12);
      setTeacherPayouts((payoutData ?? []) as TeacherPayoutRecord[]);

      const { data: payoutTxData } = await supabase
        .from('teacher_payout_transactions')
        .select('*')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      setTeacherPayoutTransactions((payoutTxData ?? []) as TeacherPayoutTransactionRecord[]);
    }

    // Subscriptions
    const { data: subData } = await supabase
      .from('subscriptions')
      .select(`*, teacher:profiles!subscriptions_teacher_id_fkey(${PROFILE_PUBLIC_COLUMNS}), plan:subscription_plans(*)`)
      .eq('student_id', user.id)
      .order('created_at', { ascending: false });
    setSubscriptions(subData as Subscription[] ?? []);

    // Enrollments
    const { data: enrollData } = await supabase
      .from('course_enrollments')
      .select('*, course:courses(*, category:categories(*))')
      .eq('student_id', user.id)
      .order('enrolled_at', { ascending: false });
    setEnrollments(enrollData as CourseEnrollment[] ?? []);

    // Favorites
    const { data: favData } = await supabase
      .from('favorites')
      .select(`*, video:videos(${VIDEO_PUBLIC_COLUMNS}, category:categories(*), teacher:profiles!videos_teacher_id_fkey(${PROFILE_PUBLIC_COLUMNS}))`)
      .eq('student_id', user.id)
      .order('created_at', { ascending: false });
    setFavorites(favData as Favorite[] ?? []);

    // Watch history
    const { data: histData } = await supabase
      .from('watch_history')
      .select(`*, video:videos(${VIDEO_PUBLIC_COLUMNS}, category:categories(*), teacher:profiles!videos_teacher_id_fkey(${PROFILE_PUBLIC_COLUMNS}))`)
      .eq('student_id', user.id)
      .order('watched_at', { ascending: false })
      .limit(20);
    setHistory(histData as WatchHistoryItem[] ?? []);
  }, [user, isTeacher, teacherTier]);

  useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);

  const cancelSubscription = async (id: string) => {
    const { error } = await supabase.from('subscriptions').update({ status: 'cancelled' }).eq('id', id);
    if (error) {
      toast('تعذر إلغاء الاشتراك. حاول مرة أخرى.', 'error');
      return;
    }
    toast('تم إلغاء الاشتراك', 'success');
    fetchDashboardData();
  };

  const saveProfile = async () => {
    setSaving(true);
    const { error } = await supabase.from('profiles').update({
      full_name: fullName, bio, specialization, years_experience: yearsExp,
      phone, location, website, avatar_url: avatarUrl, cover_url: coverUrl, cv_url: cvUrl,
      guardian_phone: profile?.is_teacher ? null : guardianPhone || null,
      education_stage: profile?.is_teacher ? null : profileStage || null,
      curriculum: profile?.is_teacher ? null : profileCurriculum || null,
      teaching_stages: profile?.is_teacher && profileStage ? [profileStage] : [],
      teaching_curricula: profile?.is_teacher && profileCurriculum ? [profileCurriculum] : [],
      updated_at: new Date().toISOString(),
    }).eq('id', user!.id);
    setSaving(false);
    if (!error) {
      await refreshProfile();
      toast('تم حفظ التغييرات بنجاح', 'success');
    } else {
      toast('حدث خطأ أثناء الحفظ', 'error');
    }
  };

  const handleVideoUpload = async () => {
    if (!user || !videoTitle || !videoFile) return;
    const lim = getTeacherLimits(profile?.teacher_tier);
    if (!lim.premium && isFreeAtLimit(usage.videos_used, usage.videos_limit)) {
      toast(`وصلت للحد المجاني من الفيديوهات (${usage.videos_limit}). رقِّ لخطة بريميوم لرفع غير محدود.`, 'error');
      return;
    }
    setSaving(true);
    setUploadProgress(0);

    const videoUrl = await uploadPrivateFile('videos', videoFile, user.id, setUploadProgress);
    if (!videoUrl) {
      setSaving(false);
      setUploadProgress(0);
      toast('فشل رفع الفيديو. حاول مرة أخرى', 'error');
      return;
    }

    const { error } = await supabase.from('videos').insert({
      teacher_id: user.id,
      title: videoTitle,
      description: videoDesc,
      video_url: videoUrl,
      thumbnail_url: videoThumb || null,
      category_id: videoCategory || null,
      course_id: videoCourse || null,
      duration_seconds: videoDuration,
      is_free: videoIsFree,
      education_stage: videoStage || null,
      curriculum: videoCurriculum || null,
    });

    setSaving(false);
    setUploadProgress(0);

    if (!error) {
      setShowVideoForm(false);
      setVideoTitle(''); setVideoDesc(''); setVideoFile(null); setVideoThumb('');
      setVideoCategory(null); setVideoCourse(null); setVideoDuration(0); setVideoIsFree(true); setVideoStage(''); setVideoCurriculum('');
      fetchDashboardData();
      toast('تم رفع الفيديو بنجاح', 'success');
    } else {
      const parsed = parseUsageError(error.message);
      toast(parsed.limit ? parsed.text : 'حدث خطأ أثناء رفع الفيديو', 'error');
    }
  };

  const handleCourseCreate = async () => {
    if (!user || !courseTitle) return;
    const lim = getTeacherLimits(profile?.teacher_tier);
    if (!lim.premium && isFreeAtLimit(usage.courses_used, usage.courses_limit)) {
      toast(`وصلت للحد المجاني من الدورات (${usage.courses_limit}). رقِّ لخطة بريميوم لإنشاء غير محدود.`, 'error');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('courses').insert({
      teacher_id: user.id,
      title: courseTitle,
      description: courseDesc,
      category_id: courseCategory || null,
      level: courseLevel,
      price: coursePrice,
      subscription_price: courseSubPrice,
      subscription_duration_months: Math.max(1, courseSubMonths),
      thumbnail_url: courseThumb || null,
      education_stage: courseStage || null,
      curriculum: courseCurriculum || null,
    });
    setSaving(false);
    if (!error) {
      setShowCourseForm(false);
      setCourseTitle(''); setCourseDesc(''); setCourseCategory(null);
      setCourseLevel('beginner'); setCoursePrice(0); setCourseSubPrice(0); setCourseSubMonths(1); setCourseThumb(''); setCourseStage(''); setCourseCurriculum('');
      fetchDashboardData();
      toast('تم إنشاء الدورة بنجاح', 'success');
    } else {
      const parsed = parseUsageError(error.message);
      toast(parsed.limit ? parsed.text : 'حدث خطأ أثناء إنشاء الدورة', 'error');
    }
  };

  const deleteVideo = async (vidId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الفيديو؟')) return;
    await supabase.from('videos').delete().eq('id', vidId);
    setVideos(videos.filter(v => v.id !== vidId));
    toast('تم حذف الفيديو', 'info');
  };

  const togglePinVideo = async (vidId: string, currentlyPinnedId: string | null) => {
    if (!user) return;
    const { error } = currentlyPinnedId === vidId
      ? await supabase.rpc('teacher_unpin_video', { p_teacher_id: user.id })
      : await supabase.rpc('teacher_set_pinned_video', { p_video_id: vidId });
    if (error) {
      toast('تعذر تحديث الفيديو المميز', 'error');
      return;
    }
    setVideos(videos.map((v) => ({ ...v, is_pinned: currentlyPinnedId === vidId ? false : v.id === vidId })));
    toast(currentlyPinnedId === vidId ? 'تمت إزالة الفيديو المميز' : 'تم تثبيت الفيديو كفيديو مميز', 'success');
  };

  const deleteCourse = async (courseId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الدورة؟ سيتم حذف جميع الفيديوهات المرتبطة بها.')) return;
    await supabase.from('courses').delete().eq('id', courseId);
    setCourses(courses.filter(c => c.id !== courseId));
    toast('تم حذف الدورة', 'info');
  };

  const openPricingEditor = (c: Course) => {
    setEditingPricingCourse(c.id);
    setEditBuyPrice(c.price ?? 0);
    setEditSubPrice(c.subscription_price ?? 0);
    setEditSubMonths(c.subscription_duration_months ?? 1);
  };

  const saveCoursePricing = async (courseId: string) => {
    const { error } = await supabase.from('courses').update({
      price: Math.max(0, editBuyPrice),
      subscription_price: Math.max(0, editSubPrice),
      subscription_duration_months: Math.max(1, editSubMonths),
    }).eq('id', courseId);
    if (error) {
      toast('تعذر حفظ الأسعار', 'error');
    } else {
      toast('تم حفظ أسعار الدورة', 'success');
      setEditingPricingCourse(null);
      fetchDashboardData();
    }
  };

  const handleAvatarUpload = async (file: File) => {
    if (!user) return;
    const url = await uploadFile('avatars', file, user.id);
    if (url) {
      setAvatarUrl(url);
      toast('تم رفع الصورة الشخصية', 'success');
    }
  };

  const handleCoverUpload = async (file: File) => {
    if (!user) return;
    const url = await uploadFile('avatars', file, user.id);
    if (url) {
      setCoverUrl(url);
      toast('تم رفع صورة الغلاف', 'success');
    }
  };

  const handleCvUpload = async (file: File) => {
    if (!user) return;
    const url = await uploadPrivateFile('cvs', file, user.id);
    if (url) {
      setCvUrl(url);
      toast('تم رفع السيرة الذاتية', 'success');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!profile) return null;

  const totalViews = videos.reduce((sum, v) => sum + v.views_count, 0);
  const activeEnrollments = enrollments.filter(e => e.status === 'active').length;
  const completedCourses = enrollments.filter(e => e.status === 'completed').length;

  const teacherTabs: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
    { id: 'overview', label: 'نظرة عامة', icon: LayoutDashboard },
    { id: 'profile', label: 'الملف الشخصي', icon: User },
    { id: 'videos', label: 'الفيديوهات', icon: VideoIcon },
    { id: 'courses', label: 'الدورات', icon: BookOpen },
    { id: 'students', label: 'متابعة الطلاب', icon: UsersIcon },
    { id: 'members', label: 'طلاب منصتي', icon: UsersIcon },
    { id: 'exams', label: 'الامتحانات', icon: ClipboardCheck },
    { id: 'analytics', label: 'التحليلات', icon: BarChart3 },
    { id: 'payouts', label: 'المستحقات', icon: Banknote },
    { id: 'competitions', label: 'المنافسات', icon: Gamepad2 },
    { id: 'qa', label: 'أسئلة الطلاب', icon: MessageSquare },
    { id: 'sessions', label: 'الحصص المباشرة', icon: Calendar },
    { id: 'messages', label: 'رسائل الطلاب', icon: Send },
    { id: 'packages', label: 'العروض والباقات', icon: PackageIcon },
    { id: 'certificates', label: 'شهادات الطلاب', icon: Award },
    ...(profile.is_manager ? [
      { id: 'page' as Tab, label: 'إعدادات صفحتي', icon: Palette },
      { id: 'honors' as Tab, label: 'التكريم', icon: Medal },
      { id: 'assistants' as Tab, label: 'المساعدون', icon: UsersIcon },
    ] : []),
    { id: 'account', label: 'الحساب', icon: User },
    { id: 'security', label: 'الأمان', icon: ShieldCheck },
    { id: 'appearance', label: 'المظهر', icon: Sun },
  ];

  const studentTabs: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
    { id: 'overview', label: 'نظرة عامة', icon: LayoutDashboard },
    { id: 'profile', label: 'الملف الشخصي', icon: User },
    { id: 'subscriptions', label: 'اشتراكاتي', icon: Crown },
    { id: 'favorites', label: 'المفضلة', icon: Heart },
    { id: 'history', label: 'سجل المشاهدة', icon: Clock },
    { id: 'notifications', label: 'الإشعارات', icon: Bell },
    { id: 'account', label: 'الحساب', icon: User },
    { id: 'security', label: 'الأمان', icon: ShieldCheck },
    { id: 'appearance', label: 'المظهر', icon: Sun },
  ];

  const guardianTabs: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
    { id: 'children', label: 'أبنائي', icon: UsersIcon },
    { id: 'account', label: 'الحساب', icon: User },
    { id: 'security', label: 'الأمان', icon: ShieldCheck },
    { id: 'appearance', label: 'المظهر', icon: Sun },
  ];

  const tabs = profile.is_teacher ? teacherTabs : profile.is_guardian ? guardianTabs : studentTabs;

  const limits = getTeacherLimits(profile?.teacher_tier);
  const videosAtLimit = isFreeAtLimit(usage.videos_used, usage.videos_limit);
  const coursesAtLimit = isFreeAtLimit(usage.courses_used, usage.courses_limit);
  const upgradeToast = () => toast(limits.premiumPlus ? 'أنت بالفعل على خطة Premium Plus' : limits.premium ? 'أنت بالفعل على خطة Premium' : 'خطة Premium اشتراك مدفوع. تواصل مع إدارة المنصة لتفعيلها.', 'info');
  const planContactToast = (plan: string) => toast(`لتفعيل ${plan} بقيمة الاشتراك المصرية، تواصل مع إدارة المنصة مؤقتًا.`, 'info');
  const totalPayoutAmount = teacherPayouts.reduce((sum, payout) => sum + Number(payout.total_teacher_payout ?? 0), 0);
  const totalPlatformFee = teacherPayouts.reduce((sum, payout) => sum + Number(payout.total_platform_fee ?? 0), 0);
  const pendingPayoutAmount = teacherPayouts.filter((payout) => payout.status === 'pending' || payout.status === 'approved' || payout.status === 'processing').reduce((sum, payout) => sum + Number(payout.total_teacher_payout ?? 0), 0);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <MetaTags title={profile.is_teacher ? 'مساحة المدرس | منصة العلم' : profile.is_guardian ? 'مساحة ولي الأمر | منصة العلم' : 'مساحة الطالب | منصة العلم'} noIndex />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className={`text-3xl font-bold ${profile.is_teacher ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-800 dark:text-slate-100'}`}>
            {profile.is_teacher ? 'مساحة المدرس' : profile.is_guardian ? 'مساحة ولي الأمر' : 'مساحة الطالب'}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            مرحباً، {profile.full_name} — {roleLabel(profile, isAdmin)}
          </p>
        </div>

        {profile.is_teacher && (
          <div className="mb-6 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${limits.premium ? 'bg-gradient-to-br from-amber-400 to-orange-500' : 'bg-slate-100 dark:bg-slate-700'}`}>
                  {limits.premium ? <Crown className="h-5 w-5 text-white" /> : <LockKeyhole className="h-5 w-5 text-slate-500 dark:text-slate-300" />}
                </div>
                <div>
                  <p className="font-bold text-slate-800 dark:text-white">خطتك: {limits.planLabel}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {limits.premium ? 'اشتراك Premium مدفوع — كل المميزات مفتوحة بلا حدود' : `الخطة المجانية: ${usage.videos_limit} فيديو • ${usage.courses_limit} دورات • الترقية إلى Premium مدفوعة`}
                  </p>
                </div>
              </div>
              {!limits.premium && (
                <button onClick={upgradeToast} className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-amber-600">
                  <Crown className="h-4 w-4" /> ترقية إلى بريميوم
                </button>
              )}
            </div>
            {!limits.premium && (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <QuotaBar label="الفيديوهات" used={usage.videos_used} limit={usage.videos_limit} />
                <QuotaBar label="الدورات" used={usage.courses_used} limit={usage.courses_limit} />
              </div>
            )}
            {limits.premiumPlus && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <ServiceQuotaBar label="رفع فيديوهات بواسطة الفريق" used={serviceUsage.find((item) => item.service_key === 'managed_video_uploads')?.used_count ?? 0} limit={10} />
                <ServiceQuotaBar label="جلسات الاستشارة" used={serviceUsage.find((item) => item.service_key === 'consultations')?.used_count ?? 0} limit={1} />
              </div>
            )}
            {!limits.premium && (
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <TeacherPlanCard
                  name="Premium"
                  price="150 جنيه"
                  description="للمدرس الذي يريد نشر محتوى أكثر بدون حدود."
                  features="فيديوهات ودورات بدون حدود • نشر الأكاديمية • تحليلات أساسية • دعم عادي"
                  onSelect={() => planContactToast('Premium')}
                />
                <TeacherPlanCard
                  name="Premium Plus"
                  price="299 جنيه"
                  description="للمدرس الذي يحتاج متابعة أسرع ودعمًا ذا أولوية."
                  features="كل مميزات Premium • دعم خلال 24 ساعة • رفع 10 فيديوهات شهريًا بواسطة الفريق • جلسة استشارة شهرية"
                  featured
                  onSelect={() => planContactToast('Premium Plus')}
                />
              </div>
            )}
          </div>
        )}

        <div className={`relative mb-8 overflow-hidden rounded-3xl p-6 text-white shadow-xl sm:p-8 ${
          profile.is_teacher
            ? 'bg-gradient-to-l from-emerald-700 via-emerald-600 to-teal-500 shadow-emerald-900/10'
            : 'bg-gradient-to-l from-blue-700 via-blue-600 to-cyan-500 shadow-blue-900/10'
        }`}>
          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <span className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-bold backdrop-blur-sm">{profile.is_teacher ? 'مساحة عمل المدرس' : profile.is_guardian ? 'متابعة الأبناء' : 'رحلتك التعليمية'}</span>
                <h2 className="mt-3 text-2xl font-extrabold sm:text-3xl">{profile.is_teacher ? 'خلّي محتواك يوصل للطلاب بشكل أفضل' : profile.is_guardian ? 'اطمّن على رحلة أبنائك التعليمية' : 'تابع تعلمك وخلّك قريب من أهدافك'}</h2>
                <p className="mt-2 text-sm leading-7 text-white/80">{profile.is_teacher ? 'تابع أداء المحتوى، نظم دوراتك، وابقَ على تواصل مع طلابك من مكان واحد.' : profile.is_guardian ? 'راجع تقدم أبنائك ونتائج امتحاناتهم وشهاداتهم من مكان واحد.' : 'راجع دوراتك واشتراكاتك وحضورك، وواصل التقدم في كل مادة بسهولة.'}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {profile.is_teacher ? (
                <>
                  <button type="button" onClick={() => (videosAtLimit ? upgradeToast() : setActiveTab('videos'))} className={`inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-blue-700 shadow-sm transition hover:bg-blue-50 ${videosAtLimit ? 'opacity-70' : ''}`}>{videosAtLimit ? <LockKeyhole className="h-4 w-4" /> : <Upload className="h-4 w-4" />} {videosAtLimit ? 'وصلت للحد' : 'رفع فيديو'}</button>
                  <button type="button" onClick={() => (coursesAtLimit ? upgradeToast() : setActiveTab('courses'))} className={`inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2.5 text-sm font-bold text-white ring-1 ring-white/30 transition hover:bg-white/25 ${coursesAtLimit ? 'opacity-70' : ''}`}>{coursesAtLimit ? <LockKeyhole className="h-4 w-4" /> : <FolderPlus className="h-4 w-4" />} {coursesAtLimit ? 'وصلت للحد' : 'إنشاء دورة'}</button>
                  <Link to={`/teacher/${user!.id}`} className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2.5 text-sm font-bold text-white ring-1 ring-white/30 transition hover:bg-white/25"><ExternalLink className="h-4 w-4" /> صفحتي العامة</Link>
                </>
              ) : profile.is_guardian ? (
                <button type="button" onClick={() => setActiveTab('children')} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-emerald-700 shadow-sm transition hover:bg-emerald-50"><UsersIcon className="h-4 w-4" /> متابعة الأبناء</button>
              ) : (
                <>
                  <button type="button" onClick={() => setShowFlashcards(true)} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-blue-700 shadow-sm transition hover:bg-blue-50">
                    <Sparkles className="h-4 w-4 text-blue-600" /> بطاقات المذاكرة
                  </button>
                  <Link to="/courses" className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2.5 text-sm font-bold text-white ring-1 ring-white/30 transition hover:bg-white/25"><BookOpen className="h-4 w-4" /> تصفح الدورات</Link>
                </>
              )}
            </div>
          </div>
          <FlashcardsModal isOpen={showFlashcards} onClose={() => setShowFlashcards(false)} />
          <div className="pointer-events-none absolute -left-8 -top-16 h-48 w-48 rounded-full border-[24px] border-white/10" />
          <div className="pointer-events-none absolute -bottom-24 right-1/3 h-56 w-56 rounded-full border-[30px] border-cyan-300/10" />
        </div>

        {profile.is_teacher && <TeacherQuickStats teacherId={user!.id} onOpen={setActiveTab} />}

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Mobile Tab Bar */}
          <div className="lg:hidden mb-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-2">
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
                      activeTab === tab.id
                        ? profile.is_teacher
                          ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                          : 'bg-blue-500 text-white shadow-md shadow-blue-500/30'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar - Desktop Only */}
          <div className="hidden lg:block lg:col-span-1">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 sticky top-20">
              <div className="flex items-center gap-3 mb-6 p-2">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white text-lg font-bold overflow-hidden">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" decoding="async" />
                  ) : (
                    profile.full_name.charAt(0)
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-slate-800 dark:text-slate-100 text-sm truncate">{profile.full_name}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{profile.email}</p>
                </div>
              </div>
              <nav className="space-y-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? profile.is_teacher
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                          : 'bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {activeTab === 'children' && profile.is_guardian && <GuardianWorkspace />}

            {activeTab === 'overview' && !profile.is_guardian && (
              <div className="space-y-6">
                {!profile.is_teacher && <GuardianRequestsPanel />}
                {!profile.is_teacher && <StreakWidget />}

                <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
                  {profile.is_teacher ? (
                    <>
                      <StatCard icon={VideoIcon} label="الفيديوهات" value={videos.length} color="blue" />
                      <StatCard icon={Eye} label="إجمالي المشاهدات" value={totalViews} color="cyan" />
                      <StatCard icon={BookOpen} label="الدورات" value={courses.length} color="emerald" />
                      <StatCard icon={Crown} label="المشتركون النشطون" value={subscriberCount} color="amber" />
                    </>
                  ) : (
                    <>
                      <StatCard icon={Crown} label="الاشتراكات النشطة" value={subscriptions.filter(s => s.status === 'active').length} color="blue" />
                      <StatCard icon={BookOpen} label="الدورات المسجلة" value={activeEnrollments} color="cyan" />
                      <StatCard icon={Award} label="دورات مكتملة" value={completedCourses} color="emerald" />
                    </>
                  )}
                </div>

                {/* Recent activity */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-500" />
                    {profile.is_teacher ? 'أحدث الفيديوهات' : 'آخر ما شاهدته'}
                  </h3>
                  {profile.is_teacher ? (
                    videos.length === 0 ? (
                      <EmptyState icon={VideoIcon} text="لم ترفع أي فيديو بعد" action={
                        <button onClick={() => setActiveTab('videos')} className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors">ارفع أول فيديو</button>
                      } />
                    ) : (
                      <div className="space-y-3">
                        {videos.slice(0, 5).map((v) => (
                          <Link key={v.id} to={`/video/${v.id}`} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                            <div className="w-16 aspect-video rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                              <Play className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-slate-800 dark:text-slate-100 text-sm line-clamp-1">{v.title}</p>
                              <p className="text-xs text-slate-400 dark:text-slate-500">{v.views_count} مشاهدة</p>
                            </div>
                            <span className={`px-2 py-0.5 text-xs rounded-md ${v.is_free ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300'}`}>
                              {v.is_free ? 'مجاني' : 'مدفوع'}
                            </span>
                          </Link>
                        ))}
                      </div>
                    )
                  ) : history.length === 0 ? (
                    <EmptyState icon={Play} text="لم تشاهد أي فيديو بعد" action={
                      <Link to="/teachers" className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors">تصفح المدرسين</Link>
                    } />
                  ) : (
                    <div className="space-y-3">
                      {history.slice(0, 5).map((h) => (
                        <Link key={h.id} to={`/video/${h.video_id}`} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                          <div className="w-16 aspect-video rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                            <Play className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-800 dark:text-slate-100 text-sm line-clamp-1">{h.video?.title ?? 'فيديو'}</p>
                            <p className="text-xs text-slate-400 dark:text-slate-500">{h.video?.teacher?.full_name ?? ''}</p>
                          </div>
                          <span className="text-xs text-slate-400 dark:text-slate-500">{new Date(h.watched_at).toLocaleDateString('ar-EG')}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                {/* Enrollments progress (students) */}
                {!profile.is_teacher && enrollments.length > 0 && (
                  <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                    <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-blue-500" /> تقدم الدورات
                    </h3>
                    <div className="space-y-4">
                      {enrollments.slice(0, 5).map((enr) => (
                        <div key={enr.id}>
                          <div className="flex items-center justify-between mb-1.5">
                            <Link to={`/course/${enr.course_id}`} className="text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-blue-600 transition-colors line-clamp-1">
                              {enr.course?.title ?? 'دورة'}
                            </Link>
                            <span className="text-sm font-bold text-slate-600 dark:text-slate-300">{enr.progress_percent}%</span>
                          </div>
                          <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${enr.status === 'completed' ? 'bg-emerald-500' : 'bg-gradient-to-r from-blue-600 to-cyan-500'}`}
                              style={{ width: `${Math.min(100, Math.max(0, enr.progress_percent ?? 0))}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'notifications' && !profile.is_teacher && (
              <NotificationCenter userId={user!.id} />
            )}

            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-blue-700 via-blue-600 to-cyan-500 p-6 text-white shadow-xl sm:p-8">
                  {coverUrl && <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${coverUrl})` }} />}
                  {coverUrl && <div className="absolute inset-0 bg-gradient-to-l from-blue-950/90 via-blue-900/70 to-cyan-900/70" />}
                  <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-3xl border-4 border-white/30 bg-white/15 text-4xl font-extrabold shadow-lg">
                        {avatarUrl ? <img src={avatarUrl} alt={fullName} className="h-full w-full object-cover" loading="lazy" decoding="async" /> : fullName.charAt(0) || <User className="h-9 w-9" />}
                      </div>
                      <div>
                        <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold">{profile.is_teacher ? 'حساب مدرس' : 'حساب طالب'}</span>
                        <h2 className="mt-2 text-2xl font-extrabold sm:text-3xl">{fullName || 'أكمل ملفك الشخصي'}</h2>
                        <p className="mt-1 text-sm text-blue-100">{profile.is_teacher ? (specialization || 'أضف تخصصك ليعرفك الطلاب') : (profileStage ? educationStages.find((stage) => stage.value === profileStage)?.label : 'أضف مرحلتك الدراسية')}</p>
                      </div>
                    </div>
                    {profile.is_teacher && <Link to={`/teacher/${user!.id}`} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-blue-700 shadow-sm transition hover:bg-blue-50"><ExternalLink className="h-4 w-4" /> عرض الملف العام</Link>}
                  </div>
                  <div className="pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full border-[24px] border-white/10" />
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {profile.is_teacher ? (
                    <>
                      <ProfileMetric icon={VideoIcon} label="الفيديوهات" value={videos.length} tone="blue" />
                      <ProfileMetric icon={BookOpen} label="الدورات" value={courses.length} tone="emerald" />
                      <ProfileMetric icon={Eye} label="المشاهدات" value={totalViews} tone="cyan" />
                      <ProfileMetric icon={UsersIcon} label="الطلاب/المشتركون" value={subscriberCount} tone="amber" />
                    </>
                  ) : (
                    <>
                      <ProfileMetric icon={BookOpen} label="الدورات المسجلة" value={enrollments.length} tone="blue" />
                      <ProfileMetric icon={Award} label="الدورات المكتملة" value={completedCourses} tone="emerald" />
                      <ProfileMetric icon={Heart} label="المفضلة" value={favorites.length} tone="rose" />
                      <ProfileMetric icon={Clock} label="سجل المشاهدة" value={history.length} tone="amber" />
                    </>
                  )}
                </div>

                <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                    <div className="mb-4 flex items-center justify-between"><div><h3 className="font-extrabold text-slate-800 dark:text-white">اكتمال الملف</h3><p className="mt-1 text-xs text-slate-500">{profile.is_teacher ? 'كلما اكتمل الملف زادت ثقة المستخدمين بك.' : 'أكمل بياناتك ليظهر مرحلتك الدراسية في الترشيحات.'}</p></div><span className="text-xl font-extrabold text-blue-600">{profileCompletion(profile, { fullName, bio, specialization, avatarUrl, location, profileStage, profileCurriculum, phone, guardianPhone })}%</span></div>
                    <div className="h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700"><div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-400 transition-all" style={{ width: `${profileCompletion(profile, { fullName, bio, specialization, avatarUrl, location, profileStage, profileCurriculum, phone, guardianPhone })}%` }} /></div>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">{!avatarUrl && <span className="rounded-full bg-amber-50 px-3 py-1.5 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">أضف صورة شخصية</span>}{!bio && <span className="rounded-full bg-amber-50 px-3 py-1.5 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">أضف نبذة</span>}{!location && <span className="rounded-full bg-slate-100 px-3 py-1.5 text-slate-600 dark:bg-slate-700 dark:text-slate-300">أضف موقعك</span>}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-900"><h3 className="font-extrabold text-slate-800 dark:text-white">روابط سريعة</h3><div className="mt-4 space-y-2">{profile.is_teacher ? <><QuickProfileLink icon={Upload} label="رفع فيديو جديد" onClick={() => setActiveTab('videos')} /><QuickProfileLink icon={FolderPlus} label="إنشاء دورة" onClick={() => setActiveTab('courses')} /><QuickProfileLink icon={BarChart3} label="عرض التحليلات" onClick={() => setActiveTab('analytics')} /></> : <><QuickProfileLink icon={BookOpen} label="تصفح الدورات" href="/courses" /><QuickProfileLink icon={Heart} label="فتح المفضلة" onClick={() => setActiveTab('favorites')} /><QuickProfileLink icon={Bell} label="عرض الإشعارات" onClick={() => setActiveTab('notifications')} /></>}</div></div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2"><Settings className="w-5 h-5 text-blue-500" /> تعديل البيانات الشخصية</h3>
                <div className="grid sm:grid-cols-2 gap-5">
                  <Field label="الاسم الكامل" value={fullName} onChange={setFullName} />
                  {profile.is_teacher && <Field label="التخصص" value={specialization} onChange={setSpecialization} placeholder="مثال: مدرس رياضيات" />}
                  <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">{profile.is_teacher ? 'الصف الذي تدرّسه' : 'الصف الدراسي'}</label><select value={profileStage} onChange={(e) => setProfileStage(e.target.value)} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200"><option value="">كل المراحل</option>{educationStages.map((stage) => <option key={stage.value} value={stage.value}>{stage.label}</option>)}</select></div>
                  <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">{profile.is_teacher ? 'المنهج الذي تدرّسه' : 'نوع المنهج'}</label><select value={profileCurriculum} onChange={(e) => setProfileCurriculum(e.target.value)} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200"><option value="">كل المناهج</option>{curricula.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
                  <Field label="رقم الهاتف" value={phone} onChange={setPhone} placeholder="+20..." dir="ltr" />
                  {!profile.is_teacher && <Field label="رقم ولي الأمر" value={guardianPhone} onChange={setGuardianPhone} placeholder="+20..." dir="ltr" />}
                  <Field label="الموقع" value={location} onChange={setLocation} placeholder="القاهرة، مصر" />
                  {profile.is_teacher && <Field label="الموقع الإلكتروني" value={website} onChange={setWebsite} placeholder="https://..." dir="ltr" />}
                  {profile.is_teacher && <Field label="سنوات الخبرة" value={String(yearsExp)} onChange={(v) => setYearsExp(parseInt(v) || 0)} type="number" />}
                </div>

                {/* Cover upload */}
                <div className="mt-5">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">صورة الغلاف</label>
                  <div className="flex items-center gap-4">
                    <div className="relative h-20 w-32 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-400 flex items-center justify-center overflow-hidden">
                      {coverUrl ? <img src={coverUrl} alt="cover" className="w-full h-full object-cover" loading="lazy" decoding="async" /> : <ImageIcon className="w-6 h-6 text-white/70" />}
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors cursor-pointer flex items-center gap-2">
                        <Upload className="w-4 h-4" /> رفع غلاف
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCoverUpload(f); }} />
                      </label>
                      {coverUrl && (
                        <button type="button" onClick={() => setCoverUrl('')} className="px-4 py-2 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-300 text-sm font-medium rounded-xl hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors flex items-center gap-2">
                          <Trash2 className="w-4 h-4" /> إزالة الغلاف
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-400">صورة عريضة تظهر في أعلى ملفك الشخصي (مقاس مناسب للغلاف ~ 16:9).</p>
                </div>

                {/* Avatar upload */}
                <div className="mt-5">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">الصورة الشخصية</label>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/40 dark:to-cyan-900/40 flex items-center justify-center overflow-hidden">
                      {avatarUrl ? <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" loading="lazy" decoding="async" /> : <User className="w-6 h-6 text-blue-400" />}
                    </div>
                    <label className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors cursor-pointer flex items-center gap-2">
                      <Upload className="w-4 h-4" /> رفع صورة
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAvatarUpload(f); }} />
                    </label>
                  </div>
                </div>

                {/* CV upload */}
                {profile.is_teacher && (
                <div className="mt-5">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">السيرة الذاتية (CV)</label>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-500 dark:text-slate-400 truncate">
                      {cvUrl ? 'تم رفع السيرة الذاتية' : 'لم يتم رفع سيرة ذاتية بعد'}
                    </div>
                    <label className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors cursor-pointer flex items-center gap-2">
                      <FileText className="w-4 h-4" /> رفع CV
                      <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCvUpload(f); }} />
                    </label>
                  </div>
                </div>
                )}

                <div className="mt-5">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">نبذة تعريفية</label>
                  <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} placeholder={profile.is_teacher ? 'اكتب نبذة عنك وعن خبرتك في التدريس...' : 'اكتب نبذة قصيرة عنك وعن اهتماماتك الدراسية...'}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors resize-none" />
                </div>

                <button onClick={saveProfile} disabled={saving}
                  className="mt-6 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold rounded-xl shadow-md shadow-blue-500/25 hover:shadow-lg transition-all disabled:opacity-60 flex items-center gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} حفظ التغييرات
                </button>
              </div>
              </div>
            )}

            {activeTab === 'videos' && profile.is_teacher && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2"><VideoIcon className="w-5 h-5 text-blue-500" /> إدارة الفيديوهات</h3>
                  <button onClick={() => (videosAtLimit ? upgradeToast() : setShowVideoForm(!showVideoForm))}
                    className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2">
                    {videosAtLimit ? <LockKeyhole className="w-4 h-4" /> : <Plus className="w-4 h-4" />} {videosAtLimit ? 'وصلت للحد' : 'إضافة فيديو'}
                  </button>
                </div>

                <div className="mb-5 flex items-start gap-3 rounded-xl border border-violet-200 bg-violet-50 p-4 text-sm leading-6 text-violet-800 dark:border-violet-800/60 dark:bg-violet-950/40 dark:text-violet-200">
                  <Pin className="mt-0.5 h-5 w-5 shrink-0" />
                  <p>اختر فيديو واحد ليكون <strong>الفيديو المميز</strong> في صفحتك العامة — يظهر لطلابك كمقدمة تعريفية عند فتح ملفك الشخصي.</p>
                </div>

                {showVideoForm && (
                  <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-6">
                    <h4 className="font-bold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2"><Upload className="w-5 h-5 text-blue-500" /> رفع فيديو جديد</h4>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <Field label="عنوان الفيديو" value={videoTitle} onChange={setVideoTitle} placeholder="شرح درس..." />
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">التخصص</label>
                        <select value={videoCategory ?? ''} onChange={(e) => setVideoCategory(e.target.value || null)}
                          className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors">
                          <option value="">بدون تخصص</option>
                          {categories.map((c) => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">الدورة (اختياري)</label>
                        <select value={videoCourse ?? ''} onChange={(e) => setVideoCourse(e.target.value || null)}
                          className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors">
                          <option value="">بدون دورة</option>
                          {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                        </select>
                      </div>
                      <Field label="رابط الصورة المصغرة (اختياري)" value={videoThumb} onChange={setVideoThumb} placeholder="https://..." dir="ltr" />
                      <Field label="المدة بالثواني" value={String(videoDuration)} onChange={(v) => setVideoDuration(parseInt(v) || 0)} type="number" />
                      <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">المرحلة الدراسية</label><select value={videoStage} onChange={(e) => setVideoStage(e.target.value)} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200"><option value="">كل المراحل</option>{educationStages.map((stage) => <option key={stage.value} value={stage.value}>{stage.label}</option>)}</select></div>
                      <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">المنهج</label><select value={videoCurriculum} onChange={(e) => setVideoCurriculum(e.target.value)} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200"><option value="">كل المناهج</option>{curricula.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">نوع الوصول</label>
                        <div className="flex gap-3">
                          <button type="button" onClick={() => setVideoIsFree(true)}
                            className={`flex-1 px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${videoIsFree ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}>مجاني</button>
                          <button type="button" onClick={() => setVideoIsFree(false)}
                            className={`flex-1 px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${!videoIsFree ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}>للمشتركين</button>
                        </div>
                      </div>
                    </div>

                    {/* File upload */}
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">ملف الفيديو</label>
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-colors">
                        <div className="flex flex-col items-center gap-2">
                          <Upload className="w-8 h-8 text-slate-400 dark:text-slate-500" />
                          <span className="text-sm text-slate-500 dark:text-slate-400">
                            {videoFile ? videoFile.name : 'اختر ملف فيديو لرفعه'}
                          </span>
                        </div>
                        <input type="file" accept="video/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setVideoFile(f); }} />
                      </label>
                      {uploadProgress > 0 && uploadProgress < 100 && (
                        <div className="mt-3">
                          <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-blue-600 to-cyan-500 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
                          </div>
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 text-center">جاري الرفع... {uploadProgress}%</p>
                        </div>
                      )}
                    </div>

                    <div className="mt-4">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">وصف الفيديو</label>
                      <textarea value={videoDesc} onChange={(e) => setVideoDesc(e.target.value)} rows={3} placeholder="وصف محتوى الفيديو..."
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors resize-none" />
                    </div>

                    <div className="flex gap-3 mt-5">
                      <button onClick={handleVideoUpload} disabled={saving || !videoTitle || !videoFile}
                        className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-60 flex items-center gap-2">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} رفع الفيديو
                      </button>
                      <button onClick={() => setShowVideoForm(false)}
                        className="px-6 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">إلغاء</button>
                    </div>
                  </div>
                )}

                {videos.length === 0 && !showVideoForm ? (
                  <EmptyState icon={VideoIcon} text="لم ترفع أي فيديو بعد" />
                ) : (
                  <div className="space-y-3">
                    {videos.map((v) => {
                      const pinnedId = videos.find((x) => x.is_pinned)?.id ?? null;
                      const isPinnedVideo = v.is_pinned;
                      return (
                      <div key={v.id} className={`bg-white dark:bg-slate-800 rounded-2xl border p-4 flex items-center gap-4 ${isPinnedVideo ? 'border-violet-400 ring-1 ring-violet-300 dark:border-violet-500 dark:ring-violet-500/40' : 'border-slate-200 dark:border-slate-700'}`}>
                        <div className="w-20 aspect-video rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                          {v.thumbnail_url ? <img src={v.thumbnail_url} alt="" className="w-full h-full object-cover rounded-lg" loading="lazy" decoding="async" /> : <Play className="w-6 h-6 text-slate-400 dark:text-slate-500" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Link to={`/video/${v.id}`} className="font-bold text-slate-800 dark:text-slate-100 hover:text-blue-600 transition-colors line-clamp-1">{v.title}</Link>
                            {isPinnedVideo && <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-bold text-violet-700 dark:bg-violet-900/40 dark:text-violet-300"><Pin className="h-3 w-3" /> الفيديو المميز</span>}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500 mt-1">
                            <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {v.views_count}</span>
                            {v.category && <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded-md">{v.category.name_ar}</span>}
                            {v.course && <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-md dark:bg-blue-900/30 dark:text-blue-300">{v.course.title}</span>}
                            <span className={`px-2 py-0.5 rounded-md ${v.is_free ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300'}`}>
                              {v.is_free ? 'مجاني' : 'مدفوع'}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => void togglePinVideo(v.id, pinnedId)}
                          title={isPinnedVideo ? 'إزالة التثبيت من الصفحة العامة' : 'تثبيت كفيديو مميز في صفحتك العامة'}
                          className={`p-2 rounded-lg transition-colors ${isPinnedVideo ? 'text-violet-600 bg-violet-50 hover:bg-violet-100 dark:bg-violet-900/30 dark:text-violet-300 dark:hover:bg-violet-900/50' : 'text-slate-400 hover:bg-violet-50 hover:text-violet-500 dark:hover:bg-violet-900/30'}`}
                        >
                          <Pin className="w-5 h-5" />
                        </button>
                        <button onClick={() => deleteVideo(v.id)} className="p-2 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'courses' && profile.is_teacher && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2"><BookOpen className="w-5 h-5 text-blue-500" /> إدارة الدورات</h3>
                  <button onClick={() => (coursesAtLimit ? upgradeToast() : setShowCourseForm(!showCourseForm))}
                    className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2">
                    {coursesAtLimit ? <LockKeyhole className="w-4 h-4" /> : <FolderPlus className="w-4 h-4" />} {coursesAtLimit ? 'وصلت للحد' : 'إنشاء دورة'}
                  </button>
                </div>

                {showCourseForm && (
                  <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-6">
                    <h4 className="font-bold text-slate-700 dark:text-slate-200 mb-4">إنشاء دورة جديدة</h4>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <Field label="عنوان الدورة" value={courseTitle} onChange={setCourseTitle} placeholder="مثال: الرياضيات للصف الأول" />
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">التخصص</label>
                        <select value={courseCategory ?? ''} onChange={(e) => setCourseCategory(e.target.value || null)}
                          className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors">
                          <option value="">بدون تخصص</option>
                          {categories.map((c) => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">المستوى</label>
                        <select value={courseLevel} onChange={(e) => setCourseLevel(e.target.value as typeof courseLevel)}
                          className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors">
                          <option value="beginner">مبتدئ</option>
                          <option value="intermediate">متوسط</option>
                          <option value="advanced">متقدم</option>
                        </select>
                      </div>
                      <Field label="سعر الشراء (مرة واحدة، 0 = غير مفعّل)" value={String(coursePrice)} onChange={(v) => setCoursePrice(parseFloat(v) || 0)} type="number" />
                      <Field label="سعر الاشتراك الشهري (0 = غير مفعّل)" value={String(courseSubPrice)} onChange={(v) => setCourseSubPrice(parseFloat(v) || 0)} type="number" />
                      <Field label="مدة الاشتراك (شهور)" value={String(courseSubMonths)} onChange={(v) => setCourseSubMonths(parseInt(v, 10) || 1)} type="number" />
                      <Field label="رابط صورة الدورة (اختياري)" value={courseThumb} onChange={setCourseThumb} placeholder="https://..." dir="ltr" />
                      <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">المرحلة الدراسية</label><select value={courseStage} onChange={(e) => setCourseStage(e.target.value)} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200"><option value="">كل المراحل</option>{educationStages.map((stage) => <option key={stage.value} value={stage.value}>{stage.label}</option>)}</select></div>
                      <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">المنهج</label><select value={courseCurriculum} onChange={(e) => setCourseCurriculum(e.target.value)} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200"><option value="">كل المناهج</option>{curricula.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
                    </div>
                    <CommissionPreview purchasePrice={coursePrice} subscriptionPrice={courseSubPrice} />
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">وصف الدورة</label>
                      <textarea value={courseDesc} onChange={(e) => setCourseDesc(e.target.value)} rows={3} placeholder="وصف محتوى الدورة..."
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors resize-none" />
                    </div>
                    <div className="flex gap-3 mt-5">
                      <button onClick={handleCourseCreate} disabled={saving || !courseTitle}
                        className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-60 flex items-center gap-2">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <FolderPlus className="w-4 h-4" />} إنشاء الدورة
                      </button>
                      <button onClick={() => setShowCourseForm(false)}
                        className="px-6 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">إلغاء</button>
                    </div>
                  </div>
                )}

                {courses.length === 0 && !showCourseForm ? (
                  <EmptyState icon={BookOpen} text="لم تنشئ أي دورة بعد" />
                ) : (
                  <div className="grid sm:grid-cols-2 gap-4">
                    {courses.map((c) => (
                      <div key={c.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
                        <div className="flex items-start justify-between mb-3">
                          <Link to={`/course/${c.id}`} className="font-bold text-slate-800 dark:text-slate-100 hover:text-blue-600 transition-colors line-clamp-1 flex-1">{c.title}</Link>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button onClick={() => openPricingEditor(c)} title="تعديل الأسعار" className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors">
                              <Banknote className="w-4 h-4" />
                            </button>
                            <button onClick={() => deleteCourse(c.id)} className="p-1.5 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors flex-shrink-0">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        {c.description && <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">{c.description}</p>}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2 py-0.5 text-xs rounded-md ${
                            c.level === 'beginner' ? 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-300' :
                            c.level === 'intermediate' ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300' :
                            'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-300'
                          }`}>
                            {c.level === 'beginner' ? 'مبتدئ' : c.level === 'intermediate' ? 'متوسط' : 'متقدم'}
                          </span>
                          {c.category && <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-xs rounded-md">{c.category.name_ar}</span>}
                          <span className="text-xs text-slate-400 dark:text-slate-500">{videos.filter(v => v.course_id === c.id).length} فيديو</span>
                        </div>
                        <div className="mt-3 flex items-center gap-2 flex-wrap text-xs">
                          <span className={`px-2 py-0.5 rounded-md font-bold ${c.price === 0 && c.subscription_price === 0
                            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300'
                            : 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300'}`}>
                            {c.price === 0 && c.subscription_price === 0 ? 'مجانية' : 'مدفوعة — مقفولة'}
                          </span>
                          {c.subscription_price > 0 && <span className="px-2 py-0.5 bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300 rounded-md">اشتراك: {c.subscription_price} جنيه/{c.subscription_duration_months} شهر</span>}
                          {c.price > 0 && <span className="px-2 py-0.5 bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300 rounded-md">شراء: {c.price} جنيه</span>}
                        </div>
                        {editingPricingCourse === c.id && (
                          <div className="mt-4 rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50/50 dark:bg-amber-900/10 p-4">
                            <p className="mb-3 text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2"><Banknote className="w-4 h-4 text-amber-500" /> أسعار الدورة</p>
                            <div className="grid gap-3 sm:grid-cols-3">
                              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">سعر الشراء (مرة واحدة)
                                <input type="number" min="0" value={String(editBuyPrice)} onChange={(e) => setEditBuyPrice(parseFloat(e.target.value) || 0)} className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-normal" />
                              </label>
                              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">سعر الاشتراك الشهري
                                <input type="number" min="0" value={String(editSubPrice)} onChange={(e) => setEditSubPrice(parseFloat(e.target.value) || 0)} className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-normal" />
                              </label>
                              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">مدة الاشتراك (شهور)
                                <input type="number" min="1" value={String(editSubMonths)} onChange={(e) => setEditSubMonths(parseInt(e.target.value, 10) || 1)} className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-normal" />
                              </label>
                            </div>
                            <CommissionPreview purchasePrice={editBuyPrice} subscriptionPrice={editSubPrice} compact />
                            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">بمجرد تعيين أي سعر، تُقفل الفيديوهات المدفوعة في الدورة ولا تُشاهد إلا بعد دفع الاشتراك واعتماده.</p>
                            <div className="mt-3 flex gap-2">
                              <button onClick={() => void saveCoursePricing(c.id)} className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold rounded-lg shadow hover:shadow-lg transition-all flex items-center gap-1.5"><Save className="w-4 h-4" /> حفظ الأسعار</button>
                              <button onClick={() => setEditingPricingCourse(null)} className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-sm font-medium rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">إلغاء</button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'competitions' && profile.is_teacher && (
              <>
                <TeacherCompetitions userId={user!.id} categories={categories} />
                {profile.is_manager && <TeacherLeaderboards teacherId={user!.id} />}
              </>
            )}

            {activeTab === 'students' && profile.is_teacher && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2"><UsersIcon className="w-5 h-5 text-blue-500" /> متابعة الطلاب المشتركين</h3>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">تتبع أداء وتقدم طلابك في دوراتك</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium">
                      {students.length} طالب
                    </span>
                  </div>
                </div>

                {students.length === 0 ? (
                  <EmptyState icon={UsersIcon} text="لا يوجد طلاب مشتركين في دوراتك حالياً" />
                ) : (
                  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-slate-50 dark:bg-slate-700/50">
                          <tr>
                            <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 dark:text-slate-400">الطالب</th>
                            <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 dark:text-slate-400">الدورة</th>
                            <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 dark:text-slate-400">التقدم</th>
                            <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 dark:text-slate-400">الحالة</th>
                            <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 dark:text-slate-400">الإجراءات</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                          {students.map((enrollment) => (
                            <tr key={enrollment.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/40 dark:to-cyan-900/40 flex items-center justify-center">
                                    <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                                      {enrollment.student?.full_name?.charAt(0) || 'ط'}
                                    </span>
                                  </div>
                                  <div>
                                    <p className="font-medium text-slate-800 dark:text-slate-100">{enrollment.student?.full_name || 'طالب'}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{enrollment.student?.email || ''}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className="font-medium text-slate-700 dark:text-slate-200">{enrollment.course?.title || 'دورة'}</span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-24 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all"
                                      style={{ width: `${enrollment.progress_percent || 0}%` }}
                                    />
                                  </div>
                                  <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{enrollment.progress_percent || 0}%</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                  enrollment.status === 'active'
                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                                    : enrollment.status === 'completed'
                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                    : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                                }`}>
                                  {enrollment.status === 'active' ? 'نشط' : enrollment.status === 'completed' ? 'مكتمل' : 'متوقف'}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <button
                                  onClick={() => setSelectedStudent(enrollment.student)}
                                  className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 rounded-lg text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                                >
                                  عرض التفاصيل
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'members' && profile.is_teacher && <AcademyMembersPanel teacherId={user!.id} />}

            {activeTab === 'qa' && profile.is_teacher && <TeacherQA teacherId={user!.id} />}
            {activeTab === 'sessions' && profile.is_teacher && <TeacherLiveSessions teacherId={user!.id} />}
            {activeTab === 'messages' && profile.is_teacher && <TeacherMessages teacherId={user!.id} />}
            {activeTab === 'packages' && profile.is_teacher && <TeacherPackages teacherId={user!.id} />}
            {activeTab === 'certificates' && profile.is_teacher && <TeacherCertificates teacherId={user!.id} />}

            {activeTab === 'exams' && profile.is_teacher && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2"><ClipboardCheck className="w-5 h-5 text-blue-500" /> إدارة الامتحانات</h3>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">إنشاء وإدارة امتحانات دوراتك</p>
                  </div>
                  <button
                    onClick={() => setShowExamForm(!showExamForm)}
                    className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> إنشاء امتحان
                  </button>
                </div>

                {showExamForm && (
                  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                    <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-4">{editingExam ? 'تعديل الامتحان' : 'امتحان جديد'}</h4>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="عنوان الامتحان" value={examForm.title} onChange={(v) => setExamForm({...examForm, title: v})} placeholder="امتحان الوحدة الأولى" />
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">الدورة</label>
                        <select
                          value={examForm.course_id}
                          onChange={(e) => setExamForm({...examForm, course_id: e.target.value})}
                          disabled={!!editingExam}
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 disabled:opacity-50"
                        >
                          <option value="">اختر الدورة</option>
                          {courses.map((c) => (
                            <option key={c.id} value={c.id}>{c.title}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">درجة النجاح (%)</label>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={examForm.passing_score}
                          onChange={(e) => setExamForm({...examForm, passing_score: parseInt(e.target.value) || 70})}
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200"
                        />
                      </div>
                    </div>

                    <div className="mt-6">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="font-bold text-slate-800 dark:text-slate-100">الأسئلة</h5>
                        <button
                          onClick={() => setExamForm({...examForm, questions: [...examForm.questions, { question: '', options: ['', '', '', ''], correct_option: 0 }]})}
                          className="px-3 py-1.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-1"
                        >
                          <Plus className="w-4 h-4" /> إضافة سؤال
                        </button>
                      </div>

                      {examForm.questions.length === 0 ? (
                        <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm">
                          لا توجد أسئلة بعد. أضف سؤالاً للبدء.
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {examForm.questions.map((q, qIndex) => (
                            <div key={qIndex} className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 bg-slate-50 dark:bg-slate-900">
                              <div className="flex items-start justify-between mb-3">
                                <span className="font-bold text-slate-700 dark:text-slate-200">سؤال {qIndex + 1}</span>
                                <button
                                  onClick={() => setExamForm({...examForm, questions: examForm.questions.filter((_, i) => i !== qIndex)})}
                                  className="text-rose-500 hover:text-rose-700"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                              <input
                                value={q.question}
                                onChange={(e) => {
                                  const newQuestions = [...examForm.questions];
                                  newQuestions[qIndex].question = e.target.value;
                                  setExamForm({...examForm, questions: newQuestions});
                                }}
                                placeholder="اكتب السؤال هنا..."
                                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 mb-3"
                              />
                              <div className="space-y-2">
                                {q.options.map((opt, optIndex) => (
                                  <div key={optIndex} className="flex items-center gap-2">
                                    <input
                                      type="radio"
                                      name={`correct-${qIndex}`}
                                      checked={q.correct_option === optIndex}
                                      onChange={() => {
                                        const newQuestions = [...examForm.questions];
                                        newQuestions[qIndex].correct_option = optIndex;
                                        setExamForm({...examForm, questions: newQuestions});
                                      }}
                                      className="accent-blue-600"
                                    />
                                    <input
                                      value={opt}
                                      onChange={(e) => {
                                        const newQuestions = [...examForm.questions];
                                        newQuestions[qIndex].options[optIndex] = e.target.value;
                                        setExamForm({...examForm, questions: newQuestions});
                                      }}
                                      placeholder={`الخيار ${optIndex + 1}`}
                                      className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-700 dark:text-slate-200"
                                    />
                                  </div>
                                ))}
                              </div>
                              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">حدد الخيار الصحيح بالدائرة</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="mt-6 flex gap-2">
                      <button
                        onClick={async () => {
                          if (!examForm.title.trim() || !examForm.course_id) {
                            toast('أدخل عنوان الامتحان واختر الدورة', 'error');
                            return;
                          }
                          if (examForm.questions.length === 0) {
                            toast('أضف سؤالاً واحداً على الأقل', 'error');
                            return;
                          }
                          const hasEmptyQuestion = examForm.questions.some(q => !q.question.trim() || q.options.some(o => !o.trim()));
                          if (hasEmptyQuestion) {
                            toast('أكمل جميع حقول الأسئلة والخيارات', 'error');
                            return;
                          }

                          if (editingExam) {
                            // Update existing exam
                            const { error: quizError } = await supabase.from('quizzes').update({
                              title: examForm.title,
                              passing_score: examForm.passing_score,
                            }).eq('id', editingExam.id);

                            if (quizError) {
                              toast('فشل تحديث الامتحان', 'error');
                              return;
                            }

                            // Delete existing questions
                            await supabase.from('quiz_questions').delete().eq('quiz_id', editingExam.id);

                            // Insert updated questions
                            const questionsToInsert = examForm.questions.map((q, index) => ({
                              quiz_id: editingExam.id,
                              question: q.question,
                              options: q.options,
                              correct_option: q.correct_option,
                              sort_order: index,
                            }));

                            const { error: questionsError } = await supabase.from('quiz_questions').insert(questionsToInsert);

                            if (questionsError) {
                              toast('فشل تحديث الأسئلة', 'error');
                              return;
                            }

                            toast('تم تحديث الامتحان والأسئلة بنجاح', 'success');
                          } else {
                            // Create new exam
                            const { data: quizData, error: quizError } = await supabase.from('quizzes').insert({
                              title: examForm.title,
                              course_id: examForm.course_id,
                              passing_score: examForm.passing_score,
                            }).select().single();

                            if (quizError) {
                              toast('فشل إنشاء الامتحان', 'error');
                              return;
                            }

                            const questionsToInsert = examForm.questions.map((q, index) => ({
                              quiz_id: quizData.id,
                              question: q.question,
                              options: q.options,
                              correct_option: q.correct_option,
                              sort_order: index,
                            }));

                            const { error: questionsError } = await supabase.from('quiz_questions').insert(questionsToInsert);

                            if (questionsError) {
                              toast('فشل إضافة الأسئلة', 'error');
                              return;
                            }

                            toast('تم إنشاء الامتحان وإضافة الأسئلة بنجاح', 'success');
                          }

                          setShowExamForm(false);
                          setEditingExam(null);
                          setExamForm({ title: '', course_id: '', passing_score: 70, questions: [] });
                          await fetchDashboardData();
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2"
                      >
                        <Save className="w-4 h-4" /> {editingExam ? 'حفظ التعديلات' : 'إنشاء الامتحان'}
                      </button>
                      <button
                        onClick={() => {
                          setShowExamForm(false);
                          setEditingExam(null);
                          setExamForm({ title: '', course_id: '', passing_score: 70, questions: [] });
                        }}
                        className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                      >
                        إلغاء
                      </button>
                    </div>
                  </div>
                )}

                {exams.length === 0 ? (
                  <EmptyState icon={ClipboardCheck} text="لا توجد امتحانات حالياً" />
                ) : (
                  <div className="grid gap-4">
                    {exams.map((exam) => (
                      <div key={exam.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-1">{exam.title}</h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">{exam.course?.title || 'بدون دورة'}</p>
                            <div className="flex items-center gap-4 text-sm text-slate-400 dark:text-slate-500">
                              <span className="flex items-center gap-1">
                                <UsersIcon className="w-4 h-4" />
                                {examResults.filter(r => r.quiz_id === exam.id).length} محاولة
                              </span>
                              <span className="flex items-center gap-1">
                                <CheckCircle className="w-4 h-4" />
                                {examResults.filter(r => r.quiz_id === exam.id && r.passed).length} ناجح
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={async () => {
                                const { data: questions } = await supabase.from('quiz_questions').select('*').eq('quiz_id', exam.id).order('sort_order');
                                const loadedQuestions = (questions ?? []).map((q: QuizQuestion) => ({
                                  id: q.id,
                                  question: q.question,
                                  options: q.options,
                                  correct_option: q.correct_option,
                                }));
                                setEditingExam({
                                  ...exam,
                                  questions: loadedQuestions
                                });
                                setExamForm({
                                  title: exam.title,
                                  course_id: exam.course_id,
                                  passing_score: exam.passing_score,
                                  questions: loadedQuestions
                                });
                                setShowExamForm(true);
                              }}
                              className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                            >
                              <Edit className="w-5 h-5" />
                            </button>
                            <button
                              onClick={async () => {
                                await supabase.from('quizzes').delete().eq('id', exam.id);
                                await fetchDashboardData();
                                toast('تم حذف الامتحان', 'success');
                              }}
                              className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'analytics' && profile.is_teacher && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-blue-500" /> تحليلات الأداء</h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">إحصائيات شاملة عن أداء دوراتك وطلابك</p>
                </div>

                {analytics ? (
                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                          <Eye className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{analytics.totalViews.toLocaleString()}</p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">إجمالي المشاهدات</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                          <UsersIcon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{analytics.totalEnrollments}</p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">المشتركين في الدورات</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center">
                          <TrendingUp className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{analytics.avgProgress.toFixed(1)}%</p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">متوسط التقدم</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                          <Award className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{analytics.avgScore.toFixed(1)}</p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">متوسط الدرجات</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                          <ClipboardCheck className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{analytics.totalExams}</p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">الامتحانات المنشورة</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
                          <CheckCircle className="w-6 h-6 text-rose-600 dark:text-rose-400" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{analytics.passedExams}</p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">الناجحين في الامتحانات</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <EmptyState icon={BarChart3} text="جاري تحميل البيانات..." />
                )}
              </div>
            )}

            {activeTab === 'payouts' && profile.is_teacher && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2"><Banknote className="w-5 h-5 text-emerald-500" /> مستحقات المدرس</h3>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">متابعة الإيراد الخاص بك، رسوم المنصة، والفواتير المدفوعة</p>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                    {teacherPayouts.filter((payout) => payout.status === 'paid').length} دفعة مسددة
                  </span>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                    <p className="text-sm text-slate-500 dark:text-slate-400">إجمالي مستحقاتك</p>
                    <p className="mt-3 text-2xl font-black text-emerald-600 dark:text-emerald-300">{Number(totalPayoutAmount).toLocaleString('ar-EG')} جنيه</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                    <p className="text-sm text-slate-500 dark:text-slate-400">رسوم المنصة</p>
                    <p className="mt-3 text-2xl font-black text-amber-600 dark:text-amber-300">{Number(totalPlatformFee).toLocaleString('ar-EG')} جنيه</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                    <p className="text-sm text-slate-500 dark:text-slate-400">مستحقات معلقة</p>
                    <p className="mt-3 text-2xl font-black text-blue-600 dark:text-blue-300">{Number(pendingPayoutAmount).toLocaleString('ar-EG')} جنيه</p>
                  </div>
                </div>

                <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
                  <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
                    <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-700">
                      <h4 className="font-bold text-slate-800 dark:text-slate-100">سجل الدفعات</h4>
                    </div>

                    {teacherPayouts.length === 0 ? (
                      <div className="p-5"><EmptyState icon={Banknote} text="لا توجد دفعات مسجلة حتى الآن" /></div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-right text-sm">
                          <thead className="bg-slate-50 dark:bg-slate-900">
                            <tr>
                              <th className="px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400">الفترة</th>
                              <th className="px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400">الإيراد</th>
                              <th className="px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400">المنصة</th>
                              <th className="px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400">المستحق</th>
                              <th className="px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400">الحالة</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {teacherPayouts.map((payout) => (
                              <tr key={payout.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">
                                  {new Date(payout.period_start).toLocaleDateString('ar-EG')} - {new Date(payout.period_end).toLocaleDateString('ar-EG')}
                                </td>
                                <td className="px-4 py-3 font-bold text-emerald-700 dark:text-emerald-300">{Number(payout.total_gross).toLocaleString('ar-EG')} جنيه</td>
                                <td className="px-4 py-3 font-bold text-amber-700 dark:text-amber-300">{Number(payout.total_platform_fee).toLocaleString('ar-EG')} جنيه</td>
                                <td className="px-4 py-3 font-bold text-blue-700 dark:text-blue-300">{Number(payout.total_teacher_payout).toLocaleString('ar-EG')} جنيه</td>
                                <td className="px-4 py-3">
                                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${payout.status === 'paid' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : payout.status === 'pending' ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200'}`}>
                                    {payout.status === 'pending' ? 'قيد الانتظار' : payout.status === 'paid' ? 'مدفوع' : payout.status === 'approved' ? 'موافق عليه' : payout.status === 'processing' ? 'قيد التنفيذ' : 'فشل'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
                    <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-700">
                      <h4 className="font-bold text-slate-800 dark:text-slate-100">المعاملات الأخيرة</h4>
                    </div>

                    {teacherPayoutTransactions.length === 0 ? (
                      <div className="p-5 text-sm text-slate-500 dark:text-slate-400">لا توجد معاملات حديثة.</div>
                    ) : (
                      <div className="space-y-3 p-4">
                        {teacherPayoutTransactions.slice(0, 8).map((transaction) => (
                          <div key={transaction.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/50">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{Number(transaction.amount).toLocaleString('ar-EG')} جنيه</span>
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${transaction.status === 'paid' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200'}`}>
                                {transaction.status === 'paid' ? 'تم' : transaction.status === 'processing' ? 'قيد التنفيذ' : transaction.status === 'pending' ? 'قيد الانتظار' : 'فشل'}
                              </span>
                            </div>
                            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{transaction.method || 'بنك'} • {new Date(transaction.created_at).toLocaleDateString('ar-EG')}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'page' && profile.is_manager && <TeacherPageSettingsPanel teacherId={user!.id} premium={limits.premium} />}

            {activeTab === 'honors' && profile.is_manager && <TeacherHonors teacherId={user!.id} />}

            {activeTab === 'honors' && profile.is_manager && <TeacherHonors teacherId={user!.id} />}
            {activeTab === 'assistants' && profile.is_manager && <TeacherAssistants />}

            {/* Student Details Modal */}
            {selectedStudent && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                  <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">تفاصيل الطالب</h3>
                      <button onClick={() => setSelectedStudent(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                        <X className="w-5 h-5 text-slate-500" />
                      </button>
                    </div>
                  </div>
                  <div className="p-6 space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/40 dark:to-cyan-900/40 flex items-center justify-center">
                        <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                          {selectedStudent.full_name?.charAt(0) || 'ط'}
                        </span>
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-slate-800 dark:text-slate-100">{selectedStudent.full_name}</h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{selectedStudent.email}</p>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4">
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">التقدم في الدورات</p>
                        <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                          {studentProgress[selectedStudent.id]?.length || 0} فيديو
                        </p>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4">
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">الامتحانات المحلولة</p>
                        <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                          {examResults.filter(r => r.student_id === selectedStudent.id).length}
                        </p>
                      </div>
                    </div>

                    <div>
                      <h5 className="font-bold text-slate-800 dark:text-slate-100 mb-3">آخر النشاط</h5>
                      <div className="space-y-2">
                        {studentProgress[selectedStudent.id]?.slice(0, 5).map((progress: VideoProgress) => (
                          <div key={progress.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                            <Play className="w-4 h-4 text-blue-500" />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{progress.video?.title || 'فيديو'}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">{progress.progress_percent || 0}% مكتمل</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'subscriptions' && !profile.is_teacher && (
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2 dark:text-white"><Crown className="w-5 h-5 text-blue-500" /> اشتراكاتي</h3>
                {subscriptions.length === 0 ? (
                  <EmptyState icon={Crown} text="لا توجد اشتراكات بعد" action={
                    <Link to="/courses" className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors">استكشف الدورات</Link>
                  } />
                ) : (
                  <div className="space-y-4">
                    {subscriptions.map((sub) => {
                      const isActive = sub.status === 'active';
                      const isPending = sub.status === 'pending';
                      const isCancelled = sub.status === 'cancelled';
                      const statusLabel = isActive ? 'نشط' : isPending ? 'معلق - قيد التأكيد' : isCancelled ? 'ملغى' : 'منتهي';
                      const statusClass = isActive
                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300'
                        : isPending
                          ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300';
                      return (
                        <div key={sub.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/40 dark:to-cyan-900/40 flex items-center justify-center">
                                <Crown className="w-6 h-6 text-blue-600" />
                              </div>
                              <div>
                                <p className="font-bold text-slate-800 dark:text-white">{sub.plan?.name_ar ?? 'باقة'}</p>
                                <p className="text-sm text-slate-400 dark:text-slate-400">
                                  {sub.payment_status === 'paid' ? 'مدفوع' : sub.payment_status === 'pending' ? 'الدفع قيد التأكيد' : 'غير مدفوع'}
                                </p>
                              </div>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusClass}`}>
                              {statusLabel}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                            <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                              <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> يبدأ: {sub.start_date ? new Date(sub.start_date).toLocaleDateString('ar-EG') : '—'}</span>
                              <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {sub.access_type === 'purchase' || !sub.end_date ? 'وصول دائم' : `ينتهي: ${new Date(sub.end_date).toLocaleDateString('ar-EG')}`}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {isPending && (
                                <a
                                  href={whatsappLink(`مرحباً، أريد إتمام الدفع لباقة ${sub.plan?.name_ar ?? ''} لإتمام تفعيل اشتراكي.`)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300 text-xs font-medium hover:bg-emerald-100 transition-colors"
                                >
                                  <MessageCircle className="w-4 h-4" /> أكمل الدفع عبر واتساب
                                </a>
                              )}
                              {(isActive || isPending) && (
                                <button
                                  onClick={() => cancelSubscription(sub.id)}
                                  className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-300 text-xs font-medium hover:bg-rose-100 transition-colors"
                                >
                                  إلغاء الاشتراك
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'favorites' && !profile.is_teacher && (
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2"><Heart className="w-5 h-5 text-rose-500" /> المفضلة</h3>
                {favorites.length === 0 ? (
                  <EmptyState icon={Heart} text="لا توجد فيديوهات في المفضلة" />
                ) : (
                  <div className="grid sm:grid-cols-2 gap-4">
                    {favorites.map((fav) => (
                      <Link key={fav.id} to={`/video/${fav.video_id}`}
                        className="group bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 hover:shadow-lg hover:border-blue-200 dark:hover:border-blue-900 transition-all">
                        <div className="flex gap-3">
                          <div className="w-24 aspect-video rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                            <Play className="w-6 h-6 text-slate-400 dark:text-slate-500 group-hover:text-blue-500 transition-colors" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-800 dark:text-slate-100 line-clamp-1 group-hover:text-blue-600 transition-colors">{fav.video?.title}</p>
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{fav.video?.teacher?.full_name}</p>
                            <p className="text-xs text-slate-300 dark:text-slate-600 mt-1">{new Date(fav.created_at).toLocaleDateString('ar-EG')}</p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'history' && !profile.is_teacher && (
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2"><Clock className="w-5 h-5 text-blue-500" /> سجل المشاهدة</h3>
                {history.length === 0 ? (
                  <EmptyState icon={Clock} text="لا يوجد سجل مشاهدات بعد" action={
                    <Link to="/teachers" className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors">ابدأ المشاهدة</Link>
                  } />
                ) : (
                  <div className="space-y-3">
                    {history.map((h) => (
                      <Link key={h.id} to={`/video/${h.video_id}`}
                        className="group flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all">
                        <div className="w-20 aspect-video rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                          <Play className="w-6 h-6 text-slate-400 dark:text-slate-500 group-hover:text-blue-500 transition-colors" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-800 dark:text-slate-100 line-clamp-1 group-hover:text-blue-600 transition-colors">{h.video?.title}</p>
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{h.video?.teacher?.full_name}</p>
                        </div>
                        <span className="text-xs text-slate-400 dark:text-slate-500 flex-shrink-0">{new Date(h.watched_at).toLocaleDateString('ar-EG')}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'account' && (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
                <h3 className="mb-5 flex items-center gap-2 font-bold text-slate-800 dark:text-slate-100"><User className="w-5 h-5 text-blue-500" /> معلومات الحساب</h3>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">البريد الإلكتروني</label>
                    <div className="flex gap-2">
                      <input value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr"
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors" />
                      <button onClick={updateEmail} disabled={saving || email === user?.email}
                        className="shrink-0 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50">تحديث</button>
                    </div>
                    <p className="mt-1.5 text-xs text-slate-400">سيتم إرسال رسالة تأكيد للبريد الجديد قبل تفعيله.</p>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">تاريخ الانضمام</label>
                    <div className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 py-2.5 text-sm text-slate-500 dark:text-slate-400">
                      <Smartphone className="h-4 w-4" /> {new Date(profile.created_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                  </div>
                </div>
                <div className="mt-6 border-t border-slate-100 pt-5 dark:border-slate-700">
                  <button onClick={signOutAll}
                    className="flex items-center gap-2 rounded-xl bg-rose-50 px-5 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-100 dark:bg-rose-900/30 dark:text-rose-300">
                    <LogOut className="h-4 w-4" /> تسجيل الخروج من جميع الأجهزة
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
                <h3 className="mb-5 flex items-center gap-2 font-bold text-slate-800 dark:text-slate-100"><ShieldCheck className="w-5 h-5 text-blue-500" /> الأمان</h3>
                <div className="max-w-md space-y-5">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">كلمة السر الجديدة</label>
                    <div className="relative">
                      <input type={showPass ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="6 أحرف على الأقل"
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 py-2.5 pl-11 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors" />
                      <button onClick={() => setShowPass(!showPass)} type="button"
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">تأكيد كلمة السر</label>
                    <div className="relative">
                      <input type={showPass ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 py-2.5 pl-11 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors" />
                      {confirmPassword && (
                        <span className="absolute left-3 top-1/2 -translate-y-1/2">
                          {newPassword === confirmPassword
                            ? <Check className="h-4 w-4 text-emerald-500" />
                            : <span className="h-4 w-4 text-rose-500">✕</span>}
                        </span>
                      )}
                    </div>
                  </div>
                  <button onClick={changePassword} disabled={saving || !newPassword}
                    className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} تغيير كلمة السر
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'appearance' && (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
                <h3 className="mb-5 flex items-center gap-2 font-bold text-slate-800 dark:text-slate-100"><Sun className="w-5 h-5 text-blue-500" /> المظهر</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <button onClick={() => setTheme('light')}
                    className={`flex flex-col items-center gap-3 rounded-2xl border-2 p-6 transition ${actualTheme === 'light' ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20' : 'border-slate-200 hover:border-blue-200 dark:border-slate-700'}`}>
                    <div className="flex h-16 w-24 overflow-hidden rounded-lg border border-slate-200">
                      <div className="h-full w-1/3 bg-white" /><div className="h-full w-1/3 bg-slate-200" /><div className="h-full w-1/3 bg-blue-500" />
                    </div>
                    <span className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                      <Sun className="h-4 w-4" /> الوضع الفاتح {actualTheme === 'light' && <Check className="h-4 w-4 text-blue-600" />}
                    </span>
                  </button>
                  <button onClick={() => setTheme('dark')}
                    className={`flex flex-col items-center gap-3 rounded-2xl border-2 p-6 transition ${actualTheme === 'dark' ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20' : 'border-slate-200 hover:border-blue-200 dark:border-slate-700'}`}>
                    <div className="flex h-16 w-24 overflow-hidden rounded-lg border border-slate-700">
                      <div className="h-full w-1/3 bg-slate-900" /><div className="h-full w-1/3 bg-slate-700" /><div className="h-full w-1/3 bg-blue-500" />
                    </div>
                    <span className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                      <Moon className="h-4 w-4" /> الوضع الليلي {actualTheme === 'dark' && <Check className="h-4 w-4 text-blue-600" />}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TeacherCompetitions({ userId, categories }: { userId: string; categories: Category[] }) {
  const { toast } = useToast();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [selected, setSelected] = useState<Competition | null>(null);
  const [questions, setQuestions] = useState<CompetitionQuestion[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [competitionStage, setCompetitionStage] = useState('');
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [correctOption, setCorrectOption] = useState(0);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from('competitions').select('*').eq('teacher_id', userId).order('created_at', { ascending: false });
    setCompetitions((data ?? []) as Competition[]);
  }, [userId]);
  useEffect(() => { void load(); }, [load]);

  const choose = async (competition: Competition) => {
    setSelected(competition);
    const { data } = await supabase.from('competition_questions').select('*').eq('competition_id', competition.id).order('sort_order', { ascending: true });
    setQuestions((data ?? []) as CompetitionQuestion[]);
  };
  const createCompetition = async () => {
    if (!title.trim() || !competitionStage) return;
    setSaving(true);
    const { data, error } = await supabase.from('competitions').insert({ teacher_id: userId, title, description, category_id: categoryId || categories[0]?.id || null, education_stage: competitionStage, status: 'published' }).select().single();
    setSaving(false);
    if (error || !data) { toast('تعذر إنشاء المنافسة', 'error'); return; }
    setTitle(''); setDescription(''); setCategoryId(''); setCompetitionStage(''); await load(); await choose(data as Competition); toast('تم إنشاء المنافسة', 'success');
  };
  const addQuestion = async () => {
    if (!selected || !question.trim() || options.some((option) => !option.trim())) return;
    setSaving(true);
    const { data, error } = await supabase.from('competition_questions').insert({ competition_id: selected.id, question, options, correct_option: correctOption, sort_order: questions.length }).select().single();
    setSaving(false);
    if (error || !data) { toast('تعذر إضافة السؤال', 'error'); return; }
    setQuestions((items) => [...items, data as CompetitionQuestion]); setQuestion(''); setOptions(['', '', '', '']); setCorrectOption(0); toast('تمت إضافة السؤال', 'success');
  };
  const removeQuestion = async (id: string) => { await supabase.from('competition_questions').delete().eq('id', id); setQuestions((items) => items.filter((item) => item.id !== id)); };

  return <div className="space-y-6"><div className="flex items-center justify-between"><div><h3 className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-100"><Gamepad2 className="h-5 w-5 text-cyan-600" /> إدارة المنافسات</h3><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">أنشئ تحدياتك وأضف أسئلة اختيار من متعدد للطلاب.</p></div></div><div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm"><h4 className="mb-4 font-bold text-slate-800 dark:text-slate-100">منافسة جديدة</h4><div className="grid gap-4 sm:grid-cols-2"><Field label="اسم المنافسة" value={title} onChange={setTitle} placeholder="تحدي العلوم الأسبوعي" /><Field label="وصف مختصر" value={description} onChange={setDescription} placeholder="اختبر معلوماتك واجمع النقاط" /><div><label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">المرحلة الدراسية <span className="text-rose-500">*</span></label><select value={competitionStage} onChange={(e) => setCompetitionStage(e.target.value)} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200"><option value="">اختر المرحلة...</option>{educationStages.map((stage) => <option key={stage.value} value={stage.value}>{stage.label}</option>)}</select></div></div><button onClick={() => void createCompetition()} disabled={saving || !title.trim() || !competitionStage} className="mt-4 flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-40"><FolderPlus className="h-4 w-4" /> إنشاء المنافسة</button></div><div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]"><div className="space-y-3">{competitions.map((competition) => <button key={competition.id} onClick={() => void choose(competition)} className={`w-full rounded-2xl border p-4 text-right transition ${selected?.id === competition.id ? 'border-cyan-400 bg-cyan-50 dark:border-cyan-500/60 dark:bg-cyan-900/30' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-cyan-200 dark:hover:border-cyan-800'}`}><div className="flex items-center justify-between gap-3"><span className="font-bold text-slate-800 dark:text-slate-100">{competition.title}</span><span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">منشورة</span></div><p className="mt-2 text-xs text-slate-400 dark:text-slate-500">المرحلة: {competition.education_stage ? educationStages.find((s) => s.value === competition.education_stage)?.label ?? competition.education_stage : 'غير محددة'}</p></button>)}{competitions.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-600 p-8 text-center text-sm text-slate-400 dark:text-slate-500">لم تنشئ منافسات بعد</div>}</div>{selected ? <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm"><div className="mb-5 flex items-center justify-between"><div><h4 className="font-extrabold text-slate-800 dark:text-slate-100">أسئلة: {selected.title}</h4><p className="mt-1 text-xs text-slate-400 dark:text-slate-500">الإجابة الصحيحة لا تظهر للطلاب في الواجهة التعليمية.</p></div><ListPlus className="h-5 w-5 text-cyan-600" /></div><div className="space-y-3">{questions.map((item, index) => <div key={item.id} className="flex items-start justify-between gap-3 rounded-xl bg-slate-50 dark:bg-slate-900 p-3"><div><p className="text-sm font-bold text-slate-700 dark:text-slate-200">{index + 1}. {item.question}</p><p className="mt-1 text-xs text-emerald-600">الإجابة الصحيحة: {item.options[item.correct_option]}</p></div><button onClick={() => void removeQuestion(item.id)} className="text-xs font-bold text-rose-500">حذف</button></div>)}</div><div className="mt-5 border-t border-slate-100 dark:border-slate-700 pt-5"><Field label="نص السؤال" value={question} onChange={setQuestion} placeholder="اكتب السؤال هنا" /><div className="mt-3 grid gap-2 sm:grid-cols-2">{options.map((option, index) => <input key={index} value={option} onChange={(event) => setOptions((items) => items.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} placeholder={`الإجابة ${index + 1}`} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2.5 text-sm outline-none focus:border-cyan-500" />)}</div><div className="mt-3 flex items-center gap-3"><label className="text-xs font-bold text-slate-600 dark:text-slate-300">الإجابة الصحيحة</label><select value={correctOption} onChange={(event) => setCorrectOption(Number(event.target.value))} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm">{options.map((_, index) => <option key={index} value={index}>الإجابة {index + 1}</option>)}</select></div><button onClick={() => void addQuestion()} disabled={saving || !question.trim() || options.some((option) => !option.trim())} className="mt-4 flex items-center gap-2 rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-40"><Plus className="h-4 w-4" /> إضافة السؤال</button></div></div> : <div className="flex min-h-[260px] items-center justify-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 p-8 text-center text-sm text-slate-400 dark:text-slate-500">اختر منافسة لإدارة أسئلتها</div>}</div></div>;
}

function StatCard({ icon: Icon, label, value, color }: { icon: typeof Eye; label: string; value: number | string; color: string }) {
  const colorMap: Record<string, { bg: string; text: string; iconBg: string; gradient: string }> = {
    blue: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-300', iconBg: 'bg-blue-500', gradient: 'from-blue-500 to-blue-600' },
    cyan: { bg: 'bg-cyan-50 dark:bg-cyan-900/20', text: 'text-cyan-600 dark:text-cyan-300', iconBg: 'bg-cyan-500', gradient: 'from-cyan-500 to-cyan-600' },
    amber: { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-600 dark:text-amber-300', iconBg: 'bg-amber-500', gradient: 'from-amber-500 to-amber-600' },
    emerald: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-600 dark:text-emerald-300', iconBg: 'bg-emerald-500', gradient: 'from-emerald-500 to-emerald-600' },
  };
  const colors = colorMap[color] ?? colorMap.blue;
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm`}>
      <div className={`absolute -right-4 -top-4 h-16 w-16 rounded-full opacity-10 bg-gradient-to-br ${colors.gradient}`} />
      <div className={`relative flex h-10 w-10 items-center justify-center rounded-xl ${colors.iconBg} shadow-lg shadow-${color}-500/30 mb-3`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <p className="relative text-2xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
      <p className="relative text-xs font-medium text-slate-400 dark:text-slate-500">{label}</p>
    </div>
  );
}

function ProfileMetric({ icon: Icon, label, value, tone }: { icon: typeof Eye; label: string; value: number | string; tone: 'blue' | 'emerald' | 'cyan' | 'amber' | 'rose' }) {
  const styles = { blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300', emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300', cyan: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-300', amber: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300', rose: 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-300' };
  return <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800"><div className={`flex h-10 w-10 items-center justify-center rounded-xl ${styles[tone]}`}><Icon className="h-5 w-5" /></div><div><strong className="block text-xl text-slate-900 dark:text-white">{value}</strong><span className="text-xs text-slate-500 dark:text-slate-400">{label}</span></div></div>;
}

function profileCompletion(profile: Profile, values: { fullName: string; bio: string; specialization: string; avatarUrl: string; location: string; profileStage: string; profileCurriculum: string; phone: string; guardianPhone: string }) {
  const fields = profile.is_teacher
    ? [values.fullName, values.bio, values.specialization, values.avatarUrl, values.location, values.profileStage, values.profileCurriculum, values.phone]
    : [values.fullName, values.phone, values.guardianPhone, values.avatarUrl, values.profileStage, values.profileCurriculum, values.location, values.bio];
  return Math.round((fields.filter(Boolean).length / fields.length) * 100);
}

function QuickProfileLink({ icon: Icon, label, onClick, href }: { icon: typeof Eye; label: string; onClick?: () => void; href?: string }) {
  const className = "flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-white hover:text-blue-600 dark:text-slate-300 dark:hover:bg-slate-800";
  if (href) return <Link to={href} className={className}><Icon className="h-4 w-4" /> {label}</Link>;
  return <button type="button" onClick={onClick} className={className}><Icon className="h-4 w-4" /> {label}</button>;
}

type GuardianChildSummary = {
  link_id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  avatar_url: string | null;
  education_stage: string | null;
  link_status: string;
  courses_count: number;
  completed_courses: number;
  average_progress: number;
  exams_count: number;
  average_score: number;
  passed_exams: number;
  certificates_count: number;
};

function GuardianWorkspace() {
  const { toast } = useToast();
  const [children, setChildren] = useState<GuardianChildSummary[]>([]);
  const [studentEmail, setStudentEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('guardian_children_summary');
    if (error) toast('تعذر تحميل بيانات الأبناء', 'error');
    setChildren((data ?? []) as GuardianChildSummary[]);
    setLoading(false);
  }, [toast]);

  useEffect(() => { void load(); }, [load]);

  const requestStudent = async () => {
    if (!studentEmail.trim()) return;
    setRequesting(true);
    const { error } = await supabase.rpc('guardian_request_student', { p_student_email: studentEmail.trim() });
    setRequesting(false);
    if (error) {
      toast(error.message.includes('student not found') ? 'لم يتم العثور على حساب طالب بهذا البريد' : 'تعذر إرسال طلب الربط', 'error');
      return;
    }
    setStudentEmail('');
    toast('تم إرسال طلب الربط. يجب أن يوافق الطالب أولًا.', 'success');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-100"><UsersIcon className="h-5 w-5 text-emerald-500" /> أبنائي</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">تابع التقدم والامتحانات والشهادات بعد موافقة الطالب على الربط.</p>
        </div>
        <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">{children.length} أبناء مرتبطون</span>
      </div>

      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 dark:border-emerald-500/30 dark:bg-emerald-900/10">
        <h4 className="font-bold text-emerald-900 dark:text-emerald-200">إضافة ابن أو ابنة</h4>
        <p className="mt-1 text-xs leading-5 text-emerald-800/80 dark:text-emerald-300/80">اكتب البريد الإلكتروني لحساب الطالب. لن تظهر البيانات إلا بعد موافقته.</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input value={studentEmail} onChange={(event) => setStudentEmail(event.target.value)} type="email" dir="ltr" placeholder="student@example.com" className="flex-1 rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-emerald-500 dark:border-emerald-500/30 dark:bg-slate-900 dark:text-white" />
          <button type="button" onClick={() => { void requestStudent(); }} disabled={requesting || !studentEmail.trim()} className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50">{requesting ? 'جارٍ الإرسال...' : 'إرسال طلب الربط'}</button>
        </div>
      </div>

      {loading ? <Loader2 className="mx-auto mt-10 h-8 w-8 animate-spin text-emerald-600" /> : children.length === 0 ? <EmptyState icon={UsersIcon} text="لا توجد حسابات أبناء مرتبطة حتى الآن" /> : (
        <div className="grid gap-4 lg:grid-cols-2">
          {children.map((child) => (
            <div key={child.link_id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-emerald-500 to-teal-400 text-lg font-bold text-white">{child.avatar_url ? <img src={child.avatar_url} alt={child.student_name} className="h-full w-full object-cover" loading="lazy" decoding="async" /> : child.student_name.charAt(0)}</div>
                <div className="min-w-0"><h4 className="font-bold text-slate-800 dark:text-white">{child.student_name}</h4><p className="truncate text-xs text-slate-500 dark:text-slate-400">{child.student_email} {child.education_stage ? `• ${child.education_stage}` : ''}</p></div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <GuardianMetric label="متوسط التقدم" value={`${Number(child.average_progress ?? 0).toLocaleString('ar-EG')}%`} />
                <GuardianMetric label="دورات مكتملة" value={child.completed_courses} />
                <GuardianMetric label="متوسط الامتحانات" value={`${Number(child.average_score ?? 0).toLocaleString('ar-EG')}%`} />
                <GuardianMetric label="الشهادات" value={child.certificates_count} />
              </div>
              <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-xs dark:bg-slate-900/60"><span className="text-slate-500 dark:text-slate-400">{child.exams_count} محاولات امتحان • {child.passed_exams} ناجحة</span><span className="font-bold text-emerald-600 dark:text-emerald-300">الحساب مرتبط</span></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function GuardianMetric({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/60"><p className="text-lg font-black text-slate-800 dark:text-white">{value}</p><p className="mt-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">{label}</p></div>;
}

function GuardianRequestsPanel() {
  const { toast } = useToast();
  const [requests, setRequests] = useState<Array<{ id: string; guardian_name: string; guardian_email: string; requested_at: string }>>([]);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.rpc('student_guardian_requests');
      setRequests((data ?? []) as Array<{ id: string; guardian_name: string; guardian_email: string; requested_at: string }>);
    })();
  }, []);

  if (requests.length === 0) return null;

  const respond = async (id: string, approve: boolean) => {
    const { error } = await supabase.rpc('student_respond_guardian_request', { p_link_id: id, p_approve: approve });
    if (error) { toast('تعذر تحديث طلب ولي الأمر', 'error'); return; }
    setRequests((current) => current.filter((request) => request.id !== id));
    toast(approve ? 'تمت الموافقة على ربط ولي الأمر' : 'تم رفض طلب الربط', approve ? 'success' : 'info');
  };

  return <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-500/30 dark:bg-amber-900/10"><h3 className="font-bold text-amber-900 dark:text-amber-200">طلبات أولياء الأمور</h3><p className="mt-1 text-xs text-amber-800/80 dark:text-amber-300/80">وافق فقط على الأشخاص الذين تعرفهم حتى يتمكنوا من متابعة تقدمك.</p><div className="mt-3 space-y-2">{requests.map((request) => <div key={request.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-3 dark:bg-slate-800"><div><p className="text-sm font-bold text-slate-800 dark:text-white">{request.guardian_name}</p><p className="text-xs text-slate-500 dark:text-slate-400">{request.guardian_email}</p></div><div className="flex gap-2"><button type="button" onClick={() => { void respond(request.id, true); }} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white">موافقة</button><button type="button" onClick={() => { void respond(request.id, false); }} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-200">رفض</button></div></div>)}</div></div>;
}

function EmptyState({ icon: Icon, text, action }: { icon: typeof Eye; text: string; action?: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center">
      <Icon className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
      <p className="text-slate-500 dark:text-slate-400 mb-4">{text}</p>
      {action}
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text', dir }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; dir?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} dir={dir}
        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors" />
    </div>
  );
}

function CommissionPreview({ purchasePrice, subscriptionPrice, compact = false }: { purchasePrice: number; subscriptionPrice: number; compact?: boolean }) {
  const purchase = calculateCommissionBreakdown(Math.max(0, purchasePrice));
  const subscription = calculateCommissionBreakdown(Math.max(0, subscriptionPrice));
  const hasPrice = purchase.grossAmount > 0 || subscription.grossAmount > 0;

  if (!hasPrice) return null;

  const line = (label: string, breakdown: ReturnType<typeof calculateCommissionBreakdown>) => (
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
      <span className="font-semibold text-slate-600 dark:text-slate-300">{label}: {formatCurrency(breakdown.grossAmount)}</span>
      <span className="text-slate-500 dark:text-slate-400">عمولة المنصة {breakdown.commissionRate}% = {formatCurrency(breakdown.platformFee)}</span>
      <span className="font-bold text-emerald-700 dark:text-emerald-300">صافي المدرس: {formatCurrency(breakdown.teacherPayout)}</span>
    </div>
  );

  return (
    <div className={`${compact ? 'mt-3' : 'mt-4'} rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-500/30 dark:bg-emerald-900/10`}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">توزيع الإيراد</p>
        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">النسبة الحالية للمنصة: 20%</span>
      </div>
      <div className="space-y-2">
        {purchase.grossAmount > 0 && line('شراء كامل', purchase)}
        {subscription.grossAmount > 0 && line('اشتراك شهري', subscription)}
      </div>
      <p className="mt-3 text-[11px] leading-5 text-slate-500 dark:text-slate-400">هذه معاينة محاسبية قبل أي خصم أو استرجاع. الطالب يدفع السعر الظاهر، والمنصة تحتفظ بنسبة 20%، والباقي مستحق لك.</p>
    </div>
  );
}

function TeacherPlanCard({ name, price, description, features, featured = false, onSelect }: { name: string; price: string; description: string; features: string; featured?: boolean; onSelect: () => void }) {
  return (
    <div className={`rounded-xl border p-4 ${featured ? 'border-amber-300 bg-amber-50/70 dark:border-amber-500/40 dark:bg-amber-900/10' : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/50'}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-black text-slate-800 dark:text-slate-100">{name}</p>
          <p className="mt-1 text-xl font-black text-emerald-700 dark:text-emerald-300">{price}<span className="text-xs font-semibold text-slate-500 dark:text-slate-400"> / شهريًا</span></p>
        </div>
        {featured && <span className="rounded-full bg-amber-200 px-2 py-1 text-[10px] font-black text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">الأكثر قيمة</span>}
      </div>
      <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{description}</p>
      <p className="mt-2 text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">{features}</p>
      <button type="button" onClick={onSelect} className={`mt-3 w-full rounded-lg px-3 py-2 text-xs font-bold transition ${featured ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}>تواصل للتفعيل</button>
    </div>
  );
}

function QuotaBar({ label, used, limit }: { label: string; used: number; limit: number }) {
  const infinite = limit <= 0;
  const pct = usagePercent(used, limit);
  const atLimit = isFreeAtLimit(used, limit);
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
        <span>{label}</span>
        <span className={atLimit ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}>
          {infinite ? 'غير محدود' : `${used} / ${limit}`}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
        <div className={`h-full rounded-full transition-all ${atLimit ? 'bg-rose-500' : 'bg-gradient-to-r from-emerald-500 to-teal-500'}`} style={{ width: `${infinite ? 100 : pct}%` }} />
      </div>
      {atLimit && <p className="mt-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400">وصلت للحد المجاني — قم بالترقية</p>}
    </div>
  );
}


function ServiceQuotaBar({ label, used, limit }: { label: string; used: number; limit: number }) {
  const percentage = Math.min(100, Math.round((used / limit) * 100));
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 dark:border-amber-500/30 dark:bg-amber-900/10">
      <div className="mb-1.5 flex items-center justify-between gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300"><span>{label}</span><span>{used} / {limit}</span></div>
      <div className="h-2 overflow-hidden rounded-full bg-white/80 dark:bg-slate-700"><div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500" style={{ width: `${percentage}%` }} /></div>
      <p className="mt-1.5 text-[10px] text-slate-500 dark:text-slate-400">يتجدد الاستخدام مع بداية كل شهر.</p>
    </div>
  );
}
function TeacherQuickStats({ teacherId, onOpen }: { teacherId: string; onOpen: (t: Tab) => void }) {
  const [stats, setStats] = useState<{ followers: number; questions: number; bookings: number; unread: number } | null>(null);

  useEffect(() => {
    void (async () => {
      const [f, s, b, m] = await Promise.all([
        supabase.from('teacher_follows').select('id', { count: 'exact', head: true }).eq('teacher_id', teacherId),
        supabase.from('teacher_questions').select('id', { count: 'exact', head: true }).eq('teacher_id', teacherId).is('answer', null),
        supabase.from('live_session_bookings').select('id, session_id', { count: 'exact' }).limit(1000),
        supabase.from('messages').select('id', { count: 'exact', head: true }).eq('receiver_id', teacherId).is('read_at', null),
      ]);
      const sids = new Set((b.data ?? []).map((x: { session_id: string }) => x.session_id));
      const mySessions = await supabase.from('scheduled_sessions').select('id').eq('teacher_id', teacherId);
      const my = new Set((mySessions.data ?? []).map((x: { id: string }) => x.id));
      let upcoming = 0;
      for (const id of sids) if (my.has(id)) upcoming++;
      setStats({ followers: f.count ?? 0, questions: s.count ?? 0, bookings: upcoming, unread: m.count ?? 0 });
    })();
  }, [teacherId]);

  const items: Array<{ id: number; label: string; icon: typeof UsersIcon; value: number | string; color: string; go: Tab }> = [
    { id: 1, label: 'متابع للمدرس', icon: UsersIcon, value: stats?.followers ?? '—', color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300', go: 'members' },
    { id: 2, label: 'أسئلة بانتظار إجابة', icon: HelpCircle, value: stats?.questions ?? '—', color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300', go: 'qa' },
    { id: 3, label: 'حجوزات حصص قادمة', icon: CalendarDays, value: stats?.bookings ?? '—', color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300', go: 'sessions' },
    { id: 4, label: 'رسائل غير مقروءة', icon: Mail, value: stats?.unread ?? '—', color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300', go: 'messages' },
  ];

  return (
    <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map((it) => (
        <button key={it.id} onClick={() => onOpen(it.go)} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-right shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700/50" type="button">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${it.color}`}><it.icon className="h-5 w-5" /></div>
          <div><div className="text-xl font-extrabold text-slate-900 dark:text-white">{it.value}</div><div className="text-xs font-semibold text-slate-500 dark:text-slate-400">{it.label}</div></div>
        </button>
      ))}
    </div>
  );
}
