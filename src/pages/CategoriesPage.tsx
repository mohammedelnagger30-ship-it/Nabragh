import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import MetaTags from '@/components/MetaTags';
import type { Category } from '@/types';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [videoCounts, setVideoCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: catData } = await supabase.from('categories').select('*').order('sort_order', { ascending: true });
      const cats = catData as Category[] ?? [];
      setCategories(cats);

      const { data: vidData } = await supabase.from('videos').select('category_id');
      const counts: Record<string, number> = {};
      (vidData ?? []).forEach((v: { category_id: string | null }) => {
        if (v.category_id) counts[v.category_id] = (counts[v.category_id] ?? 0) + 1;
      });
      setVideoCounts(counts);
      setLoading(false);
    })();
  }, []);

  const colorMap: Record<string, { bg: string; text: string; gradient: string }> = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', gradient: 'from-blue-500 to-blue-600' },
    cyan: { bg: 'bg-cyan-50', text: 'text-cyan-600', gradient: 'from-cyan-500 to-cyan-600' },
    teal: { bg: 'bg-teal-50', text: 'text-teal-600', gradient: 'from-teal-500 to-teal-600' },
    green: { bg: 'bg-green-50', text: 'text-green-600', gradient: 'from-green-500 to-green-600' },
    indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', gradient: 'from-indigo-500 to-indigo-600' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', gradient: 'from-amber-500 to-amber-600' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-600', gradient: 'from-orange-500 to-orange-600' },
    sky: { bg: 'bg-sky-50', text: 'text-sky-600', gradient: 'from-sky-500 to-sky-600' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', gradient: 'from-emerald-500 to-emerald-600' },
    rose: { bg: 'bg-rose-50', text: 'text-rose-600', gradient: 'from-rose-500 to-rose-600' },
  };

  return (
    <div className="pt-[4.5rem] min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      <MetaTags title="التخصصات الدراسية | منصة العلم" description="تصفح جميع التخصصات الدراسية وابدأ التعلم مع أفضل المدرسين" />
      <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-10 lg:px-8">
        <div className="mb-8 text-center sm:mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-4 dark:bg-blue-900/30 dark:text-blue-300">
            <BookOpen className="w-4 h-4" />
            التخصصات الدراسية
          </div>
          <h1 className="mb-2 text-2xl font-extrabold text-slate-900 dark:text-white sm:text-4xl">جميع التخصصات</h1>
          <p className="mx-auto max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400 sm:text-base">اختر التخصص الذي يناسبك وابدأ التعلم مع أفضل المدرسين</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 animate-pulse">
                <div className="w-14 h-14 rounded-xl bg-slate-200 dark:bg-slate-700 mb-4" />
                <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded mb-2" />
                <div className="h-4 bg-slate-100 dark:bg-slate-600 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
            {categories.map((cat) => {
              const colors = colorMap[cat.color] ?? colorMap.blue;
              const count = videoCounts[cat.id] ?? 0;
              return (
                <Link
                  key={cat.id}
                  to={`/teachers?category=${cat.id}`}
                  className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl sm:p-7 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-blue-500/50 dark:shadow-black/30"
                >
                  <div className={`w-14 h-14 rounded-xl ${colors.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform ${colors.text}`}>
                    <BookOpen className={`w-7 h-7 ${colors.text}`} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">{cat.name_ar}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">{cat.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 dark:text-slate-500">{count} فيديو</span>
                    <span className={`flex items-center gap-1 text-sm font-medium ${colors.text} group-hover:gap-2 transition-all`}>
                      استكشف <ArrowLeft className="w-4 h-4" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
