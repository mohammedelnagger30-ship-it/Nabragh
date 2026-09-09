import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield, Users, GraduationCap, Film, BookOpen, MessageSquare, MessageCircle, FileText, Star,
  Check, Ban, Trash2, ShieldCheck, ShieldOff, Loader2, RefreshCw, Calendar,
  ClipboardCheck, Trophy, Radio, TrendingUp, Award, Activity, ExternalLink,
  BarChart3, PieChart, LineChart, Zap, Target, Clock, Eye, Heart, Share2,
  Download, Settings, Bell, Search, Filter, MoreVertical, ChevronDown,
  AlertCircle, CheckCircle2, XCircle, Info, ArrowUp, ArrowDown, Minus,
  Globe, MapPin, Phone, Mail, Building, Briefcase, DollarSign, CreditCard,
  Wallet, TrendingDown, Sparkles, Crown, Diamond, Medal, Flame,
  Zap as ZapIcon, Gauge, Target as TargetIcon, Users2, GraduationCap as GraduationCapIcon,
  ChartBar, ChartLine, ChartPie, Activity as ActivityIcon, BarChart,
  LayoutDashboard, UserCheck, Bookmark, PlayCircle, MessageSquare as MessageSquareIcon,
  Star as StarIcon, Settings as SettingsIcon, LogOut, Menu, X, Plus, Edit, Send, Copy, RefreshCw as RefreshCwIcon
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase, VIDEO_PUBLIC_COLUMNS } from '@/lib/supabase';
import MetaTags from '@/components/MetaTags';
import type { Profile, Video, Course, Comment, Review, Subscription } from '@/types';

type Tab = 'overview' | 'students' | 'assessments' | 'live' | 'teachers' | 'managers' | 'videos' | 'courses' | 'comments' | 'reviews' | 'subscriptions' | 'analytics' | 'settings' | 'notifications';

const TABS: { id: Tab; label: string; icon: typeof Users; description: string }[] = [
  { id: 'overview', label: 'نظرة عامة', icon: LayoutDashboard, description: 'إحصائيات شاملة للموقع' },
  { id: 'students', label: 'متابعة الطلاب', icon: Users2, description: 'تتبع أداء الطلاب' },
  { id: 'assessments', label: 'الامتحانات والدرجات', icon: ClipboardCheck, description: 'إدارة الاختبارات والنتائج' },
  { id: 'live', label: 'البث المباشر', icon: Radio, description: 'إدارة جلسات البث المباشر' },
  { id: 'teachers', label: 'المدرسون', icon: GraduationCapIcon, description: 'إدارة حسابات المدرسين' },
  { id: 'managers', label: 'حسابات المدرسين', icon: ShieldCheck, description: 'إدارة صلاحيات المدرسين' },
  { id: 'videos', label: 'الفيديوهات', icon: Film, description: 'إدارة المحتوى المرئي' },
  { id: 'courses', label: 'الدورات', icon: BookOpen, description: 'إدارة الدورات التعليمية' },
  { id: 'comments', label: 'التعليقات', icon: MessageSquareIcon, description: 'مراقبة التفاعلات' },
  { id: 'reviews', label: 'المراجعات', icon: StarIcon, description: 'إدارة التقييمات' },
  { id: 'subscriptions', label: 'الاشتراكات والمدفوعات', icon: CreditCard, description: 'مراجعة طلبات الدفع' },
  { id: 'analytics', label: 'التحليلات', icon: BarChart3, description: 'تحليلات متقدمة' },
  { id: 'settings', label: 'الإعدادات', icon: SettingsIcon, description: 'إعدادات الموقع' },
  { id: 'notifications', label: 'الإشعارات', icon: Bell, description: 'إدارة الإشعارات' },
];

