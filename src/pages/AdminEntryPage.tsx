import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import AdminLoginPage from './AdminLoginPage';
import AdminPage from './AdminPage';

export default function AdminEntryPage() {
  const { user, loading, isAdmin } = useAuth();
  if (loading) return <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center text-sm text-slate-500">جاري التحقق من الصلاحيات...</div>;
  if (!user) return <AdminLoginPage portal="site" />;
  return isAdmin ? <AdminPage /> : <div className="mx-auto max-w-xl px-5 py-24 text-center"><h1 className="text-2xl font-extrabold">هذا الحساب ليس مديرًا للموقع</h1><p className="mt-3 text-sm text-slate-500">استخدم بوابة المدرس إذا كان لديك حساب مدرس معتمد.</p><Link to="/admin/teacher" className="mt-6 inline-flex rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white">الدخول إلى مساحة المدرس</Link></div>;
}