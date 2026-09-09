import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, Star, Users, Filter, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { curricula, educationStages, getCurriculumLabel, getEducationStageLabel } from '@/lib/education';
import type { Profile, Category, Review } from '@/types';

export default function TeachersPage() {
  const { profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [teachers, setTeachers] = useState<Profile[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [reviews, setReviews] = useState<Record<string, { avg: number; count: number }>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(searchParams.get('category'));
  const [sortBy, setSortBy] = useState<'newest' | 'name' | 'experience'>('newest');
  const [selectedStage, setSelectedStage] = useState(searchParams.get('stage') ?? profile?.education_stage ?? '');
  const [selectedCurriculum, setSelectedCurriculum] = useState(searchParams.get('curriculum') ?? profile?.curriculum ?? '');

  useEffect(() => {
    if (!profile || searchParams.get('stage') || searchParams.get('curriculum')) return;
    setSelectedStage(profile.education_stage ?? '');
    setSelectedCurriculum(profile.curriculum ?? '');
  }, [profile, searchParams]);

  useEffect(() => {
    (async () => {
      const { data: catData } = await supabase.from('categories').select('*').order('sort_order', { ascending: true });
      setCategories(catData as Category[] ?? []);

      let query = supabase.from('profiles').select('*').eq('is_teacher', true).eq('is_approved', true);
      if (selectedCategory) {
        query = query.eq('specialization', categories.find(c => c.id === selectedCategory)?.name_ar ?? '');
      }
      if (sortBy === 'newest') query = query.order('created_at', { ascending: false });
      if (sortBy === 'name') query = query.order('full_name', { ascending: true });
      if (sortBy === 'experience') query = query.order('years_experience', { ascending: false });

      const { data: teacherData } = await query;
      const teacherList = (teacherData as Profile[] ?? []).filter((teacher) => {
        const stageMatch = !selectedStage || (teacher.teaching_stages ?? []).includes(selectedStage);
        const curriculumMatch = !selectedCurriculum || (teacher.teaching_curricula ?? []).includes(selectedCurriculum);
        return stageMatch && curriculumMatch;
      });
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
  }, [selectedCategory, sortBy, categories, selectedStage, selectedCurriculum]);

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

  const updateEducationFilter = (stage: string, curriculum: string) => {
    setSelectedStage(stage);
    setSelectedCurriculum(curriculum);
    const params: Record<string, string> = {};
    if (selectedCategory) params.category = selectedCategory;
    if (stage) params.stage = stage;
    if (curriculum) params.curriculum = curriculum;
    setSearchParams(params);
  };

  return (
    <div className="pt-[4.5rem] min-h-screen bg-gradient-to-br from-slate-50 to-white">
      <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-10 lg:px-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
              <h1 className="mb-1.5 text-2xl font-extrabold text-slate-900 sm:text-4xl">المدرسون</h1>
          <p className="text-sm leading-6 text-slate-500 sm:text-base">اكتشف نخبة من أفضل المدرسين في جميع التخصصات</p>
        </div>

        {/* Search & Filters */}
        <div className="mb-6 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث عن مدرس بالاسم أو التخصص..."
                className="min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-4 pr-11 text-sm text-slate-800 placeholder:text-slate-400 transition-colors focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
              />
            </div>
            <div className="flex gap-3">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="min-h-12 w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 transition-colors focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 lg:w-auto"
              >
                <option value="newest">الأحدث</option>
                <option value="name">الاسم</option>
                <option value="experience">الأكثر خبرة</option>
              </select>
            </div>
          </div>

          {/* Category Pills */}
            <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1 sm:mt-4 sm:flex-wrap sm:overflow-visible">
            <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <button
              onClick={() => handleCategoryClick(null)}
                className={`min-h-10 shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                !selectedCategory ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              الكل
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategoryClick(cat.id)}
                  className={`min-h-10 shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  selectedCategory === cat.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat.name_ar}
              </button>
            ))}
            {selectedCategory && (
              <button
                onClick={() => handleCategoryClick(null)}
                  className="flex min-h-10 shrink-0 items-center gap-1 rounded-full px-3 py-2 text-sm font-semibold text-red-500 transition-colors hover:bg-red-50"
              >
                <X className="w-4 h-4" /> إزالة الفلتر
              </button>
            )}
          </div>
          <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
            <label className="text-xs font-bold text-slate-500">المرحلة: <select value={selectedStage} onChange={(e) => updateEducationFilter(e.target.value, selectedCurriculum)} className="mt-1 min-h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-normal text-slate-700"><option value="">كل المراحل</option>{educationStages.map((stage) => <option key={stage.value} value={stage.value}>{stage.label}</option>)}</select></label>
            <label className="text-xs font-bold text-slate-500">المنهج: <select value={selectedCurriculum} onChange={(e) => updateEducationFilter(selectedStage, e.target.value)} className="mt-1 min-h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-normal text-slate-700"><option value="">كل المناهج</option>{curricula.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
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
            <p className="mb-4 text-sm text-slate-500">{filtered.length} مدرس {selectedStage && `في ${getEducationStageLabel(selectedStage)}`} {selectedCurriculum && `- ${getCurriculumLabel(selectedCurriculum)}`}</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
              {filtered.map((teacher) => {
                const review = reviews[teacher.id];
                return (
                  <Link
                    key={teacher.id}
                    to={`/teacher/${teacher.id}`}
                    className="group bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-lg hover:border-blue-200 transition-all hover:-translate-y-1"
                  >
                    <div className="p-5 text-center sm:p-6">
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
