import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  GraduationCap, Play, Users, Video as VideoIcon, Shield, Award, BookOpen, Trophy, Medal,
  ArrowLeft, Star, Sparkles, TrendingUp, Lock, Zap
} from 'lucide-react';
import { supabase, PROFILE_PUBLIC_COLUMNS, VIDEO_PUBLIC_COLUMNS } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import SearchSuggestions from '@/components/SearchSuggestions';
import LazyImage from '@/components/LazyImage';
import { cache, generateCacheKey } from '@/lib/cache';
import type { Profile, Category, Video, Course, WatchHistoryItem, StudentSubjectLeaderboard } from '@/types';
import { getCurriculumLabel, getEducationStageLabel } from '@/lib/education';
import { isPublicTeacher, INTERNAL_TEACHER_ID } from '@/lib/teachers';
import MetaTags from '@/components/MetaTags';
import { CardSkeleton, TeacherCardSkeleton, VideoCardSkeleton } from '@/components/SkeletonLoader';

export default function LandingPage() {
  const { user, profile } = useAuth();
  const [teachers, setTeachers] = useState<Profile[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [continueWatching, setContinueWatching] = useState<WatchHistoryItem[]>([]);
  const [champions, setChampions] = useState<StudentSubjectLeaderboard[]>([]);
  const [stats, setStats] = useState({ teachers: 0, videos: 0, students: 0, courses: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadError, setHasLoadError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const timeoutId = window.setTimeout(() => {
      if (isMounted) {
        setHasLoadError(true);
        setIsLoading(false);
      }
    }, 8000);

    setIsLoading(true);
    setHasLoadError(false);

    (async () => {
      try {
        // Check cache for static data
        const categoriesCacheKey = generateCacheKey('categories', {});
        const statsCacheKey = generateCacheKey('stats', {});
        
        const cachedCategories = cache.get(categoriesCacheKey);
        const cachedStats = cache.get(statsCacheKey);

        let stats: { teachers: number; videos: number; students: number; courses: number };
        
        if (cachedStats) {
          stats = cachedStats;
        } else {
          const [teacherCount, videoCount, studentCount, courseCount] = await Promise.all([
            supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_teacher', true).eq('is_approved', true).not('id', 'eq', INTERNAL_TEACHER_ID),
            supabase.from('videos').select('id', { count: 'exact', head: true }),
            supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_teacher', false),
            supabase.from('courses').select('id', { count: 'exact', head: true }),
          ]);
          stats = {
            teachers: teacherCount.count ?? 0,
            videos: videoCount.count ?? 0,
            students: studentCount.count ?? 0,
            courses: courseCount.count ?? 0,
          };
          cache.set(statsCacheKey, stats, 5 * 60 * 1000); // 5 minutes
        }

        const categoriesPromise = cachedCategories 
          ? Promise.resolve({ data: cachedCategories, error: null })
          : supabase.from('categories').select('*').order('sort_order', { ascending: true });

        const [teacherResult, categoryResult, videoResult, courseResult] = await Promise.all([
          supabase.from('profiles').select(PROFILE_PUBLIC_COLUMNS).eq('is_teacher', true).eq('is_approved', true).not('id', 'eq', INTERNAL_TEACHER_ID).order('created_at', { ascending: false }).limit(12),
          categoriesPromise,
          supabase.from('videos').select(`${VIDEO_PUBLIC_COLUMNS}, category:categories(*), teacher:profiles!videos_teacher_id_fkey(${PROFILE_PUBLIC_COLUMNS})`).order('views_count', { ascending: false }).limit(6),
          supabase.from('courses').select('*, category:categories(*)').eq('is_published', true).order('created_at', { ascending: false }).limit(3),
        ]);

        if ([teacherResult, categoryResult, videoResult, courseResult].some((result) => result.error)) {
          throw new Error('Unable to load landing page data');
        }

        let champions: StudentSubjectLeaderboard[] = [];
        try {
          const { data: championData } = await supabase
            .from('student_subject_leaderboard')
            .select('*')
            .eq('subject_rank', 1)
            .order('points', { ascending: false })
            .limit(12);
          champions = (championData ?? []) as StudentSubjectLeaderboard[];
        } catch {
          // Ignore champion loading errors so the rest of the page still renders
        }

        // Cache static data
        if (!cachedCategories && categoryResult.data) {
          cache.set(categoriesCacheKey, categoryResult.data, 10 * 60 * 1000); // 10 minutes
        }

        let historyData: WatchHistoryItem[] = [];
        if (user && !profile?.is_teacher) {
          const historyCacheKey = generateCacheKey('watch_history', { userId: user.id });
          const cachedHistory = cache.get(historyCacheKey);
          
          if (cachedHistory) {
            historyData = cachedHistory;
          } else {
            const { data } = await supabase
              .from('watch_history')
              .select(`*, video:videos(${VIDEO_PUBLIC_COLUMNS}, category:categories(*), teacher:profiles!videos_teacher_id_fkey(${PROFILE_PUBLIC_COLUMNS}))`)
              .eq('student_id', user.id)
              .order('watched_at', { ascending: false })
              .limit(4);
            historyData = data as WatchHistoryItem[] ?? [];
            cache.set(historyCacheKey, historyData, 2 * 60 * 1000); // 2 minutes
          }
        }

        if (isMounted) {
          setTeachers(((teacherResult.data as Profile[] ?? []).filter(isPublicTeacher).slice(0, 4)));
          setCategories(categoryResult.data as Category[] ?? []);
          setVideos(videoResult.data as unknown as Video[] ?? []);
          setCourses(courseResult.data as Course[] ?? []);
          setStats(stats);
          setContinueWatching(historyData);
          setChampions(champions);
          setHasLoadError(false);
        }
      } catch {
        if (isMounted) setHasLoadError(true);
      } finally {
        window.clearTimeout(timeoutId);
        if (isMounted) setIsLoading(false);
      }
    })();

    return () => {
      isMounted = false;
      window.clearTimeout(timeoutId);
    };
  }, [profile?.is_teacher, retryCount, user]);

  const retryLoading = () => {
    setIsLoading(true);
    setHasLoadError(false);
    setRetryCount((count) => count + 1);
  };

  const colorMap: Record<string, string> = {
    blue: 'from-blue-500 to-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300',
    cyan: 'from-cyan-500 to-cyan-600 bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-300',
    teal: 'from-teal-500 to-teal-600 bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-300',
    green: 'from-green-500 to-green-600 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-300',
    indigo: 'from-indigo-500 to-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300',
    amber: 'from-amber-500 to-amber-600 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-300',
    orange: 'from-orange-500 to-orange-600 bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-300',
    sky: 'from-sky-500 to-sky-600 bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-300',
    emerald: 'from-emerald-500 to-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-300',
    rose: 'from-rose-500 to-rose-600 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-300',
  };

  return (
    <>
      <MetaTags
        title="منصة العلم - تعلّم من أفضل المدرسين"
        description="منصة تعليمية متكاملة تتيح للمدرسين رفع فيديوهاتهم وللطلاب الوصول لمحتوى تعليمي متميز في جميع التخصصات"
      />
      <div className="pt-[4.5rem]">
        {isLoading && (
          <div className="border-b border-blue-100 dark:border-blue-900/40 bg-blue-50 dark:bg-blue-900/20 px-4 py-3 text-center text-sm font-medium text-blue-700 dark:text-blue-300" role="status">
            جاري تجهيز أفضل المحتوى لك...
          </div>
        )}
      {hasLoadError && !isLoading && (
        <div className="flex flex-wrap items-center justify-center gap-3 border-b border-rose-100 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-900/20 px-4 py-3 text-center text-sm font-medium text-rose-700" role="alert">
          <span>تعذر تحميل البيانات. تحقق من الاتصال وحاول مرة أخرى.</span>
          <button type="button" onClick={retryLoading} className="rounded-lg bg-rose-100 px-3 py-1.5 text-xs font-bold text-rose-800 transition hover:bg-rose-200">إعادة المحاولة</button>
        </div>
      )}
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-[#f7f9fc] dark:bg-slate-900">
        <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute -right-32 top-10 h-80 w-80 rounded-full bg-blue-200/30 dark:bg-blue-900/20 blur-3xl" />
          <div className="absolute -bottom-24 -left-20 h-96 w-96 rounded-full bg-cyan-100/50 dark:bg-cyan-900/20 blur-3xl" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-l from-transparent via-blue-200 dark:via-blue-800 to-transparent" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-12 sm:px-6 sm:pb-24 sm:pt-20 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="text-center lg:text-right">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-100 dark:border-blue-800 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-bold text-blue-700 dark:text-blue-300 shadow-sm sm:text-sm">
                <Sparkles className="w-4 h-4" />
                تعلم أذكى، من أي مكان
              </div>
              <h1 className="mb-5 px-1 pb-1 text-4xl font-extrabold leading-[1.35] text-slate-900 dark:text-white dark:text-white sm:px-0 sm:text-5xl sm:leading-[1.25] lg:text-[4.25rem]">
                طريقك الأقصر
                <span className="block bg-gradient-to-l from-blue-700 via-blue-600 to-cyan-500 bg-clip-text text-transparent">لإتقان أي مادة</span>
              </h1>
              <p className="mx-auto mb-8 max-w-xl text-base leading-8 text-slate-600 dark:text-slate-300 dark:text-slate-300 sm:text-lg lg:mr-0">
                محتوى تعليمي منظم، مدرسون موثوقون، وتقدم محفوظ في مكان واحد. ابدأ درسَك التالي بثقة وبدون تشتت.
              </p>
              <div className="flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
                <Link
                  to="/signup"
                  className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-7 py-3.5 font-bold text-white shadow-lg shadow-blue-600/25 transition-all hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-xl"
                >
                  ابدأ التعلم الآن
                  <ArrowLeft className="w-5 h-5" />
                </Link>
                <Link
                  to="/teachers"
                  className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:border-slate-700 bg-white dark:bg-slate-800 px-7 py-3.5 font-bold text-slate-700 dark:text-slate-200 dark:text-slate-200 shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-200 dark:hover:border-blue-700 hover:bg-blue-50/40 dark:hover:bg-blue-900/20"
                >
                  تصفح المدرسين
                  <Users className="w-5 h-5" />
                </Link>
              </div>

              {/* Search bar */}
              <div className="relative mx-auto mt-8 max-w-xl lg:mr-0">
                <SearchSuggestions />
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
              <div className="relative z-10 grid grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-4">
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800 p-4 shadow-xl shadow-slate-200/50 dark:shadow-black/40 sm:p-6">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/40 flex items-center justify-center mb-3">
                      <VideoIcon className="w-6 h-6 text-blue-600" />
                    </div>
                    <h3 className="mb-1 font-bold text-slate-800 dark:text-slate-100">فيديوهات HD</h3>
                    <p className="text-xs leading-6 text-slate-500 dark:text-slate-400 sm:text-sm">جودة عالية مع حماية كاملة للمحتوى</p>
                  </div>
                  <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 p-4 text-white shadow-xl shadow-blue-700/25 sm:p-6">
                    <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center mb-3">
                      <Shield className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold mb-1">حماية كاملة</h3>
                    <p className="text-xs leading-6 text-blue-50 sm:text-sm">حماية الفيديوهات والبيانات بأعلى المعايير</p>
                  </div>
                </div>
                <div className="space-y-4 pt-8">
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800 p-4 shadow-xl shadow-slate-200/50 dark:shadow-black/40 sm:p-6">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/40 flex items-center justify-center mb-3">
                      <Award className="w-6 h-6 text-emerald-600" />
                    </div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-1">مدرسون محترفون</h3>
                    <p className="text-xs leading-6 text-slate-500 dark:text-slate-400 sm:text-sm">نخبة من أفضل المدرسين في كل تخصص</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800 p-4 shadow-xl shadow-slate-200/50 dark:shadow-black/40 sm:p-6">
                    <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-900/40 flex items-center justify-center mb-3">
                      <TrendingUp className="w-6 h-6 text-amber-600" />
                    </div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-1">تتبع التقدم</h3>
                    <p className="text-xs leading-6 text-slate-500 dark:text-slate-400 sm:text-sm">تابع تقدمك في كل مادة وكل درس</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-slate-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { icon: Users, label: 'مدرسون', value: stats.teachers, suffix: '+' },
              { icon: VideoIcon, label: 'فيديو تعليمي', value: stats.videos, suffix: '+' },
              { icon: BookOpen, label: 'دورة تدريبية', value: stats.courses, suffix: '+' },
              { icon: GraduationCap, label: 'طالب نشط', value: stats.students, suffix: '+' },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white/10 mb-3">
                  <stat.icon className="w-6 h-6 text-blue-400" />
                </div>
                <div className="text-3xl font-bold text-white">
                  {isLoading || hasLoadError ? (hasLoadError ? '—' : '...') : `${stat.value}${stat.suffix}`}
                </div>
                <div className="text-sm text-slate-400 dark:text-slate-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {user && profile && !profile.is_teacher && profile.education_stage && profile.curriculum && (
        <section className="border-b border-blue-100 dark:border-blue-900/40 bg-blue-50/60 dark:bg-slate-800/60 py-6">
          <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 px-4 sm:flex-row sm:items-center sm:px-6 lg:px-8">
            <div>
              <p className="text-xs font-bold text-blue-600">مسارك التعليمي</p>
              <h2 className="mt-1 text-lg font-extrabold text-slate-900 dark:text-white">{getEducationStageLabel(profile.education_stage)} - {getCurriculumLabel(profile.curriculum)}</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">نعرض لك محتوى ومدرسين مناسبين لاختياراتك.</p>
            </div>
            <div className="flex w-full gap-2 sm:w-auto">
              <Link to={`/teachers?stage=${profile.education_stage}&curriculum=${profile.curriculum}`} className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-center text-sm font-bold text-white hover:bg-blue-700 sm:flex-none">مدرسوك</Link>
              <Link to="/courses" className="flex-1 rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-800 px-4 py-2.5 text-center text-sm font-bold text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-slate-700 sm:flex-none">دوراتك</Link>
            </div>
          </div>
        </section>
      )}

      {/* Continue Watching (for logged-in students) */}
      {continueWatching.length > 0 && (
        <section className="py-12 bg-white dark:bg-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
              <Play className="w-6 h-6 text-blue-500" /> أكمل ما شاهدته
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {continueWatching.map((h) => (
                <Link
                  key={h.id}
                  to={`/video/${h.video_id}`}
                  className="group bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 dark:border-slate-700 overflow-hidden hover:shadow-lg hover:border-blue-200 transition-all hover:-translate-y-1"
                >
                  <div className="aspect-video bg-slate-100 dark:bg-slate-700 flex items-center justify-center relative">
                    {h.video?.thumbnail_url ? (
                      <LazyImage src={h.video.thumbnail_url} alt={h.video.title} className="w-full h-full object-cover" />
                    ) : (
                      <Play className="w-8 h-8 text-slate-400 dark:text-slate-500 group-hover:text-blue-500 transition-colors" />
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="font-medium text-slate-800 dark:text-slate-100 text-sm line-clamp-1 group-hover:text-blue-600 transition-colors">{h.video?.title}</h3>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{h.video?.teacher?.full_name}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Categories Section */}
      <section className="py-20 bg-white dark:bg-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-4 py-2 rounded-full text-sm font-medium mb-4">
              <BookOpen className="w-4 h-4" />
              التخصصات الدراسية
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-800 dark:text-slate-100 mb-3">استكشف التخصصات</h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">مجموعة متنوعة من التخصصات الأكاديمية يدرسها لك أفضل المدرسين</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {isLoading ? Array.from({ length: 5 }).map((_, index) => <CardSkeleton key={index} />) : categories.map((cat) => {
              const colors = colorMap[cat.color] ?? colorMap.blue;
              const bgClass = colors.split(' ').slice(2).join(' ');
              const textClass = colors.split(' ').slice(3).join(' ');
              return (
                <Link
                  key={cat.id}
                  to={`/teachers?category=${cat.id}`}
                  className="group bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:border-slate-700 rounded-2xl p-5 hover:shadow-lg hover:border-blue-200 dark:hover:border-blue-500/50 transition-all hover:-translate-y-1"
                >
                  <div className={`w-12 h-12 rounded-xl ${bgClass} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                    <BookOpen className={`w-6 h-6 ${textClass}`} />
                  </div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-1">{cat.name_ar}</h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 line-clamp-2">{cat.description}</p>
                </Link>
              );
            })}
          </div>
          {!isLoading && categories.length === 0 && <p className="mt-6 text-center text-sm text-slate-500">لا توجد تخصصات متاحة حاليًا.</p>}
        </div>
      </section>

      {/* Featured Teachers */}
      {(isLoading || teachers.length > 0) && (
        <section className="py-20 bg-gradient-to-br from-slate-50 to-blue-50/30 dark:from-slate-900 dark:to-blue-900/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between mb-10">
              <div>
                <div className="inline-flex items-center gap-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-4 py-2 rounded-full text-sm font-medium mb-4">
                  <Award className="w-4 h-4" />
                  مدرسون متميزون
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold text-slate-800 dark:text-slate-100">أفضل المدرسين</h2>
              </div>
              <Link to="/teachers" className="hidden sm:flex items-center gap-2 text-blue-600 font-medium hover:gap-3 transition-all">
                عرض الكل <ArrowLeft className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {isLoading ? Array.from({ length: 4 }).map((_, index) => <TeacherCardSkeleton key={index} />) : teachers.map((teacher) => (
                <Link
                  key={teacher.id}
                  to={`/teacher/${teacher.id}`}
                  className="group bg-white dark:bg-slate-800 rounded-2xl shadow-md shadow-slate-200/50 dark:shadow-black/40 border border-slate-100 dark:border-slate-700 dark:border-slate-700 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all"
                >
                  <div className="aspect-square bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center overflow-hidden">
                    {teacher.avatar_url ? (
                      <LazyImage src={teacher.avatar_url} alt={teacher.full_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white text-3xl font-bold">
                        {teacher.full_name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-1">{teacher.full_name}</h3>
                    <p className="text-sm text-blue-600 mb-2">{teacher.specialization ?? 'مدرس'}</p>
                    <div className="flex items-center gap-2 text-sm text-slate-400 dark:text-slate-500">
                      <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                      <span>جديد</span>
                      {teacher.years_experience > 0 && (
                        <span className="mr-auto">{teacher.years_experience} سنوات خبرة</span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            {!isLoading && teachers.length === 0 && <p className="text-center text-sm text-slate-500">سيظهر المدرسون المعتمدون هنا قريبًا.</p>}
          </div>
        </section>
      )}

      {/* Featured Courses */}
      {(isLoading || courses.length > 0) && (
        <section className="py-20 bg-white dark:bg-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between mb-10">
              <div>
                <div className="inline-flex items-center gap-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-4 py-2 rounded-full text-sm font-medium mb-4">
                  <BookOpen className="w-4 h-4" />
                  دورات مميزة
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold text-slate-800 dark:text-slate-100">أحدث الدورات</h2>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {isLoading ? Array.from({ length: 3 }).map((_, index) => <CardSkeleton key={index} />) : courses.map((course) => (
                <Link
                  key={course.id}
                  to={`/course/${course.id}`}
                  className="group bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 dark:border-slate-700 overflow-hidden hover:shadow-lg hover:border-blue-200 transition-all hover:-translate-y-1"
                >
                  <div className="aspect-video bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center relative">
                    {course.thumbnail_url ? (
                      <LazyImage src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
                    ) : (
                      <BookOpen className="w-12 h-12 text-blue-300" />
                    )}
                    <span className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-medium ${
                      course.level === 'beginner' ? 'bg-green-100 text-green-700' :
                      course.level === 'intermediate' ? 'bg-amber-100 text-amber-700' :
                      'bg-rose-100 text-rose-700'
                    }`}>
                      {course.level === 'beginner' ? 'مبتدئ' : course.level === 'intermediate' ? 'متوسط' : 'متقدم'}
                    </span>
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-2 group-hover:text-blue-600 transition-colors line-clamp-1">{course.title}</h3>
                    {course.description && (
                      <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">{course.description}</p>
                    )}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-blue-600 font-medium">
                        {course.price === 0 ? 'مجاني' : `${course.price} ر.س`}
                      </span>
                      {course.category && (
                        <span className="text-slate-400 dark:text-slate-500 text-xs">{course.category.name_ar}</span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            {!isLoading && courses.length === 0 && <p className="text-center text-sm text-slate-500">لا توجد دورات منشورة حاليًا.</p>}
          </div>
        </section>
      )}

      {/* Popular Videos */}
      {(isLoading || videos.length > 0) && (
        <section className="py-20 bg-gradient-to-br from-slate-50 to-blue-50/30 dark:from-slate-900 dark:to-blue-900/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between mb-10">
              <div>
                <div className="inline-flex items-center gap-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-4 py-2 rounded-full text-sm font-medium mb-4">
                  <Play className="w-4 h-4" />
                  دروس شائعة
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold text-slate-800 dark:text-slate-100">الأكثر مشاهدة</h2>
              </div>
              <Link to="/courses" className="hidden sm:flex items-center gap-2 text-blue-600 font-medium hover:gap-3 transition-all">
                عرض الكل <ArrowLeft className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {isLoading ? Array.from({ length: 6 }).map((_, index) => <VideoCardSkeleton key={index} />) : videos.slice(0, 6).map((v) => (
                <Link
                  key={v.id}
                  to={`/video/${v.id}`}
                  className="group bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 dark:border-slate-700 overflow-hidden hover:shadow-lg hover:border-blue-200 transition-all hover:-translate-y-1"
                >
                  <div className="aspect-video bg-gradient-to-br from-slate-100 to-slate-200 relative overflow-hidden flex items-center justify-center">
                    {v.thumbnail_url ? (
                      <LazyImage src={v.thumbnail_url} alt={v.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-blue-600/80 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Play className="w-6 h-6 text-white fill-white" />
                      </div>
                    )}
                    {v.is_free && (
                      <span className="absolute top-2 right-2 px-2 py-1 bg-emerald-500 text-white text-xs font-medium rounded-md">مجاني</span>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-1 line-clamp-1 group-hover:text-blue-600 transition-colors">{v.title}</h3>
                    {v.teacher && <p className="text-sm text-slate-400 dark:text-slate-500 mb-2">{v.teacher.full_name}</p>}
                    <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
                      <span>{v.views_count} مشاهدة</span>
                      {v.category && <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded-md">{v.category.name_ar}</span>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            {!isLoading && videos.length === 0 && <p className="text-center text-sm text-slate-500">لا توجد فيديوهات منشورة حاليًا.</p>}
          </div>
        </section>
      )}

      {champions.length > 0 && (
        <section className="relative overflow-hidden bg-slate-950 py-20 text-white">
          <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-amber-400/10 blur-3xl" />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-end">
              <div><div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/10 px-4 py-2 text-sm font-bold text-amber-200"><Trophy className="h-4 w-4" /> لوحة الشرف</div><h2 className="text-3xl font-extrabold sm:text-4xl">أبطال كل مادة</h2><p className="mt-3 max-w-xl text-sm leading-7 text-slate-400 dark:text-slate-500">تكريم مستحق للطالب الأول في كل مادة، مع عرض مرحلته ونقاطه ليكون إنجازه مصدر إلهام للجميع.</p></div>
              <Link to="/competitions" className="flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-bold text-cyan-300 hover:bg-white/10">ادخل ساحة المنافسة <ArrowLeft className="h-4 w-4" /></Link>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {champions.slice(0, 12).map((champion) => (
                <div key={champion.student_id} className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.07] p-5 transition hover:-translate-y-1 hover:bg-white/10">
                  <div className="absolute left-4 top-4 text-amber-300"><Medal className="h-5 w-5" /></div>
                  <div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-amber-300 to-orange-500 text-lg font-extrabold text-slate-900 dark:text-white">{champion.avatar_url ? <img src={champion.avatar_url} alt={champion.full_name} className="h-full w-full object-cover" /> : champion.full_name.charAt(0)}</div><div className="min-w-0"><h3 className="truncate font-extrabold text-white">{champion.full_name}</h3><p className="mt-1 text-xs font-bold text-amber-200">{champion.subject_name}</p><p className="mt-1 text-[11px] text-cyan-300">{getEducationStageLabel(champion.education_stage)}</p></div></div>
                  <div className="mt-5 flex items-end justify-between border-t border-white/10 pt-4"><div><div className="text-xl font-extrabold text-amber-300">{champion.points}</div><div className="text-[11px] text-slate-400 dark:text-slate-500">نقطة إنجاز</div></div><div className="text-left text-xs text-slate-400 dark:text-slate-500">{champion.competitions_played} منافسات</div></div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* How It Works */}
      <section className="py-20 bg-white dark:bg-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-4 py-2 rounded-full text-sm font-medium mb-4">
              <Zap className="w-4 h-4" />
              كيف تعمل المنصة
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-800 dark:text-slate-100 mb-3">ابدأ رحلتك التعليمية في 3 خطوات</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Users, step: '١', title: 'أنشئ حساباً', desc: 'سجّل كطالب أو مدرس في دقائق، وأنشئ ملفك الشخصي' },
              { icon: BookOpen, step: '٢', title: 'اختر مدرسك', desc: 'تصفح المدرسين حسب التخصص واقرأ السيرة الذاتية والتقييمات' },
              { icon: Play, step: '٣', title: 'ابدأ التعلم', desc: 'اشترك واشاهد الفيديوهات بجودة عالية في أي وقت ومن أي مكان' },
            ].map((item, i) => (
              <div key={i} className="relative text-center">
                <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/30 border border-blue-100 dark:border-blue-900/40 mb-5">
                  <item.icon className="w-9 h-9 text-blue-600" />
                  <span className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 text-white text-sm font-bold flex items-center justify-center shadow-md">
                    {item.step}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">{item.title}</h3>
                <p className="text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs mx-auto">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-white/10 text-blue-300 px-4 py-2 rounded-full text-sm font-medium mb-4">
              <Shield className="w-4 h-4" />
              لماذا منصة العلم؟
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">مميزات تجعلنا الأفضل</h2>
            <p className="text-slate-400 dark:text-slate-500 max-w-2xl mx-auto">نوفّر تجربة تعليمية متكاملة بأعلى معايير الجودة والحماية العالمية</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Shield, title: 'حماية المحتوى', desc: 'حماية الفيديوهات من النسخ والتسريب بأحدث تقنيات التشفير' },
              { icon: VideoIcon, title: 'جودة 4K', desc: 'فيديوهات بجودة فائقة مع إمكانية المشاهدة على أي جهاز' },
              { icon: Award, title: 'سيرة ذاتية موثقة', desc: 'كل مدرس لديه سيرة ذاتية كاملة مع التحقق من المؤهلات' },
              { icon: Lock, title: 'خصوصية البيانات', desc: 'حماية كاملة لبيانات الطلاب والمدرسين وفق المعايير العالمية' },
            ].map((feat, i) => (
              <div key={i} className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:bg-white/10 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center mb-4">
                  <feat.icon className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="font-bold text-white mb-2">{feat.title}</h3>
                <p className="text-sm text-slate-400 dark:text-slate-500 leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-white dark:bg-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative bg-gradient-to-br from-blue-600 to-cyan-500 dark:from-blue-900/80 dark:to-cyan-900/70 rounded-3xl p-12 text-center overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
            <div className="relative">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">جاهز لبدء رحلتك التعليمية؟</h2>
              <p className="text-blue-50 text-lg mb-8 max-w-2xl mx-auto">
                انضم إلى آلاف الطلاب والمدرسين على منصة العلم اليوم
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to="/signup"
                  className="px-8 py-3.5 bg-white text-blue-600 font-semibold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
                >
                  إنشاء حساب مجاني
                </Link>
                <Link
                  to="/pricing"
                  className="px-8 py-3.5 bg-white/10 backdrop-blur-sm text-white font-semibold rounded-xl border border-white/20 hover:bg-white/20 transition-all"
                >
                  عرض الباقات
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
      </div>
    </>
  );
}
