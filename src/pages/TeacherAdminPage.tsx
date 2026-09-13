import { useAuth } from '@/context/AuthContext';
import { Navigate } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { whatsappLink } from '@/lib/contact';
import DashboardPage from './DashboardPage';

export default function TeacherAdminPage() {
  const { user, loading, profile, isAdmin } = useAuth();
  if (loading) return <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center text-xs text-slate-500 sm:text-sm">جاري تجهيز مساحة المدرس...</div>;
  if (!user) return <Navigate to="/signin?next=/admin/teacher" replace />;
  if (isAdmin) return <Navigate to="/admin" replace />;
  if (!profile) return <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center text-xs text-slate-500 sm:text-sm">جاري تحميل بيانات الحساب...</div>;
  if (!profile.is_teacher) return <div className="mx-auto max-w-xl px-4 py-16 text-center sm:px-5 sm:py-24"><h1 className="text-xl font-extrabold sm:text-2xl">هذه مساحة المدرسين فقط</h1><p className="mt-3 text-xs text-slate-500 sm:text-sm">الحساب الحالي ليس حساب مدرس معتمد.</p></div>;
  if (!profile.is_approved) return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center sm:px-5 sm:py-24">
      <h1 className="text-xl font-extrabold sm:text-2xl">حسابك قيد المراجعة</h1>
      <p className="mt-3 text-xs leading-5 text-slate-500 sm:text-sm sm:leading-6">حسابك كمدرس قيد المراجعة من الإدارة. سيتم إشعارك عبر الإشعارات عند الموافقة.</p>
      <a
        href={whatsappLink('مرحباً، أريد التأكيد من حالة حسابي كمدرس في منصة العلم.') }
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-700 sm:mt-6 sm:px-5 sm:py-3 sm:text-sm"
      >
        <MessageCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        تواصل معنا للتأكيد
      </a>
    </div>
  );
  return <DashboardPage teacherWorkspace />;
}