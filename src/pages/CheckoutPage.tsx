import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CreditCard, Smartphone, Building2, Loader2, CheckCircle2, AlertCircle, Shield, ArrowRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { supabase } from '@/lib/supabase';
import MetaTags from '@/components/MetaTags';

interface PaymentMethod {
  id: string;
  name: string;
  description: string;
  icon: typeof CreditCard;
  color: string;
  bgColor: string;
}

const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 'card',
    name: 'بطاقة ائتمان / خصم',
    description: 'Visa, Mastercard, Meeza',
    icon: CreditCard,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
  },
  {
    id: 'wallet',
    name: 'محفظة إلكترونية',
    description: 'فودافون كاش, Orange Money, Etisalat Cash',
    icon: Smartphone,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
  },
  {
    id: 'fawry',
    name: 'فوري',
    description: 'ادفع من أي فرع فوري أو مصعد كاش',
    icon: Building2,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
  },
];

export default function CheckoutPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const courseId = searchParams.get('course');

  const [course, setCourse] = useState<Record<string, unknown> | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<string>('card');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymobUrl, setPaymobUrl] = useState<string | null>(null);
  const [currentPaymentId, setCurrentPaymentId] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  useEffect(() => {
    if (!user) { navigate('/signin', { replace: true }); return; }
    if (!courseId) { navigate('/dashboard', { replace: true }); return; }

    void (async () => {
      const { data: c } = await supabase.from('courses').select('*, teacher:profiles!courses_teacher_id_fkey(full_name)').eq('id', courseId).maybeSingle();
      setCourse(c);
      setLoading(false);
    })();
  }, [user, courseId, navigate]);

  // Poll payment status after showing Paymob
  useEffect(() => {
    if (!currentPaymentId) return;

    let attempts = 0;
    const maxAttempts = 30; // 60 seconds max

    const interval = setInterval(async () => {
      attempts++;
      if (attempts > maxAttempts) { clearInterval(interval); return; }

      const { data } = await supabase
        .from('payments')
        .select('status')
        .eq('id', currentPaymentId)
        .maybeSingle();

      if (data?.status === 'paid') {
        clearInterval(interval);
        setPaymentSuccess(true);
        setPaymobUrl(null);
        toast('تم الدفع بنجاح!', 'success');
      } else if (data?.status === 'failed') {
        clearInterval(interval);
        setPaymobUrl(null);
        setError('فشلت عملية الدفع. يمكنك المحاولة مرة أخرى.');
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [currentPaymentId, toast]);

  const handlePay = async () => {
    if (!user || !courseId) return;
    setProcessing(true);
    setError(null);

    try {
      const c = course as { id: string; teacher_id: string; title: string; price: number; subscription_price: number; subscription_duration_months?: number } | null;
      if (!c) { setError('الدورة غير موجودة'); setProcessing(false); return; }

      const amount = c.price > 0 ? c.price : c.subscription_price;
      const endDate = new Date(Date.now() + Math.max(1, c.subscription_duration_months ?? 1) * 30 * 24 * 60 * 60 * 1000).toISOString();

      // Create subscription
      const { data: subRow, error: subErr } = await supabase.from('subscriptions').insert({
        student_id: user.id,
        teacher_id: c.teacher_id,
        course_id: c.id,
        access_type: c.price > 0 ? 'purchase' : 'subscription',
        status: 'pending',
        payment_status: 'pending',
        start_date: new Date().toISOString(),
        end_date: c.price > 0 ? null : endDate,
        notes: c.price > 0 ? 'شراء نهائي للدورة' : 'اشتراك في الدورة',
      }).select('id').single();

      if (subErr || !subRow) { setError('تعذر إنشاء الاشتراك'); setProcessing(false); return; }

      // Create payment
      const { data: payRow, error: payErr } = await supabase.from('payments').insert({
        subscription_id: subRow.id,
        student_id: user.id,
        teacher_id: c.teacher_id,
        amount,
        method: selectedMethod,
        status: 'pending',
        notes: `دفع عبر ${selectedMethod} للدورة: ${c.title}`,
      }).select('id').single();

      if (payErr || !payRow) { setError('تعذر تجهيز الدفع'); setProcessing(false); return; }

      setCurrentPaymentId(payRow.id);

      // Get Paymob payment link
      const { data: linkData, error: linkErr } = await supabase.functions.invoke('create-paymob-payment-link', {
        body: { paymentId: payRow.id },
      });

      setProcessing(false);

      if (linkErr || !linkData?.paymentUrl) {
        setError('تعذر تجهيز رابط الدفع. تواصل مع الإدارة.');
        toast('تعذر تجهيز رابط الدفع', 'error');
        return;
      }

      // Show Paymob iframe
      setPaymobUrl(linkData.paymentUrl as string);
    } catch (err) {
      console.error('Checkout error:', err);
      setError('حدث خطأ غير متوقع');
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const amount = (course?.price as number) ?? 0;
  const title = (course?.title as string) ?? 'دورة';
  const teacherName = (course?.teacher as Record<string, unknown>)?.full_name as string ?? '';

  // Payment success screen
  if (paymentSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 flex items-center justify-center px-4">
        <MetaTags title="تم الدفع بنجاح" description="تم تفعيل اشتراكيك" />
        <div className="w-full max-w-md text-center">
          <div className="rounded-3xl border border-emerald-200 bg-white p-10 shadow-xl dark:border-emerald-800 dark:bg-slate-800">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
              <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="mt-6 text-xl font-extrabold text-slate-900 dark:text-white">تم الدفع بنجاح!</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">تم تفعيل اشتراكيك. يمكنك الآن الوصول للمحتوى.</p>
            <div className="mt-8 flex flex-col gap-3">
              <Link to={`/course/${courseId}`} className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 py-3 text-sm font-bold text-white shadow-md transition-all hover:-translate-y-0.5">
                فتح الدورة
              </Link>
              <Link to="/dashboard?tab=subscriptions" className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                عرض اشتراكاتي
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Paymob iframe view
  if (paymobUrl) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-950">
        <MetaTags title={`دفع — ${title}`} description="إتمام الدفع عبر Paymob" />
        <div className="max-w-lg mx-auto px-4 py-6">
          <div className="mb-4 flex items-center justify-between">
            <button onClick={() => { setPaymobUrl(null); setCurrentPaymentId(null); }} className="text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400">
              ← إلغاء والعودة
            </button>
            <p className="text-sm font-bold text-slate-800 dark:text-white">{amount} جنيه</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-lg dark:border-slate-700 dark:bg-slate-800">
            <iframe
              src={paymobUrl}
              title="Paymob Payment"
              className="w-full border-0"
              style={{ minHeight: '600px' }}
            />
          </div>

          <p className="mt-4 text-center text-xs text-slate-400 dark:text-slate-500">
            أكمل الدفع في النافذة أعلاه. بعد الدفع، سيتم التحقق تلقائياً.
          </p>
        </div>
      </div>
    );
  }

  // Checkout form
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-950">
      <MetaTags title={`دفع — ${title}`} description={`إتمام الدفع للدورة ${title}`} />

      <div className="max-w-lg mx-auto px-4 py-8 sm:py-12">
        <Link to={`/course/${courseId}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 mb-6 transition-colors">
          <ArrowRight className="h-4 w-4" />
          العودة للدورة
        </Link>

        <div className="mb-8">
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white sm:text-3xl">إتمام الدفع</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">اختر طريقة الدفع المناسبة لك</p>
        </div>

        {/* Order Summary */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800 mb-6">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4">ملخص الطلب</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600 dark:text-slate-400">الدورة</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white">{title}</span>
            </div>
            {teacherName && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-400">المدرس</span>
                <span className="text-sm text-slate-700 dark:text-slate-300">{teacherName}</span>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-700 pt-3">
              <span className="text-sm font-bold text-slate-800 dark:text-white">المبلغ</span>
              <span className="text-lg font-extrabold text-blue-600">{amount > 0 ? `${amount} جنيه` : 'مجاني'}</span>
            </div>
          </div>
        </div>

        {/* Payment Methods */}
        {amount > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800 mb-6">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4">طريقة الدفع</h3>
            <div className="space-y-3">
              {PAYMENT_METHODS.map((method) => {
                const Icon = method.icon;
                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setSelectedMethod(method.id)}
                    className={`w-full flex items-center gap-4 rounded-xl border-2 p-4 transition-all ${
                      selectedMethod === method.id
                        ? 'border-blue-500 bg-blue-50/50 dark:border-blue-400 dark:bg-blue-900/10'
                        : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'
                    }`}
                  >
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${method.bgColor}`}>
                      <Icon className={`h-5 w-5 ${method.color}`} />
                    </div>
                    <div className="flex-1 text-right">
                      <p className="text-sm font-bold text-slate-800 dark:text-white">{method.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{method.description}</p>
                    </div>
                    <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                      selectedMethod === method.id ? 'border-blue-500 bg-blue-500' : 'border-slate-300 dark:border-slate-600'
                    }`}>
                      {selectedMethod === method.id && <CheckCircle2 className="h-3 w-3 text-white" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-6 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Pay Button */}
        {amount > 0 ? (
          <button
            onClick={() => void handlePay()}
            disabled={processing}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-500/25 transition-all hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
          >
            {processing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                جاري التجهيز...
              </>
            ) : (
              <>
                <CreditCard className="h-5 w-5" />
                الدفع {amount} جنيه
              </>
            )}
          </button>
        ) : (
          <button
            onClick={() => void handlePay()}
            disabled={processing}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/25 transition-all hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
          >
            {processing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                جاري التسجيل...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5" />
                التسجيل المجاني
              </>
            )}
          </button>
        )}

        {/* Security Note */}
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400 dark:text-slate-500">
          <Shield className="h-3.5 w-3.5" />
          <span>دفع آمن ومشفر — Paymob</span>
        </div>
      </div>
    </div>
  );
}
