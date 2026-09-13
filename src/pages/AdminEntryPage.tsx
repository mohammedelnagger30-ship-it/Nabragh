import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import AdminPage from './AdminPage';

export default function AdminEntryPage() {
  const { user, loading, isAdmin, profile } = useAuth();
  if (loading) return <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center text-sm text-slate-500">جاري التحقق من الصلاحيات...</div>;
  if (!user) return <Navigate to="/signin?next=/admin" replace />;
  if (isAdmin) return <AdminPage />;
  return <Navigate to={profile?.is_teacher ? '/admin/teacher' : '/dashboard'} replace />;
}