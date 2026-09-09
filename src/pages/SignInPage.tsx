import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GraduationCap, Mail, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import PasswordField from '@/components/PasswordField';
import MetaTags from '@/components/MetaTags';

export default function SignInPage() {
  const { signIn, user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && profile) navigate(profile.is_teacher ? '/admin/teacher' : '/dashboard', { replace: true });
  }, [user, profile, navigate]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const { error: signInError } = await signIn(email, password);
    setLoading(false);
    if (signInError) {
      setError(signInError);
      toast(signInError, 'error');
    } else {
      toast('مرحباً بعودتك!', 'success');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-cyan-50/30 px-4 pb-10 pt-[6.5rem] dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 sm:pt-24">
      <MetaTags title="تسجيل الدخول | منصة العلم" description="سجّل دخولك إلى منصة العلم" />
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-xl shadow-slate-200/60 dark:border-slate-700 dark:bg-slate-800 dark:shadow-none sm:p-8">
          <div className="mb-8 flex flex-col items-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 shadow-lg shadow-blue-500/30">
              <GraduationCap className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">تسجيل الدخول</h1>
            <p className="mt-1 text-sm text-slate-500">مرحباً بعودتك إلى منصة العلم</p>
          </div>

          {error && (
            <div className="mb-6 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="signin-email" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">البريد الإلكتروني</label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  id="signin-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  autoComplete="email"
                  className="min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-4 pr-11 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                  placeholder="you@example.com"
                  dir="ltr"
                />
              </div>
            </div>

            <PasswordField id="signin-password" value={password} onChange={setPassword} />

            <button type="submit" disabled={loading} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 py-3 font-bold text-white shadow-md shadow-blue-500/25 transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60">
              {loading && <Loader2 className="h-5 w-5 animate-spin" />}
              دخول
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            <Link to="/forgot-password" className="mb-3 block font-semibold text-blue-600 hover:underline">نسيت كلمة المرور؟</Link>
            ليس لديك حساب؟{' '}
            <Link to="/signup" className="font-medium text-blue-600 hover:underline">أنشئ حساباً جديداً</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
