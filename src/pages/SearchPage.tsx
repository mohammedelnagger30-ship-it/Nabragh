import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, Video as VideoIcon, Users, BookOpen, X, Play, Eye } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Profile, Video, Course } from '@/types';

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') ?? '';
  const [query, setQuery] = useState(initialQuery);
  const [activeFilter, setActiveFilter] = useState<'all' | 'teachers' | 'videos' | 'courses'>('all');
  const [teachers, setTeachers] = useState<Profile[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [hasError, setHasError] = useState(false);

  const performSearch = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setHasSearched(true);
    setHasError(false);
    const safeQuery = q.trim().replace(/[,%()]/g, ' ');

    const { data: teacherData, error: teacherError } = await supabase
      .from('profiles')
      .select('*')
      .eq('is_teacher', true)
      .or(`full_name.ilike.%${safeQuery}%,specialization.ilike.%${safeQuery}%,bio.ilike.%${safeQuery}%`)
      .limit(10);
    setTeachers(teacherData as Profile[] ?? []);

    const { data: vidData, error: videoError } = await supabase
      .from('videos')
      .select('*, category:categories(*), teacher:profiles!videos_teacher_id_fkey(*)')
      .or(`title.ilike.%${safeQuery}%,description.ilike.%${safeQuery}%`)
      .limit(10);
    setVideos(vidData as Video[] ?? []);

    const { data: courseData, error: courseError } = await supabase
      .from('courses')
      .select('*, category:categories(*), teacher:profiles!courses_teacher_id_fkey(*)')
      .or(`title.ilike.%${safeQuery}%,description.ilike.%${safeQuery}%`)
      .limit(10);
    setCourses(courseData as Course[] ?? []);

    setHasError(!!teacherError || !!videoError || !!courseError);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (initialQuery) performSearch(initialQuery);
  }, [initialQuery, performSearch]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(query);
  };

  const totalResults = teachers.length + videos.length + courses.length;

  return (
    <div className="pt-[4.5rem] min-h-screen bg-gradient-to-br from-slate-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="mb-2 text-2xl font-extrabold text-slate-900 sm:text-3xl">البحث</h1>
        <p className="mb-6 text-sm text-slate-500">ابحث في المدرسين والدروس والدورات من مكان واحد.</p>

        {/* Search bar */}
        <form onSubmit={handleSearch} className="relative mb-6">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث عن مدرسين، فيديوهات، أو دورات..."
            className="w-full pr-12 pl-12 py-3.5 bg-white border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors shadow-sm"
          />
          {query && (
            <button type="button" onClick={() => { setQuery(''); setTeachers([]); setVideos([]); setCourses([]); setHasSearched(false); }}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          )}
        </form>

        {/* Filter tabs */}
        {hasSearched && (
          <div className="flex items-center gap-2 mb-6 flex-wrap">
            {[
              { id: 'all' as const, label: 'الكل', count: totalResults },
              { id: 'teachers' as const, label: 'مدرسون', count: teachers.length },
              { id: 'videos' as const, label: 'فيديوهات', count: videos.length },
              { id: 'courses' as const, label: 'دورات', count: courses.length },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  activeFilter === tab.id ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}>
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>
        )}

        {hasError && <div role="alert" className="mb-5 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">حدث خطأ أثناء البحث. حاول مرة أخرى.</div>}

        {/* Results */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !hasSearched ? (
          <div className="text-center py-20">
            <Search className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 text-lg">ابدأ البحث عن المدرسين والفيديوهات والدورات</p>
          </div>
        ) : totalResults === 0 ? (
          <div className="text-center py-20">
            <X className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 text-lg">لا توجد نتائج لـ "{query}"</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Teachers */}
            {(activeFilter === 'all' || activeFilter === 'teachers') && teachers.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-500" /> مدرسون
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {teachers.map((t) => (
                    <Link key={t.id} to={`/teacher/${t.id}`}
                      className="group bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-lg hover:border-blue-200 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-lg font-bold text-blue-600">{t.full_name.charAt(0)}</span>
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{t.full_name}</h3>
                          <p className="text-sm text-blue-600">{t.specialization ?? 'مدرس'}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Videos */}
            {(activeFilter === 'all' || activeFilter === 'videos') && videos.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <VideoIcon className="w-5 h-5 text-blue-500" /> فيديوهات
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {videos.map((v) => (
                    <Link key={v.id} to={`/video/${v.id}`}
                      className="group bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg hover:border-blue-200 transition-all">
                      <div className="aspect-video bg-slate-100 flex items-center justify-center relative">
                        {v.thumbnail_url ? (
                          <img src={v.thumbnail_url} alt={v.title} className="w-full h-full object-cover" />
                        ) : (
                          <Play className="w-8 h-8 text-slate-400 group-hover:text-blue-500 transition-colors" />
                        )}
                        {v.is_free && <span className="absolute top-2 right-2 px-2 py-1 bg-emerald-500 text-white text-xs rounded-md">مجاني</span>}
                      </div>
                      <div className="p-4">
                        <h3 className="font-bold text-slate-800 line-clamp-1 group-hover:text-blue-600 transition-colors">{v.title}</h3>
                        <p className="text-sm text-slate-400 mt-1">{v.teacher?.full_name}</p>
                        <div className="flex items-center gap-3 text-xs text-slate-400 mt-2">
                          <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {v.views_count}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Courses */}
            {(activeFilter === 'all' || activeFilter === 'courses') && courses.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-500" /> دورات
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {courses.map((c) => (
                    <Link key={c.id} to={`/course/${c.id}`}
                      className="group bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-lg hover:border-blue-200 transition-all">
                      <h3 className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors mb-2">{c.title}</h3>
                      {c.description && <p className="text-sm text-slate-500 line-clamp-2 mb-3">{c.description}</p>}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 text-xs rounded-md ${
                          c.level === 'beginner' ? 'bg-green-50 text-green-600' :
                          c.level === 'intermediate' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'
                        }`}>
                          {c.level === 'beginner' ? 'مبتدئ' : c.level === 'intermediate' ? 'متوسط' : 'متقدم'}
                        </span>
                        {c.category && <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-xs rounded-md">{c.category.name_ar}</span>}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
