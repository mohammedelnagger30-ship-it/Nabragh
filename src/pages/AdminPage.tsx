import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield, Users, GraduationCap, Film, BookOpen, MessageSquare, Star,
  Check, Ban, Trash2, ShieldCheck, ShieldOff, Loader2, RefreshCw, Calendar,
  ClipboardCheck, Trophy, Radio, TrendingUp, Award, Activity, ExternalLink
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import MetaTags from '@/components/MetaTags';
import type { Profile, Video, Course, Comment, Review } from '@/types';

type Tab = 'overview' | 'students' | 'assessments' | 'live' | 'teachers' | 'managers' | 'videos' | 'courses' | 'comments' | 'reviews';

const TABS: { id: Tab; label: string; icon: typeof Users }[] = [
  { id: 'overview', label: 'نظرة عامة', icon: Calendar },
  { id: 'students', label: 'متابعة الطلاب', icon: Activity },
  { id: 'assessments', label: 'الامتحانات والدرجات', icon: ClipboardCheck },
  { id: 'live', label: 'البث المباشر', icon: Radio },
  { id: 'teachers', label: 'المدرسون', icon: GraduationCap },
  { id: 'managers', label: 'المدراء', icon: ShieldCheck },
  { id: 'videos', label: 'الفيديوهات', icon: Film },
  { id: 'courses', label: 'الدورات', icon: BookOpen },
  { id: 'comments', label: 'التعليقات', icon: MessageSquare },
  { id: 'reviews', label: 'المراجعات', icon: Star },
];

