import { ShieldCheck } from 'lucide-react';
import type { Profile } from '@/types';
import { isTrustedTeacher } from '@/lib/teachers';

export default function TrustedTeacherBadge({ teacher, avgRating = 0, reviewCount = 0, className = '' }: { teacher: Profile; avgRating?: number; reviewCount?: number; className?: string }) {
  const { trusted, reasons } = isTrustedTeacher(teacher, avgRating, reviewCount);
  if (!trusted) return null;
  return (
    <span
      title={reasons.join(' · ')}
      className={`inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 ${className}`}
    >
      <ShieldCheck className="h-3.5 w-3.5" />
      مدرس موثوق
    </span>
  );
}