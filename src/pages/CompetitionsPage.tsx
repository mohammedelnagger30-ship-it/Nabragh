import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ChevronLeft, Clock3, Crown, Gamepad2, Loader2, Medal, Trophy, Users, Zap } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { getEducationStageLabel } from '@/lib/education';
import type { Competition, CompetitionQuestion, StudentSubjectLeaderboard } from '@/types';

export default function CompetitionsPage() {
  const { user, profile } = useAuth();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [leaderboard, setLeaderboard] = useState<StudentSubjectLeaderboard[]>([]);
  const [selected, setSelected] = useState<Competition | null>(null);
  const [questions, setQuestions] = useState<CompetitionQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<{ score: number; points: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const [competitionResult, leaderboardResult] = await Promise.all([
        supabase.from('competitions').select('*').eq('status', 'published').order('created_at', { ascending: false }),
        supabase.from('student_subject_leaderboard').select('*').order('subject_rank', { ascending: true }).limit(30),
      ]);
      setCompetitions((competitionResult.data ?? []) as Competition[]);
      setLeaderboard((leaderboardResult.data ?? []) as StudentSubjectLeaderboard[]);
      setLoading(false);
    })();
  }, []);

  const visibleCompetitions = useMemo(() => competitions.filter((competition) => !profile?.education_stage || !competition.education_stage || competition.education_stage === profile.education_stage), [competitions, profile?.education_stage]);

  const openCompetition = async (competition: Competition) => {
    setSelected(competition);
    setResult(null);
    setAnswers({});
    const { data } = await supabase.from('competition_questions_public').select('*').eq('competition_id', competition.id).order('sort_order', { ascending: true });
    setQuestions((data ?? []) as CompetitionQuestion[]);
  };

  const submitCompetition = async () => {
    if (!user || !selected || questions.length === 0) return;
    setSubmitting(true);
    const { data, error } = await supabase.rpc('submit_competition_attempt', { target_competition_id: selected.id, submitted_answers: answers, duration: 0 });
    const attemptResult = Array.isArray(data) ? data[0] : data;
    if (!error && attemptResult) setResult({ score: attemptResult.score, points: attemptResult.points });
    setSubmitting(false);
  };

  const topStudents = leaderboard.filter((student) => student.subject_rank === 1).slice(0, 5);

  return <div className="min-h-screen bg-slate-50 pb-16 pt-28"><div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
    <section className="relative overflow-hidden rounded-[2rem] bg-slate-950 px-6 py-10 text-white shadow-xl sm:px-10"><div className="absolute -left-20 -top-24 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" /><div className="relative grid items-center gap-8 lg:grid-cols-[1.2fr_0.8fr]"><div><div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm font-bold text-cyan-200"><Gamepad2 className="h-4 w-4" /> ساحة التحدي التعليمية</div><h1 className="text-3xl font-extrabold leading-tight sm:text-5xl">نافس، تعلّم، واصنع <span className="text-cyan-300">اسمك بين الأوائل</span></h1><p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">اختبر معلوماتك في تحديات قصيرة، اجمع النقاط، وارتقِ في ترتيب مرحلتك التعليمية.</p><Link to="/dashboard" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-extrabold text-slate-950 transition hover:bg-cyan-300">شاهد إنجازاتك <ChevronLeft className="h-4 w-4" /></Link></div><div className="grid grid-cols-2 gap-3"><HeroStat icon={Zap} label="نقاط لكل إجابة" value="10" /><HeroStat icon={Trophy} label="ترتيب حسب المرحلة" value="#1" /><HeroStat icon={Clock3} label="تحديات جديدة" value={visibleCompetitions.length} /><HeroStat icon={Users} label="طلاب متنافسون" value={leaderboard.length} /></div></div></section>

    {selected ? <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8"><button onClick={() => setSelected(null)} className="mb-5 text-sm font-bold text-cyan-700">العودة إلى التحديات</button><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex items-center gap-2 text-xs font-bold text-cyan-600"><Zap className="h-4 w-4" /> تحدي مباشر</div><h2 className="mt-2 text-2xl font-extrabold text-slate-900">{selected.title}</h2><p className="mt-2 text-sm text-slate-500">{selected.description || 'أجب عن الأسئلة واجمع نقاطك في لوحة الشرف.'}</p></div><span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">{questions.length} أسئلة</span></div>{result ? <ResultCard score={result.score} points={result.points} /> : <div className="mt-7 space-y-5">{questions.map((question, index) => <div key={question.id} className="rounded-2xl border border-slate-200 p-5"><div className="mb-4 flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cyan-50 text-xs font-extrabold text-cyan-700">{index + 1}</span><h3 className="font-bold leading-7 text-slate-800">{question.question}</h3></div><div className="grid gap-2 sm:grid-cols-2">{question.options.map((option, optionIndex) => <button key={optionIndex} onClick={() => setAnswers((current) => ({ ...current, [question.id]: optionIndex }))} className={`rounded-xl border px-4 py-3 text-right text-sm font-semibold transition ${answers[question.id] === optionIndex ? 'border-cyan-500 bg-cyan-50 text-cyan-800' : 'border-slate-200 text-slate-600 hover:border-cyan-300 hover:bg-cyan-50/40'}`}>{option}</button>)}</div></div>)}{questions.length > 0 && <button onClick={() => void submitCompetition()} disabled={!user || submitting || Object.keys(answers).length !== questions.length} className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3.5 text-sm font-extrabold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40">{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}{user ? 'إرسال الإجابات وحساب النتيجة' : 'سجل دخولك للمشاركة'}</button>}</div>}</section> : <div className="mt-8 grid gap-8 lg:grid-cols-[1.35fr_0.65fr]"><section><div className="mb-5 flex items-end justify-between"><div><p className="text-sm font-bold text-cyan-600">تحديات متاحة لك</p><h2 className="mt-1 text-2xl font-extrabold text-slate-900">اختر منافستك</h2></div><Zap className="h-7 w-7 text-amber-500" /></div>{loading ? <div className="flex justify-center rounded-2xl bg-white p-12"><Loader2 className="h-7 w-7 animate-spin text-cyan-600" /></div> : visibleCompetitions.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">لا توجد منافسات منشورة لمرحلتك حاليًا.</div> : <div className="grid gap-4 sm:grid-cols-2">{visibleCompetitions.map((competition) => <button key={competition.id} onClick={() => void openCompetition(competition)} className="group rounded-2xl border border-slate-200 bg-white p-5 text-right shadow-sm transition hover:-translate-y-1 hover:border-cyan-300 hover:shadow-lg"><div className="flex items-start justify-between gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600"><Gamepad2 className="h-5 w-5" /></div><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">مفتوحة</span></div><h3 className="mt-5 font-extrabold text-slate-800 group-hover:text-cyan-700">{competition.title}</h3><p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">{competition.description || 'تحدي جديد في انتظارك.'}</p><div className="mt-5 flex items-center justify-between text-xs font-bold text-slate-400"><span>{getEducationStageLabel(competition.education_stage)}</span><span className="flex items-center gap-1 text-cyan-600">ابدأ الآن <ChevronLeft className="h-3 w-3" /></span></div></button>)}</div>}</section><aside className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"><div className="flex items-center gap-2"><Crown className="h-5 w-5 text-amber-500" /><h2 className="font-extrabold text-slate-900">أبطال المرحلة</h2></div><p className="mt-1 text-xs text-slate-400">{profile?.education_stage ? getEducationStageLabel(profile.education_stage) : 'الترتيب العام'}</p><div className="mt-5 space-y-3">{topStudents.map((student, index) => <div key={student.student_id} className={`flex items-center gap-3 rounded-xl p-3 ${index === 0 ? 'bg-amber-50' : 'bg-slate-50'}`}><div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-xs font-extrabold text-slate-700 shadow-sm">{index === 0 ? <Medal className="h-4 w-4 text-amber-500" /> : index + 1}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-slate-800">{student.full_name}</p><p className="text-[11px] text-slate-400">{student.competitions_played} منافسات</p></div><span className="text-sm font-extrabold text-cyan-700">{student.points}</span></div>)}{topStudents.length === 0 && <p className="py-8 text-center text-sm text-slate-400">ابدأ المنافسة لتظهر لوحة الشرف.</p>}</div><Link to="/" className="mt-5 flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-xs font-bold text-slate-600 hover:bg-slate-50">عرض تكريم الأوائل <ChevronLeft className="h-4 w-4" /></Link></aside></div>}
  </div></div>;
}

function HeroStat({ icon: Icon, label, value }: { icon: typeof Zap; label: string; value: number | string }) { return <div className="rounded-2xl border border-white/10 bg-white/10 p-4"><Icon className="h-5 w-5 text-cyan-300" /><div className="mt-3 text-2xl font-extrabold">{value}</div><div className="mt-1 text-xs text-slate-400">{label}</div></div>; }
function ResultCard({ score, points }: { score: number; points: number }) { return <div className="mt-8 rounded-2xl bg-gradient-to-br from-emerald-50 to-cyan-50 p-8 text-center"><CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" /><h3 className="mt-3 text-2xl font-extrabold text-slate-900">أحسنت! تم تسجيل نتيجتك</h3><div className="mt-5 flex justify-center gap-8"><div><div className="text-3xl font-extrabold text-cyan-700">{score}%</div><div className="text-xs text-slate-500">النتيجة</div></div><div><div className="text-3xl font-extrabold text-amber-600">+{points}</div><div className="text-xs text-slate-500">نقاط</div></div></div></div>; }
