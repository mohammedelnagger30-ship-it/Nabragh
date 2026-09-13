import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Search, Filter } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { curricula, educationStages, getCurriculumLabel, getEducationStageLabel } from '@/lib/education';
import type { Course, Category } from '@/types';
import AdvancedFilter from '@/components/AdvancedFilter';
import MetaTags from '@/components/MetaTags';

export default function CoursesPage() {
  const { profile } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [advFilters, setAdvFilters] = useState<Record<string, string[]>>({});

  const selectedStage = advFilters.stage?.[0] ?? null;
  const selectedCurriculum = advFilters.curriculum?.[0] ?? null;

  useEffect(() => {
    (async () => {
      const { data: catData } = await supabase.from('categories').select('*').order('sort_order', { ascending: true });
      setCategories(catData as Category[] ?? []);
    })();
  }, []);

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('courses')
      .select('*, category:categories(*), teacher:profiles!courses_teacher_id_fkey(*)')
      .eq('is_published', true)
      .eq('is_visible', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (selectedCategory) {
      query = query.eq('category_id', selectedCategory);
    }
    if (selectedStage) {
      query = query.or(`education_stage.eq.${selectedStage},education_stage.is.null`);
    }
    if (selectedCurriculum) {
      query = query.eq('curriculum', selectedCurriculum);
    }

    const { data } = await query;
    setCourses(data as Course[] ?? []);
    setLoading(false);
  }, [selectedCategory, selectedStage, selectedCurriculum]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const filtered = courses.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.title.toLowerCase().includes(q) || (c.description?.toLowerCase().includes(q) ?? false);
  });

  const levelLabels: Record<string, string> = { beginner: 'مبتدئ', intermediate: 'متوسط', advanced: 'متقدم' };
  const levelColors: Record<string, string> = {
    beginner: 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400', intermediate: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400', advanced: 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400',
  };

  return (
    <div className="pt-[4.5rem] min-h-screen bg-slate-50/70 dark:bg-slate-900">
      <MetaTags title="الدورات التدريبية | منصة العلم" description="تصفح جميع الدورات التدريبية المتاحة على منصة العلم" />
      <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-10 lg:px-8">
        <div className="mb-8">
          <h1 className="mb-1.5 text-2xl font-extrabold text-slate-900 sm:text-4xl dark:text-white">الدورات التدريبية</h1>
          <p className="text-sm leading-6 text-slate-600 sm:text-base dark:text-slate-400">تصفح جميع الدورات المتاحة على المنصة</p>
        </div>

        {/* Search & Filters */}
        <div className="mb-6 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm shadow-blue-500/5 sm:p-5 dark:border-slate-700 dark:bg-slate-800">
          <div className="relative mb-4">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث عن دورة..."
              className="min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50/60 py-3 pl-4 pr-11 text-sm text-slate-800 placeholder:text-slate-400 transition-colors focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible">
            <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${!selectedCategory ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20' : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'}`}
            >
              كل التخصصات
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${selectedCategory === cat.id ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20' : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'}`}
              >
                {cat.name_ar}
              </button>
            ))}
          </div>

          <div className="mt-3">
            <AdvancedFilter
              groups={[
                {
                  id: 'stage',
                  label: 'المرحلة الدراسية',
                  type: 'radio',
                  options: educationStages.map((s) => ({ id: s.value, label: s.label })),
                },
                {
                  id: 'curriculum',
                  label: 'المنهج',
                  options: curricula.map((c) => ({ id: c.value, label: c.label })),
                },
              ]}
              onFilterChange={setAdvFilters}
              activeFilters={advFilters}
            />
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden animate-pulse dark:bg-slate-800 dark:border-slate-700">
                <div className="aspect-video bg-slate-200 dark:bg-slate-700" />
                <div className="p-5">
                  <div className="h-5 bg-slate-200 rounded mb-2 dark:bg-slate-700" />
                  <div className="h-4 bg-slate-100 rounded w-2/3 dark:bg-slate-700" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4 dark:text-slate-600" />
            <h3 className="text-xl font-bold text-slate-700 mb-2 dark:text-slate-200">لا توجد دورات</h3>
            <p className="text-slate-500 dark:text-slate-400">لم نعثر على دورات تطابق بحثك</p>
          </div>
        ) : (
          <>
            <p className="mb-4 text-sm font-semibold text-slate-500 dark:text-slate-400">{filtered.length} دورة {selectedStage && `في ${getEducationStageLabel(selectedStage)}`} {selectedCurriculum && `- ${getCurriculumLabel(selectedCurriculum)}`}</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
              {filtered.map((course) => (
                <Link
                  key={course.id}
                  to={`/course/${course.id}`}
                  className="group bg-white rounded-2xl shadow-sm border border-slate-200/90 overflow-hidden hover:shadow-xl hover:shadow-blue-500/10 hover:border-blue-300 transition-all hover:-translate-y-1 dark:bg-slate-800 dark:border-slate-700 dark:hover:border-blue-500"
                >
                  <div className="aspect-video bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center relative dark:from-slate-700 dark:to-slate-700">
                    {course.thumbnail_url ? (
                      <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
                    ) : (
                      <BookOpen className="w-12 h-12 text-blue-300 dark:text-blue-400" />
                    )}
                    {course.education_stage && (
                      <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                        {getEducationStageLabel(course.education_stage)}
                      </span>
                    )}
                    {course.price === 0 && (
                      <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                        مجاني
                      </span>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold text-slate-800 mb-2 group-hover:text-blue-600 transition-colors line-clamp-1 dark:text-white dark:group-hover:text-blue-400">{course.title}</h3>
                    {course.description && (
                      <p className="text-sm text-slate-500 line-clamp-2 mb-3 dark:text-slate-400">{course.description}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {course.teacher && (
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center">
                              <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{course.teacher.full_name.charAt(0)}</span>
                            </div>
                            <span className="text-xs text-slate-500 dark:text-slate-400">{course.teacher.full_name}</span>
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
