export interface ArenaLeague {
  id: 'bronze' | 'silver' | 'gold' | 'diamond' | 'legend';
  name: string;
  minPoints: number;
  icon: string;
  color: string;
  badgeBg: string;
}

export const ARENA_LEAGUES: ArenaLeague[] = [
  { id: 'bronze', name: 'دوري البرونز', minPoints: 0, icon: '🥉', color: 'text-amber-700', badgeBg: 'bg-amber-100 dark:bg-amber-950/40' },
  { id: 'silver', name: 'دوري الفضة', minPoints: 201, icon: '🥈', color: 'text-slate-500', badgeBg: 'bg-slate-200 dark:bg-slate-800' },
  { id: 'gold', name: 'دوري الذهب', minPoints: 501, icon: '🥇', color: 'text-amber-500', badgeBg: 'bg-amber-100 dark:bg-amber-900/40' },
  { id: 'diamond', name: 'دوري الماس', minPoints: 1001, icon: '💎', color: 'text-cyan-500', badgeBg: 'bg-cyan-100 dark:bg-cyan-950/40' },
  { id: 'legend', name: 'دوري الأسطورة', minPoints: 2001, icon: '👑', color: 'text-purple-600', badgeBg: 'bg-purple-100 dark:bg-purple-950/40' },
];

export function getLeagueByPoints(points: number): ArenaLeague {
  if (points >= 2001) return ARENA_LEAGUES[4];
  if (points >= 1001) return ARENA_LEAGUES[3];
  if (points >= 501) return ARENA_LEAGUES[2];
  if (points >= 201) return ARENA_LEAGUES[1];
  return ARENA_LEAGUES[0];
}

export interface RealisticRival {
  id: string;
  name: string;
  avatar: string;
  points: number;
  league: ArenaLeague;
  winRate: string;
}

export const REALISTIC_RIVALS: RealisticRival[] = [
  { id: 'r1', name: 'عمر الخالد', avatar: '👨‍🎓', points: 340, league: ARENA_LEAGUES[1], winRate: '78%' },
  { id: 'r2', name: 'سارة المحمود', avatar: '👩‍🎓', points: 680, league: ARENA_LEAGUES[2], winRate: '85%' },
  { id: 'r3', name: 'يوسف العتيبي', avatar: '🧑‍🎓', points: 1250, league: ARENA_LEAGUES[3], winRate: '92%' },
  { id: 'r4', name: 'مريم الزهراني', avatar: '👩‍🏫', points: 450, league: ARENA_LEAGUES[1], winRate: '81%' },
  { id: 'r5', name: 'خالد السعيد', avatar: '👨‍💻', points: 2150, league: ARENA_LEAGUES[4], winRate: '96%' },
];
