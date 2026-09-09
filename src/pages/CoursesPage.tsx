import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Search, Filter } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { curricula, educationStages, getCurriculumLabel, getEducationStageLabel } from '@/lib/education';
import type { Course, Category } from '@/types';

export default function CoursesPage() {
  const { profile } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [selectedStage, setSelectedStage] = useState(profile?.education_stage ?? '');
  const [selectedCurriculum, setSelectedCurriculum] = useState(profile?.curriculum ?? '');

  useEffect(() => {
    if (!profile) return;
    setSelectedStage(profile.education_stage ?? '');
    setSelectedCurriculum(profile.curriculum ?? '');
  }, [profile]);

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
      .order('created_at', { ascending: false });

    if (selectedCategory) {
      query = query.eq('category_id', selectedCategory);
    }
    if (selectedLevel) {
      query = query.eq('level', selectedLevel);
    }
    if (selectedStage) query = query.eq('education_stage', selectedStage);
    if (selectedCurriculum) query = query.eq('curriculum', selectedCurriculum);

    const { data } = await query;
    setCourses(data as Course[] ?? []);
    setLoading(false);
  }, [selectedCategory, selectedLevel, selectedStage, selectedCurriculum]);

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
    beginner: 'bg-green-50 text-green-600', intermediate: 'bg-amber-50 text-amber-600', advanced: 'bg-rose-50 text-rose-600',
  };

  return (
    <div className="pt-[4.5rem] min-h-screen bg-gradient-to-br from-slate-50 to-white">
      <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-10 lg:px-8">
        <div className="mb-8">
          <h1 className="mb-1.5 text-2xl font-extrabold text-slate-900 sm:text-4xl">الدورات التدريبية</h1>
          <p className="text-sm leading-6 text-slate-500 sm:text-base">تصفح جميع الدورات المتاحة على المنصة</p>
        </div>

        {/* Search & Filters */}
        <div className="mb-6 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm sm:p-5">
          <div className="relative mb-4">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث عن دورة..."
              className="min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-4 pr-11 text-sm text-slate-800 placeholder:text-slate-400 transition-colors focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible">
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

          <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible">
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
          <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
            <label className="text-xs font-bold text-slate-500">المرحلة: <select value={selectedStage} onChange={(e) => setSelectedStage(e.target.value)} className="mt-1 min-h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-normal text-slate-700"><option value="">كل المراحل</option>{educationStages.map((stage) => <option key={stage.value} value={stage.value}>{stage.label}</option>)}</select></label>
            <label className="text-xs font-bold text-slate-500">المنهج: <select value={selectedCurriculum} onChange={(e) => setSelectedCurriculum(e.target.value)} className="mt-1 min-h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-normal text-slate-700"><option value="">كل المناهج</option>{curricula.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
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
            <p className="mb-4 text-sm text-slate-500">{filtered.length} دورة {selectedStage && `في ${getEducationStageLabel(selectedStage)}`} {selectedCurriculum && `- ${getCurriculumLabel(selectedCurriculum)}`}</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
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
