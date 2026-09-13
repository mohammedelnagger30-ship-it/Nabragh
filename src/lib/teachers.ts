import type { Profile } from '@/types';

export const INTERNAL_TEACHER_ID = 'd0b3f927-0294-4d57-bee6-963133402b4d';

export function isPublicTeacher(teacher: Profile) {
  if (!teacher.is_teacher || !teacher.is_approved || teacher.is_manager) return false;
  const name = teacher.full_name.trim();
  if (/^(admin|administrator|مدير(?: النظام)?)$/i.test(name)) return false;
  if ((teacher.email ?? '').toLowerCase().startsWith('admin@')) return false;
  return true;
}

export interface TeacherTrustScore {
  trusted: boolean;
  reasons: string[];
}

export function isTrustedTeacher(teacher: Profile, avgRating = 0, reviewCount = 0): TeacherTrustScore {
  const reasons: string[] = [];
  if (!isPublicTeacher(teacher)) return { trusted: false, reasons };
  if (teacher.is_verified) reasons.push('سيرة ذاتية موثقة');
  if (teacher.years_experience >= 5) reasons.push(`${teacher.years_experience} سنوات خبرة`);
  if (reviewCount > 0 && avgRating >= 4.5) reasons.push(`تقييم ${avgRating.toFixed(1)} من ${reviewCount} طالب`);
  return { trusted: reasons.length > 0, reasons };
}