export default function AdminPage() {
  const { user, loading, isAdmin } = useAuth();
  const [tab, setTab] = useState<Tab>('overview');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [stats, setStats] = useState<Record<string, number>>({});
  const [teachers, setTeachers] = useState<Profile[]>([]);
  const [adminIds, setAdminIds] = useState<Set<string>>(new Set());
  const [managerIds, setManagerIds] = useState<Set<string>>(new Set());
  const [videos, setVideos] = useState<Video[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [students, setStudents] = useState<Profile[]>([]);
  const [studentRows, setStudentRows] = useState<Record<string, { courses: number; progress: number; attempts: number; score: number }>>({});
  const [assessmentRows, setAssessmentRows] = useState<Array<{ id: string; title: string; course: string; attempts: number; average: number; passed: number }>>([]);

  const count = useCallback(async (table: string, filters?: Record<string, unknown>) => {
    let q = supabase.from(table).select('*', { count: 'exact', head: true });
    if (filters) {
      for (const [k, v] of Object.entries(filters)) q = q.eq(k, v);
    }
    const { count: c } = await q;
    return c ?? 0;
  }, []);

  const loadStats = useCallback(async () => {
    setBusy(true);
    try {
      const [t, s, v, c, co, r, q, a, e, cert] = await Promise.all([
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
      ]);
      setStats({ teachers: t, students: s, videos: v, courses: c, comments: co, reviews: r, quizzes: q, attempts: a, enrollments: e, certificates: cert });
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
      supabase.from('profiles').select('*').eq('is_teacher', false).order('created_at', { ascending: false }).limit(200),
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
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('is_teacher', true)
      .order('created_at', { ascending: false });
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
      .select('*, teacher:profiles!videos_teacher_id_fkey(id, full_name, email)')
      .order('created_at', { ascending: false })
      .limit(200);
    setVideos((data ?? []) as Video[]);
  }, []);

  const loadCourses = useCallback(async () => {
    const { data } = await supabase
      .from('courses')
      .select('*, teacher:profiles!courses_teacher_id_fkey(id, full_name, email), category:categories(name_ar)')
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
    if (tab === 'students') void loadStudents();
    if (tab === 'assessments') void loadAssessments();
  }, [tab, isAdmin, loadTeachers, loadVideos, loadCourses, loadComments, loadReviews, loadStudents, loadAssessments, loadManagers]);

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

  if (!loading && !user) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-4 text-center">
        <Shield className="h-12 w-12 text-slate-300" />
        <div className="text-lg font-bold text-slate-700">سجّل الدخول أولاً</div>
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
        <div className="text-lg font-bold text-slate-700">غير مصرح لك بالوصول للوحة الإدارة</div>
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
    { label: 'المدرسون', value: stats.teachers ?? 0, icon: GraduationCap, color: 'bg-blue-50 text-blue-600' },
    { label: 'الطلاب', value: stats.students ?? 0, icon: Users, color: 'bg-cyan-50 text-cyan-600' },
    { label: 'المسجلون في الدورات', value: stats.enrollments ?? 0, icon: BookOpen, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'محاولات الاختبارات', value: stats.attempts ?? 0, icon: ClipboardCheck, color: 'bg-violet-50 text-violet-600' },
    { label: 'الاختبارات المنشورة', value: stats.quizzes ?? 0, icon: Award, color: 'bg-amber-50 text-amber-600' },
    { label: 'الشهادات', value: stats.certificates ?? 0, icon: Trophy, color: 'bg-rose-50 text-rose-600' },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-28 sm:px-6 lg:px-8">
      <MetaTags title="لوحة الإدارة | منصة العلم" noIndex />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800">لوحة الإدارة</h1>
            <p className="text-sm text-slate-500">إدارة المدرسين والمحتوى والإحصائيات</p>
          </div>
        </div>
        <button
          onClick={() => void run(loadStats)}
          className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
        >
          <RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} />
          تحديث
        </button>
      </div>

      {error && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      <div className="mt-8 flex flex-wrap gap-2">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors ${
                tab === t.id ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="mt-8">
        {tab === 'overview' && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {statCards.map((s) => {
                const Icon = s.icon;
                return (
                  <div key={s.label} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${s.color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="text-2xl font-extrabold text-slate-800">{s.value}</div>
                      <div className="text-sm font-medium text-slate-500">{s.label}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
              <div className="rounded-2xl bg-slate-900 p-6 text-white">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-cyan-300">مركز الأداء الأكاديمي</p>
                    <h2 className="mt-2 text-2xl font-extrabold">تابع جودة التعلم لحظة بلحظة</h2>
                    <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">راقب تقدم الطلاب، نجاح الاختبارات، ونشاط المنصة من مكان واحد لاتخاذ قرارات تعليمية أسرع.</p>
                  </div>
                  <TrendingUp className="h-9 w-9 shrink-0 text-cyan-300" />
                </div>
                <div className="mt-6 grid grid-cols-3 gap-3">
                  <MiniMetric label="محتوى منشور" value={(stats.videos ?? 0) + (stats.courses ?? 0)} />
                  <MiniMetric label="تفاعل الطلاب" value={(stats.comments ?? 0) + (stats.reviews ?? 0)} />
                  <MiniMetric label="نسبة الشهادات" value={`${stats.students ? Math.round(((stats.certificates ?? 0) / stats.students) * 100) : 0}%`} />
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-2 text-slate-800"><Radio className="h-5 w-5 text-red-500" /><h2 className="font-extrabold">البث المباشر</h2></div>
                <p className="mt-3 text-sm leading-6 text-slate-500">جهّز جلسة مراجعة أو حصة تفاعلية ووصل الطلاب مباشرة من المنصة.</p>
                <button onClick={() => setTab('live')} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-red-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-red-600"><Radio className="h-4 w-4" /> فتح مركز البث</button>
              </div>
            </div>
          </div>
        )}

        {tab === 'students' && (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <InsightCard icon={Users} label="إجمالي الطلاب" value={students.length} tone="cyan" />
              <InsightCard icon={TrendingUp} label="متوسط التقدم" value={`${students.length ? Math.round(students.reduce((sum, student) => { const row = studentRows[student.id]; return sum + (row?.courses ? row.progress / row.courses : 0); }, 0) / students.length) : 0}%`} tone="emerald" />
              <InsightCard icon={Trophy} label="طلاب لديهم محاولات" value={students.filter((student) => (studentRows[student.id]?.attempts ?? 0) > 0).length} tone="amber" />
            </div>
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 className="font-extrabold text-slate-800">لوحة متابعة الطلاب</h2><p className="mt-1 text-xs text-slate-400">التقدم، الدورات، والنتائج في سجل واحد</p></div><Activity className="h-5 w-5 text-cyan-500" /></div>
              <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-right text-sm"><thead className="bg-slate-50 text-xs font-bold text-slate-500"><tr><th className="px-5 py-3">الترتيب</th><th className="px-5 py-3">الطالب</th><th className="px-5 py-3">الدورات</th><th className="px-5 py-3">التقدم</th><th className="px-5 py-3">الاختبارات</th><th className="px-5 py-3">المتوسط</th><th className="px-5 py-3">المستوى</th></tr></thead><tbody className="divide-y divide-slate-100">{[...students].sort((first, second) => (studentRows[second.id]?.score ?? 0) - (studentRows[first.id]?.score ?? 0)).map((student, rank) => { const row = studentRows[student.id] ?? { courses: 0, progress: 0, attempts: 0, score: 0 }; const progress = row.courses ? Math.round(row.progress / row.courses) : 0; const average = row.attempts ? Math.round(row.score / row.attempts) : 0; return <tr key={student.id} className="hover:bg-slate-50"><td className="px-5 py-4 font-extrabold text-slate-500">{rank + 1}</td><td className="px-5 py-4"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-100 font-bold text-cyan-700">{student.full_name?.charAt(0) ?? 'ط'}</div><div><div className="font-bold text-slate-800">{student.full_name}</div><div className="text-xs text-slate-400">{student.email}</div></div></div></td><td className="px-5 py-4 font-bold text-slate-600">{row.courses}</td><td className="px-5 py-4"><div className="flex items-center gap-3"><div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-cyan-500" style={{ width: `${progress}%` }} /></div><span className="text-xs font-bold text-slate-500">{progress}%</span></div></td><td className="px-5 py-4 text-slate-600">{row.attempts}</td><td className="px-5 py-4 font-bold text-slate-700">{average ? `${average}%` : '—'}</td><td className="px-5 py-4"><LevelBadge progress={progress} /></td></tr>; })}{!busy && students.length === 0 && <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-400">لا توجد بيانات طلاب متاحة</td></tr>}</tbody></table></div>
            </div>
          </div>
        )}

        {tab === 'assessments' && (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-3"><InsightCard icon={ClipboardCheck} label="الاختبارات" value={stats.quizzes ?? 0} tone="violet" /><InsightCard icon={Activity} label="إجمالي المحاولات" value={stats.attempts ?? 0} tone="cyan" /><InsightCard icon={Award} label="الشهادات المصدرة" value={stats.certificates ?? 0} tone="amber" /></div>
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 className="font-extrabold text-slate-800">تحليل الامتحانات والتقييمات</h2><p className="mt-1 text-xs text-slate-400">مقارنة الأداء ونسبة النجاح لكل اختبار</p></div><Trophy className="h-5 w-5 text-amber-500" /></div><div className="overflow-x-auto"><table className="w-full min-w-[620px] text-right text-sm"><thead className="bg-slate-50 text-xs font-bold text-slate-500"><tr><th className="px-5 py-3">الاختبار</th><th className="px-5 py-3">الكورس</th><th className="px-5 py-3">المحاولات</th><th className="px-5 py-3">متوسط الدرجات</th><th className="px-5 py-3">نسبة النجاح</th></tr></thead><tbody className="divide-y divide-slate-100">{assessmentRows.map((assessment) => <tr key={assessment.id} className="hover:bg-slate-50"><td className="px-5 py-4 font-bold text-slate-800">{assessment.title}</td><td className="px-5 py-4 text-slate-500">{assessment.course}</td><td className="px-5 py-4 text-slate-600">{assessment.attempts}</td><td className="px-5 py-4"><span className="font-extrabold text-slate-800">{assessment.average}%</span></td><td className="px-5 py-4"><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">{assessment.attempts ? Math.round((assessment.passed / assessment.attempts) * 100) : 0}%</span></td></tr>)}{!busy && assessmentRows.length === 0 && <tr><td colSpan={5} className="px-5 py-12 text-center text-slate-400">لا توجد اختبارات أو محاولات بعد</td></tr>}</tbody></table></div></div>
          </div>
        )}

        {tab === 'live' && <LiveCenter />}

        {tab === 'teachers' && (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">المدرس</th>
                  <th className="hidden px-4 py-3 md:table-cell">التخصص</th>
                  <th className="hidden px-4 py-3 lg:table-cell">الموقع</th>
                  <th className="px-4 py-3">الحالة</th>
                  <th className="px-4 py-3">أدمن</th>
                  <th className="px-4 py-3">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {teachers.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 text-sm font-bold text-white">
                          {t.full_name?.charAt(0) ?? 'U'}
                        </div>
                        <div>
                          <div className="font-bold text-slate-800">{t.full_name}</div>
                          <div className="text-xs text-slate-400">{t.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 text-slate-600 md:table-cell">{t.specialization || '—'}</td>
                    <td className="hidden px-4 py-3 text-slate-600 lg:table-cell">{t.location || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                        t.is_approved ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                      }`}>
                        {t.is_approved ? <Check className="h-3 w-3" /> : <Ban className="h-3 w-3" />}
                        {t.is_approved ? 'معتمد' : 'محظور'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {adminIds.has(t.id) ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-2.5 py-1 text-xs font-bold text-white">
                          <ShieldCheck className="h-3 w-3" /> أدمن
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => void run(async () => {
                            await supabase.rpc('admin_set_approved', { target_id: t.id, approved: !t.is_approved });
                            await loadTeachers();
                          })}
                          className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                            t.is_approved ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
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
                            adminIds.has(t.id) ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-slate-900 text-white hover:bg-slate-700'
                          }`}
                          disabled={busy}
                        >
                          {adminIds.has(t.id) ? 'إلغاء الأدمن' : 'تعيين أدمن'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!busy && teachers.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">لا يوجد مدرسون بعد</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'managers' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-semibold text-amber-800">
              مدير الصفحة = المدرس صاحب صفحة عامة قابلة للتخصيص (ألوان، أسعار، لعبة، متابعة طلابه). منح الترتيب يفتح له كل الإمكانيات داخل لوحته.
            </div>
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <table className="w-full text-right text-sm">
                <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">المدرس</th>
                    <th className="hidden px-4 py-3 md:table-cell">البريد</th>
                    <th className="px-4 py-3">الحالة</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {teachers.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-700">
                            {t.full_name?.charAt(0) ?? 'م'}
                          </div>
                          <div>
                            <div className="font-bold text-slate-800">{t.full_name || '—'}</div>
                            <div className="text-xs text-slate-400">{t.specialization || 'مدرس'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="hidden px-4 py-3 text-slate-600 md:table-cell" dir="ltr">{t.email || '—'}</td>
                      <td className="px-4 py-3">
                        {managerIds.has(t.id) ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-bold text-violet-700">
                            <ShieldCheck className="h-3 w-3" /> مدير صفحة
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => void run(async () => {
                            await supabase.rpc('admin_set_manager', { target_id: t.id, value: !managerIds.has(t.id) });
                            await loadManagers();
                          })}
                          disabled={busy}
                          className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                            managerIds.has(t.id) ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-violet-600 text-white hover:bg-violet-700'
                          }`}
                        >
                          {managerIds.has(t.id) ? 'سحب المديرية' : 'منح مديرية الصفحة'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!busy && teachers.length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-10 text-center text-slate-400">لا يوجد مدرسون بعد</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'videos' && (
          <VideoTable videos={videos} busy={busy} onDelete={(id) => void run(async () => {
            await supabase.from('videos').delete().eq('id', id);
            setVideos((v) => v.filter((x) => x.id !== id));
          })} />
        )}

        {tab === 'courses' && (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">الكورس</th>
                  <th className="hidden px-4 py-3 md:table-cell">التخصص</th>
                  <th className="hidden px-4 py-3 md:table-cell">المدرس</th>
                  <th className="px-4 py-3">السعر</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {courses.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-bold text-slate-800">{c.title}</td>
                    <td className="hidden px-4 py-3 text-slate-600 md:table-cell">{c.category?.name_ar || '—'}</td>
                    <td className="hidden px-4 py-3 text-slate-600 md:table-cell">{c.teacher?.full_name || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{c.price === 0 ? 'مجاني' : `${c.price} ر.س`}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => void run(async () => {
                          await supabase.from('courses').delete().eq('id', c.id);
                          setCourses((x) => x.filter((i) => i.id !== c.id));
                        })}
                        disabled={busy}
                        className="rounded-lg bg-red-50 p-2 text-red-600 transition hover:bg-red-100"
                        title="حذف"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {!busy && courses.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400">لا توجد دورات بعد</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'comments' && (
          <div className="space-y-3">
            {comments.map((c) => (
              <div key={c.id} className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <MessageSquare className="h-3 w-3" />
                    {c.student?.full_name || 'طالب'}
                    {' · '}
                    {new Date(c.created_at).toLocaleDateString('ar-EG')}
                  </div>
                  <p className="mt-1 text-slate-700">{c.comment}</p>
                </div>
                <button
                  onClick={() => void run(async () => {
                    await supabase.from('comments').delete().eq('id', c.id);
                    setComments((x) => x.filter((i) => i.id !== c.id));
                  })}
                  disabled={busy}
                  className="rounded-lg bg-red-50 p-2 text-red-600 transition hover:bg-red-100"
                  title="حذف"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            {!busy && comments.length === 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-400">لا توجد تعليقات بعد</div>
            )}
          </div>
        )}

        {tab === 'reviews' && (
          <div className="space-y-3">
            {reviews.map((r) => (
              <div key={r.id} className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="flex items-center gap-0.5 text-amber-500">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`h-3 w-3 ${i < r.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
                      ))}
                    </span>
                    {r.student?.full_name || 'طالب'}
                    {' · '}
                    {new Date(r.created_at).toLocaleDateString('ar-EG')}
                  </div>
                  <p className="mt-1 text-slate-700">{r.comment || 'بدون تعليق'}</p>
                </div>
                <button
                  onClick={() => void run(async () => {
                    await supabase.from('reviews').delete().eq('id', r.id);
                    setReviews((x) => x.filter((i) => i.id !== r.id));
                  })}
                  disabled={busy}
                  className="rounded-lg bg-red-50 p-2 text-red-600 transition hover:bg-red-100"
                  title="حذف"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            {!busy && reviews.length === 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-400">لا توجد مراجعات بعد</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function VideoTable({ videos, busy, onDelete }: { videos: Video[]; busy: boolean; onDelete: (id: string) => void }) {
  if (videos.length === 0) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-400">لا توجد فيديوهات بعد</div>;
  }
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {videos.map((v) => (
        <div key={v.id} className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Film className="h-3 w-3" />
              {v.teacher?.full_name || 'مدرس'}
              {' · '}
              {v.views_count} مشاهدة
            </div>
            <div className="mt-1 truncate font-bold text-slate-800">{v.title}</div>
            <div className="mt-0.5 truncate text-xs text-slate-400">{v.category?.name_ar || ''}</div>
          </div>
          <button
            onClick={() => onDelete(v.id)}
            disabled={busy}
            className="shrink-0 rounded-lg bg-red-50 p-2 text-red-600 transition hover:bg-red-100"
            title="حذف"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: number | string }) {
  return <div className="rounded-xl bg-white/10 p-3"><div className="text-xl font-extrabold">{value}</div><div className="mt-1 text-xs text-slate-300">{label}</div></div>;
}

function InsightCard({ icon: Icon, label, value, tone }: { icon: typeof Users; label: string; value: number | string; tone: 'cyan' | 'emerald' | 'amber' | 'violet' }) {
  const tones = { cyan: 'bg-cyan-50 text-cyan-600', emerald: 'bg-emerald-50 text-emerald-600', amber: 'bg-amber-50 text-amber-600', violet: 'bg-violet-50 text-violet-600' };
  return <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className={`flex h-11 w-11 items-center justify-center rounded-xl ${tones[tone]}`}><Icon className="h-5 w-5" /></div><div><div className="text-xl font-extrabold text-slate-800">{value}</div><div className="text-xs font-semibold text-slate-500">{label}</div></div></div>;
}

function LevelBadge({ progress }: { progress: number }) {
  const level = progress >= 80 ? { label: 'متقدم', style: 'bg-emerald-50 text-emerald-700' } : progress >= 45 ? { label: 'متوسط', style: 'bg-amber-50 text-amber-700' } : { label: 'مبتدئ', style: 'bg-slate-100 text-slate-600' };
  return <span className={`rounded-full px-3 py-1 text-xs font-bold ${level.style}`}>{level.label}</span>;
}

function LiveCenter() {
  const [title, setTitle] = useState('');
  const [roomUrl, setRoomUrl] = useState('');
  const [started, setStarted] = useState(false);
  return <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]"><div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 className="font-extrabold text-slate-800">غرفة البث المباشر</h2><p className="mt-1 text-xs text-slate-400">أدر رابط الحصة وحالتها للطلاب</p></div><span className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ${started ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-500'}`}><span className={`h-2 w-2 rounded-full ${started ? 'animate-pulse bg-red-500' : 'bg-slate-400'}`} />{started ? 'مباشر الآن' : 'غير نشط'}</span></div><div className="space-y-4 p-5"><label className="block text-sm font-bold text-slate-700">عنوان الجلسة<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="مثال: مراجعة نهائية للرياضيات" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500" /></label><label className="block text-sm font-bold text-slate-700">رابط غرفة البث<input value={roomUrl} onChange={(event) => setRoomUrl(event.target.value)} placeholder="https://..." dir="ltr" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-left text-sm outline-none transition focus:border-cyan-500" /></label><button onClick={() => setStarted((value) => !value)} disabled={!title.trim() || !roomUrl.trim()} className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"><Radio className="h-4 w-4" />{started ? 'إنهاء البث' : 'بدء البث الآن'}</button>{started && <a href={roomUrl} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm font-bold text-cyan-700"><ExternalLink className="h-4 w-4" /> فتح غرفة البث</a>}</div></div><div className="rounded-2xl bg-slate-900 p-6 text-white"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/20 text-red-300"><Radio className="h-6 w-6" /></div><h2 className="mt-5 text-xl font-extrabold">تشغيل الحصص التفاعلية</h2><p className="mt-3 text-sm leading-7 text-slate-300">استخدم رابط Zoom أو Google Meet أو أي مزود بث، وسيظهر للطلاب من خلال حالة الجلسة في لوحة الإدارة.</p><div className="mt-6 space-y-3 text-sm text-slate-300"><div className="flex items-center gap-3"><Check className="h-4 w-4 text-emerald-400" /> رابط واحد واضح للطلاب</div><div className="flex items-center gap-3"><Check className="h-4 w-4 text-emerald-400" /> مؤشر مباشر لحالة الحصة</div><div className="flex items-center gap-3"><Check className="h-4 w-4 text-emerald-400" /> جاهز للربط بمزود بث خارجي</div></div></div></div>;
}