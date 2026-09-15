import { useState } from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, Facebook, Youtube, Instagram, Mail, Phone, MapPin, MessageCircle, X, Music2, Send, Twitter } from 'lucide-react';
import { useSiteSettings, contact as settingsContact, whatsappHref } from '@/lib/siteSettings';

export default function Footer() {
  const settings = useSiteSettings();
  const contact = settingsContact(settings);
  const siteName = String(settings.site_name ?? 'Noona | منصتك التعليمية الشاملة');
  const footerAbout = String(settings.footer_texts?.about ?? 'منصة تعليمية عربية تجمع الطلاب بالمدرسين في تجربة منظمة وآمنة.');
  const copyright = String(settings.footer_texts?.copyright ?? 'جميع الحقوق محفوظة');
  const contactHeading = String(settings.footer_texts?.contact_heading ?? 'تواصل معنا');
  const [showSupportButton, setShowSupportButton] = useState(() => localStorage.getItem('hideSupportButton') !== 'true');

  const hideSupportButton = () => {
    localStorage.setItem('hideSupportButton', 'true');
    setShowSupportButton(false);
  };

  const socials = [
    { Icon: Facebook, href: contact.facebook, label: 'Facebook' },
    { Icon: Youtube, href: contact.youtube, label: 'YouTube' },
    { Icon: Instagram, href: contact.instagram, label: 'Instagram' },
    { Icon: Music2, href: contact.tiktok, label: 'TikTok' },
    { Icon: Send, href: contact.telegram, label: 'Telegram' },
    { Icon: Twitter, href: contact.x, label: 'X' },
  ].filter((s) => s.href);

  return (
    <>
      <footer className="bg-slate-900 text-slate-300 dark:bg-slate-950 dark:text-slate-400">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-16">
        <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:gap-x-8 md:grid-cols-4 md:gap-10">
          <div className="md:col-span-1">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400">
                <GraduationCap className="h-5 w-5 text-white" />
              </div>
              <span className="text-base font-bold text-white sm:text-xl">{siteName}</span>
            </div>
            <p className="text-xs leading-6 text-slate-400 sm:text-sm">
              {footerAbout}
            </p>
            <div className="mt-4 flex gap-2 sm:mt-6 sm:gap-3">
              {socials.map(({ Icon, href, label }) => (
                <a key={label} href={href} target="_blank" rel="noreferrer" aria-label={label} className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 transition-colors hover:bg-blue-600 sm:h-10 sm:w-10">
                  <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold text-white sm:mb-4 sm:text-base">روابط سريعة</h3>
            <ul className="space-y-2 text-xs sm:space-y-3 sm:text-sm">
              <li><Link to="/" className="transition-colors hover:text-blue-400">الرئيسية</Link></li>
              <li><Link to="/teachers" className="transition-colors hover:text-blue-400">المدرسون</Link></li>
              <li><Link to="/courses" className="transition-colors hover:text-blue-400">الدورات</Link></li>
              <li><Link to="/competitions" className="transition-colors hover:text-blue-400">المنافسات</Link></li>
              <li><Link to="/categories" className="transition-colors hover:text-blue-400">التخصصات</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold text-white sm:mb-4 sm:text-base">المنصة</h3>
            <ul className="space-y-2 text-xs sm:space-y-3 sm:text-sm">
              <li><Link to="/about" className="transition-colors hover:text-blue-400">من نحن</Link></li>
              <li><Link to="/privacy" className="transition-colors hover:text-blue-400">سياسة الخصوصية</Link></li>
              <li><Link to="/terms" className="transition-colors hover:text-blue-400">الشروط والأحكام</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold text-white sm:mb-4 sm:text-base">{contactHeading}</h3>
            <ul className="space-y-2 text-xs sm:space-y-3 sm:text-sm">
              <li className="flex min-w-0 items-start gap-2">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
                <a href={`mailto:${contact.email}`} className="break-all hover:text-blue-400">{contact.email}</a>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0 text-blue-400" />
                <a href={`tel:${contact.phone_tel}`} dir="ltr">{contact.phone_display}</a>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
                <span>{contact.city}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-slate-800 pt-6 text-center text-xs text-slate-500 sm:mt-12 sm:pt-8 sm:text-sm">
          <p>© {new Date().getFullYear()} {siteName}. {copyright}.</p>
        </div>
        </div>
      </footer>
      {showSupportButton && <div className="fixed bottom-20 left-4 z-40 sm:bottom-6 sm:left-6">
        <a href={whatsappHref(contact.whatsapp)} target="_blank" rel="noreferrer" aria-label="واتساب الدعم" title="واتساب الدعم" className="flex h-12 w-12 items-center justify-center rounded-full bg-[#128C7E] text-white shadow-xl shadow-[#075E54]/30 ring-4 ring-white/80 transition-all hover:-translate-y-1 hover:bg-[#075E54] hover:shadow-2xl dark:ring-slate-950/80 sm:h-14 sm:w-14">
          <MessageCircle className="h-6 w-6 sm:h-7 sm:w-7" aria-hidden="true" />
        </a>
        <button type="button" onClick={hideSupportButton} aria-label="إخفاء زر الدعم" title="إخفاء" className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-slate-700 text-white shadow-md transition hover:bg-rose-600">
          <X className="h-3 w-3" aria-hidden="true" />
        </button>
      </div>}
    </>
  );
}
