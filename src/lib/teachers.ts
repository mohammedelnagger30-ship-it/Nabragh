import type { Profile } from '@/types';

export const INTERNAL_TEACHER_ID = 'd0b3f927-0294-4d57-bee6-963133402b4d';

export function isPublicTeacher(teacher: Profile) {
  if (!teacher.is_teacher || !teacher.is_approved || teacher.is_manager) return false;
  const name = teacher.full_name.trim();
  if (/^(admin|administrator|مدير(?: النظام)?)$/i.test(name)) return false;
  if ((teacher.email ?? '').toLowerCase().startsWith('admin@')) return false;
  return true;
}
