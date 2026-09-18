import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2, ArrowRight, Home, Receipt } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import MetaTags from '@/components/MetaTags';

type PaymentStatus = 'loading' | 'success' | 'failed' | 'pending' | 'not_found';

export default function PaymentStatusPage() {
  const [searchParams] = useSearchParams();
  const paymentIdFromUrl = searchParams.get('payment_id');
  const orderId = searchParams.get('order_id');

  // Fallback: check sessionStorage for payment_id set by CheckoutPage
  const paymentId = paymentIdFromUrl ?? (() => {
    try { return sessionStorage.getItem('last_payment_id'); } catch { return null; }
  })();

  const [status, setStatus] = useState<PaymentStatus>('loading');
  const [paymentData, setPaymentData] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (!paymentId && !orderId) { setStatus('not_found'); return; }

    void (async () => {
      // Poll for payment status (webhook may take a few seconds)
      let attempts = 0;
      const maxAttempts = 10;

      while (attempts < maxAttempts) {
        let query = supabase.from('payments').select('id, amount, status, method, paid_at, notes').limit(1);

        if (paymentId) {
          query = query.eq('id', paymentId);
        } else if (orderId) {
          query = query.eq('provider_order_id', orderId);
        }

        const { data } = await query.maybeSingle();
        if (data) {
          setPaymentData(data);
          if (data.status === 'paid') { setStatus('success'); return; }
          if (data.status === 'failed') { setStatus('failed'); return; }
          if (data.status === 'pending' && attempts >= 3) { setStatus('pending'); return; }
        }

        attempts++;
        await new Promise((r) => setTimeout(r, 2000));
      }

      // After max attempts, check one last time
      let finalQuery = supabase.from('payments').select('id, amount, status, method, paid_at, notes').limit(1);
      if (paymentId) finalQuery = finalQuery.eq('id', paymentId);
      else if (orderId) finalQuery = finalQuery.eq('provider_order_id', orderId);

      const { data: finalData } = await finalQuery.maybeSingle();
      if (finalData) {
        setPaymentData(finalData);
        setStatus(finalData.status === 'paid' ? 'success' : finalData.status === 'failed' ? 'failed' : 'pending');
      } else {
        setStatus('not_found');
      }
    })();
  }, [paymentId, orderId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 flex items-center justify-center px-4">
      <MetaTags title="حالة الدفع" description="نتيجة عملية الدفع" />

      <div className="w-full max-w-md text-center">
        {status === 'loading' && (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 shadow-xl dark:border-slate-700 dark:bg-slate-800">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-blue-500" />
            <h2 className="mt-6 text-xl font-extrabold text-slate-900 dark:text-white">جاري التحقق من الدفع...</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">يرجى الانتظار لحظات</p>
          </div>
        )}

        {status === 'success' && (
          <div className="rounded-3xl border border-emerald-200 bg-white p-10 shadow-xl dark:border-emerald-800 dark:bg-slate-800">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
              <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="mt-6 text-xl font-extrabold text-slate-900 dark:text-white">تم الدفع بنجاح!</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">تم تفعيل اشتراكيك. يمكنك الآن الوصول للمحتوى.</p>

            {paymentData && (
              <div className="mt-6 rounded-xl bg-slate-50 p-4 dark:bg-slate-900">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">المبلغ</span>
                    <span className="font-bold text-slate-900 dark:text-white">{paymentData.amount as number} جنيه</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">التاريخ</span>
                    <span className="text-slate-700 dark:text-slate-300">{paymentData.paid_at ? new Date(paymentData.paid_at as string).toLocaleString('ar-EG') : '—'}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-8 flex flex-col gap-3">
              <Link to="/dashboard" className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 py-3 text-sm font-bold text-white shadow-md transition-all hover:-translate-y-0.5">
                <Home className="h-4 w-4" />
                الذهاب للوحة التحكم
              </Link>
              <Link to="/dashboard?tab=subscriptions" className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                <Receipt className="h-4 w-4" />
                عرض اشتراكاتي
              </Link>
            </div>
          </div>
        )}

        {status === 'failed' && (
          <div className="rounded-3xl border border-rose-200 bg-white p-10 shadow-xl dark:border-rose-800 dark:bg-slate-800">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/30">
              <XCircle className="h-8 w-8 text-rose-600 dark:text-rose-400" />
            </div>
            <h2 className="mt-6 text-xl font-extrabold text-slate-900 dark:text-white">فشل الدفع</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">لم يتم إتمام العملية. يمكنك المحاولة مرة أخرى.</p>

            {paymentData && (
              <div className="mt-6 rounded-xl bg-rose-50 p-4 dark:bg-rose-950/20">
                <p className="text-xs text-rose-600 dark:text-rose-400">{paymentData.notes as string ?? 'فشلت عملية الدفع'}</p>
              </div>
            )}

            <div className="mt-8 flex flex-col gap-3">
              <Link to="/dashboard?tab=subscriptions" className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 py-3 text-sm font-bold text-white shadow-md transition-all hover:-translate-y-0.5">
                <ArrowRight className="h-4 w-4" />
                المحاولة مرة أخرى
              </Link>
              <Link to="/dashboard" className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                <Home className="h-4 w-4" />
                العودة للرئيسية
              </Link>
            </div>
          </div>
        )}

        {status === 'pending' && (
          <div className="rounded-3xl border border-amber-200 bg-white p-10 shadow-xl dark:border-amber-800 dark:bg-slate-800">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
              <Loader2 className="h-8 w-8 animate-spin text-amber-600 dark:text-amber-400" />
            </div>
            <h2 className="mt-6 text-xl font-extrabold text-slate-900 dark:text-white">الدفع قيد المعالجة</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">لم نتلق تأكيد الدفع بعد. يرجى الانتظار أو المحاولة لاحقاً.</p>

            <div className="mt-8 flex flex-col gap-3">
              <Link to="/dashboard?tab=subscriptions" className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 py-3 text-sm font-bold text-white shadow-md transition-all hover:-translate-y-0.5">
                <Receipt className="h-4 w-4" />
                متابعة اشتراكاتي
              </Link>
              <Link to="/dashboard" className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                <Home className="h-4 w-4" />
                العودة للرئيسية
              </Link>
            </div>
          </div>
        )}

        {status === 'not_found' && (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 shadow-xl dark:border-slate-700 dark:bg-slate-800">
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">لم يتم العثور على عملية الدفع</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">تأكد من صحة الرابط أو تواصل مع الإدارة.</p>
            <Link to="/dashboard" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-700">
              <Home className="h-4 w-4" />
              العودة للرئيسية
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