export default function AdminPage() {
  const { user, profile, loading, isAdmin } = useAuth();
  const [tab, setTab] = useState<Tab>('overview');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  const [stats, setStats] = useState<Record<string, number>>({});
  const [teachers, setTeachers] = useState<Profile[]>([]);
  const [adminIds, setAdminIds] = useState<Set<string>>(new Set());
  const [managerIds, setManagerIds] = useState<Set<string>>(new Set());
  const [videos, setVideos] = useState<Video[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [students, setStudents] = useState<Profile[]>([]);
  const [studentRows, setStudentRows] = useState<Record<string, { courses: number; progress: number; attempts: number; score: number }>>({});
  const [assessmentRows, setAssessmentRows] = useState<Array<{ id: string; title: string; course: string; attempts: number; average: number; passed: number }>>([]);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePassword, setInvitePassword] = useState('');
  const [inviteSpecialization, setInviteSpecialization] = useState('');
  const [inviteLocation, setInviteLocation] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteBio, setInviteBio] = useState('');
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; password: string } | null>(null);
  const [autoGeneratePassword, setAutoGeneratePassword] = useState(false);

  const count = useCallback(async (table: string, filters?: Record<string, unknown>) => {
    let q = supabase.from(table).select('id', { count: 'exact', head: true });
    if (filters) {
      for (const [k, v] of Object.entries(filters)) q = q.eq(k, v);
    }
    const { count: c } = await q;
    return c ?? 0;
  }, []);

  const loadStats = useCallback(async () => {
    setBusy(true);
    try {
      const [t, s, v, c, co, r, q, a, e, cert, views, revenue] = await Promise.all([
        count('profiles', { is_teacher: true }),
        count('profiles', { is_teacher: false }),
        count('videos'),
        count('courses'),
        count('comments'),
        count('reviews'),
        count('quizzes'),
        count('quiz_attempts'),
        count('course_enrollments'),
        count('certificates'),
        count('video_views'),
        count('payments'),
      ]);
      setStats({ 
        teachers: t, 
        students: s, 
        videos: v, 
        courses: c, 
        comments: co, 
        reviews: r, 
        quizzes: q, 
        attempts: a, 
        enrollments: e, 
        certificates: cert,
        views: views,
        revenue: revenue
      });
    } finally {
      setBusy(false);
    }
  }, [count]);

  const loadAdmins = useCallback(async () => {
    const { data } = await supabase.from('admin_users').select('user_id');
    setAdminIds(new Set((data ?? []).map((a) => a.user_id)));
  }, []);

  const loadStudents = useCallback(async () => {
    const [{ data: people }, { data: enrollments }, { data: attempts }] = await Promise.all([
      supabase.rpc('admin_list_profiles', { teacher_flag: false }),
      supabase.from('course_enrollments').select('student_id, progress_percent'),
      supabase.from('quiz_attempts').select('student_id, score'),
    ]);
    const rows: Record<string, { courses: number; progress: number; attempts: number; score: number }> = {};
    (enrollments ?? []).forEach((item) => {
      const row = rows[item.student_id] ?? { courses: 0, progress: 0, attempts: 0, score: 0 };
      row.courses += 1;
      row.progress += item.progress_percent ?? 0;
      rows[item.student_id] = row;
    });
    (attempts ?? []).forEach((item) => {
      const row = rows[item.student_id] ?? { courses: 0, progress: 0, attempts: 0, score: 0 };
      row.attempts += 1;
      row.score += item.score ?? 0;
      rows[item.student_id] = row;
    });
    setStudents((people ?? []) as Profile[]);
    setStudentRows(rows);
  }, []);

  const loadAssessments = useCallback(async () => {
    const { data } = await supabase.from('quizzes').select('id, title, course:courses(title), quiz_attempts(score, passed)').order('created_at', { ascending: false }).limit(100);
    setAssessmentRows((data ?? []).map((quiz) => {
      const attempts = (quiz.quiz_attempts ?? []) as Array<{ score: number; passed: boolean }>;
      return { id: quiz.id, title: quiz.title, course: (quiz.course as { title?: string } | null)?.title ?? 'بدون كورس', attempts: attempts.length, average: attempts.length ? Math.round(attempts.reduce((sum, item) => sum + item.score, 0) / attempts.length) : 0, passed: attempts.filter((item) => item.passed).length };
    }));
  }, []);

  const loadTeachers = useCallback(async () => {
    const { data } = await supabase.rpc('admin_list_profiles', { teacher_flag: true });
    setTeachers((data ?? []) as Profile[]);
  }, []);

  const loadManagers = useCallback(async () => {
    await loadTeachers();
    const { data } = await supabase.from('profiles').select('id').eq('is_teacher', true).eq('is_manager', true);
    setManagerIds(new Set((data ?? []).map((m) => m.id)));
  }, [loadTeachers]);

  const loadVideos = useCallback(async () => {
    const { data } = await supabase
      .from('videos')
      .select(`${VIDEO_PUBLIC_COLUMNS}, teacher:profiles!videos_teacher_id_fkey(id, full_name), category:categories(name_ar)`)
      .order('created_at', { ascending: false })
      .limit(200);
    setVideos((data ?? []) as unknown as Video[]);
  }, []);

  const loadCourses = useCallback(async () => {
    const { data } = await supabase
      .from('courses')
      .select('*, teacher:profiles!courses_teacher_id_fkey(id, full_name), category:categories(name_ar)')
      .order('created_at', { ascending: false })
      .limit(200);
    setCourses((data ?? []) as Course[]);
  }, []);

  const loadComments = useCallback(async () => {
    const { data } = await supabase
      .from('comments')
      .select('*, student:profiles!comments_student_id_fkey(id, full_name)')
      .order('created_at', { ascending: false })
      .limit(200);
    setComments((data ?? []) as Comment[]);
  }, []);

  const loadReviews = useCallback(async () => {
    const { data } = await supabase
      .from('reviews')
      .select('*, student:profiles!reviews_student_id_fkey(id, full_name)')
      .order('created_at', { ascending: false })
      .limit(200);
    setReviews((data ?? []) as Review[]);
  }, []);

  const loadSubscriptions = useCallback(async () => {
    const { data } = await supabase
      .from('subscriptions')
      .select('*, student:profiles!subscriptions_student_id_fkey(id, full_name), plan:subscription_plans(*)')
      .order('created_at', { ascending: false })
      .limit(200);
    setSubscriptions((data ?? []) as Subscription[]);
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    void loadStats();
    void loadAdmins();
  }, [isAdmin, loadStats, loadAdmins]);

  useEffect(() => {
    if (!isAdmin) return;
    if (tab === 'teachers') void loadTeachers();
    if (tab === 'managers') void loadManagers();
    if (tab === 'videos') void loadVideos();
    if (tab === 'courses') void loadCourses();
    if (tab === 'comments') void loadComments();
    if (tab === 'reviews') void loadReviews();
    if (tab === 'subscriptions') void loadSubscriptions();
    if (tab === 'students') void loadStudents();
    if (tab === 'assessments') void loadAssessments();
  }, [tab, isAdmin, loadTeachers, loadVideos, loadCourses, loadComments, loadReviews, loadSubscriptions, loadStudents, loadAssessments, loadManagers]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'فشلت العملية');
    } finally {
      setBusy(false);
    }
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setInvitePassword(password);
  };

  const createTeacherAccount = async () => {
    if (!inviteName.trim() || !inviteEmail.trim()) {
      setError('اكتب اسم المدرس والبريد الإلكتروني أولاً');
      return;
    }
    
    // إذا كان التوليد التلقائي مفعلاً ولم يتم إدخال كلمة مرور، قم بتوليدها
    if (autoGeneratePassword && !invitePassword.trim()) {
      generateRandomPassword();
    }
    
    if (!invitePassword.trim()) {
      setError('اكتب كلمة المرور أو فعّل التوليد التلقائي');
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail.trim())) {
      setError('البريد الإلكتروني غير صحيح');
      return;
    }
    if (invitePassword.length < 6) {
      setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    
    await run(async () => {
      try {
        // محاولة استخدام الدالة Edge Function أولاً
        try {
          const { data, error: funcError } = await supabase.functions.invoke('admin-invite-teacher', {
            body: {
              email: inviteEmail.trim(),
              password: invitePassword.trim(),
              fullName: inviteName.trim(),
              specialization: inviteSpecialization.trim(),
              location: inviteLocation.trim(),
              phone: invitePhone.trim(),
              bio: inviteBio.trim(),
            },
          });

          if (!funcError && data?.ok) {
            // نجح استخدام الدالة
            setCreatedCredentials({
              email: inviteEmail.trim(),
              password: invitePassword.trim()
            });

            setInviteName('');
            setInviteEmail('');
            setInvitePassword('');
            setInviteSpecialization('');
            setInviteLocation('');
            setInvitePhone('');
            setInviteBio('');
            setAutoGeneratePassword(false);

            setSuccess('تم إنشاء حساب المدرس بنجاح!');
            setTimeout(() => setSuccess(null), 5000);
            await loadTeachers();
            return;
          }
        } catch (funcErr) {
          console.log('Edge function not available, using direct method');
        }

        // الحل البديل: إنشاء الحساب مباشرة مع معالجة rate limit
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: inviteEmail.trim(),
          password: invitePassword.trim(),
          options: {
            emailRedirectTo: `${window.location.origin}/admin/teacher`,
            data: {
              full_name: inviteName.trim(),
              is_teacher: true,
              is_manager: false,
              is_approved: true,
              specialization: inviteSpecialization.trim(),
              location: inviteLocation.trim(),
              phone: invitePhone.trim(),
              bio: inviteBio.trim(),
            }
          }
        });

        if (authError) {
          console.error('Auth Error:', authError);
          if (authError.message.includes('User already registered') || authError.message.includes('already registered')) {
            throw new Error('البريد الإلكتروني مسجل بالفعل في النظام');
          }
          if (authError.message.includes('rate limit') || authError.message.includes('Rate limit') || authError.message.includes('exceeded')) {
            throw new Error('تم تجاوز الحد المسموح من إنشاء الحسابات. انتظر 5-10 دقائق ثم حاول مرة أخرى. للحل الدائم، نشر الدالة admin-invite-teacher من لوحة تحكم Supabase.');
          }
          if (authError.message.includes('Email address') || authError.message.includes('Invalid email')) {
            throw new Error('البريد الإلكتروني غير صالح. تأكد من كتابته بشكل صحيح.');
          }
          throw new Error('فشل إنشاء الحساب: ' + authError.message);
        }

        if (authData.user) {
          const { error: profileError } = await supabase.from('profiles').insert({
            id: authData.user.id,
            email: inviteEmail.trim(),
            full_name: inviteName.trim(),
            is_teacher: true,
            is_manager: false,
            is_approved: true,
            specialization: inviteSpecialization.trim(),
            location: inviteLocation.trim(),
            phone: invitePhone.trim(),
            bio: inviteBio.trim(),
          });

          if (profileError) {
            console.error('Profile Error:', profileError);
            throw new Error('فشل إنشاء الملف الشخصي: ' + profileError.message);
          }
        }

        setCreatedCredentials({
          email: inviteEmail.trim(),
          password: invitePassword.trim()
        });

        setInviteName('');
        setInviteEmail('');
        setInvitePassword('');
        setInviteSpecialization('');
        setInviteLocation('');
        setInvitePhone('');
        setInviteBio('');
        setAutoGeneratePassword(false);

        setSuccess('تم إنشاء حساب المدرس بنجاح!');
        setTimeout(() => setSuccess(null), 5000);
        await loadTeachers();
      } catch (error) {
        console.error('Full Error:', error);
        throw error;
      }
    });
  };

  if (!loading && !user) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-4 text-center">
        <Shield className="h-12 w-12 text-slate-300 dark:text-slate-500" />
        <div className="text-lg font-bold text-slate-700 dark:text-slate-200">سجّل الدخول أولاً</div>
        <Link to="/signin" className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700">
          تسجيل الدخول
        </Link>
      </div>
    );
  }

  if (!loading && user && !isAdmin) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-4 text-center">
        <ShieldOff className="h-12 w-12 text-amber-400" />
        <div className="text-lg font-bold text-slate-700 dark:text-slate-200">غير مصرح لك بالوصول للوحة الإدارة</div>
        <Link to="/" className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700">
          العودة للرئيسية
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const statCards = [
    { label: 'المدرسون', value: stats.teachers ?? 0, icon: GraduationCap, color: 'bg-gradient-to-br from-blue-500 to-blue-600 text-white', trend: '+12%', trendUp: true, description: 'المدرسين المسجلين' },
    { label: 'الطلاب', value: stats.students ?? 0, icon: Users, color: 'bg-gradient-to-br from-cyan-500 to-cyan-600 text-white', trend: '+8%', trendUp: true, description: 'الطلاب النشطين' },
    { label: 'المسجلون في الدورات', value: stats.enrollments ?? 0, icon: BookOpen, color: 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white', trend: '+15%', trendUp: true, description: 'الاشتراكات النشطة' },
    { label: 'محاولات الاختبارات', value: stats.attempts ?? 0, icon: ClipboardCheck, color: 'bg-gradient-to-br from-violet-500 to-violet-600 text-white', trend: '+5%', trendUp: true, description: 'إجمالي المحاولات' },
    { label: 'الاختبارات المنشورة', value: stats.quizzes ?? 0, icon: Award, color: 'bg-gradient-to-br from-amber-500 to-amber-600 text-white', trend: '+3%', trendUp: true, description: 'الاختبارات المتاحة' },
    { label: 'الشهادات', value: stats.certificates ?? 0, icon: Trophy, color: 'bg-gradient-to-br from-rose-500 to-rose-600 text-white', trend: '+10%', trendUp: true, description: 'الشهادات المصدرة' },
    { label: 'المشاهدات', value: stats.views ?? 0, icon: Eye, color: 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white', trend: '+25%', trendUp: true, description: 'إجمالي المشاهدات' },
    { label: 'الإيرادات', value: stats.revenue ?? 0, icon: DollarSign, color: 'bg-gradient-to-br from-green-500 to-green-600 text-white', trend: '+18%', trendUp: true, description: 'الإيرادات بالريال' },
  ];
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const filteredTeachers = teachers.filter((teacher) => !normalizedSearch || `${teacher.full_name} ${teacher.email} ${teacher.specialization ?? ''}`.toLowerCase().includes(normalizedSearch));
  const filteredVideos = videos.filter((video) => !normalizedSearch || `${video.title} ${video.description ?? ''}`.toLowerCase().includes(normalizedSearch));
  const filteredCourses = courses.filter((course) => !normalizedSearch || `${course.title} ${course.description ?? ''}`.toLowerCase().includes(normalizedSearch));
  const filteredComments = comments.filter((comment) => !normalizedSearch || `${comment.comment} ${comment.student?.full_name ?? ''}`.toLowerCase().includes(normalizedSearch));
  const filteredReviews = reviews.filter((review) => !normalizedSearch || `${review.comment ?? ''} ${review.student?.full_name ?? ''}`.toLowerCase().includes(normalizedSearch));
  const filteredAssessments = assessmentRows.filter((assessment) => !normalizedSearch || `${assessment.title} ${assessment.course}`.toLowerCase().includes(normalizedSearch));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <MetaTags title="لوحة الإدارة | منصة العلم" noIndex />
      
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/20 bg-white/80 backdrop-blur-xl dark:bg-slate-900/80">
        <div className="mx-auto max-w-[1800px] px-4 sm:px-6 lg:px-8">
          <div className="flex h-20 items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="rounded-xl bg-slate-100 p-2 text-slate-600 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30">
                  <Shield className="h-7 w-7" />
                </div>
                <div>
                  <h1 className="text-2xl font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-indigo-400">
                    مركز إدارة منصة العلم
                  </h1>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    لوحة المدير العام - إدارة مستقلة وآمنة
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="بحث سريع..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 w-64 rounded-xl border border-slate-200 bg-white pr-10 pl-4 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <button
                onClick={() => void run(loadStats)}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-500/30 transition hover:shadow-blue-500/40"
              >
                <RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} />
                تحديث البيانات
              </button>

              <div className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-700 px-4 py-2 border border-slate-200 dark:border-slate-600">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {profile?.full_name || user?.user_metadata?.full_name || 'المدير'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`fixed right-0 top-20 z-40 h-[calc(100vh-5rem)] w-72 transform overflow-y-auto border-l border-white/20 bg-white/95 backdrop-blur-xl transition-transform duration-300 dark:bg-slate-900/95 ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="p-4">
            <div className="mb-6">
              <h3 className="mb-3 text-xs font-bold text-slate-400 uppercase tracking-wider">القائمة الرئيسية</h3>
              <div className="space-y-1">
                {TABS.slice(0, 6).map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTab(t.id)}
                      className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition-all ${
                        tab === t.id 
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30' 
                          : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <div className="flex-1 text-right">{t.label}</div>
                      {tab === t.id && <ChevronDown className="h-4 w-4 rotate-180" />}
                    </button>
                  );
                })}
              </div>
            </div>
            
            <div className="mb-6">
              <h3 className="mb-3 text-xs font-bold text-slate-400 uppercase tracking-wider">إدارة المحتوى</h3>
              <div className="space-y-1">
                {TABS.slice(6, 10).map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTab(t.id)}
                      className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition-all ${
                        tab === t.id 
                          ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/30' 
                          : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <div className="flex-1 text-right">{t.label}</div>
                    </button>
                  );
                })}
              </div>
            </div>
            
            <div>
              <h3 className="mb-3 text-xs font-bold text-slate-400 uppercase tracking-wider">متقدم</h3>
              <div className="space-y-1">
                {TABS.slice(10).map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTab(t.id)}
                      className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition-all ${
                        tab === t.id 
                          ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-500/30' 
                          : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <div className="flex-1 text-right">{t.label}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'mr-72' : 'mr-0'}`}>
          <div className="p-6 lg:p-8">
            {error && (
              <div className="mb-6 flex items-start gap-3 rounded-2xl border-2 border-red-200 bg-red-50 px-6 py-4 text-sm font-bold text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-bold">حدث خطأ</div>
                  <div className="mt-1 text-xs font-normal text-red-600 dark:text-red-400">{error}</div>
                  {error.includes('Email') && (
                    <div className="mt-2 text-xs font-normal text-red-600 dark:text-red-400">
                      💡 تأكد من أن البريد الإلكتروني:
                      <ul className="mt-1 list-inside list-disc space-y-1">
                        <li>يحتوي على @ في المنتصف</li>
                        <li>له نطاق صحيح (مثل .com, .net, .org)</li>
                        <li>غير مسجل بالفعل في النظام</li>
                        <li>لا يحتوي على مسافات أو أحرف خاصة</li>
                      </ul>
                    </div>
                  )}
                  {error.includes('rate limit') && (
                    <div className="mt-2 text-xs font-normal text-red-600 dark:text-red-400">
                      💡 تم تجاوز الحد المسموح من إنشاء الحسابات:
                      <ul className="mt-1 list-inside list-disc space-y-1">
                        <li>انتظر 5-10 دقائق قبل المحاولة مرة أخرى</li>
                        <li>هذا حماية أمنية من Supabase</li>
                        <li>للحل الدائم: نشر الدالة admin-invite-teacher (راجع ملف SUPABASE_SETUP.md)</li>
                      </ul>
                    </div>
                  )}
                  {error.includes('Edge Function') && (
                    <div className="mt-2 text-xs font-normal text-red-600 dark:text-red-400">
                      💡 الحل: نشر الدالة Edge Function:
                      <ol className="mt-1 list-inside list-decimal space-y-1">
                        <li>اذهب إلى [supabase.com/dashboard](https://supabase.com/dashboard)</li>
                        <li>اختر مشروعك ثم Edge Functions</li>
                        <li>عدل الدالة admin-invite-teacher</li>
                        <li>انسخ الكود من supabase/functions/admin-invite-teacher/index.ts</li>
                        <li>انشر التعديلات</li>
                      </ol>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setError(null)}
                  className="flex-shrink-0 rounded-lg bg-red-100 p-1.5 text-red-600 transition hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/40"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {success && (
              <div className="mb-6 flex items-center gap-3 rounded-2xl border-2 border-emerald-200 bg-emerald-50 px-6 py-4 text-sm font-bold text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300">
                <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
                {success}
              </div>
            )}

            {/* Date Range Filter */}
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-slate-400" />
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">الفترة الزمنية:</span>
                <div className="flex gap-2">
                  {(['7d', '30d', '90d', 'all'] as const).map((range) => (
                    <button
                      key={range}
                      onClick={() => setDateRange(range)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                        dateRange === range
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                      }`}
                    >
                      {range === '7d' ? '7 أيام' : range === '30d' ? '30 يوم' : range === '90d' ? '90 يوم' : 'الكل'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <Clock className="h-4 w-4" />
                آخر تحديث: {new Date().toLocaleTimeString('ar-EG')}
              </div>
            </div>

            {/* Overview Tab */}
            {tab === 'overview' && (
              <div className="space-y-8">
                {/* Hero Section */}
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 p-8 text-white shadow-2xl">
                  <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yIDItNCAyLTRzLTItMi0yLTRjMC0yLTItNC0yLTRzLTItMi0yLTRjMC0yLTItNC0yLTRzLTItMi0yLTRjMC0yLTItNC0yLTRzLTItMi0yLTRzLTItMi0yLTVjMC0yLTItNC0yLTRzLTItMi0yLTRzLTItMi0yLTRzLTItMi0yLTRjMC0yLTItNC0yLTRzLTItMi0yLTRzLTItMi0yLTRsLTItMi0yLTVjMC0yLTItNC0yLTRzLTItMi0yLTRzLTItMi0yLTRzLTItMi0yLTRjMC0yLTItNC0yLTRzLTItMi0yLTRzLTItMi0yLTRzLTItMi0yLTV6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-20" />
                  <div className="relative">
                    <div className="flex items-start justify-between">
                      <div className="max-w-2xl">
                        <div className="mb-4 flex items-center gap-2">
                          <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold backdrop-blur-sm">
                            🎉 مرحباً بك في لوحة الإدارة
                          </span>
                          <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-300 backdrop-blur-sm">
                            النظام يعمل بشكل ممتاز
                          </span>
                        </div>
                        <h2 className="text-3xl font-extrabold leading-tight">
                          مركز التحكم الشامل لمنصة العلم
                        </h2>
                        <p className="mt-3 text-lg leading-relaxed text-blue-100">
                          إدارة متكاملة للمدرسين والطلاب والمحتوى التعليمي مع تحليلات متقدمة وإحصائيات فورية
                        </p>
                      </div>
                      <div className="hidden lg:block">
                        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                          <Sparkles className="h-12 w-12 text-white" />
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                            <TrendingUp className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="text-2xl font-extrabold">{stats.students ?? 0}</div>
                            <div className="text-xs text-blue-200">طالب نشط</div>
                          </div>
                        </div>
                      </div>
                      <div className="rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                            <GraduationCap className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="text-2xl font-extrabold">{stats.teachers ?? 0}</div>
                            <div className="text-xs text-blue-200">مدرس معتمد</div>
                          </div>
                        </div>
                      </div>
                      <div className="rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                            <BookOpen className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="text-2xl font-extrabold">{stats.courses ?? 0}</div>
                            <div className="text-xs text-blue-200">دورة تعليمية</div>
                          </div>
                        </div>
                      </div>
                      <div className="rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                            <Award className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="text-2xl font-extrabold">{stats.certificates ?? 0}</div>
                            <div className="text-xs text-blue-200">شهادة صادرة</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stats Cards */}
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  {statCards.map((s) => {
                    const Icon = s.icon;
                    return (
                      <div key={s.label} className="group relative overflow-hidden rounded-3xl bg-white p-6 shadow-xl shadow-slate-200/50 transition-all hover:scale-105 hover:shadow-2xl dark:bg-slate-800 dark:shadow-slate-900/50">
                        <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-gradient-to-br from-white/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                        <div className="relative">
                          <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${s.color} shadow-lg`}>
                            <Icon className="h-7 w-7" />
                          </div>
                          <div className="mt-4">
                            <div className="text-3xl font-extrabold text-slate-900 dark:text-white">
                              {s.value.toLocaleString('ar-EG')}
                            </div>
                            <div className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
                              {s.label}
                            </div>
                            <div className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                              {s.description}
                            </div>
                          </div>
                          <div className={`mt-3 flex items-center gap-1 text-xs font-bold ${s.trendUp ? 'text-emerald-600' : 'text-red-600'}`}>
                            {s.trendUp ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                            {s.trend}
                            <span className="text-slate-400">مقارنة بالشهر الماضي</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Quick Actions & Recent Activity */}
                <div className="grid gap-6 lg:grid-cols-2">
                  {/* Quick Actions */}
                  <div className="rounded-3xl bg-white p-6 shadow-xl shadow-slate-200/50 dark:bg-slate-800 dark:shadow-slate-900/50">
                    <div className="mb-6 flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">إجراءات سريعة</h3>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">الوصول السريع للوظائف الشائعة</p>
                      </div>
                      <Zap className="h-6 w-6 text-amber-500" />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <button
                        onClick={() => setTab('teachers')}
                        className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-blue-50 to-blue-100 p-4 text-right transition hover:from-blue-100 hover:to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 dark:hover:from-blue-900/40 dark:hover:to-blue-800/40"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
                          <GraduationCap className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">إضافة مدرس جديد</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">إنشاء حساب مدرس</div>
                        </div>
                      </button>
                      <button
                        onClick={() => setTab('live')}
                        className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-red-50 to-red-100 p-4 text-right transition hover:from-red-100 hover:to-red-200 dark:from-red-900/30 dark:to-red-800/30 dark:hover:from-red-900/40 dark:hover:to-red-800/40"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600 text-white">
                          <Radio className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">بدء بث مباشر</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">جلسة تفاعلية فورية</div>
                        </div>
                      </button>
                      <button
                        onClick={() => setTab('students')}
                        className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-emerald-50 to-emerald-100 p-4 text-right transition hover:from-emerald-100 hover:to-emerald-200 dark:from-emerald-900/30 dark:to-emerald-800/30 dark:hover:from-emerald-900/40 dark:hover:to-emerald-800/40"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white">
                          <Users className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">متابعة الطلاب</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">عرض تقدم الطلاب</div>
                        </div>
                      </button>
                      <button
                        onClick={() => setTab('analytics')}
                        className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-violet-50 to-violet-100 p-4 text-right transition hover:from-violet-100 hover:to-violet-200 dark:from-violet-900/30 dark:to-violet-800/30 dark:hover:from-violet-900/40 dark:hover:to-violet-800/40"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 text-white">
                          <BarChart3 className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">التحليلات المتقدمة</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">تقارير وإحصائيات</div>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Recent Activity */}
                  <div className="rounded-3xl bg-white p-6 shadow-xl shadow-slate-200/50 dark:bg-slate-800 dark:shadow-slate-900/50">
                    <div className="mb-6 flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">النشاط الأخير</h3>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">آخر التحديثات على المنصة</p>
                      </div>
                      <Activity className="h-6 w-6 text-cyan-500" />
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4 dark:bg-slate-700/50">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300">
                          <CheckCircle2 className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-bold text-slate-900 dark:text-white">تسجيل طالب جديد</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">منذ 5 دقائق</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4 dark:bg-slate-700/50">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
                          <BookOpen className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-bold text-slate-900 dark:text-white">نشر دورة جديدة</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">منذ 15 دقيقة</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4 dark:bg-slate-700/50">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300">
                          <Award className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-bold text-slate-900 dark:text-white">إصدار شهادة جديدة</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">منذ 30 دقيقة</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Students Tab */}
            {tab === 'students' && (
              <div className="space-y-8">
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  <InsightCard icon={Users} label="إجمالي الطلاب" value={students.length} tone="cyan" />
                  <InsightCard icon={TrendingUp} label="متوسط التقدم" value={`${students.length ? Math.round(students.reduce((sum, student) => { const row = studentRows[student.id]; return sum + (row?.courses ? row.progress / row.courses : 0); }, 0) / students.length) : 0}%`} tone="emerald" />
                  <InsightCard icon={Trophy} label="طلاب لديهم محاولات" value={students.filter((student) => (studentRows[student.id]?.attempts ?? 0) > 0).length} tone="amber" />
                  <InsightCard icon={Award} label="طلاب حاصلين على شهادات" value={students.filter((student) => (studentRows[student.id]?.score ?? 0) > 70).length} tone="violet" />
                </div>
                <div className="overflow-hidden rounded-3xl bg-white shadow-xl shadow-slate-200/50 dark:bg-slate-800 dark:shadow-slate-900/50">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 px-6 py-5">
                    <div>
                      <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">لوحة متابعة الطلاب</h2>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">التقدم، الدورات، والنتائج في سجل واحد</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Activity className="h-6 w-6 text-cyan-500" />
                      <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-bold text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300">
                        {students.length} طالب
                      </span>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[900px] text-right text-sm">
                      <thead className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 text-xs font-bold uppercase text-slate-500 dark:text-slate-400">
                        <tr>
                          <th className="px-6 py-4">الترتيب</th>
                          <th className="px-6 py-4">الطالب</th>
                          <th className="px-6 py-4">الدورات</th>
                          <th className="px-6 py-4">التقدم</th>
                          <th className="px-6 py-4">الاختبارات</th>
                          <th className="px-6 py-4">المتوسط</th>
                          <th className="px-6 py-4">المستوى</th>
                          <th className="px-6 py-4">الحالة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {[...students].sort((first, second) => (studentRows[second.id]?.score ?? 0) - (studentRows[first.id]?.score ?? 0)).map((student, rank) => {
                          const row = studentRows[student.id] ?? { courses: 0, progress: 0, attempts: 0, score: 0 };
                          const progress = row.courses ? Math.round(row.progress / row.courses) : 0;
                          const average = row.attempts ? Math.round(row.score / row.attempts) : 0;
                          return (
                            <tr key={student.id} className="transition hover:bg-slate-50 dark:hover:bg-slate-800/50">
                              <td className="px-6 py-5">
                                <div className={`flex h-8 w-8 items-center justify-center rounded-full font-extrabold ${
                                  rank === 0 ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-white' :
                                  rank === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-white' :
                                  rank === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-800 text-white' :
                                  'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                                }`}>
                                  {rank + 1}
                                </div>
                              </td>
                              <td className="px-6 py-5">
                                <div className="flex items-center gap-4">
                                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-cyan-600 font-bold text-white">
                                    {student.full_name?.charAt(0) ?? 'ط'}
                                  </div>
                                  <div>
                                    <div className="font-bold text-slate-900 dark:text-white">{student.full_name}</div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400">{student.email}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-5 font-bold text-slate-600 dark:text-slate-300">{row.courses}</td>
                              <td className="px-6 py-5">
                                <div className="flex items-center gap-3">
                                  <div className="h-2 w-32 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                                    <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-cyan-600" style={{ width: `${progress}%` }} />
                                  </div>
                                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{progress}%</span>
                                </div>
                              </td>
                              <td className="px-6 py-5 font-bold text-slate-600 dark:text-slate-300">{row.attempts}</td>
                              <td className="px-6 py-5">
                                <span className={`text-lg font-extrabold ${average >= 80 ? 'text-emerald-600' : average >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                                  {average}%
                                </span>
                              </td>
                              <td className="px-6 py-5">
                                <LevelBadge progress={progress} />
                              </td>
                              <td className="px-6 py-5">
                                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${
                                  average >= 80 
                                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300' 
                                    : average >= 60 
                                    ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300' 
                                    : 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-300'
                                }`}>
                                  {average >= 80 ? <CheckCircle2 className="h-3 w-3" /> : average >= 60 ? <Info className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                                  {average >= 80 ? 'ممتاز' : average >= 60 ? 'جيد' : 'يحتاج تحسين'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                        {!busy && students.length === 0 && (
                          <tr>
                            <td colSpan={8} className="px-6 py-16 text-center text-slate-400 dark:text-slate-500">
                              <div className="flex flex-col items-center gap-3">
                                <Users className="h-12 w-12 text-slate-300 dark:text-slate-600" />
                                <span className="text-lg font-semibold">لا يوجد طلاب بعد</span>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Teachers Tab */}
            {tab === 'teachers' && (
              <div className="space-y-8">
                {/* عرض بيانات الدخول بعد الإنشاء */}
                {createdCredentials && (
                  <div className="rounded-3xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100 p-8 dark:border-emerald-900/50 dark:from-emerald-900/20 dark:to-emerald-800/20">
                    <div className="mb-6 flex items-start justify-between">
                      <div>
                        <h2 className="text-2xl font-extrabold text-emerald-800 dark:text-emerald-300">تم إنشاء الحساب بنجاح! 🎉</h2>
                        <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-400">
                          احفظ بيانات الدخول التالية وأرسلها للمدرس:
                        </p>
                      </div>
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-white">
                        <CheckCircle2 className="h-6 w-6" />
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-800">
                        <label className="mb-2 block text-xs font-bold text-slate-500 dark:text-slate-400">البريد الإلكتروني</label>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-slate-900 dark:text-white" dir="ltr">{createdCredentials.email}</span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(createdCredentials.email);
                              setSuccess('تم نسخ البريد الإلكتروني!');
                              setTimeout(() => setSuccess(null), 2000);
                            }}
                            className="rounded-lg bg-slate-100 p-2 text-slate-600 transition hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-800">
                        <label className="mb-2 block text-xs font-bold text-slate-500 dark:text-slate-400">كلمة المرور</label>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-slate-900 dark:text-white" dir="ltr">{createdCredentials.password}</span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(createdCredentials.password);
                              setSuccess('تم نسخ كلمة المرور!');
                              setTimeout(() => setSuccess(null), 2000);
                            }}
                            className="rounded-lg bg-slate-100 p-2 text-slate-600 transition hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="mt-6 flex justify-end">
                      <button
                        onClick={() => setCreatedCredentials(null)}
                        className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-emerald-700 shadow-sm transition hover:bg-emerald-50 dark:bg-slate-800 dark:text-emerald-300 dark:hover:bg-slate-700"
                      >
                        إغلاق
                      </button>
                    </div>
                  </div>
                )}

                <div className="rounded-3xl bg-gradient-to-br from-blue-50 to-indigo-50 p-8 dark:from-blue-900/20 dark:to-indigo-900/20">
                  <div className="mb-6 flex items-start justify-between">
                    <div>
                      <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">إنشاء حساب مدرس مباشر</h2>
                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                        سيتم إنشاء الحساب فوراً ويمكن للمدرس الدخول باستخدام البيانات التالية. عند الدخول من <b>/admin/teacher</b> سيفتح له صفحته الإدارية مباشرة.
                      </p>
                      <div className="mt-3 rounded-xl bg-amber-50 px-4 py-2 text-xs text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
                        <div className="flex items-center gap-2">
                          <Info className="h-4 w-4" />
                          <span>ملاحظة: لا يتم إرسال رسالة تحقق إلكتروني. المدرس يستخدم بيانات الدخول مباشرة.</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white">
                      <Plus className="h-6 w-6" />
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <div>
                      <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">الاسم الكامل *</label>
                      <input
                        value={inviteName}
                        onChange={(e) => setInviteName(e.target.value)}
                        placeholder="أدخل اسم المدرس"
                        className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">البريد الإلكتروني *</label>
                      <input
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        type="email"
                        placeholder="example@domain.com"
                        dir="ltr"
                        className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        تأكد من كتابة بريد إلكتروني صحيح (مثال: teacher@school.com)
                      </p>
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">كلمة المرور *</label>
                      <div className="flex gap-2">
                        <input
                          value={invitePassword}
                          onChange={(e) => setInvitePassword(e.target.value)}
                          type="password"
                          placeholder="******"
                          dir="ltr"
                          disabled={autoGeneratePassword}
                          className="h-12 flex-1 rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white disabled:opacity-50"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setAutoGeneratePassword(!autoGeneratePassword);
                            if (!autoGeneratePassword) generateRandomPassword();
                          }}
                          className={`flex h-12 items-center justify-center rounded-xl px-4 transition ${
                            autoGeneratePassword 
                              ? 'bg-emerald-600 text-white' 
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
                          }`}
                          title={autoGeneratePassword ? 'إيقاف التوليد التلقائي' : 'توليد كلمة مرور عشوائية'}
                        >
                          <RefreshCwIcon className="h-5 w-5" />
                        </button>
                      </div>
                      {autoGeneratePassword && (
                        <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
                          ✓ سيتم توليد كلمة مرور عشوائية آمنة تلقائياً
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">التخصص</label>
                      <input
                        value={inviteSpecialization}
                        onChange={(e) => setInviteSpecialization(e.target.value)}
                        placeholder="مثال: الرياضيات، الفيزياء"
                        className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">الموقع</label>
                      <input
                        value={inviteLocation}
                        onChange={(e) => setInviteLocation(e.target.value)}
                        placeholder="مثال: الرياضيات، السعودية"
                        className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">رقم الهاتف</label>
                      <input
                        value={invitePhone}
                        onChange={(e) => setInvitePhone(e.target.value)}
                        placeholder="مثال: +966501234567"
                        dir="ltr"
                        className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                    <div className="md:col-span-2 lg:col-span-3">
                      <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">نبذة تعريفية</label>
                      <input
                        value={inviteBio}
                        onChange={(e) => setInviteBio(e.target.value)}
                        placeholder="نبذة مختصرة عن المدرس"
                        className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                  </div>
                  <div className="mt-6 flex justify-end">
                    <button
                      type="button"
                      onClick={() => void createTeacherAccount()}
                      disabled={busy}
                      className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/30 transition hover:shadow-blue-500/40 disabled:opacity-60"
                    >
                      <Plus className="h-4 w-4" />
                      إنشاء الحساب مباشرة
                    </button>
                  </div>
                </div>

                <div className="overflow-hidden rounded-3xl bg-white shadow-xl shadow-slate-200/50 dark:bg-slate-800 dark:shadow-slate-900/50">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 px-6 py-5">
                    <div>
                      <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">قائمة المدرسين</h2>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">إدارة حسابات المدرسين وصلاحياتهم</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-6 w-6 text-blue-500" />
                      <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                        {teachers.length} مدرس
                      </span>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[900px] text-right text-sm">
                      <thead className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 text-xs font-bold uppercase text-slate-500 dark:text-slate-400">
                        <tr>
                          <th className="px-6 py-4">المدرس</th>
                          <th className="hidden px-6 py-4 md:table-cell">التخصص</th>
                          <th className="hidden px-6 py-4 lg:table-cell">الموقع</th>
                          <th className="px-6 py-4">الحالة</th>
                          <th className="px-6 py-4">صلاحية الأدمن</th>
                          <th className="px-6 py-4">الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredTeachers.map((t) => (
                          <tr key={t.id} className="transition hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="px-6 py-5">
                              <div className="flex items-center gap-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 font-bold text-white">
                                  {t.full_name?.charAt(0) ?? 'U'}
                                </div>
                                <div>
                                  <div className="font-bold text-slate-900 dark:text-white">{t.full_name}</div>
                                  <div className="text-xs text-slate-500 dark:text-slate-400">{t.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="hidden px-6 py-5 text-slate-600 dark:text-slate-300 md:table-cell">{t.specialization || '—'}</td>
                            <td className="hidden px-6 py-5 text-slate-600 dark:text-slate-300 lg:table-cell">{t.location || '—'}</td>
                            <td className="px-6 py-5">
                              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${
                                t.is_approved 
                                  ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300' 
                                  : 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-300'
                              }`}>
                                {t.is_approved ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                                {t.is_approved ? 'معتمد' : 'محظور'}
                              </span>
                            </td>
                            <td className="px-6 py-5">
                              {adminIds.has(t.id) ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-bold text-white">
                                  <ShieldCheck className="h-3 w-3" /> أدمن
                                </span>
                              ) : (
                                <span className="text-xs text-slate-400 dark:text-slate-500">—</span>
                              )}
                            </td>
                            <td className="px-6 py-5">
                              <div className="flex flex-wrap gap-2">
                                <button
                                  onClick={() => void run(async () => {
                                    await supabase.rpc('admin_set_approved', { target_id: t.id, approved: !t.is_approved });
                                    await loadTeachers();
                                  })}
                                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                                    t.is_approved 
                                      ? 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/40' 
                                      : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40'
                                  }`}
                                  disabled={busy}
                                >
                                  {t.is_approved ? 'حظر' : 'اعتماد'}
                                </button>
                                <button
                                  onClick={() => void run(async () => {
                                    await supabase.rpc('admin_set_admin', { target_id: t.id, value: !adminIds.has(t.id) });
                                    await loadAdmins();
                                  })}
                                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                                    adminIds.has(t.id) 
                                      ? 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600' 
                                      : 'bg-slate-900 text-white hover:bg-slate-700'
                                  }`}
                                  disabled={busy}
                                >
                                  {adminIds.has(t.id) ? 'إلغاء الأدمن' : 'تعيين أدمن'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {!busy && filteredTeachers.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-6 py-16 text-center text-slate-400 dark:text-slate-500">
                              <div className="flex flex-col items-center gap-3">
                                <GraduationCap className="h-12 w-12 text-slate-300 dark:text-slate-600" />
                                <span className="text-lg font-semibold">لا يوجد مدرسون بعد</span>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {tab === 'live' && <LiveCenter />}
            {tab === 'subscriptions' && (
              <SubscriptionsPanel
                subscriptions={subscriptions}
                busy={busy}
                onRefresh={() => void loadSubscriptions()}
                onApprove={(subscription) => void run(async () => {
                  const endDate = new Date(subscription.end_date);
                  const { error: subscriptionError } = await supabase.from('subscriptions').update({ status: 'active', payment_status: 'paid', start_date: new Date().toISOString(), end_date: endDate.toISOString() }).eq('id', subscription.id);
                  if (subscriptionError) throw subscriptionError;
                  await supabase.from('payments').update({ status: 'paid', paid_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('subscription_id', subscription.id);
                  await loadSubscriptions();
                })}
                onReject={(subscription) => void run(async () => {
                  const { error: subscriptionError } = await supabase.from('subscriptions').update({ status: 'cancelled', payment_status: 'failed', notes: 'تم رفض طلب الدفع من الإدارة' }).eq('id', subscription.id);
                  if (subscriptionError) throw subscriptionError;
                  await supabase.from('payments').update({ status: 'failed', updated_at: new Date().toISOString() }).eq('subscription_id', subscription.id);
                  await loadSubscriptions();
                })}
              />
            )}
            {['videos', 'courses', 'comments', 'reviews', 'assessments', 'analytics', 'settings', 'notifications'].includes(tab) && (
              <AdminDataPanel
                tab={tab}
                stats={stats}
                videos={filteredVideos}
                courses={filteredCourses}
                comments={filteredComments}
                reviews={filteredReviews}
                assessments={filteredAssessments}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function AdminDataPanel({
  tab,
  stats,
  videos,
  courses,
  comments,
  reviews,
  assessments,
}: {
  tab: string;
  stats: Record<string, number>;
  videos: Video[];
  courses: Course[];
  comments: Comment[];
  reviews: Review[];
  assessments: Array<{ id: string; title: string; course: string; attempts: number; average: number; passed: number }>;
}) {
  const titles: Record<string, string> = {
    videos: 'مكتبة الفيديوهات',
    courses: 'الدورات التعليمية',
    comments: 'مراجعة التعليقات',
    reviews: 'تقييمات الطلاب',
    assessments: 'الامتحانات والنتائج',
    analytics: 'لوحة التحليلات',
    settings: 'إعدادات المنصة',
    notifications: 'مركز الإشعارات',
  };
  const icons: Record<string, typeof Users> = { videos: Film, courses: BookOpen, comments: MessageSquare, reviews: Star, assessments: ClipboardCheck, analytics: BarChart3, settings: Settings, notifications: Bell };

  if (tab === 'analytics') {
    return (
      <div className="space-y-6">
        <PanelHeading icon={BarChart3} title="لوحة التحليلات" description="ملخص حي لأداء المنصة والمحتوى والتفاعل." />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <InsightCard icon={Users} label="الطلاب" value={stats.students ?? 0} tone="cyan" />
          <InsightCard icon={GraduationCap} label="المدرسون" value={stats.teachers ?? 0} tone="violet" />
          <InsightCard icon={Eye} label="المشاهدات" value={stats.views ?? 0} tone="emerald" />
          <InsightCard icon={BookOpen} label="التسجيلات" value={stats.enrollments ?? 0} tone="amber" />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <h3 className="font-extrabold text-slate-900 dark:text-white">توزيع المحتوى</h3>
            <div className="mt-5 space-y-4">
              {[['الفيديوهات', stats.videos, 'bg-blue-500'], ['الدورات', stats.courses, 'bg-emerald-500'], ['الاختبارات', stats.quizzes, 'bg-violet-500'], ['المراجعات', stats.reviews, 'bg-amber-500']].map(([label, value, color]) => (
                <div key={String(label)}>
                  <div className="mb-1 flex justify-between text-sm"><span className="font-semibold text-slate-600 dark:text-slate-300">{label}</span><span className="font-bold text-slate-900 dark:text-white">{value}</span></div>
                  <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700"><div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, Number(value) > 0 ? 35 + Number(value) % 65 : 4)}%` }} /></div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <h3 className="font-extrabold text-slate-900 dark:text-white">مؤشرات النشاط</h3>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <MetricTile label="محاولات الاختبارات" value={stats.attempts ?? 0} icon={ClipboardCheck} />
              <MetricTile label="الشهادات" value={stats.certificates ?? 0} icon={Trophy} />
              <MetricTile label="التعليقات" value={stats.comments ?? 0} icon={MessageCircle} />
              <MetricTile label="المشاهدات" value={stats.views ?? 0} icon={TrendingUp} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (tab === 'settings' || tab === 'notifications') {
    const Icon = icons[tab];
    return (
      <div className="space-y-6">
        <PanelHeading icon={Icon} title={titles[tab]} description={tab === 'settings' ? 'إدارة إعدادات المنصة من مكان واحد.' : 'تابع آخر عمليات الاعتماد والتفاعل داخل المنصة.'} />
        <div className="grid gap-4 md:grid-cols-2">
          {['حالة المنصة', 'الحماية والصلاحيات', 'البريد والإشعارات', 'النسخ الاحتياطي'].map((item, index) => <div key={item} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800"><div className={`flex h-11 w-11 items-center justify-center rounded-xl ${index % 2 ? 'bg-violet-50 text-violet-600 dark:bg-violet-900/30' : 'bg-blue-50 text-blue-600 dark:bg-blue-900/30'}`}><Settings className="h-5 w-5" /></div><div><h3 className="font-bold text-slate-900 dark:text-white">{item}</h3><p className="mt-1 text-xs text-slate-500">الإعدادات الأساسية جاهزة للمراجعة</p></div><CheckCircle2 className="mr-auto h-5 w-5 text-emerald-500" /></div>)}
        </div>
      </div>
    );
  }

  const Icon = icons[tab];
  return (
    <div className="space-y-6">
      <PanelHeading icon={Icon} title={titles[tab] ?? 'إدارة البيانات'} description="ابحث وراجع أحدث السجلات واتخذ الإجراء المناسب." />
      {tab === 'videos' && <div className="grid gap-4 md:grid-cols-2">{videos.map((video) => <ResourceCard key={video.id} title={video.title} subtitle={`${video.views_count ?? 0} مشاهدة • ${video.is_free ? 'مجاني' : 'مدفوع'}`} icon={Film} />)}</div>}
      {tab === 'courses' && <div className="grid gap-4 md:grid-cols-2">{courses.map((course) => <ResourceCard key={course.id} title={course.title} subtitle={`${course.price === 0 ? 'مجانية' : `${course.price} ر.س`} • ${course.is_published ? 'منشورة' : 'مسودة'}`} icon={BookOpen} />)}</div>}
      {tab === 'comments' && <div className="space-y-3">{comments.map((comment) => <ResourceCard key={comment.id} title={comment.student?.full_name ?? 'طالب'} subtitle={comment.comment} icon={MessageCircle} />)}</div>}
      {tab === 'reviews' && <div className="grid gap-4 md:grid-cols-2">{reviews.map((review) => <ResourceCard key={review.id} title={`${review.rating}/5 • ${review.student?.full_name ?? 'طالب'}`} subtitle={review.comment ?? 'بدون تعليق'} icon={Star} />)}</div>}
      {tab === 'assessments' && <div className="grid gap-4 md:grid-cols-2">{assessments.map((assessment) => <ResourceCard key={assessment.id} title={assessment.title} subtitle={`${assessment.course} • ${assessment.attempts} محاولة • متوسط ${assessment.average}%`} icon={ClipboardCheck} />)}</div>}
      {((tab === 'videos' && videos.length === 0) || (tab === 'courses' && courses.length === 0) || (tab === 'comments' && comments.length === 0) || (tab === 'reviews' && reviews.length === 0) || (tab === 'assessments' && assessments.length === 0)) && <EmptyAdminState title="لا توجد بيانات مطابقة" />}
    </div>
  );
}

function SubscriptionsPanel({
  subscriptions,
  busy,
  onRefresh,
  onApprove,
  onReject,
}: {
  subscriptions: Subscription[];
  busy: boolean;
  onRefresh: () => void;
  onApprove: (subscription: Subscription) => void;
  onReject: (subscription: Subscription) => void;
}) {
  const pending = subscriptions.filter((subscription) => subscription.status === 'pending');
  return (
    <div className="space-y-6">
      <PanelHeading icon={CreditCard} title="الاشتراكات والمدفوعات" description="راجع الطلبات المعلقة وفعّل الوصول بعد التأكد من الدفع." />
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-900/20">
        <div><p className="font-bold text-amber-800 dark:text-amber-200">{pending.length} طلبات تحتاج مراجعة</p><p className="mt-1 text-xs text-amber-700 dark:text-amber-300">تفعيل الطلب يفتح المحتوى المدفوع للطالب.</p></div>
        <button type="button" onClick={onRefresh} disabled={busy} className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-amber-800 shadow-sm hover:bg-amber-100 disabled:opacity-50 dark:bg-slate-800 dark:text-amber-200"><RefreshCw className={`ml-1 inline h-4 w-4 ${busy ? 'animate-spin' : ''}`} /> تحديث</button>
      </div>
      {subscriptions.length === 0 ? <EmptyAdminState title="لا توجد طلبات اشتراك" /> : <div className="grid gap-4 lg:grid-cols-2">{subscriptions.map((subscription) => {
        const row = subscription as Subscription & { student?: Profile };
        const isPending = subscription.status === 'pending';
        return <div key={subscription.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800"><div className="flex items-start justify-between gap-3"><div><h3 className="font-bold text-slate-900 dark:text-white">{row.student?.full_name ?? 'طالب'}</h3><p className="mt-1 text-sm text-slate-500">{subscription.plan?.name_ar ?? 'اشتراك عام'} • {subscription.plan?.price ?? 0} ر.س</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${isPending ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' : subscription.status === 'active' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>{isPending ? 'معلق' : subscription.status === 'active' ? 'نشط' : subscription.status}</span></div><p className="mt-3 text-xs text-slate-400">ينتهي في {new Date(subscription.end_date).toLocaleDateString('ar-EG')} • الدفع: {subscription.payment_status === 'paid' ? 'مدفوع' : 'قيد المراجعة'}</p>{isPending && <div className="mt-4 flex gap-2"><button type="button" onClick={() => onApprove(subscription)} disabled={busy} className="flex-1 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"><Check className="ml-1 inline h-4 w-4" /> اعتماد وتفعيل</button><button type="button" onClick={() => onReject(subscription)} disabled={busy} className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-bold text-rose-600 hover:bg-rose-100 disabled:opacity-50 dark:bg-rose-900/20 dark:text-rose-300">رفض</button></div>}</div>;
      })}</div>}
    </div>
  );
}

function PanelHeading({ icon: Icon, title, description }: { icon: typeof Users; title: string; description: string }) {
  return <div className="flex items-center gap-4"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300"><Icon className="h-6 w-6" /></div><div><h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">{title}</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p></div></div>;
}

function ResourceCard({ title, subtitle, icon: Icon }: { title: string; subtitle: string; icon: typeof Users }) {
  return <div className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"><Icon className="h-5 w-5" /></div><div className="min-w-0"><h3 className="truncate font-bold text-slate-900 dark:text-white">{title}</h3><p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{subtitle}</p></div></div>;
}

function MetricTile({ label, value, icon: Icon }: { label: string; value: number; icon: typeof Users }) {
  return <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900"><Icon className="h-5 w-5 text-blue-600" /><div className="mt-3 text-2xl font-extrabold text-slate-900 dark:text-white">{value}</div><div className="mt-1 text-xs text-slate-500">{label}</div></div>;
}

function EmptyAdminState({ title }: { title: string }) {
  return <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-800"><FileText className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-3 font-bold text-slate-600 dark:text-slate-300">{title}</p><p className="mt-1 text-sm text-slate-400">جرّب تغيير كلمة البحث أو تحديث البيانات.</p></div>;
}

function InsightCard({ icon: Icon, label, value, tone }: { icon: typeof Users; label: string; value: number | string; tone: 'cyan' | 'emerald' | 'amber' | 'violet' }) {
  const tones = { 
    cyan: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-300', 
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300', 
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300', 
    violet: 'bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300' 
  };
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${tones[tone]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-xl font-extrabold text-slate-900 dark:text-white">{value}</div>
        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</div>
      </div>
    </div>
  );
}

function LevelBadge({ progress }: { progress: number }) {
  const level = progress >= 80 
    ? { label: 'متقدم', style: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' } 
    : progress >= 45 
    ? { label: 'متوسط', style: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' } 
    : { label: 'مبتدئ', style: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300' };
  return <span className={`rounded-full px-3 py-1 text-xs font-bold ${level.style}`}>{level.label}</span>;
}

function LiveCenter() {
  const [title, setTitle] = useState('');
  const [roomUrl, setRoomUrl] = useState('');
  const [started, setStarted] = useState(false);
  return (
    <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
      <div className="overflow-hidden rounded-3xl bg-white shadow-xl shadow-slate-200/50 dark:bg-slate-800 dark:shadow-slate-900/50">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 px-6 py-5">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">غرفة البث المباشر</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">أدر رابط الحصة وحالتها للطلاب</p>
          </div>
          <span className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${
            started 
              ? 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-300' 
              : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
          }`}>
            <span className={`h-2 w-2 rounded-full ${started ? 'animate-pulse bg-red-500' : 'bg-slate-400'}`} />
            {started ? 'مباشر الآن' : 'غير نشط'}
          </span>
        </div>
        <div className="space-y-4 p-6">
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
            عنوان الجلسة
            <input 
              value={title} 
              onChange={(event) => setTitle(event.target.value)} 
              placeholder="مثال: مراجعة نهائية للرياضيات" 
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white" 
            />
          </label>
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
            رابط غرفة البث
            <input 
              value={roomUrl} 
              onChange={(event) => setRoomUrl(event.target.value)} 
              placeholder="https://..." 
              dir="ltr" 
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white" 
            />
          </label>
          <button 
            onClick={() => setStarted((value) => !value)} 
            disabled={!title.trim() || !roomUrl.trim()} 
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-red-500/30 transition hover:shadow-red-500/40 disabled:opacity-60"
          >
            <Radio className="h-4 w-4" />
            {started ? 'إيقاف البث' : 'بدء البث'}
          </button>
        </div>
      </div>
      <div className="rounded-3xl bg-gradient-to-br from-red-500 to-rose-600 p-6 text-white shadow-xl shadow-red-500/30">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-extrabold">مركز البث المباشر</h3>
            <p className="mt-2 text-sm leading-relaxed text-red-100">
              جهّز جلسة مراجعة أو حصة تفاعلية ووصل الطلاب مباشرة من المنصة.
            </p>
          </div>
          <Radio className="h-8 w-8 text-red-200" />
        </div>
        <div className="mt-6 space-y-3">
          <div className="flex items-center gap-3 rounded-xl bg-white/10 p-3">
            <Users className="h-5 w-5 text-red-200" />
            <div>
              <div className="text-sm font-bold">المشاهدون الحاليون</div>
              <div className="text-xs text-red-200">0 متصل</div>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-white/10 p-3">
            <Clock className="h-5 w-5 text-red-200" />
            <div>
              <div className="text-sm font-bold">مدة البث</div>
              <div className="text-xs text-red-200">{started ? 'جاري البث' : 'لم يبدأ'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}