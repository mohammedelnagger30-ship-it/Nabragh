import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowRight, Play, Eye, Lock, Loader2, Heart, MessageSquare,
  Clock, BookOpen, CheckCircle2, Calendar, ChevronLeft, Home
} from 'lucide-react';
import { supabase, PROFILE_PUBLIC_COLUMNS, VIDEO_PUBLIC_COLUMNS } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import Comments from '@/components/Comments';
import SocialShare from '@/components/SocialShare';
import PlaylistManager from '@/components/PlaylistManager';
import FollowButton from '@/components/FollowButton';
import MetaTags from '@/components/MetaTags';
import StructuredData from '@/components/StructuredData';
import { generateVideoStructuredData } from '@/components/structuredDataUtils';
import type { Video, Profile, VideoProgress } from '@/types';

function formatViews(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return String(count);
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function VideoPlayerPage() {
  const { id } = useParams<{ id: string }>();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [video, setVideo] = useState<Video | null>(null);
  const [teacher, setTeacher] = useState<Profile | null>(null);
  const [relatedVideos, setRelatedVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [progress, setProgress] = useState<VideoProgress | null>(null);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'comments' | 'related'>('comments');
  const [playbackRate, setPlaybackRate] = useState(1);
  const [hasResumed, setHasResumed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const saveProgress = useCallback(async () => {
    if (!user || !video || !videoRef.current || !hasAccess) return;
    const currentWatched = Math.floor(videoRef.current.currentTime);
    const total = Math.floor(videoRef.current.duration || video.duration_seconds || 0);
    if (total <= 0) return;
    const isCompleted = currentWatched / total >= 0.9;
    const payload = {
      watched_seconds: currentWatched,
      total_seconds: total,
      is_completed: isCompleted || Boolean(progress?.is_completed),
      last_watched_at: new Date().toISOString(),
    };
    if (progress) {
      await supabase.from('video_progress').update(payload).eq('id', progress.id);
    } else {
      const { data } = await supabase.from('video_progress').insert({
        ...payload,
        student_id: user.id,
        video_id: video.id,
      }).select().single();
      if (data) setProgress(data as VideoProgress);
    }
    if (isCompleted) await supabase.rpc('update_course_progress', { target_video_id: video.id });
  }, [hasAccess, progress, user, video]);

  const fetchData = useCallback(async () => {
    if (!id) return;
    setHasResumed(false);
    const { data: vidData } = await supabase
      .from('videos')
      .select(`${VIDEO_PUBLIC_COLUMNS}, category:categories(*), teacher:profiles!videos_teacher_id_fkey(${PROFILE_PUBLIC_COLUMNS}), course:courses(*)`)
      .eq('id', id)
      .maybeSingle();
    const vid = vidData as Video | null;
    setVideo(vid);
    if (vid?.teacher) setTeacher(vid.teacher as Profile);

    if (vid) {
      await supabase.from('videos').update({ views_count: vid.views_count + 1 }).eq('id', id);

      const { data: related } = await supabase
        .from('videos')
        .select(`${VIDEO_PUBLIC_COLUMNS}, category:categories(*)`)
        .eq('teacher_id', vid.teacher_id)
        .neq('id', id)
        .limit(5);
      setRelatedVideos(related as unknown as Video[] ?? []);

      const { data: authorizedPath } = await supabase.rpc('get_video_playback_url', { target_video_id: vid.id });
      let playableUrl: string | null = null;
      if (typeof authorizedPath === 'string' && authorizedPath) {
        if (authorizedPath.startsWith('http')) {
          playableUrl = authorizedPath;
        } else {
          const { data: signedUrl } = await supabase.storage.from('videos').createSignedUrl(authorizedPath, 3600);
          playableUrl = signedUrl?.signedUrl ?? null;
        }
      }
      setPlaybackUrl(playableUrl);
      setHasAccess(Boolean(playableUrl));

      if (user) {
        const { data: fav } = await supabase
          .from('favorites')
          .select('*')
          .eq('student_id', user.id)
          .eq('video_id', id)
          .maybeSingle();
        setIsFavorited(!!fav);

        const { data: prog } = await supabase
          .from('video_progress')
          .select('*')
          .eq('student_id', user.id)
          .eq('video_id', id)
          .maybeSingle();
        setProgress(prog as VideoProgress | null);

        await supabase.from('watch_history').insert({
          student_id: user.id,
          video_id: id,
        });
      }
    }
    setLoading(false);
  }, [id, user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Track video progress
  useEffect(() => {
    if (!hasAccess || !user || !video || !videoRef.current) return;

    const handleTimeUpdate = () => {
      if (progressIntervalRef.current === null) {
        progressIntervalRef.current = setInterval(() => { void saveProgress(); }, 10000);
      }
    };

    const videoEl = videoRef.current;
    videoEl?.addEventListener('play', handleTimeUpdate);

    return () => {
      videoEl?.removeEventListener('play', handleTimeUpdate);
      videoEl?.removeEventListener('pause', saveProgress);
      videoEl?.removeEventListener('ended', saveProgress);
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    };
  }, [hasAccess, saveProgress, user, video]);

  const handleLoadedMetadata = (event: React.SyntheticEvent<HTMLVideoElement>) => {
    event.currentTarget.playbackRate = playbackRate;
    if (!hasResumed && progress && progress.watched_seconds > 5 && progress.watched_seconds < event.currentTarget.duration - 5) {
      event.currentTarget.currentTime = progress.watched_seconds;
      setHasResumed(true);
    }
  };

  const toggleFavorite = async () => {
    if (!user || !video) return;
    if (isFavorited) {
      await supabase.from('favorites').delete().eq('student_id', user.id).eq('video_id', video.id);
      setIsFavorited(false);
      toast('تمت الإزالة من المفضلة', 'info');
    } else {
      await supabase.from('favorites').insert({ student_id: user.id, video_id: video.id });
      setIsFavorited(true);
      toast('تمت الإضافة إلى المفضلة', 'success');
    }
  };

  if (loading) {
    return <div className="pt-[4.5rem] min-h-screen flex items-center justify-center bg-slate-950"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;
  }

  if (!video) {
    return (
      <div className="pt-[4.5rem] min-h-screen flex flex-col items-center justify-center bg-slate-950">
        <p className="text-slate-500 mb-4">الفيديو غير موجود</p>
        <Link to="/" className="text-blue-600 hover:underline">العودة للرئيسية</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 pt-[4.5rem] pb-16">
      <MetaTags title={`${video.title} | منصة العلم`} description={video.description ?? 'درس تعليمي على منصة العلم'} />
      <StructuredData data={generateVideoStructuredData(video)} />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="mb-4 sm:mb-6 lg:mb-8 flex flex-wrap items-center gap-y-2 text-xs sm:text-sm" aria-label="مسار التنقل">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5 sm:gap-2">
            <Link to="/" className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-medium text-slate-400 transition-colors hover:bg-slate-800/60 hover:text-white sm:px-2.5 sm:py-1.5">
              <Home className="h-3 w-3 sm:h-4 sm:w-4" />
              الرئيسية
            </Link>
            {teacher && (
              <>
                <ChevronLeft className="h-3 w-3 shrink-0 text-slate-600 sm:h-4 sm:w-4" />
                <Link to={`/teacher/${teacher.id}`} className="inline-flex max-w-[10rem] items-center truncate rounded-lg px-2 py-1 font-medium text-slate-400 transition-colors hover:bg-slate-800/60 hover:text-white sm:max-w-[12rem] sm:px-2.5 sm:py-1.5">
                  {teacher.full_name}
                </Link>
              </>
            )}
            <ChevronLeft className="h-3 w-3 shrink-0 text-slate-600 sm:h-4 sm:w-4" />
            <span className="inline-flex min-w-0 max-w-full items-center truncate rounded-lg bg-slate-800/80 px-2 py-1 font-bold text-white sm:px-3 sm:py-1.5">
              {video.title}
            </span>
          </div>
        </nav>

        <div className="grid gap-6 lg:gap-8 lg:grid-cols-3">
          {/* ===== Main column ===== */}
          <div className="lg:col-span-2 min-w-0">
            {/* Player */}
            <div className="overflow-hidden rounded-xl sm:rounded-2xl bg-black shadow-2xl shadow-blue-950/40 ring-1 ring-slate-800">
              <div className="aspect-video relative">
                {hasAccess ? (
                  <video
                    ref={videoRef}
                    src={playbackUrl ?? undefined}
                    controls
                    autoPlay
                    className="h-full w-full"
                    controlsList="nodownload"
                    onLoadedMetadata={handleLoadedMetadata}
                    onPause={() => void saveProgress()}
                    onEnded={() => void saveProgress()}
                  />
                ) : !video.is_free ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 px-4 sm:px-6">
                    <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-blue-600/20 sm:mb-4 sm:h-20 sm:w-20">
                      <Lock className="h-8 w-8 text-blue-400 sm:h-10 sm:w-10" />
                    </div>
                    <h3 className="mb-2 text-center text-lg font-bold text-white sm:text-xl">هذا الدرس ضمن اشتراك الدورة</h3>
                    <p className="mb-4 max-w-md text-center text-sm text-slate-400 sm:mb-6 sm:text-base">
                      {video.course
                        ? `اشترك في دورة «${video.course.title}» لفتح هذا الدرس وجميع الدروس المدفوعة.`
                        : 'اشترك مع هذا المدرس للحصول على جميع الفيديوهات المدفوعة.'}
                    </p>
                    {video.course && (video.course.subscription_price > 0 || video.course.price > 0) && (
                      <div className="mb-6 flex flex-wrap justify-center gap-3">
                        {video.course.subscription_price > 0 && (
                          <div className="rounded-2xl border border-blue-500/40 bg-blue-600/10 px-5 py-3 text-center">
                            <p className="text-xs text-blue-300">اشتراك شهري</p>
                            <p className="mt-1 text-2xl font-extrabold text-white">{video.course.subscription_price} <span className="text-sm font-medium text-slate-400">جنيه/شهر</span></p>
                          </div>
                        )}
                        {video.course.price > 0 && (
                          <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-5 py-3 text-center">
                            <p className="text-xs text-amber-300">دفعة واحدة</p>
                            <p className="mt-1 text-2xl font-extrabold text-white">{video.course.price} <span className="text-sm font-medium text-slate-400">جنيه</span></p>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="flex flex-wrap justify-center gap-3">
                      {video.course && (
                        <Link to={`/course/${video.course.id}`} className="rounded-xl bg-gradient-to-l from-blue-600 to-cyan-500 px-7 py-3 font-bold text-white transition hover:shadow-lg hover:shadow-blue-500/30">
                          الاشتراك في الدورة
                        </Link>
                      )}
                      {teacher && (
                        <Link to={`/teacher/${teacher.id}`} className="rounded-xl border border-white/20 bg-white/10 px-7 py-3 font-bold text-white transition hover:bg-white/20">
                          صفحة المدرس
                        </Link>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 px-6">
                    <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white/10">
                      <Play className="h-10 w-10 text-white" />
                    </div>
                    <h3 className="mb-2 text-xl font-bold text-white">الفيديو غير متاح حاليًا</h3>
                    <p className="mb-6 max-w-md text-center text-slate-400">حدثت مشكلة في تحميل الفيديو. حاول إعادة تحميل الصفحة أو تواصل مع المدرس.</p>
                    <button onClick={() => window.location.reload()} className="rounded-xl bg-white px-6 py-2.5 font-bold text-slate-900 transition hover:bg-slate-200">إعادة تحميل</button>
                  </div>
                )}
              </div>
            </div>

            {/* Title + actions */}
            <div className="mt-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <h1 className="min-w-0 max-w-2xl text-xl font-bold leading-relaxed text-white sm:text-2xl">{video.title}</h1>
                <div className="flex shrink-0 items-center gap-2">
                  <SocialShare title={video.title} description={video.description ?? undefined} />
                  {user && !profile?.is_teacher && (
                    <button onClick={toggleFavorite}
                      className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                        isFavorited ? 'bg-rose-500/20 text-rose-400' : 'bg-white/10 text-slate-300 hover:bg-white/20'
                      }`}>
                      <Heart className={`h-5 w-5 ${isFavorited ? 'fill-rose-400' : ''}`} />
                      <span className="hidden sm:inline">{isFavorited ? 'في المفضلة' : 'أضف للمفضلة'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Meta chips */}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-slate-300"><Eye className="h-3.5 w-3.5" /> {formatViews(video.views_count + 1)} مشاهدة</span>
                {video.duration_seconds > 0 && <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-slate-300"><Clock className="h-3.5 w-3.5" /> {formatDuration(video.duration_seconds)}</span>}
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-slate-300"><Calendar className="h-3.5 w-3.5" /> {new Date(video.created_at).toLocaleDateString('ar-EG')}</span>
                {video.category && <span className="rounded-full bg-blue-600/20 px-3 py-1.5 text-xs font-medium text-blue-300">{video.category.name_ar}</span>}
                {!video.is_free && <span className="rounded-full bg-amber-500/15 px-3 py-1.5 text-xs font-medium text-amber-400">للمشتركين</span>}
                {video.course && (
                  <Link to={`/course/${video.course_id}`} className="inline-flex items-center gap-1.5 rounded-full bg-cyan-600/20 px-3 py-1.5 text-xs font-medium text-cyan-300 transition hover:bg-cyan-600/30">
                    <BookOpen className="h-3.5 w-3.5" /> {video.course.title}
                  </Link>
                )}
              </div>

              {/* Speed selector */}
              {hasAccess && (
                <div className="mt-5 flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3">
                  <label htmlFor="playback-rate" className="text-sm text-slate-300">سرعة التشغيل</label>
                  <select id="playback-rate" value={playbackRate} onChange={(event) => {
                    const rate = Number(event.target.value);
                    setPlaybackRate(rate);
                    if (videoRef.current) videoRef.current.playbackRate = rate;
                  }} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-200 outline-none">
                    {[0.75, 1, 1.25, 1.5, 2].map((rate) => <option key={rate} value={rate}>{rate}x</option>)}
                  </select>
                </div>
              )}

              {/* Progress */}
              {progress && progress.total_seconds > 0 && (
                <div className="mt-5 rounded-xl border border-slate-800 bg-slate-900 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm text-slate-400">
                      {progress.is_completed ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <Clock className="h-4 w-4 text-blue-400" />}
                      {progress.is_completed ? 'تمت المشاهدة' : 'تقدمك في هذا الدرس'}
                    </span>
                    <span className="text-sm font-bold text-white">
                      {Math.round((progress.watched_seconds / progress.total_seconds) * 100)}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                    <div className={`h-full rounded-full transition-all ${progress.is_completed ? 'bg-emerald-500' : 'bg-gradient-to-r from-blue-600 to-cyan-500'}`} style={{ width: `${(progress.watched_seconds / progress.total_seconds) * 100}%` }} />
                  </div>
                </div>
              )}

              {/* Description */}
              {video.description && (
                <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900 p-5">
                  <h3 className="mb-2.5 font-bold text-white">وصف الدرس</h3>
                  <p className="whitespace-pre-line leading-7 text-slate-400">{video.description}</p>
                </div>
              )}

              {/* Teacher card */}
              {teacher && (
                <div className="mt-5 flex flex-wrap items-center gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-blue-100 to-cyan-100 text-xl font-bold text-blue-600">
                    {teacher.avatar_url ? (
                      <img src={teacher.avatar_url} alt={teacher.full_name} className="h-full w-full object-cover" loading="lazy" decoding="async" />
                    ) : (
                      <span>{teacher.full_name.charAt(0)}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-white">{teacher.full_name}</h3>
                    <p className="truncate text-sm text-slate-400">{teacher.specialization ?? 'مدرس'}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {user && !profile?.is_teacher && <FollowButton teacherId={teacher.id} isFollowing={false} variant="outline" size="sm" />}
                    <Link to={`/teacher/${teacher.id}`}
                      className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20">
                      زيارة الصفحة <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              )}

              {/* Tabs: Comments / Related */}
              <div className="mt-8">
                <div className="mb-4 flex gap-1 border-b border-slate-800">
                  <button
                    onClick={() => setActiveTab('comments')}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                      activeTab === 'comments' ? 'border-b-2 border-blue-500 text-white' : 'border-b-2 border-transparent text-slate-400 hover:text-slate-200'
                    }`}>
                    <MessageSquare className="h-4 w-4" /> التعليقات
                  </button>
                  <button
                    onClick={() => setActiveTab('related')}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                      activeTab === 'related' ? 'border-b-2 border-blue-500 text-white' : 'border-b-2 border-transparent text-slate-400 hover:text-slate-200'
                    }`}>
                    <Play className="h-4 w-4" /> فيديوهات ذات صلة ({relatedVideos.length})
                  </button>
                </div>

                {activeTab === 'comments' && (
                  <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                    <Comments videoId={video.id} />
                  </div>
                )}

                {activeTab === 'related' && (
                  <div className="space-y-3">
                    {relatedVideos.length === 0 ? (
                      <p className="rounded-2xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-500">لا توجد فيديوهات أخرى</p>
                    ) : (
                      relatedVideos.map((rv) => (
                        <Link key={rv.id} to={`/video/${rv.id}`}
                          className="group flex gap-3 rounded-xl border border-slate-800 bg-slate-900 p-3 transition hover:border-slate-700">
                          <div className="relative flex aspect-video w-32 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-800">
                            {rv.thumbnail_url ? (
                              <img src={rv.thumbnail_url} alt={rv.title} className="h-full w-full object-cover" loading="lazy" decoding="async" />
                            ) : (
                              <Play className="h-6 w-6 text-slate-500 transition group-hover:text-blue-400" />
                            )}
                            {!rv.is_free && <div className="absolute right-1 top-1"><Lock className="h-3.5 w-3.5 text-amber-400" /></div>}
                            {rv.duration_seconds > 0 && <div className="absolute bottom-1 left-1 rounded bg-black/70 px-1 text-[10px] font-bold text-white">{formatDuration(rv.duration_seconds)}</div>}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="line-clamp-2 text-sm font-medium text-white transition group-hover:text-blue-400">{rv.title}</h4>
                            <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                              <Eye className="h-3.5 w-3.5" /><span>{formatViews(rv.views_count)}</span>
                            </div>
                          </div>
                        </Link>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ===== Sidebar ===== */}
          <div className="min-w-0 space-y-6 lg:col-span-1">
            <div>
              <h3 className="mb-3 font-bold text-white">فيديوهات ذات صلة</h3>
              {relatedVideos.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-500">لا توجد فيديوهات أخرى</p>
              ) : (
                <div className="space-y-3">
                  {relatedVideos.map((rv) => (
                    <Link key={rv.id} to={`/video/${rv.id}`}
                      className="group flex gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-3 transition hover:border-slate-700">
                      <div className="relative flex aspect-video w-28 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-800">
                        {rv.thumbnail_url ? (
                          <img src={rv.thumbnail_url} alt={rv.title} className="h-full w-full object-cover" loading="lazy" decoding="async" />
                        ) : (
                          <Play className="h-6 w-6 text-slate-500 transition group-hover:text-blue-400" />
                        )}
                        {!rv.is_free && <div className="absolute right-1 top-1"><Lock className="h-3.5 w-3.5 text-amber-400" /></div>}
                        {rv.duration_seconds > 0 && <div className="absolute bottom-1 left-1 rounded bg-black/70 px-1 text-[10px] font-bold text-white">{formatDuration(rv.duration_seconds)}</div>}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="line-clamp-2 text-sm font-medium text-white transition group-hover:text-blue-400">{rv.title}</h4>
                        <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-500">
                          <Eye className="h-3.5 w-3.5" /><span>{formatViews(rv.views_count)} مشاهدة</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {user && !profile?.is_teacher && (
              <PlaylistManager videoId={video.id} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}