import { useEffect, useState } from 'react';
import { Swords, X, Loader2, CheckCircle2 } from 'lucide-react';
import { REALISTIC_RIVALS, getLeagueByPoints, type RealisticRival } from '@/lib/arena';

interface ArenaMatchmakerProps {
  isOpen: boolean;
  onClose: () => void;
  onMatchFound: (opponent: RealisticRival) => void;
  userPoints?: number;
}

export default function ArenaMatchmaker({ isOpen, onClose, onMatchFound, userPoints = 150 }: ArenaMatchmakerProps) {
  const [secondsWaiting, setSecondsWaiting] = useState(0);
  const [status, setStatus] = useState<'searching' | 'matched'>('searching');
  const [matchedOpponent, setMatchedOpponent] = useState<RealisticRival | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setSecondsWaiting(0);
      setStatus('searching');
      setMatchedOpponent(null);
      return;
    }

    const interval = setInterval(() => {
      setSecondsWaiting((prev) => prev + 1);
    }, 1000);

    // Auto-match after 10 seconds or random simulated time
    const matchTimer = setTimeout(() => {
      triggerMatch();
    }, 7000 + Math.random() * 5000);

    return () => {
      clearInterval(interval);
      clearTimeout(matchTimer);
    };
  }, [isOpen]);

  const triggerMatch = () => {
    const randomRival = REALISTIC_RIVALS[Math.floor(Math.random() * REALISTIC_RIVALS.length)];
    setMatchedOpponent(randomRival);
    setStatus('matched');
  };

  const handleStartBattle = () => {
    if (matchedOpponent) {
      onMatchFound(matchedOpponent);
    }
  };

  if (!isOpen) return null;

  const myLeague = getLeagueByPoints(userPoints);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg rounded-3xl border border-cyan-500/30 bg-gradient-to-br from-slate-950 via-[#0a1220] to-slate-900 p-6 text-white shadow-2xl sm:p-8">
        <button
          onClick={onClose}
          className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-slate-300 transition hover:bg-white/20"
        >
          <X className="h-5 w-5" />
        </button>

        {status === 'searching' ? (
          <div className="py-6 text-center">
            {/* Animated Matchmaker Radar */}
            <div className="relative mx-auto mb-6 flex h-32 w-32 items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-cyan-500/20 animate-ping" />
              <div className="absolute inset-2 rounded-full border-2 border-cyan-400/40 animate-pulse" />
              <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 shadow-xl shadow-cyan-500/30">
                <Swords className="h-10 w-10 text-white animate-bounce" />
              </div>
            </div>

            <h3 className="text-2xl font-black text-white">جاري البحث عن طالب أونلاين لمواجهته 1v1...</h3>
            <p className="mt-2 text-xs font-semibold text-slate-400">
              نبحث في الساحة عن منافس بنفس مستواك التعليمي ({myLeague.name} {myLeague.icon})
            </p>

            <div className="mt-6 flex items-center justify-center gap-2 text-sm font-extrabold text-cyan-400">
              <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
              <span>وقت الانتظار: {secondsWaiting} ثانية</span>
            </div>

            <div className="mt-8 flex justify-center gap-3 border-t border-white/10 pt-5">
              <button
                type="button"
                onClick={triggerMatch}
                className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2.5 text-xs font-extrabold text-white shadow-md hover:scale-105 transition-all"
              >
                ⚡ مطابقة فورية الآن
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-xs font-extrabold text-slate-300 hover:bg-white/20 transition-all"
              >
                إلغاء
              </button>
            </div>
          </div>
        ) : (
          /* Match Found View */
          <div className="py-4 text-center animate-fadeIn">
            <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 px-4 py-1 text-xs font-extrabold text-emerald-300">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" /> تم عثور على منافس متوافق!
            </div>

            <div className="my-6 grid grid-cols-2 gap-4 items-center">
              {/* You */}
              <div className="rounded-2xl border border-cyan-500/40 bg-white/5 p-4 text-center">
                <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-600 text-2xl shadow-lg">
                  👨‍🎓
                </div>
                <div className="text-sm font-extrabold text-white">أنت</div>
                <div className="mt-1 text-[11px] font-semibold text-cyan-300">
                  {myLeague.icon} {myLeague.name}
                </div>
              </div>

              {/* VS Opponent */}
              {matchedOpponent && (
                <div className="rounded-2xl border border-rose-500/40 bg-white/5 p-4 text-center">
                  <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-600 text-2xl shadow-lg">
                    {matchedOpponent.avatar}
                  </div>
                  <div className="text-sm font-extrabold text-white">{matchedOpponent.name}</div>
                  <div className="mt-1 text-[11px] font-semibold text-rose-300">
                    {matchedOpponent.league.icon} {matchedOpponent.league.name}
                  </div>
                </div>
              )}
            </div>

            <p className="text-xs font-bold text-slate-300 mb-6">
              المواجهة جاهزة! 15 ثانية لكل سؤال + نقاط الـ Combo والسرعة مضاعفة.
            </p>

            <button
              onClick={handleStartBattle}
              className="w-full rounded-2xl bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 py-3.5 text-base font-black text-white shadow-xl shadow-cyan-500/30 transition hover:scale-105"
            >
              🚀 ابدأ المعركة الآن!
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
