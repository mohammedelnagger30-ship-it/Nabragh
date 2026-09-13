import type { Profile, TeacherUsageStats } from '@/types';

export interface TeacherLimits {
  premium: boolean;
  maxVideos: number;
  maxCourses: number;
  canPublishAcademy: boolean;
  planLabel: string;
}

export function getTeacherLimits(tier?: Profile['teacher_tier']): TeacherLimits {
  const premium = tier === 'premium';
  return {
    premium,
    maxVideos: premium ? Infinity : 5,
    maxCourses: premium ? Infinity : 2,
    canPublishAcademy: premium,
    planLabel: premium ? 'بريميوم' : 'مجانية',
  };
}

export function parseUsageError(message: string | undefined): { limit: boolean; text: string } {
  if (message && message.includes('usage_limit')) {
    const text = message.replace(/^usage_limit:\s*/, '').trim();
    return { limit: true, text: text || 'وصلت للحد المسموح في خطتك الحالية' };
  }
  return { limit: false, text: message || '' };
}

export function usagePercent(used: number, limit: number): number {
  if (limit <= 0) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
}

export function isFreeAtLimit(used: number, limit: number): boolean {
  return limit > 0 && used >= limit;
}

export function emptyUsage(tier: Profile['teacher_tier']): TeacherUsageStats {
  const limits = getTeacherLimits(tier);
  return {
    tier: limits.premium ? 'premium' : 'free',
    videos_used: 0,
    courses_used: 0,
    videos_limit: limits.maxVideos === Infinity ? -1 : limits.maxVideos,
    courses_limit: limits.maxCourses === Infinity ? -1 : limits.maxCourses,
    academy_published: false,
  };
}