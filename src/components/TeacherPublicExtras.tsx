import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Crown, Gamepad2, Loader2, Medal, Play, Trophy, Users, Zap } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import type { Competition, CompetitionQuestion, TeacherPlan, TeacherTopStudent, TeacherHonor, TeacherPageSettings } from '@/types';

export default function TeacherPublicExtras({ teacherId, settings }: { teacherId: string; settings: TeacherPageSettings | null }) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [selected, setSelected] = useState<Competition | null>(null);
  const [questions, setQuestions] = useState<CompetitionQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<{ score: number; points: number } | null>(null);
  const [topStudents, setTopStudents] = useState<TeacherTopStudent[]>([]);
  const [honors, setHonors] = useState<TeacherHonor[]>([]);
  const [plans, setPlans] = useState<TeacherPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [boards, setBoards] = useState<Record<string, Array<{ full_name: string; points: number; rank: number }>>>({});

  const primary = settings?.primary_color ?? '#2563eb';
  const secondary = settings?.secondary_color ?? '#06b6d4';
  const accent = settings?.accent_color ?? '#f59e0b';

  const load = useCallback(async () => {
    const [{ data: comps }, { data: top }, { data: h }, { data: p }] = await Promise.all([
      supabase.from('competitions').select('*').eq('teacher_id', teacherId).eq('status', 'published').order('created_at', { ascending: false }),
      supabase.from('teacher_top_students').select('*').eq('teacher_id', teacherId).order('rank', { ascending: true }).limit(5),
      supabase.from('teacher_honors').select('*').eq('teacher_id', teacherId).order('created_at', { ascending: false }).limit(12),
      supabase.from('teacher_plans').select('*').eq('teacher_id', teacherId).eq('is_active', true).order('created_at', { ascending: false }),
    ]);
    const compList = (comps ?? []) as Competition[];
    setCompetitions(compList);
    setTopStudents((top ?? []) as TeacherTopStudent[]);
    setPlans((p ?? []) as TeacherPlan[]);

    const honorsList = (h ?? []) as TeacherHonor[];
    const ids = new Set(honorsList.map((hh) => hh.student_id));
    let nameMap = new Map<string, string>();
    if (ids.size > 0) {
      const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', Array.from(ids));
      nameMap = new Map((profiles ?? []).map((pr) => [pr.id, pr.full_name ?? 'طالب'] as [string, string]));
    }
    setHonors(honorsList.map((hh) => ({ ...hh, student: { id: hh.student_id, full_name: nameMap.get(hh.student_id) ?? 'طالب' } }) as TeacherHonor));

    if (compList.length > 0) {
      const { data: lb } = await supabase.from('competition_leaderboard').select('*').in('competition_id', compList.map((c) => c.id)).order('points', { ascending: false }).limit(50);
      const grouped: Record<string, Array<{ full_name: string; points: number; rank: number }>> = {};
      ((lb ?? []) as Array<Record<string, unknown>>).forEach((r) => {
        const row = r as { competition_id: string; full_name: string; points: number; rank: number };
        (grouped[row.competition_id] ??= []).push({ full_name: row.full_name, points: row.points, rank: row.rank });
      });
      setBoards(grouped);
    }
    setLoading(false);
  }, [teacherId]);
  useEffect(() => { void load(); }, [load]);

  const open = async (competition: Competition) => {
    setSelected(competition); setResult(null); setAnswers({});
    const { data } = await supabase.from('competition_questions_public').select('*').eq('competition_id', competition.id).order('sort_order', { ascending: true });
    setQuestions((data ?? []) as CompetitionQuestion[]);
  };

  const submit = async () => {
    if (!user || !selected || questions.length === 0 || Object.keys(answers).length !== questions.length) {
      if (!user) toast('سجّل دخولك للإجابة على الأسئلة', 'info');
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase.rpc('submit_competition_attempt', { target_competition_id: selected.id, submitted_answers: answers, duration: 0 });
    const attemptResult = (Array.isArray(data) ? data[0] : data) as { score: number; points: number } | null;
    if (!error && attemptResult) { setResult({ score: attemptResult.score, points: attemptResult.points }); void load(); }
    setSubmitting(false);
  };

  if (loading) return <div className="flex min-h-[120px] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" style={{ color: primary }} /></div>;

  const showGame = (settings?.show_competitions ?? true) && competitions.length > 0;
  const showBoard = (settings?.show_leaderboard ?? true) && (topStudents.length > 0 || Object.keys(boards).length > 0);
  const showHonors = honors.length > 0;
  const showPlans = plans.length > 0;
  if (!showGame && !showBoard && !showHonors && !showPlans) return null;

  return (
    <div className="space-y-8">
      {showGame && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl text-white" style={{ backgroundColor: primary }}><Gamepad2 className="h-5 w-5" /></div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">لعبتنا التعليمية</h2>
              <p className="text-sm text-slate-500">تحديات خاصة بهذه الصفحة — أجب واجمع النقاط وادخل ترتيب الأوائل</p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {competitions.map((c) => (
              <button key={c.id} onClick={() => void (selected ? open(c) : open(c))} className={`rounded-2xl border p-4 text-right transition ${selected?.id === c.id ? 'border-transparent text-white' : 'border-slate-200 bg-white hover:shadow-md'}`} style={selected?.id === c.id ? { background: `linear-gradient(135deg, ${primary}, ${secondary})` } : undefined}>
                <div className="flex items-center justify-between">
                  <Zap className="h-5 w-5" style={{ color: selected?.id === c.id ? '#fff' : accent }} />
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${selected?.id === c.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>{boards[c.id]?.length ?? 0} مشارك</span>
                </div>
                <div className="mt-2 font-extrabold text-slate-800" style={{ color: selected?.id === c.id ? '#fff' : undefined }}>{c.title}</div>
                {c.description && <p className={`mt-1 line-clamp-2 text-xs ${selected?.id === c.id ? 'text-white/80' : 'text-slate-500'}`}>{c.description}</p>}
                <div className={`mt-2 flex items-center gap-1 text-xs font-bold ${selected?.id === c.id ? 'text-white' : ''}`} style={selected?.id === c.id ? undefined : { color: primary }}><Play className="h-3.5 w-3.5" /> ابدأ التحدي</div>
              </button>
            ))}
          </div>

          {selected ? (
            <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50/70 p-5">
              <button onClick={() => setSelected(null)} className="mb-4 text-sm font-bold" style={{ color: primary }}>العودة لكل التحديات</button>
              {result ? (
                <div className="rounded-2xl bg-white p-8 text-center shadow-sm" style={{ borderTop: `4px solid ${primary}` }}>
                  <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
                  <h3 className="mt-3 text-2xl font-extrabold text-slate-900">أحسنت! نتيجتك</h3>
                  <div className="mt-5 flex justify-center gap-10">
                    <div><div className="text-3xl font-extrabold" style={{ color: primary }}>{result.score}%</div><div className="text-xs text-slate-500">النتيجة</div></div>
                    <div><div className="text-3xl font-extrabold" style={{ color: accent }}>+{result.points}</div><div className="text-xs text-slate-500">نقاط</div></div>
                  </div>
                  <div className="mt-5 flex flex-wrap justify-center gap-3">
                    {topStudents.slice(0, 3).map((s, i) => (
                      <div key={s.student_id} className="rounded-xl bg-slate-50 px-4 py-2 text-sm">
                        <span className="mr-1">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span>
                        <b>{s.full_name}</b> — {s.total_points} نقطة
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  {questions.map((q, i) => (
                    <div key={q.id} className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="mb-3 flex gap-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-extrabold text-white" style={{ backgroundColor: primary }}>{i + 1}</span>
                        <h4 className="font-bold leading-7 text-slate-800">{q.question}</h4>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {q.options.map((option, oi) => (
                          <button key={oi} onClick={() => setAnswers((cur) => ({ ...cur, [q.id]: oi }))} className={`rounded-xl border px-4 py-2.5 text-right text-sm font-semibold transition ${answers[q.id] === oi ? 'border-transparent text-white' : 'border-slate-200 text-slate-600 hover:border-slate-400'}`} style={answers[q.id] === oi ? { backgroundColor: primary } : undefined}>{option}</button>
                        ))}
                      </div>
                    </div>
                  ))}
                  {questions.length > 0 && (
                    <button onClick={() => void submit()} disabled={!user || submitting || Object.keys(answers).length !== questions.length} className="flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-extrabold text-white transition disabled:opacity-40" style={{ backgroundColor: primary }}>
                      {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                      {user ? 'إرسال الإجابات' : 'سجّل الدخول أولاً للإجابة'}
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              {topStudents.slice(0, 3).map((s, i) => (
                <div key={s.student_id} className="rounded-2xl border border-slate-100 bg-gradient-to-b from-white to-slate-50 p-4 text-center shadow-sm">
                  <div className="text-2xl">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</div>
                  <div className="mt-1 font-bold text-slate-800">{s.full_name}</div>
                  <div className="mt-1 text-xl font-extrabold" style={{ color: primary }}>{s.total_points}</div>
                  <div className="text-[11px] text-slate-400">نقطة</div>
                </div>
              ))}
              {topStudents.length === 0 && <div className="col-span-3 rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">لا يوجد ترتيب بعد — كن أول من يلعب!</div>}
            </div>
          )}
        </div>
      )}

      {showBoard && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl text-white" style={{ backgroundColor: accent }}><Trophy className="h-5 w-5" /></div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">أفضل الطلاب</h2>
              <p className="text-sm text-slate-500">الأوائل في تحدياتنا حسب النقاط</p>
            </div>
          </div>
          <div className="mt-5 space-y-2">
            {topStudents.slice(0, 5).map((s) => (
              <div key={s.student_id} className="flex items-center gap-3 rounded-xl border border-slate-100 px-4 py-2.5">
                <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-extrabold ${s.rank === 1 ? 'bg-amber-100 text-amber-700' : s.rank === 2 ? 'bg-slate-200 text-slate-600' : 'bg-orange-100 text-orange-700'}`}>{s.rank}</span>
                <span className="min-w-0 flex-1 truncate font-bold text-slate-700">{s.full_name}</span>
                <span className="text-xs text-slate-400">{s.competitions_played} لعب</span>
                <span className="font-extrabold" style={{ color: primary }}>{s.total_points} <span className="text-[10px] font-normal text-slate-400">نقطة</span></span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showHonors && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl text-white" style={{ backgroundColor: accent }}><Medal className="h-5 w-5" /></div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">التكريم</h2>
              <p className="text-sm text-slate-500">أوسمة الطلاب المتفوقين في هذه الصفحة</p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {honors.map((h) => (
              <div key={h.id} className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-4">
                <Crown className="h-5 w-5 text-amber-500" />
                <div className="mt-1 font-extrabold text-slate-800">{h.title}</div>
                {h.description && <p className="mt-0.5 text-xs text-slate-500">{h.description}</p>}
                <div className="mt-2 flex items-center gap-1 text-xs text-slate-400"><Users className="h-3 w-3" /> {h.student?.full_name ?? 'طالب'}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showPlans && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl text-white" style={{ backgroundColor: primary }}><Crown className="h-5 w-5" /></div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">باقات الاشتراك</h2>
              <p className="text-sm text-slate-500">باقات حصرية للوصول الكامل لمحتوى هذه الصفحة</p>
            </div>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => (
              <div key={plan.id} className="rounded-2xl border border-slate-100 p-5 shadow-sm" style={{ borderTop: `4px solid ${primary}` }}>
                <div className="font-extrabold text-slate-800">{plan.name_ar}</div>
                <div className="mt-2 text-2xl font-extrabold" style={{ color: primary }}>{plan.price === 0 ? 'مجاناً' : `${plan.price} ر.س`}</div>
                <div className="text-xs text-slate-500">/ {plan.duration_months} {plan.duration_months > 1 ? 'أشهر' : 'شهر'}</div>
                <ul className="mt-3 space-y-1 text-xs text-slate-500">
                  {plan.features.map((f, i) => <li key={i} className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-emerald-500" /> {f}</li>)}
                </ul>
                <LinkButton color={primary} label={profile?.is_teacher ? 'تواصل مع المدرس' : 'اشترك الآن'} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function LinkButton({ color, label }: { color: string; label: string }) {
  return (
    <a
      href={`mailto:${'placeholder'}`}
      onClick={(e) => e.preventDefault()}
      className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
      style={{ backgroundColor: color }}
    >
      {label}
    </a>
  );
}