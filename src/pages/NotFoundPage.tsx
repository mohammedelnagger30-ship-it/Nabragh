import { Link } from 'react-router-dom';
import { Home, Search } from 'lucide-react';
import MetaTags from '@/components/MetaTags';

export default function NotFoundPage() {
  return (
    <div className="pt-[4.5rem] min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center px-4">
      <MetaTags title="الصفحة غير موجودة" description="الصفحة التي تبحث عنها غير موجودة" noIndex />
      <div className="text-center">
        <div className="relative inline-block mb-8">
          <h1 className="text-[120px] sm:text-[180px] font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent leading-none">
            404
          </h1>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-full h-1 bg-gradient-to-r from-transparent via-blue-200 to-transparent rounded-full" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-3">الصفحة غير موجودة</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-md mx-auto">
          عذراً، الصفحة التي تبحث عنها غير موجودة أو تم نقلها إلى مكان آخر
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/"
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
          >
            <Home className="w-5 h-5" />
            العودة للرئيسية
          </Link>
          <Link
            to="/search"
            className="px-6 py-3 bg-white text-slate-700 font-semibold rounded-xl border border-slate-200 hover:bg-slate-50 transition-all flex items-center justify-center gap-2 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-700"
          >
            <Search className="w-5 h-5" />
            البحث في المنصة
          </Link>
        </div>
      </div>
    </div>
  );
}
