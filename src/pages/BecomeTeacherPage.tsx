import { Link } from 'react-router-dom';
import { GraduationCap, Users, Video, Award, CheckCircle, ArrowLeft, MessageCircle, Shield, TrendingUp } from 'lucide-react';
import MetaTags from '@/components/MetaTags';

export default function BecomeTeacherPage() {
  return (
    <>
      <MetaTags title="سجّل كمدرس | Noona" description="انضم إلى فريق المدرسين المتميزين في منصة Noona وشارك معرفتك مع آلاف الطلاب" />
      <main>
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 to-cyan-500 py-14 sm:py-20">
          <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
            <div className="absolute -right-32 top-10 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -bottom-24 -left-20 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
          </div>
          <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-sm font-bold text-white backdrop-blur-sm">
              <GraduationCap className="h-5 w-5" />
              فرصة للمدرسين المتميزين
            </div>
            <h1 className="mb-4 text-3xl font-extrabold text-white sm:text-5xl">شارك معرفتك مع آلاف الطلاب</h1>
            <p className="mx-auto mb-8 max-w-2xl text-base text-blue-100 sm:text-lg">
              انضم إلى فريق المدرسين في منصة Noona واحصل على دخل إضافي من محتواك التعليمي المميز
            </p>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-sm font-bold text-blue-600 shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl sm:text-base"
              >
                سجّل الآن كمدرس
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <a
                href="https://wa.me/966500000000"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border-2 border-white/30 px-8 py-3.5 text-sm font-bold text-white transition-all hover:bg-white/10 sm:text-base"
              >
                <MessageCircle className="h-5 w-5" />
                تواصل معنا
              </a>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="bg-slate-900 py-10">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
              {[
                { icon: Users, value: '600+', label: 'طالب نشط' },
                { icon: Video, value: '500+', label: 'فيديو تعليمي' },
                { icon: Award, value: '50+', label: 'مدرس معتمد' },
                { icon: TrendingUp, value: '4.8', label: 'متوسط التقييم' },
              ].map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">
                    <stat.icon className="h-6 w-6 text-blue-400" />
                  </div>
                  <div className="text-2xl font-bold text-white">{stat.value}</div>
                  <div className="mt-1 text-sm text-slate-400">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Why teach on Noona */}
        <section className="bg-white py-14 dark:bg-slate-900 sm:py-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="mb-10 text-center">
              <h2 className="mb-3 text-2xl font-bold text-slate-800 dark:text-slate-100 sm:text-3xl">لماذا تنضم إلينا؟</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">مميزات حصرية للمدرسين في منصتنا</p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { icon: TrendingUp, title: 'دخل إضافي', desc: 'احصل على إيرادات من فيديوهاتك ودوراتك التعليمية. أنت تحدد السعر.', color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400' },
                { icon: Users, title: 'قاعدة طلاب واسعة', desc: 'وصول مباشر لآلاف الطلاب النشطين على المنصة في جميع المحافظات.', color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400' },
                { icon: Shield, title: 'حماية المحتوى', desc: 'فيديوهاتك محمية بحماية متقدمة من التسجيل والمشاركة غير المصرح بها.', color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20 dark:text-purple-400' },
                { icon: Video, title: 'أدوات احترافية', desc: 'لوحة تحكم متكاملة لإدارة دوراتك وفيديوهاتك وطلابك وتحليلات الأداء.', color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400' },
                { icon: GraduationCap, title: 'شهادات معتمدة', desc: 'أصدر شهادات إتمام رقمية لطلابك بعد إنهاء الدورات بنجاح.', color: 'text-rose-600 bg-rose-50 dark:bg-rose-900/20 dark:text-rose-400' },
                { icon: Award, title: 'سمعة وثقة', desc: 'نظام تقييمات ومراجعات يساعدك في بناء سمعتك واستقطاب طلاب جدد.', color: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-900/20 dark:text-cyan-400' },
              ].map((item, i) => (
                <div key={i} className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md dark:border-slate-700 dark:bg-slate-800">
                  <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl ${item.color}`}>
                    <item.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mb-2 text-base font-bold text-slate-800 dark:text-slate-100">{item.title}</h3>
                  <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Steps */}
        <section className="bg-slate-50 py-14 dark:bg-slate-800/50 sm:py-20">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <h2 className="mb-10 text-center text-2xl font-bold text-slate-800 dark:text-slate-100 sm:text-3xl">كيف تسجل كمدرس؟</h2>
            <div className="space-y-6">
              {[
                { step: '1', title: 'أنشئ حساب كمدرس', desc: 'سجّل بياناتك واختر "مدرس" كنوع الحساب.' },
                { step: '2', title: 'تحقق من حسابك', desc: 'سيقوم فريقنا بمراجعة حسابك والتأكد من بياناتك خلال 24 ساعة.' },
                { step: '3', title: 'ابدأ في رفع المحتوى', desc: 'أنشئ دوراتك وارفع فيديوهاتك وابدأ في الوصول للطلاب.' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 text-lg font-bold text-white shadow-lg shadow-blue-600/25">
                    {item.step}
                  </div>
                  <div className="pt-1">
                    <h3 className="mb-1 text-base font-bold text-slate-800 dark:text-slate-100">{item.title}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-10 text-center">
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition-all hover:-translate-y-0.5 hover:shadow-xl sm:text-base"
              >
                ابدأ الآن
                <CheckCircle className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
