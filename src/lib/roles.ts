import type { Profile } from '@/types';

export function homePath(p: Profile | null | undefined, isAdmin: boolean): string {
  if (isAdmin) return '/admin';
  if (p?.is_teacher) return '/admin/teacher';
  return '/dashboard';
}

export function roleLabel(p: Profile | null | undefined, isAdmin: boolean): string {
  if (isAdmin) return 'مدير الموقع';
  if (p?.is_teacher) return p.is_manager ? 'مدرس / مدير منصة' : 'مدرس';
  return 'طالب';
}