import { useEffect, useMemo, useState, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ChevronLeft, Clock, Crown, Gamepad2, Loader2, Medal, Trophy, Zap,
  Swords, Flame, Timer, RefreshCw, Volume2, VolumeX, ShieldAlert, ArrowLeft
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { getEducationStageLabel } from '@/lib/education';
import MetaTags from '@/components/MetaTags';
import type { Competition, CompetitionQuestion, StudentSubjectLeaderboard } from '@/types';
import { addWatchedTime } from '@/lib/streak';
import ArenaMatchmaker from '@/components/ArenaMatchmaker';
import { getLeagueByPoints, type RealisticRival } from '@/lib/arena';
import { soundEngine } from '@/lib/soundFX';
import { STAGE_GROUPS } from '@/lib/education';

type GameMode = 'solo' | 'duel';

interface DuelOpponent {
  name: string;
  avatar: string;
  score: number;
  currentQuestion: number;
}

export default function CompetitionsPage() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const isTeacher = Boolean(profile?.is_teacher);
  const [searchParams] = useSearchParams();
  const compParam = searchParams.get('comp');
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [leaderboard, setLeaderboard] = useState<StudentSubjectLeaderboard[]>([]);
  const [selected, setSelected] = useState<Competition | null>(null);
  const [questions, setQuestions] = useState<CompetitionQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false); // eslint-disable-line @typescript-eslint/no-unused-vars

  // Stage Filter
  const [selectedStageFilter, setSelectedStageFilter] = useState<string>(profile?.education_stage || 'all');

  // Matchmaker state
  const [showMatchmaker, setShowMatchmaker] = useState(false);
  const [pendingCompetition, setPendingCompetition] = useState<Competition | null>(null);

  // Game Engine State
  const [gameMode, setGameMode] = useState<GameMode>('solo');
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [timeLeft, setTimeLeft] = useState(15);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [score, setScore] = useState(0);
  const [speedBonus, setSpeedBonus] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameFinished, setGameFinished] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Boosters State
  const [fiftyFiftyUsed, setFiftyFiftyUsed] = useState(false);
  const [timeFreezeUsed, setTimeFreezeUsed] = useState(false);
  const [shieldActive, setShieldActive] = useState(false);
  const [shieldUsed, setShieldUsed] = useState(false);
  const [hiddenOptions, setHiddenOptions] = useState<number[]>([]);

  // 1v1 Duel opponent simulation
  const [opponent, setOpponent] = useState<DuelOpponent | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const opponentTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    soundEngine.enabled = soundEnabled;
  }, [soundEnabled]);

  useEffect(() => {
    (async () => {
      const [competitionResult, leaderboardResult] = await Promise.all([
        supabase.from('competitions').select('*').eq('status', 'published').order('created_at', { ascending: false }),
        supabase.from('student_subject_leaderboard').select('*').order('subject_rank', { ascending: true }).limit(30),
      ]);
      const loadedComps = (competitionResult.data ?? []) as Competition[];
      setCompetitions(loadedComps);
      setLeaderboard((leaderboardResult.data ?? []) as StudentSubjectLeaderboard[]);
      setLoading(false);

      if (compParam && !profile?.is_teacher) {
        const found = loadedComps.find((c) => c.id === compParam);
        if (found) {
          void triggerGameStart(found, 'solo');
        }
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compParam, profile?.is_teacher]);

  const visibleCompetitions = useMemo(
    () =>
      competitions.filter(
        (competition) =>
          selectedStageFilter === 'all' || !competition.education_stage || competition.education_stage === selectedStageFilter
      ),
    [competitions, selectedStageFilter]
  );

  const triggerGameStart = (competition: Competition, mode: GameMode) => {
    if (isTeacher) {
      toast('المسابقات والمواجهات التنافسية مخصصة للطلاب فقط. يمكنك متابعة نتائج طلابك من لوحة التحكم.', 'info');
      return;
    }
    if (mode === 'duel') {
      setPendingCompetition(competition);
      setShowMatchmaker(true);
    } else {
      void launchBattleWithRival(competition, 'solo', null);
    }
  };

  const launchBattleWithRival = async (competition: Competition, mode: GameMode, rival: RealisticRival | null) => {
    if (rival) soundEngine.playMatchFound();
    setShowMatchmaker(false);
    setSelected(competition);
    setGameMode(mode);
    setCurrentQIndex(0);
    setAnswers({});
    setCombo(0);
    setMaxCombo(0);
    setScore(0);
    setSpeedBonus(0);
    setGameFinished(false);
    setIsPlaying(true);
    setTimeLeft(15);

    // Reset boosters
    setFiftyFiftyUsed(false);
    setTimeFreezeUsed(false);
    setShieldActive(false);
    setShieldUsed(false);
    setHiddenOptions([]);

    const { data } = await supabase
      .from('competition_questions_public')
      .select('*')
      .eq('competition_id', competition.id)
      .order('sort_order', { ascending: true });

    const loadedQ = (data ?? []) as CompetitionQuestion[];
    setQuestions(loadedQ);

    if (mode === 'duel' && rival) {
      setOpponent({
        name: rival.name,
        avatar: rival.avatar,
        score: 0,
        currentQuestion: 0,
      });
    } else {
      setOpponent(null);
    }
  };

  // Timer Countdown Logic
  useEffect(() => {
    if (!isPlaying || gameFinished || questions.length === 0) return;

    setTimeLeft(15);
    setHiddenOptions([]); // Reset hidden options for new question
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 4 && prev > 1) {
          soundEngine.playTimerTick();
        }
        if (prev <= 1) {
          clearInterval(timerRef.current as NodeJS.Timeout);
          handleTimeOut();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQIndex, isPlaying, gameFinished]);

  // Booster Handlers
  const useFiftyFifty = () => {
    if (fiftyFiftyUsed || !questions[currentQIndex]) return;
    soundEngine.playPowerupSound();
    setFiftyFiftyUsed(true);

    const currentQ = questions[currentQIndex];
    const wrongIndexes = currentQ.options
      .map((_, i) => i)
      .filter((i) => i !== currentQ.correct_option);

    // Shuffle and pick 2 wrong options to hide
    const toHide = wrongIndexes.sort(() => Math.random() - 0.5).slice(0, 2);
    setHiddenOptions(toHide);
  };

  const useTimeFreeze = () => {
    if (timeFreezeUsed) return;
    soundEngine.playPowerupSound();
    setTimeFreezeUsed(true);
    setTimeLeft((prev) => prev + 5);
  };

  const useShield = () => {
    if (shieldUsed) return;
    soundEngine.playPowerupSound();
    setShieldUsed(true);
    setShieldActive(true);
  };

  // Opponent AI behavior in 1v1 Duel
  useEffect(() => {
    if (gameMode !== 'duel' || !isPlaying || gameFinished || !opponent) return;

    if (opponentTimerRef.current) clearInterval(opponentTimerRef.current);

    const answerDelay = Math.floor(Math.random() * 4000) + 3000;

    opponentTimerRef.current = setTimeout(() => {
      const isCorrect = Math.random() > 0.35;
      setOpponent((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          score: prev.score + (isCorrect ? 10 + Math.floor(Math.random() * 5) : 0),
          currentQuestion: Math.min(questions.length, prev.currentQuestion + 1),
        };
      });
    }, answerDelay);

    return () => {
      if (opponentTimerRef.current) clearTimeout(opponentTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQIndex, gameMode, isPlaying, gameFinished]);

  const handleTimeOut = () => {
    soundEngine.playWrongSound();
    if (!shieldActive) {
      setCombo(0);
    } else {
      setShieldActive(false); // Shield consumed
    }
    advanceQuestion();
  };

  const selectAnswer = (optionIndex: number) => {
    if (!isPlaying || gameFinished || !questions[currentQIndex]) return;

    const currentQ = questions[currentQIndex];
    const isCorrect = optionIndex === currentQ.correct_option;

    setAnswers((prev) => ({ ...prev, [currentQ.id]: optionIndex }));

    if (isCorrect) {
      soundEngine.playCorrectSound();
      const newCombo = combo + 1;
      setCombo(newCombo);
      if (newCombo > maxCombo) setMaxCombo(newCombo);

      let bonus = 0;
      if (timeLeft >= 10) {
        bonus = 5;
        setSpeedBonus((prev) => prev + 5);
      }

      const pointsEarned = 10 + bonus + (newCombo > 1 ? newCombo * 2 : 0);
      setScore((prev) => prev + pointsEarned);
    } else {
      soundEngine.playWrongSound();
      if (shieldActive) {
        setShieldActive(false); // Shield consumed, keep combo!
      } else {
        setCombo(0);
      }
    }

    advanceQuestion();
  };


  const advanceQuestion = () => {
    if (currentQIndex < questions.length - 1) {
      setCurrentQIndex((prev) => prev + 1);
    } else {
      finishGame();
    }
  };

  const finishGame = async () => {
    setIsPlaying(false);
    setGameFinished(true);
    if (timerRef.current) clearInterval(timerRef.current);
    if (opponentTimerRef.current) clearTimeout(opponentTimerRef.current);

    // Save points to user profile & streak
    addWatchedTime(2); // Add streak time

    if (user && selected) {
      setSubmitting(true);
      try {
        await supabase.rpc('submit_competition_attempt', {
          target_competition_id: selected.id,
          submitted_answers: answers,
          duration: 15 * questions.length - timeLeft,
        });
      } catch (err) {
        console.error('Error submitting attempt:', err);
      } finally {
        setSubmitting(false);
      }
    }
  };

  const topStudents = leaderboard.filter((student) => student.subject_rank === 1).slice(0, 5);

  return (
    <div className="min-h-screen bg-slate-50 pb-16 pt-[4.5rem] dark:bg-slate-900">
      <MetaTags
        title="ساحة التحدي التفاعلية 1v1 | منصة العلم"
        description="نافس الطلاب في مواجهات حية 1v1 وتحديات ضد الوقت، اجمع النقاط، وارتقِ في ترتيب الأبطال"
      />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Top Hero Banner */}
        {!selected && (
          <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950 via-[#0d1527] to-slate-900 px-4 py-7 text-white shadow-2xl ring-1 ring-white/10 sm:rounded-3xl sm:px-10 sm:py-10">
            <div className="pointer-events-none absolute -left-20 -top-24 h-80 w-80 rounded-full bg-cyan-400/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-36 -right-24 h-96 w-96 rounded-full bg-blue-600/20 blur-3xl" />

            <div className="relative grid items-center gap-8 lg:grid-cols-[1.2fr_0.8fr]">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-xs font-extrabold text-cyan-300 shadow-sm backdrop-blur-sm sm:text-sm">
                  <Swords className="h-4 w-4 text-cyan-400 animate-pulse" />
                  ساحة التحدي المباشر Pro Battle Arena
                </div>
                <h1 className="text-2xl font-extrabold leading-tight text-white sm:text-3xl lg:text-5xl">
                  تحدَّ زُملاءك في مواجهات <span className="bg-gradient-to-r from-cyan-300 via-blue-400 to-indigo-300 bg-clip-text text-transparent">حاشدة و1v1 حية</span>
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                  اختر نمط اللعب، واجه التحديات ضد المؤقت أو ضد منافسيك في الوقت الفعلي، واجمع نقاط السرعة والـ Combos لتقود لوحة الشرف!
                </p>
                {isTeacher && (
                  <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-2.5 text-xs font-bold text-amber-300">
                    <ShieldAlert className="h-4 w-4 text-amber-400 shrink-0" />
                    ملاحظة للمدرسين: ساحة المواجهات والألعاب مخصصة للطلاب فقط. يمكنك إنشاء وإدارة المسابقات من لوحة التحكم.
                  </div>
                )}
                <div className="mt-7 flex flex-wrap items-center gap-3">
                  <a
                    href="#competitions-list"
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 px-6 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-cyan-500/25 transition-all hover:scale-105"
                  >
                    <Gamepad2 className="h-5 w-5" /> دخول المعركة الآن
                  </a>
                  <Link
                    to="/dashboard"
                    className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-3.5 text-sm font-extrabold text-white backdrop-blur-sm transition hover:bg-white/20"
                  >
                    شاهد إنجازاتك <ChevronLeft className="h-4 w-4" />
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <HeroStat icon={Zap} label="نقاط الإجابة والسرعة" value="+15" />
                <HeroStat icon={Swords} label="نمط مواجهة 1v1" value="مباشر ⚔️" />
                <HeroStat icon={Flame} label="مضاعفات الـ Combo" value="x5 🔥" />
                <HeroStat icon={Trophy} label="أبطال المتصدرين" value={leaderboard.length} />
              </div>
            </div>
          </section>
        )}

        {/* Selected Game Arena */}
        {selected ? (
          <section className="mt-6 rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900 sm:p-10">
            {/* Header / Top controls */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5 dark:border-slate-800">
              <button
                onClick={() => {
                  setSelected(null);
                  setIsPlaying(false);
                }}
                className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
              >
                <ArrowLeft className="h-4 w-4" /> مغادرة الساحة
              </button>

              <div className="flex items-center gap-4">
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  title={soundEnabled ? 'إيقاف الصوت' : 'تشغيل الصوت'}
                >
                  {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                </button>

                <div className="flex items-center gap-2 rounded-2xl bg-amber-50 px-4 py-2 text-sm font-extrabold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                  <Trophy className="h-4 w-4 text-amber-500" /> النقاط: {score}
                </div>
                {combo > 1 && (
                  <div className="flex items-center gap-1.5 rounded-2xl bg-orange-500 px-3.5 py-1.5 text-xs font-black text-white animate-bounce shadow-md shadow-orange-500/30">
                    <Flame className="h-4 w-4 fill-white" /> Combo x{combo}!
                  </div>
                )}
              </div>
            </div>

            {/* Game Screen: Playing */}
            {isPlaying && !gameFinished && questions.length > 0 && (
              <div className="space-y-6">
                {/* 1v1 Duel Health/Score Bar */}
                {gameMode === 'duel' && opponent && (
                  <div className="rounded-2xl border border-cyan-200/80 bg-gradient-to-r from-blue-50 via-cyan-50 to-indigo-50 p-4 shadow-sm dark:border-slate-800 dark:from-slate-850 dark:via-slate-900 dark:to-slate-900">
                    <div className="mb-2 text-center text-xs font-bold text-cyan-800 dark:text-cyan-300">
                      ⚔️ مواجهة مباشرة 1v1 حية
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {/* You */}
                      <div className="rounded-xl border border-blue-200 bg-white p-3 text-right shadow-sm dark:border-slate-700 dark:bg-slate-800">
                        <div className="flex items-center justify-between text-xs font-extrabold text-blue-600">
                          <span>أنت ({profile?.full_name?.split(' ')[0] ?? 'أنت'})</span>
                          <span>{score} نقطة</span>
                        </div>
                        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                          <div
                            className="h-full bg-blue-600 transition-all duration-300"
                            style={{ width: `${Math.min(100, (currentQIndex / questions.length) * 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* Opponent */}
                      <div className="rounded-xl border border-rose-200 bg-white p-3 text-right shadow-sm dark:border-slate-700 dark:bg-slate-800">
                        <div className="flex items-center justify-between text-xs font-extrabold text-rose-600">
                          <span>
                            {opponent.avatar} {opponent.name}
                          </span>
                          <span>{opponent.score} نقطة</span>
                        </div>
                        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                          <div
                            className="h-full bg-rose-500 transition-all duration-300"
                            style={{ width: `${Math.min(100, (opponent.currentQuestion / questions.length) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Countdown Timer Bar */}
                <div className="relative">
                  <div className="mb-2 flex items-center justify-between text-xs font-extrabold text-slate-600 dark:text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <Timer className={`h-4 w-4 ${timeLeft <= 5 ? 'text-rose-500 animate-spin' : 'text-cyan-600'}`} />
                      الوقت المتبقي: {timeLeft} ثانية
                    </span>
                    <span>
                      سؤال {currentQIndex + 1} من {questions.length}
                    </span>
                  </div>
                  <div className="h-3.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className={`h-full transition-all duration-1000 ${
                        timeLeft > 8 ? 'bg-gradient-to-r from-emerald-500 to-cyan-500' : timeLeft > 4 ? 'bg-amber-500' : 'bg-rose-500 animate-pulse'
                      }`}
                      style={{ width: `${(timeLeft / 15) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Question Card & Boosters */}
                <div className="rounded-3xl border border-slate-200/80 bg-slate-50/50 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-850 sm:p-8">
                  {/* Boosters Bar */}
                  <div className="mb-6 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 pb-4 dark:border-slate-800">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">وسائل المساعدة (Power-ups):</span>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={useFiftyFifty}
                        disabled={fiftyFiftyUsed}
                        className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-extrabold shadow-sm transition ${
                          fiftyFiftyUsed
                            ? 'border-slate-200 bg-slate-100 text-slate-400 opacity-50 dark:border-slate-800 dark:bg-slate-800'
                            : 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-300'
                        }`}
                      >
                        💡 50:50 {fiftyFiftyUsed && '(مُستخدم)'}
                      </button>

                      <button
                        type="button"
                        onClick={useTimeFreeze}
                        disabled={timeFreezeUsed}
                        className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-extrabold shadow-sm transition ${
                          timeFreezeUsed
                            ? 'border-slate-200 bg-slate-100 text-slate-400 opacity-50 dark:border-slate-800 dark:bg-slate-800'
                            : 'border-cyan-300 bg-cyan-50 text-cyan-800 hover:bg-cyan-100 dark:border-cyan-900/40 dark:bg-cyan-950/40 dark:text-cyan-300'
                        }`}
                      >
                        ⏱️ +5s تجميد الوقت {timeFreezeUsed && '(مُستخدم)'}
                      </button>

                      <button
                        type="button"
                        onClick={useShield}
                        disabled={shieldUsed}
                        className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-extrabold shadow-sm transition ${
                          shieldActive
                            ? 'border-emerald-400 bg-emerald-500 text-white animate-pulse'
                            : shieldUsed
                            ? 'border-slate-200 bg-slate-100 text-slate-400 opacity-50 dark:border-slate-800 dark:bg-slate-800'
                            : 'border-indigo-300 bg-indigo-50 text-indigo-800 hover:bg-indigo-100 dark:border-indigo-900/40 dark:bg-indigo-950/40 dark:text-indigo-300'
                        }`}
                      >
                        🛡️ درع الـ Combo {shieldActive ? '(مُفعل 🔥)' : shieldUsed ? '(مُستخدم)' : ''}
                      </button>
                    </div>
                  </div>

                  <div className="mb-6 flex items-start gap-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-cyan-600 text-lg font-black text-white shadow-md shadow-cyan-600/25">
                      {currentQIndex + 1}
                    </span>
                    <h3 className="text-xl font-extrabold leading-snug text-slate-900 dark:text-white sm:text-2xl">
                      {questions[currentQIndex].question}
                    </h3>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {questions[currentQIndex].options.map((option, idx) => {
                      const isHidden = hiddenOptions.includes(idx);
                      if (isHidden) {
                        return (
                          <div
                            key={idx}
                            className="rounded-2xl border border-dashed border-slate-200 bg-slate-100/50 p-5 text-center text-xs font-bold text-slate-400 dark:text-slate-500 opacity-40 dark:border-slate-800 dark:bg-slate-800/30"
                          >
                            ❌ تم حذف الخيار (50:50)
                          </div>
                        );
                      }

                      return (
                        <button
                          key={idx}
                          onClick={() => selectAnswer(idx)}
                          className="group relative rounded-2xl border border-slate-200/90 bg-white p-5 text-right font-bold text-slate-800 shadow-sm transition-all hover:-translate-y-0.5 hover:border-cyan-400 hover:bg-cyan-50/50 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-cyan-500/60 dark:hover:bg-slate-750"
                        >
                          <div className="flex items-center gap-3">
                            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-xs font-extrabold text-slate-600 group-hover:bg-cyan-600 group-hover:text-white dark:bg-slate-700 dark:text-slate-300">
                              {['أ', 'ب', 'ج', 'د'][idx] ?? idx + 1}
                            </span>
                            <span className="text-base font-extrabold">{option}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Victory / Game Finished Screen */}
            {gameFinished && (
              <div className="py-8 text-center animate-fadeIn">
                <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 shadow-xl shadow-orange-500/30">
                  <Trophy className="h-10 w-10 text-white animate-bounce" />
                </div>
                <h2 className="text-3xl font-black text-slate-900 dark:text-white">
                  {gameMode === 'duel' && opponent && score > opponent.score ? '🎉 مبروك! انتصرت في المواجهة!' : 'أحسنت! اكتمل التحدي بنجاح!'}
                </h2>
                <p className="mt-2 text-slate-500 dark:text-slate-400">
                  تم تسجيل إنجازك بنجاح وسُجلت النقاط في حسابك المباشر.
                </p>

                <div className="mx-auto mt-8 grid max-w-xl grid-cols-2 gap-4 sm:grid-cols-4">
                  <ResultStat label="إجمالي النقاط" value={`+${score}`} color="amber" />
                  <ResultStat label="أعلى Combo" value={`x${maxCombo}`} color="orange" />
                  <ResultStat label="مكافآت السرعة" value={`+${speedBonus}`} color="cyan" />
                  <ResultStat label="النمط" value={gameMode === 'duel' ? 'مواجهة 1v1' : 'فردي'} color="emerald" />
                </div>

                <div className="mt-8 flex justify-center gap-3">
                  <button
                    onClick={() => selected && triggerGameStart(selected, gameMode)}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-cyan-500/25 transition hover:scale-105"
                  >
                    <RefreshCw className="h-4 w-4" /> اللعب مرة أخرى
                  </button>
                  <button
                    onClick={() => {
                      setSelected(null);
                      setIsPlaying(false);
                    }}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-extrabold text-slate-700 transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200"
                  >
                    العودة للتحديات
                  </button>
                </div>
              </div>
            )}
          </section>
        ) : (
          /* Competitions Directory & Game Mode Selector */
          <div className="mt-8 grid gap-8 lg:grid-cols-[1.35fr_0.65fr]" id="competitions-list">
            <section>
              <div className="mb-6 flex items-end justify-between">
                <div>
                  <p className="text-xs font-extrabold text-cyan-600 dark:text-cyan-400">اختر نوع التحدي للبدء</p>
                  <h2 className="mt-1 text-2xl font-black text-slate-900 dark:text-white">المنافسات المتاحة</h2>
                </div>
                <Zap className="h-7 w-7 text-amber-500" />
              </div>

              {/* Educational Stage Filter Bar Grouped */}
              <div className="mb-6 space-y-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">تخصيص الأسئلة والمواجهة حسب المرحلة:</span>
                  {selectedStageFilter !== 'all' && (
                    <button
                      type="button"
                      onClick={() => setSelectedStageFilter('all')}
                      className="text-xs font-semibold text-cyan-600 hover:underline dark:text-cyan-400"
                    >
                      عرض جميع المراحل
                    </button>
                  )}
                </div>
                <div className="space-y-3">
                  {STAGE_GROUPS.map((group) => (
                    <div key={group.key} className="space-y-1.5">
                      <h4 className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400">{group.name}</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {group.stages.map((stage) => (
                          <button
                            key={stage.value}
                            type="button"
                            onClick={() => setSelectedStageFilter(stage.value)}
                            className={`rounded-xl px-3 py-1.5 text-xs font-extrabold transition-all ${
                              selectedStageFilter === stage.value
                                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/20 ring-2 ring-cyan-500/30'
                                : 'bg-slate-50 text-slate-700 border border-slate-200/80 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-750'
                            }`}
                          >
                            🎓 {stage.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {loading ? (
                <div className="flex justify-center rounded-3xl bg-white p-12 shadow-sm dark:bg-slate-900">
                  <Loader2 className="h-8 w-8 animate-spin text-cyan-600" />
                </div>
              ) : visibleCompetitions.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                  لا توجد منافسات منشورة لمرحلتك الدراسية حاليًا.
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {visibleCompetitions.map((competition) => (
                    <div
                      key={competition.id}
                      className="group rounded-3xl border border-slate-200/90 bg-white p-6 text-right shadow-sm transition-all hover:-translate-y-1 hover:border-cyan-300 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900 dark:hover:border-cyan-500/60"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20">
                          <Gamepad2 className="h-6 w-6" />
                        </div>
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                          مفتوحة للمنافسة
                        </span>
                      </div>

                      <h3 className="mt-4 text-lg font-extrabold text-slate-900 group-hover:text-cyan-600 dark:text-white dark:group-hover:text-cyan-400">
                        {competition.title}
                      </h3>
                      <p className="mt-1.5 line-clamp-2 text-xs leading-6 text-slate-500 dark:text-slate-400">
                        {competition.description || 'تحدي معرفي جديد في انتظارك لجمع النقاط.'}
                      </p>

                      {isTeacher ? (
                        <div className="mt-6 flex items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/30 p-3 border border-amber-200/80 dark:border-amber-900/40 text-xs font-bold text-amber-800 dark:text-amber-300 gap-2">
                          <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                          <span>دخول اللعبة التنافسية مخصص للطلاب فقط</span>
                        </div>
                      ) : (
                        <div className="mt-6 flex flex-col gap-2 border-t border-slate-100 pt-4 dark:border-slate-800 sm:flex-row">
                          <button
                            onClick={() => triggerGameStart(competition, 'solo')}
                            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2.5 text-xs font-extrabold text-white shadow-sm transition hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700"
                          >
                            <Clock className="h-3.5 w-3.5 text-cyan-400" /> فردي سريع
                          </button>
                          <button
                            onClick={() => triggerGameStart(competition, 'duel')}
                            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-3.5 py-2.5 text-xs font-extrabold text-white shadow-md shadow-cyan-500/20 transition hover:scale-105"
                          >
                            <Swords className="h-3.5 w-3.5" /> مواجهة 1v1
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Sidebar Leaderboard */}
            <aside className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-2">
                <Crown className="h-6 w-6 text-amber-500" />
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">أبطال لوحة الشرف</h2>
              </div>
              <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                {profile?.education_stage ? getEducationStageLabel(profile.education_stage) : 'الترتيب العام للمرحلة'}
              </p>

              <div className="mt-5 space-y-3">
                {topStudents.map((student, index) => {
                  const studentLeague = getLeagueByPoints(student.points);
                  return (
                    <div
                      key={student.student_id}
                      className={`flex items-center gap-3 rounded-2xl p-3.5 transition-colors ${
                        index === 0
                          ? 'border border-amber-200 bg-amber-50/80 dark:border-amber-900/40 dark:bg-amber-950/40'
                          : 'bg-slate-50 dark:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-xs font-extrabold text-slate-800 shadow-sm dark:bg-slate-800 dark:text-slate-200">
                        {index === 0 ? <Medal className="h-5 w-5 text-amber-500" /> : index + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <p className="truncate text-sm font-extrabold text-slate-900 dark:text-white">
                            {student.full_name}
                          </p>
                          <span className="text-xs" title={studentLeague.name}>{studentLeague.icon}</span>
                        </div>
                        <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                          {student.competitions_played} مشاركات
                        </p>
                      </div>
                      <span className="text-sm font-extrabold text-cyan-600 dark:text-cyan-400">
                        {student.points} نقطة
                      </span>
                    </div>
                  );
                })}
                {topStudents.length === 0 && (
                  <p className="py-8 text-center text-xs font-semibold text-slate-400 dark:text-slate-500">
                    شارك في المنافسات لتكون أول الأبطال المتصدرين!
                  </p>
                )}
              </div>
            </aside>
          </div>
        )}
      </div>

      <ArenaMatchmaker
        isOpen={showMatchmaker}
        onClose={() => setShowMatchmaker(false)}
        onMatchFound={(rival) => {
          if (pendingCompetition) {
            void launchBattleWithRival(pendingCompetition, 'duel', rival);
          }
        }}
      />
    </div>
  );
}

function HeroStat({ icon: Icon, label, value }: { icon: typeof Zap; label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
      <Icon className="h-5 w-5 text-cyan-300" />
      <div className="mt-3 text-2xl font-extrabold text-white">{value}</div>
      <div className="mt-1 text-xs text-slate-300">{label}</div>
    </div>
  );
}

function ResultStat({ label, value, color }: { label: string; value: string; color: 'amber' | 'orange' | 'cyan' | 'emerald' }) {
  const colorClasses = {
    amber: 'text-amber-500',
    orange: 'text-orange-500',
    cyan: 'text-cyan-600',
    emerald: 'text-emerald-600',
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center dark:border-slate-800 dark:bg-slate-800">
      <div className={`text-2xl font-black ${colorClasses[color]}`}>{value}</div>
      <div className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">{label}</div>
    </div>
  );
}
