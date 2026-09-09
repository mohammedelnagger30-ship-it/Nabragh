import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, X, Video as VideoIcon, BookOpen, User } from 'lucide-react';
import { supabase, PROFILE_PUBLIC_COLUMNS, VIDEO_PUBLIC_COLUMNS } from '@/lib/supabase';
import { INTERNAL_TEACHER_ID } from '@/lib/teachers';
import type { Video, Course, Profile } from '@/types';

interface SearchSuggestionsProps {
  onClose?: () => void;
}

export default function SearchSuggestions({ onClose }: SearchSuggestionsProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<{ videos: Video[]; courses: Course[]; teachers: Profile[] }>({
    videos: [],
    courses: [],
    teachers: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const navigate = useNavigate();
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (query.length >= 2) {
        setIsLoading(true);
        try {
          const [videosResult, coursesResult, teachersResult] = await Promise.all([
            supabase
              .from('videos')
              .select(`${VIDEO_PUBLIC_COLUMNS}, teacher:profiles!videos_teacher_id_fkey(${PROFILE_PUBLIC_COLUMNS})`)
              .ilike('title', `%${query}%`)
              .limit(5),
            supabase
              .from('courses')
              .select(`*, teacher:profiles!courses_teacher_id_fkey(${PROFILE_PUBLIC_COLUMNS})`)
              .ilike('title', `%${query}%`)
              .eq('is_published', true)
              .limit(5),
            supabase
              .from('profiles')
              .select(PROFILE_PUBLIC_COLUMNS)
              .eq('is_teacher', true)
              .eq('is_approved', true)
              .not('id', 'eq', INTERNAL_TEACHER_ID)
              .ilike('full_name', `%${query}%`)
              .limit(5),
          ]);

          setSuggestions({
            videos: (videosResult.data as unknown as Video[]) ?? [],
            courses: (coursesResult.data as Course[]) ?? [],
            teachers: (teachersResult.data as Profile[]) ?? [],
          });
          setShowResults(true);
        } catch (error) {
          console.error('Search error:', error);
        } finally {
          setIsLoading(false);
        }
      } else {
        setSuggestions({ videos: [], courses: [], teachers: [] });
        setShowResults(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query)}`);
      setShowResults(false);
      onClose?.();
    }
  };

  const clearSearch = () => {
    setQuery('');
    setSuggestions({ videos: [], courses: [], teachers: [] });
    setShowResults(false);
  };

  return (
    <div ref={searchRef} className="relative w-full">
      <form onSubmit={handleSearch} className="relative">
        <Search className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setShowResults(true)}
          aria-label="البحث عن فيديو أو دورة أو مدرس"
          placeholder="ابحث عن فيديو، دورة، أو مدرس..."
          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-3.5 pl-12 pr-12 text-slate-800 dark:text-slate-100 shadow-sm transition-colors placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:focus:ring-blue-500/20"
        />
        {query && (
          <button
            type="button"
            onClick={clearSearch}
            className="absolute left-4 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </form>

      {showResults && (
        <div className="absolute top-full right-0 left-0 mt-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl z-50 max-h-[80vh] overflow-y-auto">
          {isLoading ? (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
              <p className="mt-2 text-sm">جاري البحث...</p>
            </div>
          ) : suggestions.videos.length === 0 && suggestions.courses.length === 0 && suggestions.teachers.length === 0 ? (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400">
              <Search className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-sm">لم يتم العثور على نتائج</p>
            </div>
          ) : (
            <div className="p-4">
              {suggestions.teachers.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3 px-2">
                    <User className="h-4 w-4" />
                    المدرسون
                  </div>
                  {suggestions.teachers.map((teacher) => (
                    <Link
                      key={teacher.id}
                      to={`/teacher/${teacher.id}`}
                      onClick={() => { setShowResults(false); onClose?.(); }}
                      className="flex items-center gap-3 rounded-xl p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                    >
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white text-sm font-bold">
                        {teacher.avatar_url ? (
                          <img src={teacher.avatar_url} alt={teacher.full_name} className="h-full w-full rounded-full object-cover" />
                        ) : (
                          teacher.full_name.charAt(0)
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-800 dark:text-slate-100 truncate">{teacher.full_name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{teacher.specialization || 'مدرس'}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {suggestions.videos.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3 px-2">
                    <VideoIcon className="h-4 w-4" />
                    الفيديوهات
                  </div>
                  {suggestions.videos.map((video) => (
                    <Link
                      key={video.id}
                      to={`/video/${video.id}`}
                      onClick={() => { setShowResults(false); onClose?.(); }}
                      className="flex items-center gap-3 rounded-xl p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                    >
                      <div className="h-10 w-10 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                        <VideoIcon className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-800 dark:text-slate-100 truncate">{video.title}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{video.teacher?.full_name}</p>
                      </div>
                      {video.is_free && (
                        <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">مجاني</span>
                      )}
                    </Link>
                  ))}
                </div>
              )}

              {suggestions.courses.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3 px-2">
                    <BookOpen className="h-4 w-4" />
                    الدورات
                  </div>
                  {suggestions.courses.map((course) => (
                    <Link
                      key={course.id}
                      to={`/course/${course.id}`}
                      onClick={() => { setShowResults(false); onClose?.(); }}
                      className="flex items-center gap-3 rounded-xl p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                    >
                      <div className="h-10 w-10 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                        <BookOpen className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-800 dark:text-slate-100 truncate">{course.title}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{course.teacher?.full_name}</p>
                      </div>
                      <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                        {course.price === 0 ? 'مجاني' : `${course.price} ر.س`}
                      </span>
                    </Link>
                  ))}
                </div>
              )}

              <button
                onClick={handleSearch}
                className="w-full mt-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 py-3 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
              >
                عرض جميع النتائج لـ "{query}"
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
