import { useEffect, useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Search, Star, Users, Filter, X, Grid, List, Heart, BookOpen, Award,
  Clock, ChevronDown, ChevronUp,
  GraduationCap, Crown, SlidersHorizontal, Sparkles, ArrowRight, CheckCircle, XCircle, ArrowUpDown
} from 'lucide-react';
import { supabase, PROFILE_PUBLIC_COLUMNS } from '@/lib/supabase';
// import { useAuth } from '@/context/AuthContext';
import { curricula, educationStages, getCurriculumLabel, getEducationStageLabel } from '@/lib/education';
import { isPublicTeacher } from '@/lib/teachers';
import MetaTags from '@/components/MetaTags';
import TrustedTeacherBadge from '@/components/TrustedTeacherBadge';
import type { Profile, Category } from '@/types';

export default function TeachersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [teachers, setTeachers] = useState<Profile[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [reviews, setReviews] = useState<Record<string, { avg: number; count: number }>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(searchParams.get('category'));
  const [sortBy, setSortBy] = useState<'newest' | 'name' | 'experience' | 'rating' | 'reviews'>('rating');
  const [selectedStage, setSelectedStage] = useState(searchParams.get('stage') ?? '');
  const [selectedCurriculum, setSelectedCurriculum] = useState(searchParams.get('curriculum') ?? '');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [experienceFilter, setExperienceFilter] = useState<'all' | 'junior' | 'mid' | 'senior'>('all');
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [highlightedTeachers, setHighlightedTeachers] = useState<Profile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Remove profile dependency to prevent blocking
  // useEffect(() => {
  //   if (!profile || searchParams.get('stage') || searchParams.get('curriculum')) return;
  //   setSelectedStage(profile.education_stage ?? '');
  //   setSelectedCurriculum(profile.curriculum ?? '');
  // }, [profile, searchParams]);

  // Load favorites from localStorage
  useEffect(() => {
    const savedFavorites = localStorage.getItem('favoriteTeachers');
    if (savedFavorites) {
      setFavorites(new Set(JSON.parse(savedFavorites)));
    }
  }, []);

  const toggleFavorite = (teacherId: string) => {
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(teacherId)) {
        newFavorites.delete(teacherId);
      } else {
        newFavorites.add(teacherId);
      }
      localStorage.setItem('favoriteTeachers', JSON.stringify([...newFavorites]));
      return newFavorites;
    });
  };

  useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);

        const loadTeachers = async () => {
          const [categoryResult, teacherResult] = await Promise.all([
            supabase.from('categories').select('*').order('sort_order', { ascending: true }),
            supabase.from('profiles').select(PROFILE_PUBLIC_COLUMNS).eq('is_teacher', true).eq('is_approved', true).order('created_at', { ascending: false }).limit(100),
          ]);

          if (teacherResult.error && !teacherResult.data) {
            throw new Error(teacherResult.error.message);
          }
          if (categoryResult.error) console.warn('teachers categories:', categoryResult.error.message);
          const loadedTeachers = ((teacherResult.data as Profile[]) ?? []).filter(isPublicTeacher);
          const teacherIds = loadedTeachers.map((teacher) => teacher.id);

          // Aggregate ratings server-side when the RPC is available, fall back to a bounded query
          const { data: ratingsData, error: ratingsError } = teacherIds.length
            ? ((await supabase.rpc('get_teacher_ratings')) as { data: { teacher_id: string; avg_rating: number; review_count: number }[] | null; error: { message: string } | null })
            : { data: null, error: null };

          const loadedReviews: Record<string, { avg: number; count: number }> = !ratingsError && ratingsData
            ? Object.fromEntries(
                ratingsData.map((row) => [
                  row.teacher_id,
                  { avg: Number(row.avg_rating), count: Number(row.review_count) },
                ]),
              )
            : {};

          if (ratingsError || !ratingsData) {
            const reviewResult = teacherIds.length
              ? await supabase.from('reviews').select('teacher_id, rating').in('teacher_id', teacherIds).limit(2000)
              : { data: [], error: null };
            if (reviewResult.error) console.warn('teachers reviews:', reviewResult.error.message);

            const reviewTotals = new Map<string, { total: number; count: number }>();
            for (const review of reviewResult.data ?? []) {
              const current = reviewTotals.get(review.teacher_id) ?? { total: 0, count: 0 };
              reviewTotals.set(review.teacher_id, { total: current.total + review.rating, count: current.count + 1 });
            }
            for (const [teacherId, value] of reviewTotals) {
              loadedReviews[teacherId] = { avg: value.total / value.count, count: value.count };
            }
          }

          if (!cancelled) {
            setCategories((categoryResult.data as Category[]) ?? []);
            setTeachers(loadedTeachers);
            setHighlightedTeachers([...loadedTeachers].sort((a, b) => (loadedReviews[b.id]?.avg ?? 0) - (loadedReviews[a.id]?.avg ?? 0)).slice(0, 3));
            setReviews(loadedReviews);
            setLoading(false);
          }
        };

        void loadTeachers().catch((loadError) => {
          console.error('Error loading teachers:', loadError);
          if (!cancelled) {
            setError('تعذر تحميل المدرسين. تحقق من الاتصال وحاول مرة أخرى.');
            setLoading(false);
          }
        });

        return () => {
          cancelled = true;
        };
      }, [retryCount]);

  const filtered = useMemo(() => {
    let result = teachers.filter((t) => {
      if (selectedCategory && !t.teaching_curricula?.includes(selectedCategory) && t.specialization !== categories.find((category) => category.id === selectedCategory)?.name_ar) return false;
      if (selectedStage && !t.teaching_stages?.includes(selectedStage)) return false;
      if (selectedCurriculum && !t.teaching_curricula?.includes(selectedCurriculum)) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return t.full_name.toLowerCase().includes(q) ||
        (t.specialization?.toLowerCase().includes(q) ?? false) ||
        (t.bio?.toLowerCase().includes(q) ?? false);
    });

    // Apply experience filter
    if (experienceFilter !== 'all') {
      result = result.filter(t => {
        const exp = t.years_experience;
        switch (experienceFilter) {
          case 'junior': return exp >= 0 && exp < 3;
          case 'mid': return exp >= 3 && exp < 7;
          case 'senior': return exp >= 7;
          default: return true;
        }
      });
    }

    // Apply sorting
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'name':
          return a.full_name.localeCompare(b.full_name, 'ar');
        case 'experience':
          return b.years_experience - a.years_experience;
        case 'rating': {
          const ra = reviews[a.id];
          const rb = reviews[b.id];
          const aHas = Boolean(ra && ra.count > 0);
          const bHas = Boolean(rb && rb.count > 0);
          if (aHas !== bHas) return aHas ? -1 : 1;
          const diff = (rb?.avg ?? 0) - (ra?.avg ?? 0);
          if (diff !== 0) return diff;
          const countDiff = (rb?.count ?? 0) - (ra?.count ?? 0);
          if (countDiff !== 0) return countDiff;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        case 'reviews':
          return (reviews[b.id]?.count || 0) - (reviews[a.id]?.count || 0);
        default:
          return 0;
      }
    });

    return result;
  }, [teachers, search, experienceFilter, sortBy, reviews, selectedCategory, selectedStage, selectedCurriculum, categories]);

  const visibleTeachers = useMemo(
    () => (favoritesOnly ? filtered.filter((t) => favorites.has(t.id)) : filtered),
    [filtered, favoritesOnly, favorites],
  );

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-white pt-[4.5rem] dark:from-slate-900 dark:via-slate-800/50 dark:to-slate-950">
      <MetaTags title="المدرسون | Noona" description="اكتشف نخبة من أفضل المدرسين في جميع التخصصات" />
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        {/* Hero Header */}
        <div className="mb-6 sm:mb-10 relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-950 via-[#101a2e] to-slate-900 p-6 sm:p-10 lg:p-16 shadow-2xl shadow-slate-900/30 ring-1 ring-white/10 dark:from-black dark:via-slate-900 dark:to-slate-950">
          <div className="pointer-events-none absolute -top-20 -left-16 h-60 w-60 rounded-full bg-blue-600/20 blur-3xl sm:-top-28 sm:-left-20 sm:h-80 sm:w-80" />
          <div className="pointer-events-none absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl sm:-bottom-36 sm:-right-24 sm:h-96 sm:w-96" />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.08%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-30" />
          <div className="relative z-10 mx-auto max-w-3xl text-center">
            <div className="mb-4 flex justify-center sm:mb-5">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="flex items-center justify-center rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 shadow-xl shadow-blue-500/25 ring-1 ring-white/20">
                  <GraduationCap className="h-6 w-6 p-1 text-white sm:h-8 sm:w-8 sm:p-1.5" />
                </div>
                <span className="rounded-full bg-white/5 px-3 py-1.5 text-xs font-semibold text-white ring-1 ring-inset ring-white/15 backdrop-blur-sm sm:px-4 sm:py-2 sm:text-sm">
                  {loading && !teachers.length ? '...' : `${teachers.length} مدرس متاح`}
                </span>
              </div>
            </div>
            <h1 className="mb-3 text-2xl font-extrabold leading-tight tracking-tight text-white sm:mb-4 sm:text-3xl lg:text-5xl">
              اكتشف نخبة من أفضل المدرسين
            </h1>
            <p className="mx-auto max-w-2xl text-sm leading-relaxed text-slate-300/90 sm:text-base sm:leading-7 sm:text-lg">
              تصفح آلاف المدرسين المحترفين في جميع التخصصات واختر الأنسب لتعليمك
            </p>
          </div>
        </div>

        {/* Highlighted Teachers Section */}
        {highlightedTeachers.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-11 h-11 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl shadow-lg shadow-amber-500/30">
                  <Award className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-800 dark:text-white">
                    المدرسون المميزون
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">نخبة من أفضل المدرسين حسب تقييمات الطلاب</p>
                </div>
              </div>
              <Link
                to="/teachers"
                className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-blue-600 shadow-sm transition-colors hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 sm:flex"
              >
                عرض الكل
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {highlightedTeachers.slice(0, 3).map((teacher) => {
                const review = reviews[teacher.id];
                return (
                  <Link
                    key={teacher.id}
                    to={`/teacher/${teacher.id}`}
                    className="group relative bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-2xl hover:border-blue-300 dark:hover:border-blue-500/50 transition-all hover:-translate-y-2"
                  >
                    <div className="absolute top-3 right-3 z-10 flex flex-col items-end gap-2">
                      <span className="flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full text-white text-xs font-bold shadow-lg">
                        <Sparkles className="w-3 h-3" />
                        مميز
                      </span>
                      <TrustedTeacherBadge teacher={teacher} avgRating={review?.avg ?? 0} reviewCount={review?.count ?? 0} />
                    </div>
                    <div className="p-5 text-center sm:p-6">
                      <div className="relative w-24 h-24 mx-auto mb-4">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/40 dark:to-cyan-900/40 rounded-full animate-pulse" />
                        <div className="relative w-full h-full rounded-full overflow-hidden ring-4 ring-white dark:ring-slate-800 shadow-xl">
                          {teacher.avatar_url ? (
                            <img src={teacher.avatar_url} alt={teacher.full_name} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                          ) : (
                            <span className="text-3xl font-bold text-blue-600">{teacher.full_name.charAt(0)}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-center gap-2"><h3 className="font-bold text-slate-800 dark:text-slate-100 mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors text-lg">{teacher.full_name}</h3>{teacher.teacher_tier === 'premium' && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">بريميوم</span>}</div>
                      <p className="text-sm text-blue-600 mb-3 font-semibold">{teacher.specialization ?? 'مدرس'}</p>
                      <div className="flex items-center justify-center gap-4 text-sm">
                        {review && review.count > 0 ? (
                          <span className="flex items-center gap-1 bg-amber-50 dark:bg-amber-900/30 px-3 py-1 rounded-full">
                            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                            <span className="font-bold text-slate-700 dark:text-slate-200">{review.avg.toFixed(1)}</span>
                            <span className="text-slate-500 dark:text-slate-400">({review.count})</span>
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-slate-400 px-3 py-1">
                            <Star className="w-4 h-4" /> لا تقييمات
                          </span>
                        )}
                        {teacher.years_experience > 0 && (
                          <span className="flex items-center gap-1 bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-full text-slate-600 dark:text-slate-300">
                            <Clock className="w-4 h-4 text-blue-600" />
                            {teacher.years_experience} سنة
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Search & Filters */}
        <div className="mb-8 rounded-3xl border border-slate-200/80 bg-white/80 p-5 shadow-xl shadow-slate-200/50 backdrop-blur dark:border-slate-700 dark:bg-slate-800/60 dark:shadow-black/20 sm:p-7">
          {/* Mobile Filter Toggle */}
          <div className="lg:hidden mb-4">
            <button
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className="flex items-center gap-2 w-full px-4 py-3 bg-slate-100 dark:bg-slate-700 rounded-xl text-slate-700 dark:text-slate-200 font-semibold"
            >
              <SlidersHorizontal className="w-5 h-5" />
              {showMobileFilters ? 'إخفاء الفلاتر' : 'عرض الفلاتر'}
              {showMobileFilters ? <ChevronUp className="w-5 h-5 mr-auto" /> : <ChevronDown className="w-5 h-5 mr-auto" />}
            </button>
          </div>

          <div className={`flex flex-col gap-4 ${showMobileFilters ? 'block' : 'hidden lg:block'}`}>
            {/* Header + matching count */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 shadow-md shadow-blue-500/25">
                  <SlidersHorizontal className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-800 dark:text-white">البحث والتصفية</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">خصّص نتائجك لتجد المدرس الأنسب لأهدافك التعليمية</p>
                </div>
              </div>
              <div className="rounded-xl bg-blue-50 px-4 py-2 text-center ring-1 ring-blue-100 dark:bg-blue-900/30 dark:ring-blue-900/40">
                <span className="block text-lg font-extrabold leading-none text-blue-700 dark:text-blue-300">{visibleTeachers.length}</span>
                <span className="mt-1 block text-[10px] font-bold text-blue-600/70 dark:text-blue-300/70">مدرس يطابق بحثك</span>
              </div>
            </div>

            {/* Advanced toggle */}
            <div className="flex justify-end">
              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-colors ${
                  showAdvancedFilters
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                <Filter className="h-4 w-4" />
                فلاتر متقدمة
                {showAdvancedFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="البحث عن مدرس"
                placeholder="اكتب اسم المدرس أو التخصص للبحث..."
                className="min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-12 text-base text-slate-800 shadow-sm transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  aria-label="مسح البحث"
                  className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Active filter chips */}
            {(search || selectedCategory || selectedStage || selectedCurriculum || experienceFilter !== 'all') && (
              <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-blue-100 bg-blue-50/70 p-3 dark:border-blue-900/40 dark:bg-blue-900/20">
                <span className="flex items-center gap-1.5 text-xs font-bold text-blue-700 dark:text-blue-300">
                  <Filter className="h-3.5 w-3.5" /> فلاتر مطبقة:
                </span>
                {search && (
                  <button onClick={() => setSearch('')} className="flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700 shadow-sm ring-1 ring-slate-200 transition-colors hover:bg-slate-50 dark:bg-slate-700 dark:text-slate-200 dark:ring-slate-600 dark:hover:bg-slate-600">
                    "{search}" <X className="h-3.5 w-3.5" />
                  </button>
                )}
                {selectedCategory && (
                  <button onClick={() => handleCategoryClick(null)} className="flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700 shadow-sm ring-1 ring-slate-200 transition-colors hover:bg-slate-50 dark:bg-slate-700 dark:text-slate-200 dark:ring-slate-600 dark:hover:bg-slate-600">
                    {categories.find((c) => c.id === selectedCategory)?.name_ar ?? selectedCategory} <X className="h-3.5 w-3.5" />
                  </button>
                )}
                {selectedStage && (
                  <button onClick={() => updateEducationFilter('', selectedCurriculum)} className="flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700 shadow-sm ring-1 ring-slate-200 transition-colors hover:bg-slate-50 dark:bg-slate-700 dark:text-slate-200 dark:ring-slate-600 dark:hover:bg-slate-600">
                    {educationStages.find((s) => s.value === selectedStage)?.label ?? selectedStage} <X className="h-3.5 w-3.5" />
                  </button>
                )}
                {selectedCurriculum && (
                  <button onClick={() => updateEducationFilter(selectedStage, '')} className="flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700 shadow-sm ring-1 ring-slate-200 transition-colors hover:bg-slate-50 dark:bg-slate-700 dark:text-slate-200 dark:ring-slate-600 dark:hover:bg-slate-600">
                    {curricula.find((c) => c.value === selectedCurriculum)?.label ?? selectedCurriculum} <X className="h-3.5 w-3.5" />
                  </button>
                )}
                {experienceFilter !== 'all' && (
                  <button onClick={() => setExperienceFilter('all')} className="flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700 shadow-sm ring-1 ring-slate-200 transition-colors hover:bg-slate-50 dark:bg-slate-700 dark:text-slate-200 dark:ring-slate-600 dark:hover:bg-slate-600">
                    الخبرة: {experienceFilter === 'junior' ? '0-3 سنوات' : experienceFilter === 'mid' ? '3-7 سنوات' : '7+ سنوات'} <X className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  onClick={() => {
                    setSelectedCategory(null);
                    setSelectedStage('');
                    setSelectedCurriculum('');
                    setExperienceFilter('all');
                    setSearch('');
                    setSearchParams({});
                  }}
                  className="mr-auto flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <XCircle className="h-3.5 w-3.5" /> مسح الكل
                </button>
              </div>
            )}

            {/* Sort + View */}
            <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-700 dark:bg-slate-900/40 sm:flex-row sm:items-center sm:gap-4">
              <label htmlFor="sort-select" className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
                <ArrowUpDown className="h-4 w-4 text-blue-600 dark:text-blue-400" /> ترتيب النتائج
              </label>
              <select
                id="sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="min-h-12 min-w-0 flex-1 cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value="rating">الأعلى تقييماً</option>
                <option value="newest">الأحدث انضماماً</option>
                <option value="name">الاسم أبجدياً</option>
                <option value="experience">الأكثر خبرة</option>
                <option value="reviews">الأكثر تقييماً</option>
              </select>
              <div className="flex items-center justify-between gap-3 sm:mr-auto sm:justify-start">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">طريقة العرض</span>
                <div className="flex items-center rounded-xl bg-slate-100 p-1 dark:bg-slate-700">
                  <button
                    onClick={() => setViewMode('grid')}
                    aria-label="عرض شبكي"
                    className={`rounded-lg p-2 transition-all ${viewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm dark:bg-slate-600 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                  >
                    <Grid className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    aria-label="عرض قائمة"
                    className={`rounded-lg p-2 transition-all ${viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm dark:bg-slate-600 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                  >
                    <List className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Categories */}
            <div className="border-t border-slate-100 pt-5 dark:border-slate-700">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
                  <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" /> التخصص
                </label>
                <span className="text-xs text-slate-400 dark:text-slate-500">اختر تخصص المدرس المطلوب</span>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:flex-wrap sm:overflow-visible">
                <button
                  onClick={() => handleCategoryClick(null)}
                  className={`min-h-10 shrink-0 rounded-full px-5 py-2 text-sm font-bold transition-all ${
                    !selectedCategory
                      ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/30'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
                  }`}
                >
                  الكل
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => handleCategoryClick(cat.id)}
                    className={`min-h-10 shrink-0 rounded-full px-5 py-2 text-sm font-bold transition-all ${
                      selectedCategory === cat.id
                        ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/30'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
                    }`}
                  >
                    {cat.name_ar}
                  </button>
                ))}
              </div>
            </div>

            {/* Education & Curriculum */}
            <div className="grid gap-4 border-t border-slate-100 pt-5 dark:border-slate-700 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">المرحلة التعليمية</label>
                <p className="mb-2 text-xs text-slate-400 dark:text-slate-500">المرحلة الدراسية للطالب المستهدفة</p>
                <select
                  value={selectedStage}
                  onChange={(e) => updateEducationFilter(e.target.value, selectedCurriculum)}
                  className="w-full min-h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-normal text-slate-700 transition-colors focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
                >
                  <option value="">كل المراحل</option>
                  {educationStages.map((stage) => (
                    <option key={stage.value} value={stage.value}>
                      {stage.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">المنهج الدراسي</label>
                <p className="mb-2 text-xs text-slate-400 dark:text-slate-500">المنهج الذي تدرسه حالياً</p>
                <select
                  value={selectedCurriculum}
                  onChange={(e) => updateEducationFilter(selectedStage, e.target.value)}
                  className="w-full min-h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-normal text-slate-700 transition-colors focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
                >
                  <option value="">كل المناهج</option>
                  {curricula.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Advanced Filters */}
            {showAdvancedFilters && (
              <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4 dark:border-amber-900/30 dark:bg-amber-900/10">
                <div className="mb-3 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-200">فلاتر إضافية دقيقة</label>
                </div>
                <div className="grid gap-4 sm:grid-cols-3 sm:items-end">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-slate-500 dark:text-slate-400">سنوات الخبرة</label>
                    <select
                      value={experienceFilter}
                      onChange={(e) => setExperienceFilter(e.target.value as typeof experienceFilter)}
                      className="w-full min-h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm font-normal text-slate-700 transition-colors focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
                    >
                      <option value="all">الكل</option>
                      <option value="junior">0-3 سنوات (مبتدئ)</option>
                      <option value="mid">3-7 سنوات (متوسط)</option>
                      <option value="senior">7+ سنوات (خبير)</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <button
                      onClick={() => {
                        setSelectedCategory(null);
                        setSelectedStage('');
                        setSelectedCurriculum('');
                        setExperienceFilter('all');
                        setSearch('');
                        setSearchParams({});
                      }}
                      className="w-full min-h-12 flex items-center justify-center gap-2 rounded-xl border-2 border-red-200 bg-white text-red-600 font-bold transition-colors hover:bg-red-50 dark:border-red-800 dark:bg-slate-900 dark:text-red-400 dark:hover:bg-red-900/20"
                    >
                      <XCircle className="w-5 h-5" />
                      مسح جميع الفلاتر
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 animate-pulse">
                <div className="w-24 h-24 rounded-full bg-slate-200 dark:bg-slate-700 mx-auto mb-4" />
                <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded mb-2 w-3/4 mx-auto" />
                <div className="h-4 bg-slate-100 dark:bg-slate-600 rounded w-1/2 mx-auto mb-4" />
                <div className="h-3 bg-slate-100 dark:bg-slate-600 rounded w-full mb-2" />
                <div className="h-3 bg-slate-100 dark:bg-slate-600 rounded w-2/3 mx-auto" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-rose-500 shadow-lg shadow-red-500/25">
              <XCircle className="h-10 w-10 text-white" />
            </div>
            <h3 className="mb-3 text-2xl font-extrabold text-slate-700 dark:text-slate-200">حدث خطأ</h3>
            <p className="mx-auto mb-6 max-w-md text-slate-500 dark:text-slate-400">{error}</p>
            <button
              onClick={() => {
                setError(null);
                setRetryCount((count) => count + 1);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-3 font-bold text-white shadow-lg shadow-blue-500/25 transition-all hover:-translate-y-0.5"
            >
              إعادة المحاولة
            </button>
          </div>
        ) : visibleTeachers.length === 0 ? (
          <div className="text-center py-16">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-200 to-slate-300 shadow-lg dark:from-slate-800 dark:to-slate-700">
              <Users className="h-10 w-10 text-slate-500 dark:text-slate-400" />
            </div>
            <h3 className="mb-3 text-2xl font-extrabold text-slate-700 dark:text-slate-200">لا يوجد مدرسون</h3>
            <p className="mx-auto mb-6 max-w-md text-slate-500 dark:text-slate-400">لم نعثر على مدرسين يطابقون بحثك. جرّب تعديل الفلاتر أو البحث عن تخصص آخر.</p>
            <button
              onClick={() => {
                setSelectedCategory(null);
                setSelectedStage('');
                setSelectedCurriculum('');
                setExperienceFilter('all');
                setSearch('');
                setFavoritesOnly(false);
                setSearchParams({});
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-3 font-bold text-white shadow-lg shadow-blue-500/25 transition-all hover:-translate-y-0.5"
            >
              <Filter className="w-5 h-5" />
              مسح الفلاتر
            </button>
          </div>
        ) : (
          <>
            {/* Results Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-11 h-11 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-2xl shadow-lg shadow-blue-500/25">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-xl font-extrabold text-slate-800 dark:text-white">
                    {visibleTeachers.length} مدرس
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {selectedStage && `في ${getEducationStageLabel(selectedStage)}`}
                    {selectedCurriculum && ` - ${getCurriculumLabel(selectedCurriculum)}`}
                    {favoritesOnly && ' — مفضلتك فقط'}
                  </p>
                </div>
              </div>

              {/* Favorites Toggle */}
              <button
                onClick={() => setFavoritesOnly(!favoritesOnly)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm shadow-sm ring-1 ring-inset transition-colors ${
                  favoritesOnly
                    ? 'bg-red-50 text-red-600 ring-red-200 dark:bg-red-900/20 dark:text-red-300 dark:ring-red-800'
                    : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-slate-700'
                }`}
              >
                <Heart className={`w-5 h-5 ${favorites.size > 0 ? 'fill-red-500 text-red-500' : 'text-slate-400'}`} />
                {favoritesOnly ? 'عرض الكل' : `المفضلة (${favorites.size})`}
              </button>
            </div>

            {/* Teachers Grid/List */}
            <div className={`${viewMode === 'grid' ? 'grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3' : 'flex flex-col gap-4'}`}>
              {filtered.map((teacher) => {
                const review = reviews[teacher.id];
                const isFavorite = favorites.has(teacher.id);

                if (viewMode === 'grid') {
                  return (
                    <div
                      key={teacher.id}
                      className="group relative bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-2xl hover:border-blue-300 dark:hover:border-blue-500/50 transition-all hover:-translate-y-2"
                    >
                      {/* Favorite Button */}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          toggleFavorite(teacher.id);
                        }}
                        className="absolute top-4 left-4 z-10 p-2 bg-white/90 dark:bg-slate-700/90 backdrop-blur-sm rounded-full shadow-lg hover:scale-110 transition-transform"
                      >
                        <Heart className={`w-5 h-5 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-slate-400'}`} />
                      </button>

                      {/* Manager + Trusted badges (stacked top-right) */}
                      <div className="absolute top-4 right-4 z-10 flex flex-col items-end gap-2">
                        {teacher.is_manager && (
                          <span className="flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full text-white text-xs font-bold shadow-lg">
                            <Crown className="w-3 h-3" />
                            مدير
                          </span>
                        )}
                        <TrustedTeacherBadge teacher={teacher} avgRating={review?.avg ?? 0} reviewCount={review?.count ?? 0} />
                      </div>

                      <Link to={`/teacher/${teacher.id}`} className="block">
                        <div className="p-6 text-center">
                          {/* Avatar */}
                          <div className="relative w-28 h-28 mx-auto mb-5">
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/40 dark:to-cyan-900/40 rounded-full animate-pulse" />
                            <div className="relative w-full h-full rounded-full overflow-hidden ring-4 ring-white dark:ring-slate-800 shadow-xl">
                              {teacher.avatar_url ? (
                                <img src={teacher.avatar_url} alt={teacher.full_name} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                              ) : (
                                <span className="text-4xl font-bold text-blue-600">{teacher.full_name.charAt(0)}</span>
                              )}
                            </div>
                            {teacher.is_approved && (
                              <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center shadow-lg border-2 border-white dark:border-slate-800">
                                <CheckCircle className="w-4 h-4 text-white" />
                              </div>
                            )}
                          </div>

                          {/* Name & Specialization */}
                          <div className="flex items-center gap-2"><h3 className="font-bold text-slate-800 dark:text-slate-100 mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors text-xl">
                            {teacher.full_name}
                          </h3>{teacher.teacher_tier === 'premium' && <span className="mb-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">بريميوم</span>}</div>
                          <p className="text-sm text-blue-600 mb-4 font-semibold">{teacher.specialization ?? 'مدرس'}</p>

                          {/* Bio */}
                          {teacher.bio && (
                            <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-4 leading-relaxed">
                              {teacher.bio}
                            </p>
                          )}

                          {/* Stats */}
                          <div className="flex items-center justify-center gap-3 mb-4">
                            {review && review.count > 0 ? (
                              <div className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-900/30 px-3 py-1.5 rounded-full">
                                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                                <span className="font-bold text-slate-700 dark:text-slate-200">{review.avg.toFixed(1)}</span>
                                <span className="text-slate-500 dark:text-slate-400 text-xs">({review.count})</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 text-slate-400 px-3 py-1.5">
                                <Star className="w-4 h-4" />
                                <span className="text-xs">لا تقييمات</span>
                              </div>
                            )}
                            {teacher.years_experience > 0 && (
                              <div className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded-full text-slate-600 dark:text-slate-300">
                                <Clock className="w-4 h-4 text-blue-600" />
                                <span className="text-xs font-semibold">{teacher.years_experience} سنة</span>
                              </div>
                            )}
                          </div>

                          {/* Teaching Stages */}
                          {teacher.teaching_stages && teacher.teaching_stages.length > 0 && (
                            <div className="flex flex-wrap justify-center gap-2 mb-4">
                              {teacher.teaching_stages.slice(0, 2).map((stage) => (
                                <span key={stage} className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded-lg text-xs text-slate-600 dark:text-slate-300">
                                  {getEducationStageLabel(stage)}
                                </span>
                              ))}
                              {teacher.teaching_stages.length > 2 && (
                                <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded-lg text-xs text-slate-600 dark:text-slate-300">
                                  +{teacher.teaching_stages.length - 2}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Action Button */}
                          <div className="flex items-center justify-center gap-2 text-blue-600 font-semibold text-sm group-hover:gap-3 transition-all">
                            عرض الملف الشخصي
                            <ArrowRight className="w-4 h-4" />
                          </div>
                        </div>
                      </Link>
                    </div>
                  );
                } else {
                  // List View
                  return (
                    <div
                      key={teacher.id}
                      className="group bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-xl hover:border-blue-300 dark:hover:border-blue-500/50 transition-all"
                    >
                      <Link to={`/teacher/${teacher.id}`} className="flex items-center gap-4 p-4 sm:p-6">
                        {/* Avatar */}
                        <div className="relative w-20 h-20 flex-shrink-0">
                          <div className="w-full h-full rounded-2xl overflow-hidden ring-4 ring-white dark:ring-slate-800 shadow-lg">
                            {teacher.avatar_url ? (
                              <img src={teacher.avatar_url} alt={teacher.full_name} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/40 dark:to-cyan-900/40 flex items-center justify-center">
                                <span className="text-2xl font-bold text-blue-600">{teacher.full_name.charAt(0)}</span>
                              </div>
                            )}
                          </div>
                          {teacher.is_approved && (
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center shadow-lg border-2 border-white dark:border-slate-800">
                              <CheckCircle className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <h3 className="font-bold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors text-lg">
                                {teacher.full_name}
                              </h3>
                              <p className="text-sm text-blue-600 font-semibold">{teacher.specialization ?? 'مدرس'}</p>
                              <TrustedTeacherBadge teacher={teacher} avgRating={review?.avg ?? 0} reviewCount={review?.count ?? 0} className="mt-2" />
                            </div>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                toggleFavorite(teacher.id);
                              }}
                              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
                            >
                              <Heart className={`w-5 h-5 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-slate-400'}`} />
                            </button>
                          </div>

                          {teacher.bio && (
                            <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-1 mb-3">
                              {teacher.bio}
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-3">
                            {review && review.count > 0 && (
                              <div className="flex items-center gap-1">
                                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{review.avg.toFixed(1)}</span>
                                <span className="text-xs text-slate-500 dark:text-slate-400">({review.count})</span>
                              </div>
                            )}
                            {teacher.years_experience > 0 && (
                              <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                                <Clock className="w-4 h-4" />
                                <span className="text-sm">{teacher.years_experience} سنة</span>
                              </div>
                            )}
                            {teacher.teaching_stages && teacher.teaching_stages.length > 0 && (
                              <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                                <BookOpen className="w-4 h-4" />
                                <span className="text-sm">{teacher.teaching_stages.length} مراحل</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Arrow */}
                        <div className="flex items-center justify-center w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-full group-hover:bg-blue-600 dark:group-hover:bg-blue-500 transition-colors">
                          <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" />
                        </div>
                      </Link>
                    </div>
                  );
                }
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
