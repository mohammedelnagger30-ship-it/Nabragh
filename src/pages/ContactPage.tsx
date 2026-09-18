import { useState } from 'react';
import { Mail, Phone, MapPin, Send, MessageCircle } from 'lucide-react';
import MetaTags from '@/components/MetaTags';
import { useSiteSettings } from '@/lib/siteSettings';

export default function ContactPage() {
  const { settings } = useSiteSettings();
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <>
      <MetaTags title="تواصل معنا | Noona" description="تواصل مع فريق منصة Noona للاستفسارات والدعم الفني" />
      <main className="bg-slate-50 dark:bg-slate-900">
        <section className="bg-gradient-to-br from-blue-600 to-cyan-500 py-14 sm:py-20">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-sm font-bold text-white backdrop-blur-sm">
              <MessageCircle className="h-5 w-5" />
              نحن هنا لمساعدتك
            </div>
            <h1 className="mb-3 text-3xl font-extrabold text-white sm:text-5xl">تواصل معنا</h1>
            <p className="mx-auto max-w-2xl text-base text-blue-100 sm:text-lg">
              أي استفسار أو اقتراح أو مشكلة؟ فريق الدعم جاهز للمساعدة
            </p>
          </div>
        </section>

        <section className="mx-auto -mt-8 max-w-5xl px-4 pb-16 sm:px-6 lg:px-8">
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { icon: Mail, title: 'البريد الإلكتروني', value: settings?.contact_email || 'support@nabragh.com', href: `mailto:${settings?.contact_email || 'support@nabragh.com'}` },
              { icon: Phone, title: 'الهاتف', value: settings?.contact_phone || '+966 50 000 0000', href: `tel:${settings?.contact_phone?.replace(/\s/g, '') || '+966500000000'}` },
              { icon: MapPin, title: 'الموقع', value: settings?.contact_city || 'الرياض، السعودية', href: null },
            ].map((item, i) => (
              <div key={i} className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                  <item.icon className="h-6 w-6" />
                </div>
                <h3 className="mb-1 text-sm font-bold text-slate-500 dark:text-slate-400">{item.title}</h3>
                {item.href ? (
                  <a href={item.href} className="text-base font-bold text-slate-800 hover:text-blue-600 dark:text-slate-100 dark:hover:text-blue-400">{item.value}</a>
                ) : (
                  <p className="text-base font-bold text-slate-800 dark:text-slate-100">{item.value}</p>
                )}
              </div>
            ))}
          </div>

          <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-8">
            {submitted ? (
              <div className="py-10 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400">
                  <Send className="h-8 w-8" />
                </div>
                <h3 className="mb-2 text-xl font-bold text-slate-800 dark:text-slate-100">تم إرسال رسالتك!</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">سنرد عليك في أقرب وقت ممكن. شكراً لتواصلك معنا.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">أرسل لنا رسالة</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-bold text-slate-700 dark:text-slate-300">الاسم</label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                      placeholder="اسمك الكامل"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-bold text-slate-700 dark:text-slate-300">البريد الإلكتروني</label>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                      placeholder="email@example.com"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-bold text-slate-700 dark:text-slate-300">الموضوع</label>
                  <input
                    type="text"
                    required
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    placeholder="موضوع الرسالة"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-bold text-slate-700 dark:text-slate-300">الرسالة</label>
                  <textarea
                    required
                    rows={5}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    placeholder="اكتب رسالتك هنا..."
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition-all hover:-translate-y-0.5 hover:shadow-xl"
                >
                  <Send className="h-4 w-4" />
                  إرسال الرسالة
                </button>
              </form>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
