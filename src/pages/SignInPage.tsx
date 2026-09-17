import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { GraduationCap, Mail, AlertCircle, Loader2, Info } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { homePath, roleLabel } from '@/lib/roles';
import PasswordField from '@/components/PasswordField';
import MetaTags from '@/components/MetaTags';

const DEMO_ACCOUNTS = [
  {
    label: 'حساب مدرس تجريبي',
    description: 'الأستاذ محمد السيد — استكشف لوحة تحكم المدرس وجميع مميزاته',
    email: 'demo.muallim@gmail.com',
    password: 'Demo@123456',
    icon: '👨‍🏫',
  },
] as const;

export default function SignInPage() {
  const { signIn, user, profile, isAdmin, loading, kickedOut, kickMessage, clearKick } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = searchParams.get('next');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loadingState, setLoadingState] = useState(false);

  useEffect(() => {
    if (loading || !user || !profile) return;
    const target = next && next.startsWith('/') ? next : homePath(profile, isAdmin);
    navigate(target, { replace: true });
  }, [user, profile, isAdmin, loading, navigate, next]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    clearKick();
    setLoadingState(true);
    const result = await signIn(email, password);
    setLoadingState(false);
    if (result.error) {
      setError(result.error);
      toast(result.error, 'error');
    } else if (result.home) {
      toast('مرحباً بعودتك!', 'success');
      navigate(next && next.startsWith('/') ? next : result.home, { replace: true });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-cyan-50/30 px-4 pb-8 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 sm:pb-10">
      <MetaTags title="تسجيل الدخول" description="سجّل دخولك إلى Noona" />
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-slate-200/60 bg-white p-4 shadow-xl shadow-slate-200/60 dark:border-slate-700 dark:bg-slate-800 dark:shadow-none sm:p-5 sm:p-8">
          <div className="mb-6 flex flex-col items-center sm:mb-8">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 shadow-lg shadow-blue-500/30 sm:mb-4 sm:h-14 sm:w-14">
              <GraduationCap className="h-7 w-7 text-white sm:h-8 sm:w-8" />
            </div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-white sm:text-2xl">تسجيل الدخول</h1>
            <p className="mt-1 text-xs text-slate-500 sm:text-sm">مرحباً بعودتك إلى Noona</p>
            {user && profile && (
              <span className="mt-2 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300 sm:px-3 sm:py-1 sm:text-xs">
                سيتم توجيهك إلى مساحة {roleLabel(profile, isAdmin)}
              </span>
            )}
          </div>

          {kickedOut && kickMessage && (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30 sm:mb-6">
              <p className="text-xs font-bold text-amber-700 dark:text-amber-300">{kickMessage}</p>
            </div>
          )}

          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-xs text-red-600 dark:bg-red-900/20 sm:mb-6 sm:px-4 sm:py-3 sm:text-sm">
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 sm:h-4 sm:w-4" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            <div>
              <label htmlFor="signin-email" className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-200 sm:mb-1.5 sm:text-sm">البريد الإلكتروني</label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 sm:h-5 sm:w-5" />
                <input
                  id="signin-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  autoComplete="email"
                  className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-4 pr-10 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:border-slate-600 dark:bg-slate-900 dark:text-white sm:min-h-12 sm:py-3 sm:pr-11 sm:text-sm"
                  placeholder="you@example.com"
                  dir="ltr"
                />
              </div>
            </div>

            <PasswordField id="signin-password" value={password} onChange={setPassword} />

            <button type="submit" disabled={loadingState} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/25 transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-12 sm:py-3 sm:text-sm">
              {loadingState && <Loader2 className="h-4 w-4 animate-spin sm:h-5 sm:w-5" />}
              دخول
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-slate-500 sm:mt-6 sm:text-sm">
            <Link to="/forgot-password" className="mb-2 block font-semibold text-blue-600 hover:underline sm:mb-3">نسيت كلمة المرور؟</Link>
            ليس لديك حساب؟{' '}
            <Link to="/signup" className="font-medium text-blue-600 hover:underline">أنشئ حساباً جديداً</Link>
          </p>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-200/60 bg-white p-4 shadow-xl shadow-slate-200/40 dark:border-slate-700 dark:bg-slate-800 dark:shadow-none sm:mt-6 sm:p-5">
          <div className="mb-2 flex items-center gap-2 sm:mb-3">
            <Info className="h-3.5 w-3.5 text-blue-500 sm:h-4 sm:w-4" />
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200 sm:text-sm">حسابات تجريبية</h3>
          </div>
          <p className="mb-3 text-[10px] leading-4 text-slate-500 sm:mb-4 sm:text-xs sm:leading-5">جرب المنصة بحساب مدرس تجريبي واكتشف المميزات المتاحة.</p>
          <div className="space-y-2 sm:space-y-3">
            {DEMO_ACCOUNTS.map((account) => (
              <div key={account.email} className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/50 p-2.5 transition dark:border-slate-700 dark:bg-slate-900/40 sm:gap-3 sm:p-3">
                <span className="text-lg sm:text-xl">{account.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-800 dark:text-white sm:text-sm">{account.label}</p>
                  <p className="text-[10px] text-slate-500 truncate sm:text-[11px]">{account.description}</p>
                  <p className="mt-0.5 text-[10px] font-mono text-slate-600 dark:text-slate-300 truncate sm:mt-1 sm:text-xs" dir="ltr">{account.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEmail(account.email);
                    setPassword(account.password);
                    toast('تم ملء البيانات — اضغط "دخول" للمتابعة', 'success');
                  }}
                  className="shrink-0 rounded-lg bg-blue-50 px-2.5 py-1.5 text-[10px] font-bold text-blue-600 transition hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 sm:px-3 sm:py-2 sm:text-xs"
                >
                  تعبئة تلقائية
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
