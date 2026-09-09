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
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 pb-10 pt-[6.5rem] dark:bg-slate-900">
      <MetaTags title="استعادة كلمة المرور | منصة العلم" noIndex />
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-8 dark:border-slate-700 dark:bg-slate-800 dark:shadow-none">
        <Link to="/signin" className="mb-7 inline-flex items-center gap-2 text-sm font-semibold text-blue-600">
          <ArrowRight className="h-4 w-4" /> العودة لتسجيل الدخول
        </Link>
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
            <GraduationCap className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">استعادة كلمة المرور</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">أدخل بريدك وسنرسل لك رابطًا لإنشاء كلمة مرور جديدة.</p>
        </div>
        {sent ? (
          <div className="rounded-2xl bg-emerald-50 p-5 text-center text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
            <CheckCircle2 className="mx-auto mb-3 h-8 w-8" />
            <p className="text-sm font-semibold leading-7">راجع بريدك الإلكتروني واتبع التعليمات لإكمال الاستعادة.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-5">
            <label htmlFor="forgot-email" className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
              البريد الإلكتروني
              <div className="relative mt-2">
                <Mail className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input id="forgot-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} dir="ltr" placeholder="you@example.com" className="min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-4 pr-11 text-sm font-normal text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-600 dark:bg-slate-900 dark:text-white" />
              </div>
            </label>
            <button type="submit" disabled={loading} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 font-bold text-white transition hover:bg-blue-700 disabled:opacity-60">
              {loading && <Loader2 className="h-5 w-5 animate-spin" />}
              إرسال الرابط
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
