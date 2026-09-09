import { useEffect, useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Search, Star, Users, Filter, X, Grid, List, Heart, BookOpen, Award,
  MapPin, Clock, TrendingUp, ChevronDown, ChevronUp, Bookmark, Share2,
  Eye, MessageSquare, GraduationCap, Shield, Crown, Zap, Flame, BarChart3,
  Menu, SlidersHorizontal, Sparkles, ArrowRight, CheckCircle, XCircle
} from 'lucide-react';
import { supabase, PROFILE_PUBLIC_COLUMNS } from '@/lib/supabase';
// import { useAuth } from '@/context/AuthContext';
import { curricula, educationStages, getCurriculumLabel, getEducationStageLabel } from '@/lib/education';
import { isPublicTeacher } from '@/lib/teachers';
import MetaTags from '@/components/MetaTags';
import type { Profile, Category, Review } from '@/types';

export default function TeachersPage() {
  console.log('TeachersPage: Component mounted');
  // const { profile } = useAuth();
  const profile = null; // Temporarily disable auth
  const [searchParams, setSearchParams] = useSearchParams();
  const [teachers, setTeachers] = useState<Profile[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [reviews, setReviews] = useState<Record<string, { avg: number; count: number }>>({});
  const [loading, setLoading] = useState(false); // Start with false to show immediately
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(searchParams.get('category'));
  const [sortBy, setSortBy] = useState<'newest' | 'name' | 'experience' | 'rating' | 'reviews'>('newest');
  const [selectedStage, setSelectedStage] = useState(searchParams.get('stage') ?? '');
  const [selectedCurriculum, setSelectedCurriculum] = useState(searchParams.get('curriculum') ?? '');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [experienceFilter, setExperienceFilter] = useState<'all' | 'junior' | 'mid' | 'senior'>('all');
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [highlightedTeachers, setHighlightedTeachers] = useState<Profile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isUsingDemoData, setIsUsingDemoData] = useState(true); // Start with demo data

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
    (async () => {
      try {
        const { data: catData, error: catError } = await supabase.from('categories').select('*').order('sort_order', { ascending: true });
        if (catError) {
          console.error('Error fetching categories:', catError);
        }
        const cats = (catData as Category[]) ?? [];
        setCategories(cats);
      } catch (error) {
        console.error('Error in categories useEffect:', error);
        setCategories([]);
      }
    })();
  }, []);

  // Load demo data immediately (simplified)
  useEffect(() => {
    console.log('TeachersPage: Loading demo data immediately...');
    const demoTeachers: Profile[] = [
      {
        id: 'demo-1',
        full_name: 'أحمد محمد',
        email: 'ahmed@example.com',
        bio: 'مدرس رياضيات متخصص في المرحلة الثانوية مع خبرة 10 سنوات',
        avatar_url: null,
        phone: null,
        location: 'القاهرة',
        website: null,
        specialization: 'الرياضيات',
        years_experience: 10,
        cv_url: null,
        is_teacher: true,
        is_approved: true,
        is_manager: false,
        education_stage: 'secondary_3',
        curriculum: 'national',
        teaching_stages: ['secondary_1', 'secondary_2', 'secondary_3'],
        teaching_curricula: ['national', 'languages'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'demo-2',
        full_name: 'فاطمة علي',
        email: 'fatima@example.com',
        bio: 'مدرسة لغة عربية ومراجعة نحو وصرف',
        avatar_url: null,
        phone: null,
        location: 'الإسكندرية',
        website: null,
        specialization: 'اللغة العربية',
        years_experience: 8,
        cv_url: null,
        is_teacher: true,
        is_approved: true,
        is_manager: false,
        education_stage: 'secondary_2',
        curriculum: 'languages',
        teaching_stages: ['preparatory_1', 'preparatory_2', 'preparatory_3', 'secondary_1', 'secondary_2', 'secondary_3'],
        teaching_curricula: ['national', 'languages'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'demo-3',
        full_name: 'محمود حسن',
        email: 'mahmoud@example.com',
        bio: 'مدرس فيزياء مع منهجية حديثة في الشرح',
        avatar_url: null,
        phone: null,
        location: 'الجيزة',
        website: null,
        specialization: 'الفيزياء',
        years_experience: 5,
        cv_url: null,
        is_teacher: true,
        is_approved: true,
        is_manager: false,
        education_stage: 'secondary_3',
        curriculum: 'national',
        teaching_stages: ['secondary_1', 'secondary_2', 'secondary_3'],
        teaching_curricula: ['national'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    console.log('TeachersPage: Setting demo data', demoTeachers.length);
    setTeachers(demoTeachers);
    setHighlightedTeachers(demoTeachers.slice(0, 3));
    setIsUsingDemoData(true);
    console.log('TeachersPage: Setting loading to false');
    setLoading(false);

    // Add demo reviews
    const demoReviews: Record<string, { avg: number; count: number }> = {
      'demo-1': { avg: 4.8, count: 125 },
      'demo-2': { avg: 4.9, count: 98 },
      'demo-3': { avg: 4.7, count: 76 },
    };
    setReviews(demoReviews);
  }, []);

  // Remove the problematic useEffect - now using single useEffect with demo data

  const filtered = useMemo(() => {
    let result = teachers.filter((t) => {
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
        case 'rating':
          return (reviews[b.id]?.avg || 0) - (reviews[a.id]?.avg || 0);
        case 'reviews':
          return (reviews[b.id]?.count || 0) - (reviews[a.id]?.count || 0);
        default:
          return 0;
      }
    });

    return result;
  }, [teachers, search, experienceFilter, sortBy, reviews]);

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
      <MetaTags title="المدرسون | منصة العلم" description="اكتشف نخبة من أفضل المدرسين في جميع التخصصات" />
      <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-10 lg:px-8">
        {/* Hero Header */}
        <div className="mb-8 sm:mb-12 relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 p-8 sm:p-12 shadow-2xl">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.08%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-30" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl">
                <GraduationCap className="w-7 h-7 text-white" />
              </div>
              <div className="flex items-center gap-2">
                <span className="px-4 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm font-semibold">
                  {teachers.length} مدرس متاح
                </span>
                {isUsingDemoData && (
                  <span className="px-3 py-1 bg-amber-500/80 backdrop-blur-sm rounded-full text-white text-xs font-semibold">
                    بيانات تجريبية
                  </span>
                )}
              </div>
            </div>
            <h1 className="mb-3 text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight">
              اكتشف نخبة من أفضل المدرسين
            </h1>
            <p className="text-lg sm:text-xl text-blue-50 leading-relaxed max-w-2xl">
              تصفح آلاف المدرسين المحترفين في جميع التخصصات واختر الأنسب لتعليمك
            </p>
          </div>
        </div>

        {/* Highlighted Teachers Section */}
        {highlightedTeachers.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl">
                  <Award className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white">
                  المدرسون المميزون
                </h2>
              </div>
              <Link
                to="/teachers"
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold text-sm transition-colors"
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
                    <div className="absolute top-3 right-3 z-10">
                      <span className="flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full text-white text-xs font-bold shadow-lg">
                        <Sparkles className="w-3 h-3" />
                        مميز
                      </span>
                    </div>
                    <div className="p-5 text-center sm:p-6">
                      <div className="relative w-24 h-24 mx-auto mb-4">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/40 dark:to-cyan-900/40 rounded-full animate-pulse" />
                        <div className="relative w-full h-full rounded-full overflow-hidden ring-4 ring-white dark:ring-slate-800 shadow-xl">
                          {teacher.avatar_url ? (
                            <img src={teacher.avatar_url} alt={teacher.full_name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-3xl font-bold text-blue-600">{teacher.full_name.charAt(0)}</span>
                          )}
                        </div>
                      </div>
                      <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors text-lg">{teacher.full_name}</h3>
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
        <div className="mb-8 rounded-3xl border border-slate-200/80 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-800 sm:p-6">
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
            {/* Search Bar */}
            <div className="relative flex-1">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث عن مدرس بالاسم أو التخصص..."
                className="min-h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-600 dark:bg-slate-900 py-4 pl-4 pr-12 text-base text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
              />
            </div>

            {/* View Mode & Sort */}
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center bg-slate-100 dark:bg-slate-700 rounded-2xl p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2.5 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-slate-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                  <Grid className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2.5 rounded-xl transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                  <List className="w-5 h-5" />
                </button>
              </div>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="flex-1 min-h-12 cursor-pointer rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-600 dark:bg-slate-900 px-4 py-3 text-sm text-slate-700 dark:text-slate-200 transition-colors focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
              >
                <option value="newest">الأحدث</option>
                <option value="name">الاسم</option>
                <option value="experience">الأكثر خبرة</option>
                <option value="rating">الأعلى تقييماً</option>
                <option value="reviews">الأكثر تقييماً</option>
              </select>

              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="flex items-center gap-2 px-4 py-3 bg-slate-100 dark:bg-slate-700 rounded-2xl text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                <Filter className="w-5 h-5" />
                فلاتر متقدمة
                {showAdvancedFilters ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:flex-wrap sm:overflow-visible">
              <button
                onClick={() => handleCategoryClick(null)}
                className={`min-h-11 shrink-0 rounded-full px-5 py-2.5 text-sm font-bold transition-all ${
                  !selectedCategory
                    ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/30'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
                }`}
              >
                الكل
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryClick(cat.id)}
                  className={`min-h-11 shrink-0 rounded-full px-5 py-2.5 text-sm font-bold transition-all ${
                    selectedCategory === cat.id
                      ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/30'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
                  }`}
                >
                  {cat.name_ar}
                </button>
              ))}
              {selectedCategory && (
                <button
                  onClick={() => handleCategoryClick(null)}
                  className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-bold text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <X className="w-4 h-4" /> إزالة الفلتر
                </button>
              )}
            </div>

            {/* Education Filters */}
            <div className="grid gap-4 border-t border-slate-100 dark:border-slate-700 pt-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">المرحلة التعليمية</label>
                <select
                  value={selectedStage}
                  onChange={(e) => updateEducationFilter(e.target.value, selectedCurriculum)}
                  className="w-full min-h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-normal text-slate-700 dark:text-slate-200 dark:border-slate-600 dark:bg-slate-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
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
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">المنهج الدراسي</label>
                <select
                  value={selectedCurriculum}
                  onChange={(e) => updateEducationFilter(selectedStage, e.target.value)}
                  className="w-full min-h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-normal text-slate-700 dark:text-slate-200 dark:border-slate-600 dark:bg-slate-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
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
              <div className="grid gap-4 border-t border-slate-100 dark:border-slate-700 pt-4 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">سنوات الخبرة</label>
                  <select
                    value={experienceFilter}
                    onChange={(e) => setExperienceFilter(e.target.value as typeof experienceFilter)}
                    className="w-full min-h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-normal text-slate-700 dark:text-slate-200 dark:border-slate-600 dark:bg-slate-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                  >
                    <option value="all">الكل</option>
                    <option value="junior">0-3 سنوات (مبتدئ)</option>
                    <option value="mid">3-7 سنوات (متوسط)</option>
                    <option value="senior">7+ سنوات (خبير)</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={() => {
                      setSelectedCategory(null);
                      setSelectedStage('');
                      setSelectedCurriculum('');
                      setExperienceFilter('all');
                      setSearch('');
                      setSearchParams({});
                    }}
                    className="w-full min-h-12 flex items-center justify-center gap-2 rounded-xl border-2 border-red-200 bg-red-50 text-red-600 font-bold hover:bg-red-100 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 transition-colors"
                  >
                    <XCircle className="w-5 h-5" />
                    مسح جميع الفلاتر
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 animate-pulse">
                <div className="w-24 h-24 rounded-full bg-slate-200 dark:bg-slate-700 mx-auto mb-4" />
                <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded mb-2 w-3/4 mx-auto" />
                <div className="h-4 bg-slate-100 dark:bg-slate-600 rounded w-1/2 mx-auto mb-4" />
                <div className="h-3 bg-slate-100 dark:bg-slate-600 rounded w-full mb-2" />
                <div className="h-3 bg-slate-100 dark:bg-slate-600 rounded w-2/3 mx-auto" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <div className="w-24 h-24 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-12 h-12 text-red-500 dark:text-red-400" />
            </div>
            <h3 className="text-2xl font-bold text-slate-700 dark:text-slate-200 mb-3">حدث خطأ</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-6">{error}</p>
            <button
              onClick={() => {
                setError(null);
                setLoading(true);
                window.location.reload();
              }}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-semibold"
            >
              إعادة المحاولة
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
              <Users className="w-12 h-12 text-slate-300 dark:text-slate-600" />
            </div>
            <h3 className="text-2xl font-bold text-slate-700 dark:text-slate-200 mb-3">لا يوجد مدرسون</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-6">لم نعثر على مدرسين يطابقون بحثك. جرّب تعديل الفلاتر.</p>
            <button
              onClick={() => {
                setSelectedCategory(null);
                setSelectedStage('');
                setSelectedCurriculum('');
                setExperienceFilter('all');
                setSearch('');
                setSearchParams({});
              }}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-semibold"
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
                <div className="flex items-center justify-center w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                  <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-lg font-bold text-slate-800 dark:text-white">
                    {filtered.length} مدرس
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {selectedStage && `في ${getEducationStageLabel(selectedStage)}`}
                    {selectedCurriculum && ` - ${getCurriculumLabel(selectedCurriculum)}`}
                  </p>
                </div>
              </div>

              {/* Favorites Toggle */}
              <button
                onClick={() => {
                  // Toggle showing only favorites
                  const favoritesOnly = filtered.every(t => favorites.has(t.id));
                  if (favoritesOnly) {
                    // Show all
                  } else {
                    // Show only favorites
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-xl text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                <Heart className={`w-5 h-5 ${favorites.size > 0 ? 'fill-red-500 text-red-500' : ''}`} />
                المفضلة ({favorites.size})
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
                      className="group relative bg-white dark:bg-slate-800 rounded-3xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-2xl hover:border-blue-300 dark:hover:border-blue-500/50 transition-all hover:-translate-y-2"
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

                      {/* Manager Badge */}
                      {teacher.is_manager && (
                        <div className="absolute top-4 right-4 z-10">
                          <span className="flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full text-white text-xs font-bold shadow-lg">
                            <Crown className="w-3 h-3" />
                            مدير
                          </span>
                        </div>
                      )}

                      <Link to={`/teacher/${teacher.id}`} className="block">
                        <div className="p-6 text-center">
                          {/* Avatar */}
                          <div className="relative w-28 h-28 mx-auto mb-5">
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/40 dark:to-cyan-900/40 rounded-full animate-pulse" />
                            <div className="relative w-full h-full rounded-full overflow-hidden ring-4 ring-white dark:ring-slate-800 shadow-xl">
                              {teacher.avatar_url ? (
                                <img src={teacher.avatar_url} alt={teacher.full_name} className="w-full h-full object-cover" />
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
                          <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors text-xl">
                            {teacher.full_name}
                          </h3>
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
                              <img src={teacher.avatar_url} alt={teacher.full_name} className="w-full h-full object-cover" />
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
