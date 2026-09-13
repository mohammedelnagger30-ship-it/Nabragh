import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, GraduationCap, Loader2, Mail } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/context/ToastContext';
import MetaTags from '@/components/MetaTags';

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/signin`,
    });
    setLoading(false);
    if (error) {
      toast('تعذر إرسال رابط الاستعادة. تحقق من البريد وحاول مرة أخرى.', 'error');
      return;
    }
    setSent(true);
    toast('تم إرسال رابط استعادة كلمة المرور', 'success');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 pb-8 pt-[4.5rem] dark:bg-slate-900 sm:pb-10">
      <MetaTags title="استعادة كلمة المرور | منصة العلم" noIndex />
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-200/60 sm:p-6 sm:p-8 dark:border-slate-700 dark:bg-slate-800 dark:shadow-none">
        <Link to="/signin" className="mb-5 inline-flex items-center gap-2 text-xs font-semibold text-blue-600 sm:mb-7 sm:text-sm">
          <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4" /> العودة لتسجيل الدخول
        </Link>
        <div className="mb-5 text-center sm:mb-7">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20 sm:mb-4 sm:h-14 sm:w-14">
            <GraduationCap className="h-7 w-7 sm:h-8 sm:w-8" />
          </div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white sm:text-2xl">استعادة كلمة المرور</h1>
          <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400 sm:text-sm sm:leading-6">أدخل بريدك وسنرسل لك رابطًا لإنشاء كلمة مرور جديدة.</p>
        </div>
        {sent ? (
          <div className="rounded-2xl bg-emerald-50 p-4 text-center text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300 sm:p-5">
            <CheckCircle2 className="mx-auto mb-2 h-6 w-6 sm:mb-3 sm:h-8 sm:w-8" />
            <p className="text-xs font-semibold leading-5 sm:text-sm sm:leading-7">راجع بريدك الإلكتروني واتبع التعليمات لإكمال الاستعادة.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4 sm:space-y-5">
            <label htmlFor="forgot-email" className="block text-xs font-semibold text-slate-700 dark:text-slate-200 sm:text-sm">
              البريد الإلكتروني
              <div className="relative mt-1.5 sm:mt-2">
                <Mail className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 sm:h-5 sm:w-5" />
                <input id="forgot-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} dir="ltr" placeholder="you@example.com" className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-4 pr-10 text-xs font-normal text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-600 dark:bg-slate-900 dark:text-white sm:min-h-12 sm:py-3 sm:pr-11 sm:text-sm" />
              </div>
            </label>
            <button type="submit" disabled={loading} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 font-bold text-white transition hover:bg-blue-700 disabled:opacity-60 text-xs sm:min-h-12 sm:text-sm">
              {loading && <Loader2 className="h-4 w-4 animate-spin sm:h-5 sm:w-5" />}
              إرسال الرابط
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
