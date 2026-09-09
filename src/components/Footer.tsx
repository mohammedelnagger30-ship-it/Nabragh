import { Link } from 'react-router-dom';
import { GraduationCap, Facebook, Youtube, Instagram, Mail, Phone, MapPin } from 'lucide-react';
import { CONTACT, whatsappLink } from '@/lib/contact';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 dark:bg-slate-950 dark:text-slate-400">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
          <div className="md:col-span-1">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400">
                <GraduationCap className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold text-white">منصة العلم</span>
            </div>
            <p className="text-sm leading-relaxed text-slate-400">
              منصة تعليمية عربية تجمع الطلاب بالمدرسين في تجربة منظمة وآمنة.
            </p>
            <div className="mt-6 flex gap-3">
              {[
                { Icon: Facebook, href: CONTACT.facebook, label: 'Facebook' },
                { Icon: Youtube, href: CONTACT.youtube, label: 'YouTube' },
                { Icon: Instagram, href: CONTACT.instagram, label: 'Instagram' },
              ].map(({ Icon, href, label }) => (
                <a key={label} href={href} target="_blank" rel="noreferrer" aria-label={label} className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800 transition-colors hover:bg-blue-600">
                  <Icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-4 font-semibold text-white">روابط سريعة</h3>
            <ul className="space-y-3 text-sm">
              <li><Link to="/" className="transition-colors hover:text-blue-400">الرئيسية</Link></li>
              <li><Link to="/teachers" className="transition-colors hover:text-blue-400">المدرسون</Link></li>
              <li><Link to="/courses" className="transition-colors hover:text-blue-400">الدورات</Link></li>
              <li><Link to="/competitions" className="transition-colors hover:text-blue-400">المنافسات</Link></li>
              <li><Link to="/categories" className="transition-colors hover:text-blue-400">التخصصات</Link></li>
              <li><Link to="/pricing" className="transition-colors hover:text-blue-400">الباقات والأسعار</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 font-semibold text-white">المنصة</h3>
            <ul className="space-y-3 text-sm">
              <li><Link to="/about" className="transition-colors hover:text-blue-400">من نحن</Link></li>
              <li><Link to="/privacy" className="transition-colors hover:text-blue-400">سياسة الخصوصية</Link></li>
              <li><Link to="/terms" className="transition-colors hover:text-blue-400">الشروط والأحكام</Link></li>
              <li><Link to="/pricing#faq" className="transition-colors hover:text-blue-400">الأسئلة الشائعة</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 font-semibold text-white">تواصل معنا</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-blue-400" />
                <a href={`mailto:${CONTACT.email}`} className="hover:text-blue-400">{CONTACT.email}</a>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-blue-400" />
                <a href={`tel:${CONTACT.phoneTel}`} dir="ltr">{CONTACT.phoneDisplay}</a>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-blue-400" />
                <span>{CONTACT.city}</span>
              </li>
              <li>
                <a href={whatsappLink()} target="_blank" rel="noreferrer" className="inline-flex rounded-xl bg-emerald-500 px-4 py-2 font-bold text-white hover:bg-emerald-600">واتساب الدعم</a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-slate-800 pt-8 text-center text-sm text-slate-500">
          <p>© {new Date().getFullYear()} منصة العلم. جميع الحقوق محفوظة.</p>
        </div>
      </div>
    </footer>
  );
}
