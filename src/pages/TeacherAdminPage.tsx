import { useAuth } from '@/context/AuthContext';
import { Link } from 'react-router-dom';
import AdminLoginPage from './AdminLoginPage';
import DashboardPage from './DashboardPage';

export default function TeacherAdminPage() {
  const { user, loading, profile, isAdmin } = useAuth();
  if (loading) return <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center text-sm text-slate-500">جاري تجهيز مساحة المدرس...</div>;
  if (!user) return <AdminLoginPage redirectTo="/admin/teacher" portal="teacher" />;
  if (isAdmin) return <div className="mx-auto max-w-xl px-5 py-24 text-center"><h1 className="text-2xl font-extrabold">غير مصرح بالوصول لهذه الصفحة</h1><p className="mt-3 text-sm text-slate-500">أنت مسجل كأدمن النظام. يرجى استخدام لوحة الإدارة الرئيسية من <Link to="/admin" className="text-blue-600 hover:underline">/admin</Link></p></div>;
  if (!profile?.is_teacher) return <div className="mx-auto max-w-xl px-5 py-24 text-center"><h1 className="text-2xl font-extrabold">هذه مساحة المدرسين فقط</h1><p className="mt-3 text-sm text-slate-500">الحساب الحالي ليس حساب مدرس معتمد.</p></div>;
  if (!profile?.is_approved) return <div className="mx-auto max-w-xl px-5 py-24 text-center"><h1 className="text-2xl font-extrabold">حسابك قيد المراجعة</h1><p className="mt-3 text-sm text-slate-500">حسابك كمعلم قيد المراجعة. سيتم إشعارك عند الموافقة.</p></div>;
  return <DashboardPage teacherWorkspace />;
}