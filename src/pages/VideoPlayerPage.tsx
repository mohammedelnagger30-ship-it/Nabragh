import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowRight, Play, Eye, Lock, Loader2, Heart, MessageSquare, Share2,
  Send, Trash2, Clock, BookOpen, CheckCircle2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import Comments from '@/components/Comments';
import SocialShare from '@/components/SocialShare';
import PlaylistManager from '@/components/PlaylistManager';
import MetaTags from '@/components/MetaTags';
import StructuredData, { generateVideoStructuredData } from '@/components/StructuredData';
import type { Video, Profile, Comment, VideoProgress } from '@/types';

export default function VideoPlayerPage() {
  const { id } = useParams<{ id: string }>();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [video, setVideo] = useState<Video | null>(null);
  const [teacher, setTeacher] = useState<Profile | null>(null);
  const [relatedVideos, setRelatedVideos] = useState<Video[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [progress, setProgress] = useState<VideoProgress | null>(null);
  const [activeTab, setActiveTab] = useState<'comments' | 'related'>('comments');
  const [playbackRate, setPlaybackRate] = useState(1);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    if (!id) return;
    const { data: vidData } = await supabase
      .from('videos')
      .select('*, category:categories(*), teacher:profiles!videos_teacher_id_fkey(*), course:courses(*)')
      .eq('id', id)
      .maybeSingle();
    const vid = vidData as Video | null;
    setVideo(vid);
    if (vid?.teacher) setTeacher(vid.teacher as Profile);

    if (vid) {
      await supabase.from('videos').update({ views_count: vid.views_count + 1 }).eq('id', id);

      const { data: related } = await supabase
        .from('videos')
        .select('*, category:categories(*)')
        .eq('teacher_id', vid.teacher_id)
        .neq('id', id)
        .limit(5);
      setRelatedVideos(related as Video[] ?? []);

      const { data: commentData } = await supabase
        .from('comments')
        .select('*, student:profiles!comments_student_id_fkey(*)')
        .eq('video_id', id)
        .is('parent_id', null)
        .order('created_at', { ascending: false });
      setComments(commentData as Comment[] ?? []);

      if (vid.is_free) {
        setHasAccess(true);
      } else if (user) {
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('student_id', user.id)
          .eq('teacher_id', vid.teacher_id)
          .eq('status', 'active')
          .gt('end_date', new Date().toISOString())
          .maybeSingle();
        setHasAccess(!!sub);
      }

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
      const total = Math.floor(videoRef.current?.duration || 0);

      if (progressIntervalRef.current === null) {
        progressIntervalRef.current = setInterval(async () => {
          const currentWatched = Math.floor(videoRef.current?.currentTime ?? 0);
          const isCompleted = total > 0 && currentWatched / total >= 0.9;

          if (progress) {
            await supabase.from('video_progress').update({
              watched_seconds: currentWatched,
              total_seconds: total,
              is_completed: isCompleted || progress.is_completed,
              last_watched_at: new Date().toISOString(),
            }).eq('id', progress.id);
          } else {
            const { data: newProg } = await supabase.from('video_progress').insert({
              student_id: user.id,
              video_id: video.id,
              watched_seconds: currentWatched,
              total_seconds: total,
              is_completed: isCompleted,
              last_watched_at: new Date().toISOString(),
            }).select().single();
            if (newProg) setProgress(newProg as VideoProgress);
          }
        }, 10000);
      }
    };

    const videoEl = videoRef.current;
    videoEl?.addEventListener('play', handleTimeUpdate);

    return () => {
      videoEl?.removeEventListener('play', handleTimeUpdate);
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    };
  }, [hasAccess, user, video, progress]);

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

  const shareVideo = async () => {
    const shareData = { title: video?.title ?? 'فيديو تعليمي', url: window.location.href };
    if (navigator.share) {
      await navigator.share(shareData);
    } else {
      await navigator.clipboard.writeText(window.location.href);
      toast('تم نسخ رابط الفيديو', 'success');
    }
  };

  const submitComment = async () => {
    if (!user || !video || !commentText.trim()) return;
    setSubmittingComment(true);
    const { data, error } = await supabase.from('comments').insert({
      video_id: video.id,
      student_id: user.id,
      comment: commentText.trim(),
    }).select('*, student:profiles!comments_student_id_fkey(*)').single();

    setSubmittingComment(false);
    if (!error && data) {
      setComments([data as Comment, ...comments]);
      setCommentText('');
      toast('تم نشر تعليقك', 'success');
    } else {
      toast('حدث خطأ أثناء نشر التعليق', 'error');
    }
  };

  const deleteComment = async (commentId: string) => {
    if (!confirm('هل تريد حذف هذا التعليق؟')) return;
    await supabase.from('comments').delete().eq('id', commentId);
    setComments(comments.filter(c => c.id !== commentId));
  };

  if (loading) {
    return <div className="pt-[4.5rem] min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;
  }

  if (!video) {
    return (
      <div className="pt-[4.5rem] min-h-screen flex flex-col items-center justify-center">
        <p className="text-slate-500 mb-4">الفيديو غير موجود</p>
        <Link to="/" className="text-blue-600 hover:underline">العودة للرئيسية</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 pt-[4.5rem]">
      <MetaTags title={`${video.title} | منصة العلم`} description={video.description ?? 'درس تعليمي على منصة العلم'} />
      <StructuredData data={generateVideoStructuredData(video)} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-400 mb-4 flex-wrap">
          <Link to="/" className="hover:text-white transition-colors">الرئيسية</Link>
          <span>/</span>
          {teacher && (
            <>
              <Link to={`/teacher/${teacher.id}`} className="hover:text-white transition-colors">{teacher.full_name}</Link>
              <span>/</span>
            </>
          )}
          <span className="text-slate-300 truncate">{video.title}</span>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Video Player + Info */}
          <div className="lg:col-span-2">
            <div className="aspect-video bg-black rounded-2xl overflow-hidden relative">
              {hasAccess ? (
                <video
                  ref={videoRef}
                  src={video.video_url}
                  controls
                  autoPlay
                  className="w-full h-full"
                  controlsList="nodownload"
                  onLoadedMetadata={(event) => { event.currentTarget.playbackRate = playbackRate; }}
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900">
                  <div className="w-20 h-20 rounded-full bg-blue-600/20 flex items-center justify-center mb-4">
                    <Lock className="w-10 h-10 text-blue-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">هذا المحتوى مخصص للمشتركين</h3>
                  <p className="text-slate-400 mb-6 text-center max-w-md">
                    اشترك مع هذا المدرس للوصول إلى هذا الفيديو وجميع الفيديوهات الأخرى
                  </p>
                  <div className="flex gap-3">
                    <Link to="/pricing" className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold rounded-xl hover:shadow-lg transition-all">
                      عرض الباقات
                    </Link>
                    {teacher && (
                      <Link to={`/teacher/${teacher.id}`} className="px-6 py-2.5 bg-white/10 text-white font-semibold rounded-xl border border-white/20 hover:bg-white/20 transition-all">
                        صفحة المدرس
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Video Info */}
            <div className="mt-4">
              <div className="mb-3 flex items-start justify-between gap-4">
                <h1 className="text-2xl font-bold text-white">{video.title}</h1>
                <div className="flex shrink-0 items-center gap-2">
                  <SocialShare title={video.title} description={video.description ?? undefined} />
                  {user && !profile?.is_teacher && <PlaylistManager videoId={video.id} />}
                  {user && !profile?.is_teacher && (
                    <button onClick={toggleFavorite}
                      className={`flex items-center gap-2 rounded-xl px-3 py-2 font-medium transition-all ${
                        isFavorited ? 'bg-rose-500/20 text-rose-400' : 'bg-white/10 text-slate-300 hover:bg-white/20'
                      }`}>
                      <Heart className={`h-5 w-5 ${isFavorited ? 'fill-rose-400' : ''}`} />
                      <span className="hidden sm:inline">{isFavorited ? 'في المفضلة' : 'أضف للمفضلة'}</span>
                    </button>
                  )}
                </div>
              </div>

              {hasAccess && (
                <div className="mb-4 flex items-center gap-2 text-sm text-slate-400">
                  <label htmlFor="playback-rate">سرعة التشغيل</label>
                  <select id="playback-rate" value={playbackRate} onChange={(event) => {
                    const rate = Number(event.target.value);
                    setPlaybackRate(rate);
                    if (videoRef.current) videoRef.current.playbackRate = rate;
                  }} className="rounded-lg border border-slate-800 bg-slate-900 px-2 py-1 text-slate-200 outline-none">
                    {[0.75, 1, 1.25, 1.5, 2].map((rate) => <option key={rate} value={rate}>{rate}x</option>)}
                  </select>
                </div>
              )}

              <div className="flex items-center gap-4 text-sm text-slate-400 mb-4 flex-wrap">
                <span className="flex items-center gap-1"><Eye className="w-4 h-4" /> {video.views_count + 1} مشاهدة</span>
                {video.category && <span className="px-3 py-1 bg-slate-800 text-slate-300 rounded-full text-xs">{video.category.name_ar}</span>}
                <span>{new Date(video.created_at).toLocaleDateString('ar-EG')}</span>
                {video.course && (
                  <Link to={`/course/${video.course_id}`} className="flex items-center gap-1 px-3 py-1 bg-blue-600/20 text-blue-400 rounded-full text-xs hover:bg-blue-600/30 transition-colors">
                    <BookOpen className="w-3 h-3" /> {video.course.title}
                  </Link>
                )}
              </div>

              {/* Progress bar */}
              {progress && progress.total_seconds > 0 && (
                <div className="bg-slate-900 rounded-xl p-4 border border-slate-800 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-400 flex items-center gap-2">
                      {progress.is_completed ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Clock className="w-4 h-4 text-blue-400" />}
                      {progress.is_completed ? 'تمت المشاهدة' : 'تقدمك في هذا الدرس'}
                    </span>
                    <span className="text-sm font-bold text-white">
                      {Math.round((progress.watched_seconds / progress.total_seconds) * 100)}%
                    </span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${progress.is_completed ? 'bg-emerald-500' : 'bg-gradient-to-r from-blue-600 to-cyan-500'}`}
                      style={{ width: `${(progress.watched_seconds / progress.total_seconds) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {video.description && (
                <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 mb-4">
                  <h3 className="text-white font-semibold mb-2">وصف الدرس</h3>
                  <p className="text-slate-400 leading-relaxed whitespace-pre-line">{video.description}</p>
                </div>
              )}

              {/* Teacher Card */}
              {teacher && (
                <div className="mt-4 bg-slate-900 rounded-2xl p-5 border border-slate-800 flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {teacher.avatar_url ? (
                      <img src={teacher.avatar_url} alt={teacher.full_name} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <span className="text-xl font-bold text-blue-600">{teacher.full_name.charAt(0)}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-white">{teacher.full_name}</h3>
                    <p className="text-sm text-slate-400">{teacher.specialization ?? 'مدرس'}</p>
                  </div>
                  <Link to={`/teacher/${teacher.id}`}
                    className="px-4 py-2 bg-white/10 text-white font-medium rounded-xl hover:bg-white/20 transition-colors flex items-center gap-2 text-sm">
                    زيارة الصفحة <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              )}
            </div>

            {/* Tabs: Comments / Related */}
            <div className="mt-6">
              <div className="flex gap-1 border-b border-slate-800 mb-4">
                <button
                  onClick={() => setActiveTab('comments')}
                  className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'comments' ? 'border-blue-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}>
                  <MessageSquare className="w-4 h-4 inline ml-1" /> التعليقات
                </button>
                <button
                  onClick={() => setActiveTab('related')}
                  className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'related' ? 'border-blue-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}>
                  <Play className="w-4 h-4 inline ml-1" /> فيديوهات ذات صلة
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
                    <p className="text-slate-500 text-sm">لا توجد فيديوهات أخرى</p>
                  ) : (
                    relatedVideos.map((rv) => (
                      <Link key={rv.id} to={`/video/${rv.id}`}
                        className="group flex gap-3 bg-slate-900 rounded-xl p-3 border border-slate-800 hover:border-slate-700 transition-colors">
                        <div className="w-28 aspect-video rounded-lg bg-slate-800 flex-shrink-0 flex items-center justify-center relative overflow-hidden">
                          {rv.thumbnail_url ? (
                            <img src={rv.thumbnail_url} alt={rv.title} className="w-full h-full object-cover" />
                          ) : (
                            <Play className="w-6 h-6 text-slate-500 group-hover:text-blue-400 transition-colors" />
                          )}
                          {!rv.is_free && <div className="absolute top-1 right-1"><Lock className="w-3 h-3 text-amber-400" /></div>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-white line-clamp-2 group-hover:text-blue-400 transition-colors">{rv.title}</h4>
                          <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                            <Eye className="w-3 h-3" /><span>{rv.views_count}</span>
                          </div>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar: Related Videos */}
          <div>
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <Play className="w-5 h-5 text-blue-400" /> فيديوهات ذات صلة
            </h3>
            {relatedVideos.length === 0 ? (
              <p className="text-slate-500 text-sm">لا توجد فيديوهات أخرى</p>
            ) : (
              <div className="space-y-3">
                {relatedVideos.map((rv) => (
                  <Link key={rv.id} to={`/video/${rv.id}`}
                    className="group flex gap-3 bg-slate-900 rounded-xl p-3 border border-slate-800 hover:border-slate-700 transition-colors">
                    <div className="w-28 aspect-video rounded-lg bg-slate-800 flex-shrink-0 flex items-center justify-center relative overflow-hidden">
                      {rv.thumbnail_url ? (
                        <img src={rv.thumbnail_url} alt={rv.title} className="w-full h-full object-cover" />
                      ) : (
                        <Play className="w-6 h-6 text-slate-500 group-hover:text-blue-400 transition-colors" />
                      )}
                      {!rv.is_free && <div className="absolute top-1 right-1"><Lock className="w-3 h-3 text-amber-400" /></div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-white line-clamp-2 group-hover:text-blue-400 transition-colors">{rv.title}</h4>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                        <Eye className="w-3 h-3" /><span>{rv.views_count}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
