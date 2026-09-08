import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, Zap, Crown, Sparkles, ArrowLeft, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { SubscriptionPlan } from '@/types';

export default function PricingPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      setPlans(data as SubscriptionPlan[] ?? []);
      setLoading(false);
    })();
  }, []);

  const handleSubscribe = async (plan: SubscriptionPlan) => {
    if (!user) {
      navigate('/signup');
      return;
    }
    if (plan.price === 0) {
      navigate('/teachers');
      return;
    }
    setSubscribing(plan.id);
    // For demo: create a subscription with first available teacher
    // In production this would go through Stripe checkout
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + plan.duration_months);

    const { data: teachers } = await supabase
      .from('profiles')
      .select('id')
      .eq('is_teacher', true)
      .limit(1)
      .maybeSingle();

    if (teachers) {
      await supabase.from('subscriptions').insert({
        student_id: user.id,
        teacher_id: teachers.id,
        plan_id: plan.id,
        end_date: endDate.toISOString(),
        status: 'active',
      });
    }
    setSubscribing(null);
    navigate('/dashboard');
  };

  const planIcons: Record<string, typeof Zap> = { Free: Sparkles, Monthly: Zap, Annual: Crown };

  return (
    <div className="pt-16 min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            باقات الاشتراك
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold text-slate-800 mb-4">اختر الباقة المناسبة لك</h1>
          <p className="text-slate-500 max-w-2xl mx-auto text-lg">
            باقات مرنة تناسب جميع الاحتياجات. ابدأ مجاناً أو اشترك للوصول الكامل
          </p>
        </div>

        {/* Plans */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan) => {
              const Icon = planIcons[plan.name] ?? Sparkles;
              const isPopular = plan.name === 'Monthly';
              return (
                <div
                  key={plan.id}
                  className={`relative bg-white rounded-3xl border-2 p-8 transition-all ${
                    isPopular
                      ? 'border-blue-500 shadow-2xl shadow-blue-200/50 scale-105'
                      : 'border-slate-200 shadow-sm hover:shadow-lg hover:border-slate-300'
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-sm font-bold rounded-full shadow-lg">
                      الأكثر شيوعاً
                    </div>
                  )}
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-5 ${
                    isPopular ? 'bg-gradient-to-br from-blue-600 to-cyan-500' : 'bg-slate-100'
                  }`}>
                    <Icon className={`w-7 h-7 ${isPopular ? 'text-white' : 'text-slate-600'}`} />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-800 mb-1">{plan.name_ar}</h3>
                  <p className="text-sm text-slate-400 mb-5">
                    {plan.duration_months === 0 ? 'بدون التزام' : `${plan.duration_months} ${plan.duration_months === 1 ? 'شهر' : 'أشهر'}`}
                  </p>
                  <div className="mb-6">
                    <span className="text-4xl font-bold text-slate-800">{plan.price === 0 ? 'مجاني' : plan.price}</span>
                    {plan.price > 0 && <span className="text-slate-400 text-lg"> ر.س</span>}
                  </div>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feat, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          isPopular ? 'bg-blue-100' : 'bg-slate-100'
                        }`}>
                          <Check className={`w-3 h-3 ${isPopular ? 'text-blue-600' : 'text-slate-500'}`} />
                        </div>
                        {feat}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => handleSubscribe(plan)}
                    disabled={subscribing === plan.id}
                    className={`w-full py-3 font-semibold rounded-xl transition-all disabled:opacity-60 flex items-center justify-center gap-2 ${
                      isPopular
                        ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/25 hover:shadow-xl hover:-translate-y-0.5'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {subscribing === plan.id && <Loader2 className="w-4 h-4 animate-spin" />}
                    {plan.price === 0 ? 'ابدأ مجاناً' : 'اشترك الآن'}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* FAQ */}
        <div className="max-w-3xl mx-auto mt-20">
          <h2 className="text-2xl font-bold text-slate-800 text-center mb-8">الأسئلة الشائعة</h2>
          <div className="space-y-4">
            {[
              { q: 'هل يمكنني إلغاء الاشتراك في أي وقت؟', a: 'نعم، يمكنك إلغاء اشتراكك في أي وقت من لوحة التحكم. سيستمر الوصول حتى نهاية فترة الاشتراك المدفوعة.' },
              { q: 'هل الفيديوهات المجانية متاحة للجميع؟', a: 'نعم، جميع الفيديوهات المحددة كمجانية متاحة لأي زائر بدون الحاجة لاشتراك.' },
              { q: 'ما طرق الدفع المتاحة؟', a: 'نقبل جميع البطاقات الائتمانية الرئيسية والمحافظ الرقمية. سيتم تفعيل الدفع الإلكتروني قريباً.' },
              { q: 'هل يمكنني التحميل للمشاهدة لاحقاً؟', a: 'نعم، المشتركون في الباقات المدفوعة يمكنهم تحميل الفيديوهات للمشاهدة بدون إنترنت.' },
            ].map((faq, i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-200 p-6">
                <h3 className="font-bold text-slate-800 mb-2">{faq.q}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-16">
          <Link to="/teachers" className="inline-flex items-center gap-2 text-blue-600 font-medium hover:gap-3 transition-all">
            تصفح المدرسين <ArrowLeft className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
