import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, BookOpen, ShieldCheck } from 'lucide-react';
import MetaTags from '@/components/MetaTags';

const content = {
  '/about': {
    title: 'عن منصة العلم',
    intro: 'منصة العلم تجمع الطلاب بالمدرسين المتميزين في تجربة تعليمية منظمة وآمنة.',
    sections: [
      ['رؤيتنا', 'أن نجعل الوصول إلى التعليم الجيد أسهل وأكثر وضوحًا لكل طالب في العالم العربي.'],
      ['ماذا نقدم؟', 'دروس فيديو، دورات منظمة، متابعة للتقدم، وملفات مدرسين تساعدك على اختيار المسار المناسب.'],
    ],
  },
  '/privacy': {
    title: 'سياسة الخصوصية',
    intro: 'نحترم خصوصيتك ونتعامل مع بياناتك بمسؤولية ووضوح.',
    sections: [
      ['البيانات التي نستخدمها', 'نستخدم بيانات الحساب والتقدم التعليمي لتشغيل المنصة وتحسين تجربتك.'],
      ['حماية البيانات', 'نطبق صلاحيات وصول على الحسابات والمحتوى، ولا نبيع بيانات المستخدمين لأي جهة.'],
      ['حقوقك', 'يمكنك طلب تحديث بياناتك أو حذف حسابك عبر التواصل مع فريق المنصة.'],
    ],
  },
  '/terms': {
    title: 'الشروط والأحكام',
    intro: 'باستخدام منصة العلم، توافق على استخدام المحتوى بطريقة قانونية ومحترمة.',
    sections: [
      ['استخدام الحساب', 'أنت مسؤول عن بيانات الدخول الخاصة بك، ولا يجوز مشاركة الحساب أو إعادة بيع المحتوى.'],
      ['محتوى المدرسين', 'يجب أن يملك المدرس حقوق المحتوى الذي يرفعه، وتحتفظ المنصة بحق مراجعة المحتوى المخالف.'],
      ['الاشتراكات', 'تظهر تفاصيل السعر والمدة قبل التأكيد، وتخضع عمليات الدفع لسياسة مزود الدفع المعتمد.'],
    ],
  },
};

export default function InfoPage() {
  const location = useLocation();
  const page = content[location.pathname as keyof typeof content] ?? content['/about'];

  return (
    <div className="min-h-screen bg-slate-50 pt-[4.5rem]">
      <MetaTags title={`${page.title} | منصة العلم`} description={page.intro} />
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
        <Link to="/" className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700">
          <ArrowRight className="h-4 w-4" /> العودة للرئيسية
        </Link>
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
          <div className="mb-8 flex items-start gap-4 border-b border-slate-100 pb-7">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              {location.pathname === '/privacy' ? <ShieldCheck className="h-6 w-6" /> : <BookOpen className="h-6 w-6" />}
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">{page.title}</h1>
              <p className="mt-2 text-sm leading-7 text-slate-500">{page.intro}</p>
            </div>
          </div>
          <div className="space-y-7">
            {page.sections.map(([heading, text]) => (
              <section key={heading}>
                <h2 className="mb-2 text-lg font-bold text-slate-800">{heading}</h2>
                <p className="text-sm leading-8 text-slate-600">{text}</p>
              </section>
            ))}
          </div>
        </article>
      </div>
    </div>
  );
}
