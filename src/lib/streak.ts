export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: string;
}

export interface StreakData {
  currentStreak: number;
  bestStreak: number;
  lastActiveDate: string; // YYYY-MM-DD
  activeDaysHistory: string[]; // List of YYYY-MM-DD
  points: number;
  dailyGoalMinutes: number;
  todayWatchedMinutes: number;
  badges: Badge[];
}

const DEFAULT_BADGES: Badge[] = [
  { id: 'first_step', name: 'الخطوة الأولى', description: 'سجلت دخولك وبدأت التعلم لأول مرة', icon: '🚀', unlocked: true },
  { id: 'streak_3', name: 'شعلة النشاط', description: 'حافظت على التتابع لـ 3 أيام متتالية', icon: '🔥', unlocked: false },
  { id: 'streak_7', name: 'بطل الأسبوع', description: 'حافظت على التتابع لـ 7 أيام متتالية', icon: '⚡', unlocked: false },
  { id: 'study_master', name: 'مستكشف الدروس', description: 'شاهدت أكثر من 60 دقيقة تعلّم', icon: '🎓', unlocked: false },
  { id: 'quiz_hero', name: 'فارس التحديات', description: 'شاركت في المنافسات اليومية', icon: '🏆', unlocked: false },
];

const STORAGE_KEY = 'nabragh_student_streak_data';

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getYesterdayDateString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function loadStreakData(): StreakData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial: StreakData = {
        currentStreak: 1,
        bestStreak: 1,
        lastActiveDate: getTodayDateString(),
        activeDaysHistory: [getTodayDateString()],
        points: 50,
        dailyGoalMinutes: 15,
        todayWatchedMinutes: 0,
        badges: DEFAULT_BADGES,
      };
      saveStreakData(initial);
      return initial;
    }
    const data: StreakData = JSON.parse(raw);
    
    // Ensure all badges are present
    const existingBadgeIds = new Set(data.badges?.map((b) => b.id) ?? []);
    const mergedBadges = [
      ...(data.badges ?? []),
      ...DEFAULT_BADGES.filter((b) => !existingBadgeIds.has(b.id)),
    ];
    data.badges = mergedBadges;

    return checkAndUpdateStreak(data);
  } catch {
    const fallback: StreakData = {
      currentStreak: 1,
      bestStreak: 1,
      lastActiveDate: getTodayDateString(),
      activeDaysHistory: [getTodayDateString()],
      points: 50,
      dailyGoalMinutes: 15,
      todayWatchedMinutes: 0,
      badges: DEFAULT_BADGES,
    };
    return fallback;
  }
}

export function saveStreakData(data: StreakData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Error saving streak data:', err);
  }
}

function checkAndUpdateStreak(data: StreakData): StreakData {
  const today = getTodayDateString();
  const yesterday = getYesterdayDateString();

  if (data.lastActiveDate === today) {
    return data;
  }

  if (data.lastActiveDate === yesterday) {
    // Active yesterday, so streak increments today!
    data.currentStreak += 1;
    if (data.currentStreak > data.bestStreak) {
      data.bestStreak = data.currentStreak;
    }
    data.lastActiveDate = today;
    data.todayWatchedMinutes = 0;
    if (!data.activeDaysHistory.includes(today)) {
      data.activeDaysHistory.push(today);
    }
    data.points += 20; // Bonus points for daily streak
  } else {
    // Streak broken
    data.currentStreak = 1;
    data.lastActiveDate = today;
    data.todayWatchedMinutes = 0;
    if (!data.activeDaysHistory.includes(today)) {
      data.activeDaysHistory.push(today);
    }
  }

  // Check badges unlocking
  if (data.currentStreak >= 3) {
    const b = data.badges.find((item) => item.id === 'streak_3');
    if (b && !b.unlocked) b.unlocked = true;
  }
  if (data.currentStreak >= 7) {
    const b = data.badges.find((item) => item.id === 'streak_7');
    if (b && !b.unlocked) b.unlocked = true;
  }

  saveStreakData(data);
  return data;
}

export function addWatchedTime(minutes: number): StreakData {
  const data = loadStreakData();
  data.todayWatchedMinutes += minutes;
  data.points += minutes * 5;

  if (data.todayWatchedMinutes >= 60) {
    const b = data.badges.find((item) => item.id === 'study_master');
    if (b && !b.unlocked) b.unlocked = true;
  }

  saveStreakData(data);
  return data;
}
