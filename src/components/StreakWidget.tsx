import { useEffect, useState } from 'react';
import { Flame, Trophy, Award, Zap, CheckCircle2 } from 'lucide-react';
import { loadStreakData, type StreakData } from '@/lib/streak';

export default function StreakWidget() {
  const [streakData, setStreakData] = useState<StreakData | null>(null);

  useEffect(() => {
    setStreakData(loadStreakData());
  }, []);

  if (!streakData) return null;

  return (
    <div className="rounded-3xl border border-blue-100/80 bg-gradient-to-br from-white via-blue-50/40 to-indigo-50/30 p-6 shadow-xl shadow-blue-500/5 dark:border-slate-800 dark:from-slate-850 dark:via-slate-900 dark:to-slate-900">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 shadow-lg shadow-orange-500/25">
            <Flame className="h-9 w-9 text-white animate-bounce" />
            <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-[11px] font-extrabold text-amber-300 ring-2 ring-white dark:ring-slate-900">
              {streakData.currentStreak}
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                تتابع التعلم اليومي
              </h3>
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100/80 px-2.5 py-0.5 text-xs font-bold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                <Zap className="h-3.5 w-3.5 fill-amber-500 text-amber-500" /> {streakData.currentStreak} أيام
              </span>
            </div>
            <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-400">
              واصل التعلم يومياً للحفاظ على شعلة التتابع وزيادة نقاط إنجازك!
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-center justify-center gap-1 text-amber-500">
              <Trophy className="h-4 w-4" />
              <span className="text-base font-extrabold text-slate-900 dark:text-white">{streakData.points}</span>
            </div>
            <div className="mt-0.5 text-[11px] font-bold text-slate-500 dark:text-slate-400">نقاطك الحالية</div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-center justify-center gap-1 text-indigo-600 dark:text-indigo-400">
              <Award className="h-4 w-4" />
              <span className="text-base font-extrabold text-slate-900 dark:text-white">
                {streakData.badges.filter((b) => b.unlocked).length}/{streakData.badges.length}
              </span>
            </div>
            <div className="mt-0.5 text-[11px] font-bold text-slate-500 dark:text-slate-400">الأوسمة المكتسبة</div>
          </div>
        </div>
      </div>

      {/* Badges List */}
      <div className="mt-6 border-t border-blue-100/70 pt-5 dark:border-slate-800">
        <div className="mb-3 text-xs font-bold text-slate-500 dark:text-slate-400">أوسمة الإنجاز الخاصة بك:</div>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          {streakData.badges.map((badge) => (
            <div
              key={badge.id}
              title={badge.description}
              className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-all ${
                badge.unlocked
                  ? 'border border-amber-200 bg-amber-50/80 text-amber-900 shadow-sm dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-300'
                  : 'border border-slate-200/60 bg-slate-100/60 text-slate-400 opacity-60 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-500'
              }`}
            >
              <span className="text-base">{badge.icon}</span>
              <span>{badge.name}</span>
              {badge.unlocked && <CheckCircle2 className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
