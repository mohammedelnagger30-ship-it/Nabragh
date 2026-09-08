import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, Star, Users, Filter, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Profile, Category, Review } from '@/types';

export default function TeachersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [teachers, setTeachers] = useState<Profile[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [reviews, setReviews] = useState<Record<string, { avg: number; count: number }>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(searchParams.get('category'));
  const [sortBy, setSortBy] = useState<'newest' | 'name' | 'experience'>('newest');

  useEffect(() => {
    (async () => {
      const { data: catData } = await supabase.from('categories').select('*').order('sort_order', { ascending: true });
      setCategories(catData as Category[] ?? []);

      let query = supabase.from('profiles').select('*').eq('is_teacher', true);
      if (selectedCategory) {
        query = query.eq('specialization', categories.find(c => c.id === selectedCategory)?.name_ar ?? '');
      }
      if (sortBy === 'newest') query = query.order('created_at', { ascending: false });
      if (sortBy === 'name') query = query.order('full_name', { ascending: true });
      if (sortBy === 'experience') query = query.order('years_experience', { ascending: false });

      const { data: teacherData } = await query;
      const teacherList = teacherData as Profile[] ?? [];
      setTeachers(teacherList);
      setLoading(false);

      // Fetch reviews for all teachers
      if (teacherList.length > 0) {
        const { data: reviewData } = await supabase
          .from('reviews')
          .select('teacher_id, rating')
          .in('teacher_id', teacherList.map(t => t.id));

        const reviewMap: Record<string, { avg: number; count: number }> = {};
        (reviewData as Review[] ?? []).forEach((r) => {
          if (!reviewMap[r.teacher_id]) reviewMap[r.teacher_id] = { avg: 0, count: 0 };
          reviewMap[r.teacher_id].avg += r.rating;
          reviewMap[r.teacher_id].count += 1;
        });
        Object.keys(reviewMap).forEach(k => {
          reviewMap[k].avg = reviewMap[k].count > 0 ? reviewMap[k].avg / reviewMap[k].count : 0;
        });
        setReviews(reviewMap);
      }
    })();
  }, [selectedCategory, sortBy, categories]);

  const filtered = teachers.filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return t.full_name.toLowerCase().includes(q) ||
      (t.specialization?.toLowerCase().includes(q) ?? false) ||
      (t.bio?.toLowerCase().includes(q) ?? false);
  });

  const handleCategoryClick = (catId: string | null) => {
    setSelectedCategory(catId);
    if (catId) setSearchParams({ category: catId });
    else setSearchParams({});
  };

  return (
    <div className="pt-16 min-h-screen bg-gradient-to-br from-slate-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 mb-2">المدرسون</h1>
          <p className="text-slate-500">اكتشف نخبة من أفضل المدرسين في جميع التخصصات</p>
        </div>

        {/* Search & Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث عن مدرس بالاسم أو التخصص..."
                className="w-full pr-11 pl-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
              />
            </div>
            <div className="flex gap-3">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors cursor-pointer"
              >
                <option value="newest">الأحدث</option>
                <option value="name">الاسم</option>
                <option value="experience">الأكثر خبرة</option>
              </select>
            </div>
          </div>

          {/* Category Pills */}
          <div className="flex items-center gap-2 mt-4 flex-wrap">
            <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <button
              onClick={() => handleCategoryClick(null)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                !selectedCategory ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              الكل
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategoryClick(cat.id)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === cat.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat.name_ar}
              </button>
            ))}
            {selectedCategory && (
              <button
                onClick={() => handleCategoryClick(null)}
                className="px-3 py-1.5 rounded-full text-sm text-red-500 hover:bg-red-50 transition-colors flex items-center gap-1"
              >
                <X className="w-4 h-4" /> إزالة الفلتر
              </button>
            )}
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-200 p-6 animate-pulse">
                <div className="w-20 h-20 rounded-full bg-slate-200 mx-auto mb-4" />
                <div className="h-5 bg-slate-200 rounded mb-2" />
                <div className="h-4 bg-slate-100 rounded w-2/3 mx-auto" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-700 mb-2">لا يوجد مدرسون</h3>
            <p className="text-slate-500">لم نعثر على مدرسين يطابقون بحثك. جرّب تعديل الفلاتر.</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-slate-500 mb-4">{filtered.length} مدرس</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((teacher) => {
                const review = reviews[teacher.id];
                return (
                  <Link
                    key={teacher.id}
                    to={`/teacher/${teacher.id}`}
                    className="group bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-lg hover:border-blue-200 transition-all hover:-translate-y-1"
                  >
                    <div className="p-6 text-center">
                      <div className="w-20 h-20 rounded-full mx-auto mb-4 overflow-hidden bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center">
                        {teacher.avatar_url ? (
                          <img src={teacher.avatar_url} alt={teacher.full_name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-2xl font-bold text-blue-600">{teacher.full_name.charAt(0)}</span>
                        )}
                      </div>
                      <h3 className="font-bold text-slate-800 mb-1 group-hover:text-blue-600 transition-colors">{teacher.full_name}</h3>
                      <p className="text-sm text-blue-600 mb-3">{teacher.specialization ?? 'مدرس'}</p>
                      {teacher.bio && (
                        <p className="text-sm text-slate-500 line-clamp-2 mb-3 leading-relaxed">{teacher.bio}</p>
                      )}
                      <div className="flex items-center justify-center gap-4 text-sm text-slate-400">
                        {review && review.count > 0 ? (
                          <span className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                            {review.avg.toFixed(1)} ({review.count})
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-slate-300">
                            <Star className="w-4 h-4" /> لا تقييمات
                          </span>
                        )}
                        {teacher.years_experience > 0 && (
                          <span>{teacher.years_experience} سنوات خبرة</span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
