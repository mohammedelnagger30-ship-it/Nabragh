import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, Loader2, LockKeyhole, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import PasswordField from '@/components/PasswordField';
import MetaTags from '@/components/MetaTags';

export default function AdminLoginPage({ redirectTo = '/admin', portal = 'site' }: { redirectTo?: string; portal?: 'site' | 'teacher' }) {
  const { user, profile, isAdmin, loading, signIn } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user || loading) return;
    const allowed = portal === 'site' ? isAdmin : profile?.is_teacher;
    if (allowed) navigate(redirectTo, { replace: true });
  }, [isAdmin, loading, portal, profile?.is_teacher, redirectTo, user, navigate]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    const result = await signIn(email, password);
    setBusy(false);
    if (result.error) {
      setError(result.error);
      toast(result.error, 'error');
      return;
    }
    toast(portal === 'site' ? 'تم تسجيل الدخول إلى مركز الإدارة' : 'تم تسجيل الدخول إلى مساحة المدرس', 'success');
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <MetaTags title="دخول مركز الإدارة | منصة العلم" noIndex />
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-xl shadow-slate-300/30 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/30 sm:p-9">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-950 text-white dark:bg-blue-600"><ShieldCheck className="h-8 w-8" /></div>
          <h1 className="text-2xl font-extrabold">{portal === 'site' ? 'دخول مدير الموقع' : 'دخول المدرس'}</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{portal === 'site' ? 'بوابة مستقلة لإدارة الموقع والمدرسين' : 'بوابة مستقلة لإدارة محتواك وطلابك'}</p>
        </div>
        {error && <div role="alert" className="mb-5 flex items-center gap-2 rounded-xl bg-rose-50 px-3 py-3 text-sm text-rose-700 dark:bg-rose-900/20 dark:text-rose-300"><AlertCircle className="h-4 w-4" />{error}</div>}
        <form onSubmit={submit} className="space-y-5">
          <div><label htmlFor="admin-email" className="mb-1.5 block text-sm font-bold">البريد الخاص بالبوابة</label><input id="admin-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm dark:border-slate-700 dark:bg-slate-950" dir="ltr" /></div>
          <PasswordField id="admin-password" value={password} onChange={setPassword} />
          <button type="submit" disabled={busy} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 font-bold text-white transition hover:bg-slate-800 disabled:opacity-60 dark:bg-blue-600 dark:hover:bg-blue-700"><LockKeyhole className="h-4 w-4" />{busy && <Loader2 className="h-4 w-4 animate-spin" />} دخول آمن</button>
        </form>
        <p className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400"><Link to="/forgot-password" className="font-bold text-blue-600">استعادة كلمة المرور</Link></p>
      </div>
    </div>
  );
}