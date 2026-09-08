import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Search, Filter, Play, Eye, Loader2, Crown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Course, Category } from '@/types';

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: catData } = await supabase.from('categories').select('*').order('sort_order', { ascending: true });
      setCategories(catData as Category[] ?? []);
      await fetchCourses();
    })();
  }, []);

  const fetchCourses = async () => {
    setLoading(true);
    let query = supabase
      .from('courses')
      .select('*, category:categories(*), teacher:profiles!courses_teacher_id_fkey(*)')
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    if (selectedCategory) {
      query = query.eq('category_id', selectedCategory);
    }
    if (selectedLevel) {
      query = query.eq('level', selectedLevel);
    }

    const { data } = await query;
    setCourses(data as Course[] ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchCourses();
  }, [selectedCategory, selectedLevel]);

  const filtered = courses.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.title.toLowerCase().includes(q) || (c.description?.toLowerCase().includes(q) ?? false);
  });

  const levelLabels: Record<string, string> = { beginner: 'مبتدئ', intermediate: 'متوسط', advanced: 'متقدم' };
  const levelColors: Record<string, string> = {
    beginner: 'bg-green-50 text-green-600', intermediate: 'bg-amber-50 text-amber-600', advanced: 'bg-rose-50 text-rose-600',
  };

  return (
    <div className="pt-16 min-h-screen bg-gradient-to-br from-slate-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 mb-2">الدورات التدريبية</h1>
          <p className="text-slate-500">تصفح جميع الدورات المتاحة على المنصة</p>
        </div>

        {/* Search & Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 mb-6">
          <div className="relative mb-4">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث عن دورة..."
              className="w-full pr-11 pl-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${!selectedCategory ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              كل التخصصات
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${selectedCategory === cat.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {cat.name_ar}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={() => setSelectedLevel(null)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${!selectedLevel ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              كل المستويات
            </button>
            {['beginner', 'intermediate', 'advanced'].map((lvl) => (
              <button
                key={lvl}
                onClick={() => setSelectedLevel(selectedLevel === lvl ? null : lvl)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${selectedLevel === lvl ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {levelLabels[lvl]}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-200 overflow-hidden animate-pulse">
                <div className="aspect-video bg-slate-200" />
                <div className="p-5">
                  <div className="h-5 bg-slate-200 rounded mb-2" />
                  <div className="h-4 bg-slate-100 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-700 mb-2">لا توجد دورات</h3>
            <p className="text-slate-500">لم نعثر على دورات تطابق بحثك</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-slate-500 mb-4">{filtered.length} دورة</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((course) => (
                <Link
                  key={course.id}
                  to={`/course/${course.id}`}
                  className="group bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-lg hover:border-blue-200 transition-all hover:-translate-y-1"
                >
                  <div className="aspect-video bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center relative">
                    {course.thumbnail_url ? (
                      <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
                    ) : (
                      <BookOpen className="w-12 h-12 text-blue-300" />
                    )}
                    <span className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-medium ${levelColors[course.level]}`}>
                      {levelLabels[course.level]}
                    </span>
                    {course.price === 0 && (
                      <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                        مجاني
                      </span>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold text-slate-800 mb-2 group-hover:text-blue-600 transition-colors line-clamp-1">{course.title}</h3>
                    {course.description && (
                      <p className="text-sm text-slate-500 line-clamp-2 mb-3">{course.description}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {course.teacher && (
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center">
                              <span className="text-xs font-bold text-blue-600">{course.teacher.full_name.charAt(0)}</span>
                            </div>
                            <span className="text-xs text-slate-500">{course.teacher.full_name}</span>
                          </div>
                        )}
                      </div>
                      <span className="text-sm font-bold text-blue-600">
                        {course.price === 0 ? 'مجاني' : `${course.price} ر.س`}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
