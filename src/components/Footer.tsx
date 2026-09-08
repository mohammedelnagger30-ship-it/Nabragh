import { Link } from 'react-router-dom';
import { GraduationCap, Facebook, Twitter, Youtube, Instagram, Mail, Phone, MapPin } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-white">منصة العلم</span>
            </div>
            <p className="text-sm leading-relaxed text-slate-400">
              المنصة التعليمية الأولى عربياً. تعلّم من أفضل المدرسين بجودة عالية وحماية كاملة.
            </p>
            <div className="flex gap-3 mt-6">
              {[Facebook, Twitter, Youtube, Instagram].map((Icon, i) => (
                <a
                  key={i}
                  href={['https://www.facebook.com', 'https://twitter.com', 'https://www.youtube.com', 'https://www.instagram.com'][i]}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={['Facebook', 'Twitter', 'YouTube', 'Instagram'][i]}
                  className="w-10 h-10 rounded-lg bg-slate-800 hover:bg-blue-600 flex items-center justify-center transition-colors"
                >
                  <Icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">روابط سريعة</h3>
            <ul className="space-y-3 text-sm">
              <li><Link to="/" className="hover:text-blue-400 transition-colors">الرئيسية</Link></li>
              <li><Link to="/teachers" className="hover:text-blue-400 transition-colors">المدرسون</Link></li>
              <li><Link to="/categories" className="hover:text-blue-400 transition-colors">التخصصات</Link></li>
              <li><Link to="/pricing" className="hover:text-blue-400 transition-colors">الباقات والأسعار</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">المنصة</h3>
            <ul className="space-y-3 text-sm">
              <li><Link to="/about" className="hover:text-blue-400 transition-colors">من نحن</Link></li>
              <li><Link to="/privacy" className="hover:text-blue-400 transition-colors">سياسة الخصوصية</Link></li>
              <li><Link to="/terms" className="hover:text-blue-400 transition-colors">الشروط والأحكام</Link></li>
              <li><Link to="/pricing#faq" className="hover:text-blue-400 transition-colors">الأسئلة الشائعة</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">تواصل معنا</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-blue-400" />
                <span>info@manhatalilm.com</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-blue-400" />
                <span dir="ltr">+966 50 123 4567</span>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-400" />
                <span>الرياض، المملكة العربية السعودية</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 mt-12 pt-8 text-center text-sm text-slate-500">
          <p>© 2026 منصة العلم. جميع الحقوق محفوظة.</p>
        </div>
      </div>
    </footer>
  );
}
