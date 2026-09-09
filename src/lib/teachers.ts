import type { Profile } from '@/types';

export function isPublicTeacher(teacher: Profile) {
  if (!teacher.is_teacher || !teacher.is_approved || teacher.is_manager) return false;
  const name = teacher.full_name.trim();
  if (/^(admin|administrator|مدير(?: النظام)?)$/i.test(name)) return false;
  if ((teacher.email ?? '').toLowerCase().startsWith('admin@')) return false;
  return true;
}
