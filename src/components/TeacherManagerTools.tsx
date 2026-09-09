import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Palette, Plus, Trash2, Save, Loader2, Medal, Users as UsersIcon,
  Crown, FolderX, Trophy, BookOpen, Award, Video as VideoIcon,
  Star, CheckCircle2, TrendingUp, ClipboardList, Gamepad2, RefreshCw
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/context/ToastContext';
import type {
  Profile, TeacherPageSettings, TeacherPlan, TeacherHonor,
  Competition, CompetitionLeaderboardRow,
} from '@/types';

const DEFAULT_SETTINGS: TeacherPageSettings = {
  teacher_id: '', primary_color: '#2563eb', secondary_color: '#06b6d4',
  accent_color: '#f59e0b', show_competitions: true, show_leaderboard: true, updated_at: new Date().toISOString(),
};

export function TeacherPageSettings({ teacherId }: { teacherId: string }) {
  const { toast } = useToast();
  const [settings, setSettings] = useState<TeacherPageSettings>(DEFAULT_SETTINGS);
  const [plans, setPlans] = useState<TeacherPlan[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [planName, setPlanName] = useState('');
  const [planPrice, setPlanPrice] = useState(0);
  const [planMonths, setPlanMonths] = useState(1);
  const [planFeatures, setPlanFeatures] = useState('');

  const load = useCallback(async () => {
    const [{ data: s }, { data: p }] = await Promise.all([
      supabase.from('teacher_page_settings').select('*').eq('teacher_id', teacherId).maybeSingle(),
      supabase.from('teacher_plans').select('*').eq('teacher_id', teacherId).order('created_at', { ascending: false }),
    ]);
    if (s) setSettings({ ...DEFAULT_SETTINGS, ...(s as TeacherPageSettings) });
    setPlans((p ?? []) as TeacherPlan[]);
    setLoading(false);
  }, [teacherId]);
  useEffect(() => { void load(); }, [load]);

  const saveSettings = async () => {
    setSaving(true);
    const { error } = await supabase.from('teacher_page_settings').upsert({ ...settings, teacher_id: teacherId, updated_at: new Date().toISOString() });
    setSaving(false);
    toast(error ? 'تعذر الحفظ' : 'تم حفظ إعدادات الصفحة 🎨', error ? 'error' : 'success');
    if (!error) await load();
  };

  const addPlan = async () => {
    if (!planName.trim()) return;
    const features = planFeatures.split(',').map((f) => f.trim()).filter(Boolean);
    const { error } = await supabase.from('teacher_plans').insert({ teacher_id: teacherId, name_ar: planName, price: planPrice, duration_months: planMonths, features, sort_order: plans.length });
    if (!error) {
      setPlanName(''); setPlanPrice(0); setPlanMonths(1); setPlanFeatures('');
      await load();
      toast('تمت إضافة الباقة', 'success');
    } else toast('تعذر إضافة الباقة', 'error');
  };

  const removePlan = async (id: string) => {
    await supabase.from('teacher_plans').delete().eq('id', id);
    await load();
  };

  if (loading) return <div className="flex min-h-[220px] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-blue-600" /></div>;

  const swatches = [
    { name: 'أزرق', c: '#2563eb' }, { name: 'تركواز', c: '#0d9488' }, { name: 'بنفسجي', c: '#7c3aed' },
    { name: 'وردي', c: '#db2777' }, { name: 'برتقالي', c: '#ea580c' }, { name: 'أخضر', c: '#16a34a' },
    { name: 'كحلي', c: '#1e293b' }, { name: 'أحمر', c: '#dc2626' },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-5 flex items-center gap-2 font-bold text-slate-800"><Palette className="h-5 w-5 text-blue-600" /> تصميم صفحتي العامة</h3>
        <div className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">ألوان صفحتي</label>
            <div className="flex flex-wrap items-center gap-3">
              {[
                { key: 'primary_color' as const, label: 'الرئيسي' },
                { key: 'secondary_color' as const, label: 'الثانوي' },
                { key: 'accent_color' as const, label: 'التمييز' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
                  <input type="color" value={settings[key]} onChange={(e) => setSettings((s) => ({ ...s, [key]: e.target.value }))} className="h-8 w-10 cursor-pointer rounded border-0 bg-transparent p-0" />
                  <span className="text-xs font-bold text-slate-600">{label}</span>
                </label>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {swatches.map((s) => (
                <button key={s.c} onClick={() => setSettings((cur) => ({ ...cur, primary_color: s.c, secondary_color: s.c }))} className="flex items-center gap-1.5 rounded-full border border-slate-200 px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:border-slate-400">
                  <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: s.c }} /> {s.name}
                </button>
              ))}
            </div>
            <div className="mt-4 rounded-xl border border-slate-200 p-4">
              <div className="text-xs font-bold text-slate-500">معاينة</div>
              <div className="mt-2 flex items-center gap-2">
                <span className="h-8 w-8 rounded-full" style={{ backgroundColor: settings.primary_color }} />
                <span className="h-8 w-8 rounded-full" style={{ backgroundColor: settings.secondary_color }} />
                <span className="h-8 w-8 rounded-full" style={{ backgroundColor: settings.accent_color }} />
                <button className="rounded-lg px-3 py-1.5 text-xs font-bold text-white" style={{ backgroundColor: settings.primary_color }}>زر تجريبي</button>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-5">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input type="checkbox" checked={settings.show_competitions} onChange={(e) => setSettings((s) => ({ ...s, show_competitions: e.target.checked }))} className="h-4 w-4 accent-blue-600" />
              إظهار لعبتي (المنافسات) في صفحتي
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input type="checkbox" checked={settings.show_leaderboard} onChange={(e) => setSettings((s) => ({ ...s, show_leaderboard: e.target.checked }))} className="h-4 w-4 accent-blue-600" />
              إظهار ترتيب أفضل طلابي
            </label>
          </div>
          <button onClick={() => void saveSettings()} disabled={saving} className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-50">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} <Save className="h-4 w-4" /> حفظ الإعدادات
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-5 flex items-center gap-2 font-bold text-slate-800"><Crown className="h-5 w-5 text-amber-500" /> باقات الاشتراك الخاصة بي</h3>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            {plans.map((plan) => (
              <div key={plan.id} className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 p-4">
                <div>
                  <div className="font-bold text-slate-800">{plan.name_ar}</div>
                  <div className="mt-1 text-sm text-slate-500">
                    {plan.price === 0 ? 'مجاناً' : `${plan.price} ر.س`} / {plan.duration_months} {plan.duration_months > 1 ? 'أشهر' : 'شهر'}
                  </div>
                  {plan.features.length > 0 && (
                    <ul className="mt-2 space-y-1 text-xs text-slate-500">
                      {plan.features.map((f, i) => <li key={i} className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-emerald-500" /> {f}</li>)}
                    </ul>
                  )}
                </div>
                <button onClick={() => void removePlan(plan.id)} className="rounded-lg bg-red-50 p-2 text-red-600 hover:bg-red-100" title="حذف الباقة"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
            {plans.length === 0 && <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400">لا توجد باقات بعد — أضف أول باقة لعرضها في صفحتك</div>}
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="space-y-3">
              <input value={planName} onChange={(e) => setPlanName(e.target.value)} placeholder="اسم الباقة (مثل: باقة شهرية)" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm" />
              <div className="grid grid-cols-2 gap-3">
                <input type="number" min={0} value={planPrice} onChange={(e) => setPlanPrice(Number(e.target.value))} placeholder="السعر" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm" />
                <input type="number" min={1} value={planMonths} onChange={(e) => setPlanMonths(Number(e.target.value))} placeholder="المدة (أشهر)" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm" />
              </div>
              <input value={planFeatures} onChange={(e) => setPlanFeatures(e.target.value)} placeholder="المميزات، مفصولة بفواصل (,)" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm" />
              <button onClick={() => void addPlan()} disabled={!planName.trim()} className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40"><Plus className="h-4 w-4" /> إضافة الباقة</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface StudentInfo {
  profile: Profile;
  courses: number;
  avgProgress: number;
  videosCompleted: number;
  quizAttempts: number;
  quizScore: number;
  competitionPoints: number;
  competitionsPlayed: number;
  isSubscriber: boolean;
  videosCount: number;
}

export function TeacherStudents({ teacherId }: { teacherId: string }) {
  const [rows, setRows] = useState<StudentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: courses }, { data: videoList }, { data: quizList }] = await Promise.all([
      supabase.from('courses').select('id').eq('teacher_id', teacherId),
      supabase.from('videos').select('id').eq('teacher_id', teacherId),
      supabase.from('quizzes').select('id').eq('teacher_id', teacherId),
    ]);
    const courseIds = new Set((courses ?? []).map((c) => c.id));
    const videoIds = new Set((videoList ?? []).map((v) => v.id));
    const quizIds = new Set((quizList ?? []).map((q) => q.id));

    const [{ data: enrollments }, { data: subs }, { data: progress }, { data: attempts }, { data: topRows }] = await Promise.all([
      supabase.from('course_enrollments').select('student_id, course_id, progress_percent'),
      supabase.from('subscriptions').select('student_id, status').eq('teacher_id', teacherId),
      supabase.from('video_progress').select('student_id, video_id, is_completed'),
      supabase.from('quiz_attempts').select('student_id, quiz_id, score'),
      supabase.from('teacher_top_students').select('student_id, total_points, competitions_played').eq('teacher_id', teacherId),
    ]);

    const enrolled = new Map<string, { courses: number; progress: number }>();
    (enrollments ?? []).forEach((r) => {
      const row = r as { student_id: string; course_id: string; progress_percent: number | null };
      if (!courseIds.has(row.course_id)) return;
      const cur = enrolled.get(row.student_id) ?? { courses: 0, progress: 0 };
      cur.courses += 1; cur.progress += row.progress_percent ?? 0;
      enrolled.set(row.student_id, cur);
    });
    const progressById = new Map<string, { done: number; total: number }>();
    (progress ?? []).forEach((r) => {
      const row = r as { student_id: string; video_id: string; is_completed: boolean | null };
      if (!videoIds.has(row.video_id)) return;
      const cur = progressById.get(row.student_id) ?? { done: 0, total: 0 };
      cur.total += 1;
      if (row.is_completed) cur.done += 1;
      progressById.set(row.student_id, cur);
    });
    const quizById = new Map<string, { n: number; sum: number }>();
    (attempts ?? []).forEach((r) => {
      const row = r as { student_id: string; quiz_id: string; score: number | null };
      if (!quizIds.has(row.quiz_id)) return;
      const cur = quizById.get(row.student_id) ?? { n: 0, sum: 0 };
      cur.n += 1; cur.sum += row.score ?? 0;
      quizById.set(row.student_id, cur);
    });
    const compById = new Map<string, { n: number; points: number }>();
    ((topRows ?? []) as Array<{ student_id: string; total_points: number; competitions_played: number }>).forEach((r) => {
      compById.set(r.student_id, { n: r.competitions_played, points: r.total_points });
    });
    const subscriberIds = new Set(((subs ?? [])).filter((s) => (s as { status: string }).status === 'active').map((s) => (s as { student_id: string }).student_id));
    const videoTotal = videoIds.size;

    const candidateIds = new Set([...enrolled.keys(), ...progressById.keys(), ...subscriberIds.keys()]);
    let profiles: Profile[] = [];
    if (candidateIds.size > 0) {
      const { data } = await supabase.from('profiles').select('*').in('id', Array.from(candidateIds)).eq('is_teacher', false);
      profiles = (data ?? []) as Profile[];
    }
    const result: StudentInfo[] = profiles
      .map((profile) => {
        const enr = enrolled.get(profile.id);
        const prog = progressById.get(profile.id);
        const quiz = quizById.get(profile.id);
        const cmp = compById.get(profile.id);
        return {
          profile,
          courses: enr?.courses ?? 0,
          avgProgress: enr ? Math.round((enr.progress / enr.courses) * 100) : 0,
          videosCompleted: prog?.done ?? 0,
          quizAttempts: quiz?.n ?? 0,
          quizScore: quiz ? Math.round(quiz.sum / quiz.n) : 0,
          competitionPoints: cmp?.points ?? 0,
          competitionsPlayed: cmp?.n ?? 0,
          isSubscriber: subscriberIds.has(profile.id),
          videosCount: videoTotal,
        };
      })
      .sort((a, b) => b.competitionPoints - a.competitionPoints || b.avgProgress - a.avgProgress);

    setRows(result);
    setLoading(false);
  }, [teacherId]);
  useEffect(() => { void load(); }, [load]);

  if (loading) return <div className="flex min-h-[220px] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-blue-600" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-bold text-slate-800"><UsersIcon className="h-5 w-5 text-blue-600" /> طلابي ({rows.length})</h3>
        <button onClick={() => void load()} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"><RefreshCw className="h-3.5 w-3.5" /> تحديث</button>
      </div>
      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-400">لا يوجد طلاب مسجلون في محتواك بعد</div>
      ) : (
        <div className="space-y-3">
          {rows.map((s) => (
            <div key={s.profile.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-700">{s.profile.full_name?.charAt(0) ?? 'ط'}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 font-bold text-slate-800">
                    {s.profile.full_name ?? 'طالب'}
                    {s.isSubscriber && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">مشترك</span>}
                  </div>
                  <div className="truncate text-xs text-slate-400" dir="ltr">{s.profile.email}</div>
                </div>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">🥇 {s.competitionPoints} نقطة</span>
                <button onClick={() => setExpanded(expanded === s.profile.id ? null : s.profile.id)} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200">
                  {expanded === s.profile.id ? 'إغلاق' : 'تفاصيل'}
                </button>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
                <MiniInfo label="دورات" value={s.courses} icon={<BookOpen className="h-3.5 w-3.5" />} />
                <MiniInfo label="متوسط التقدم" value={`${s.avgProgress}%`} icon={<TrendingUp className="h-3.5 w-3.5" />} />
                <MiniInfo label="فيديوهات مكتملة" value={`${s.videosCompleted}/${s.videosCount}`} icon={<VideoIcon className="h-3.5 w-3.5" />} />
                <MiniInfo label="اختبارات" value={s.quizAttempts} icon={<ClipboardList className="h-3.5 w-3.5" />} />
                <MiniInfo label="متوسط الدرجات" value={`${s.quizScore}%`} icon={<Star className="h-3.5 w-3.5" />} />
              </div>
              {expanded === s.profile.id && (
                <div className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
                  <p className="text-slate-600">المرحلة: <b>{s.profile.education_stage || 'غير محددة'}</b></p>
                  <p className="text-slate-600">المنهج: <b>{s.profile.curriculum || 'غير محدد'}</b></p>
                  <p className="text-slate-600">منافسات لعبها: <b>{s.competitionsPlayed}</b></p>
                  <p className="text-slate-600">التقييم العام: <b>{s.profile.is_approved ? 'نشط' : 'مقيد'}</b></p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MiniInfo({ label, value, icon }: { label: string; value: number | string; icon: ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-center">
      <div className="flex items-center justify-center gap-1 text-slate-400">{icon}<span className="text-[11px]">{label}</span></div>
      <div className="mt-1 text-sm font-extrabold text-slate-700">{value}</div>
    </div>
  );
}

export function TeacherHonors({ teacherId }: { teacherId: string }) {
  const { toast } = useToast();
  const [honors, setHonors] = useState<TeacherHonor[]>([]);
  const [students, setStudents] = useState<{ id: string; name: string }[]>([]);
  const [studentId, setStudentId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [{ data: h }, { data: courses }] = await Promise.all([
      supabase.from('teacher_honors').select('*').eq('teacher_id', teacherId).order('created_at', { ascending: false }),
      supabase.from('courses').select('id').eq('teacher_id', teacherId),
    ]);
    const courseIds = new Set((courses ?? []).map((c) => c.id));
    const honorsList = (h ?? []) as TeacherHonor[];

    const studentIds = new Set<string>();
    honorsList.forEach((hh) => hh.student_id && studentIds.add(hh.student_id));
    if (courseIds.size > 0) {
      const { data: enrollments } = await supabase.from('course_enrollments').select('course_id, student_id').limit(2000);
      (enrollments ?? []).forEach((r) => {
        const e = r as { course_id: string; student_id: string };
        if (courseIds.has(e.course_id)) studentIds.add(e.student_id);
      });
    }
    let nameMap = new Map<string, string>();
    if (studentIds.size > 0) {
      const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', Array.from(studentIds));
      nameMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name ?? 'طالب'] as [string, string]));
    }
    setHonors(honorsList.map((hh) => ({ ...hh, student: { id: hh.student_id, full_name: nameMap.get(hh.student_id) ?? 'طالب' } }) as TeacherHonor));
    setStudents(Array.from(studentIds, (id) => ({ id, name: nameMap.get(id) ?? 'طالب' })));
    setLoading(false);
  }, [teacherId]);
  useEffect(() => { void load(); }, [load]);

  const award = async () => {
    if (!studentId || !title.trim()) { toast('اختر الطالب واكتب اللقب', 'info'); return; }
    const { error } = await supabase.from('teacher_honors').insert({ teacher_id: teacherId, student_id: studentId, title, description: description || null });
    if (!error) {
      setStudentId(''); setTitle(''); setDescription('');
      await load();
      toast('تم تكريم الطالب 🎉', 'success');
    } else toast('تعذر التكريم', 'error');
  };

  if (loading) return <div className="flex min-h-[220px] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-blue-600" /></div>;

  return (
    <div className="space-y-6">
      <h3 className="flex items-center gap-2 font-bold text-slate-800"><Medal className="h-5 w-5 text-amber-500" /> تكريم الطلاب</h3>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h4 className="mb-3 font-bold text-slate-700">تكريم جديد</h4>
        <div className="grid gap-3 sm:grid-cols-2">
          <select value={studentId} onChange={(e) => setStudentId(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">
            <option value="">اختر الطالب...</option>
            {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="اللقب (مثل: الأول في تحدي الرياضيات)" className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm" />
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="وصف إضافي (اختياري)" className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm sm:col-span-2" />
        </div>
        <button onClick={() => void award()} className="mt-3 flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-amber-600"><Award className="h-4 w-4" /> تكريم الطالب</button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {honors.map((h) => (
          <div key={h.id} className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm">
            <Medal className="h-6 w-6 text-amber-500" />
            <div className="mt-2 font-extrabold text-slate-800">{h.title}</div>
            {h.description && <p className="mt-1 text-sm text-slate-500">{h.description}</p>}
            <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
              <span>الطالب: {h.student?.full_name ?? 'طالب'}</span>
              <span>{new Date(h.created_at).toLocaleDateString('ar-EG')}</span>
            </div>
          </div>
        ))}
      </div>
      {honors.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-400">لا توجد تكريمات بعد — كرّم طلابك المتفوقين</div>}
    </div>
  );
}

export function TeacherLeaderboards({ teacherId }: { teacherId: string }) {
  const { toast } = useToast();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [boards, setBoards] = useState<Record<string, CompetitionLeaderboardRow[]>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase.from('competitions').select('*').eq('teacher_id', teacherId).eq('status', 'published').order('created_at', { ascending: false });
    const comps = (data ?? []) as Competition[];
    setCompetitions(comps);
    if (comps.length > 0) {
      const { data: lb } = await supabase.from('competition_leaderboard').select('*').in('competition_id', comps.map((c) => c.id)).order('points', { ascending: false }).limit(100);
      const grouped: Record<string, CompetitionLeaderboardRow[]> = {};
      ((lb ?? []) as CompetitionLeaderboardRow[]).forEach((r) => {
        (grouped[r.competition_id] ??= []).push(r);
      });
      setBoards(grouped);
    }
    setLoading(false);
  }, [teacherId]);
  useEffect(() => { void load(); }, [load]);

  const honorTop = async (competitionId: string) => {
    const top = (boards[competitionId] ?? [])[0];
    if (!top) return;
    const { error } = await supabase.from('teacher_honors').insert({
      teacher_id: teacherId, student_id: top.student_id,
      title: `الأول في «${competitions.find((c) => c.id === competitionId)?.title ?? 'تحدي'}»`,
    });
    toast(error ? 'تعذر التكريم' : 'تم تكريم الطالب الأول 🎉', error ? 'error' : 'success');
  };

  if (loading) return <div className="flex min-h-[120px] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-blue-600" /></div>;

  return (
    <div className="mt-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="flex items-center gap-2 font-bold text-slate-800"><Trophy className="h-5 w-5 text-amber-500" /> ترتيب أفضل طلابي</h3>
      <p className="mt-1 text-sm text-slate-500">يظهر هذا الترتيب في صفحتك العامة على الموقع، ويمكنك تكريم الأول من هنا.</p>
      {competitions.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-400">أنشئ منافسة منشورة وسيظهر ترتيب طلابك هنا</div>
      ) : (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {competitions.map((competition) => {
            const rows = (boards[competition.id] ?? []).slice(0, 5);
            return (
              <div key={competition.id} className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                <div className="mb-3 flex items-center gap-2 font-bold text-slate-700"><Gamepad2 className="h-4 w-4 text-cyan-600" /> {competition.title}</div>
                {rows.length === 0 ? (
                  <p className="text-xs text-slate-400">لا يوجد مشاركون بعد</p>
                ) : (
                  <div className="space-y-1.5">
                    {rows.map((r) => (
                      <div key={r.student_id} className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm">
                        <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-extrabold ${r.rank === 1 ? 'bg-amber-100 text-amber-700' : r.rank === 2 ? 'bg-slate-200 text-slate-600' : r.rank === 3 ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-400'}`}>{r.rank}</span>
                        <span className="min-w-0 flex-1 truncate font-semibold text-slate-700">{r.full_name}</span>
                        <span className="font-extrabold text-cyan-700">{r.points}</span>
                        <span className="text-[10px] text-slate-400">نقطة</span>
                      </div>
                    ))}
                    <button onClick={() => void honorTop(competition.id)} className="mt-2 flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 hover:bg-amber-100">
                      <Award className="h-3.5 w-3.5" /> تكريم الأول
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <div className="mt-4 flex items-center gap-2 text-xs text-slate-400"><FolderX className="h-4 w-4" /> التكريمات تظهر في صفحتك العامة في خانة «التكريم».</div>
    </div>
  );
}