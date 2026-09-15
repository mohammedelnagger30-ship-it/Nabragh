import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowRight, BadgeCheck, BookOpen, Calendar, Clock, Eye, ExternalLink,
  GraduationCap, Link2, Loader2, Lock, MapPin, MessageSquare, Play, Radio, Share2,
  Star, Users, Video as VideoIcon, Quote, Gamepad2, Swords, Send, Ticket,
} from 'lucide-react';
import { supabase, PROFILE_PUBLIC_COLUMNS, VIDEO_PUBLIC_COLUMNS } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { Competition, Course, LiveSession, Profile, Review, TeacherPageSettings, Video } from '@/types';
import MetaTags from '@/components/MetaTags';
import FollowButton from '@/components/FollowButton';
import TrustedTeacherBadge from '@/components/TrustedTeacherBadge';
import TeacherPublicExtras from '@/components/TeacherPublicExtras';
import { isTrustedTeacher } from '@/lib/teachers';
import { getCurriculumLabel, getEducationStageLabel } from '@/lib/education';

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

interface TeacherQnA { id: string; question: string; answer: string | null; created_at: string; student: { full_name: string | null } | null; }
interface TeacherPkg { id: string; title: string; description: string | null; price: number; duration_days: number; }
interface ScheduledSessionLite { id: string; title: string; scheduled_at: string; duration_minutes: number; status: string; }

export default function TeacherProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [teacher, setTeacher] = useState<Profile | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [followersCount, setFollowersCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [shareMessage, setShareMessage] = useState('');
  const [pageSettings, setPageSettings] = useState<TeacherPageSettings | null>(null);
  const [liveSession, setLiveSession] = useState<LiveSession | null>(null);
  const [liveTitle, setLiveTitle] = useState('');
  const [liveUrl, setLiveUrl] = useState('');
  const [savingLive, setSavingLive] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [featuredPlaybackUrl, setFeaturedPlaybackUrl] = useState<string | null>(null);
  const [featuredLocked, setFeaturedLocked] = useState(false);
  const [teacherCompetitions, setTeacherCompetitions] = useState<Competition[]>([]);
  const [questions, setQuestions] = useState<TeacherQnA[]>([]);
  const [myQuestionId, setMyQuestionId] = useState<string | null>(null);
  const [questionText, setQuestionText] = useState('');
  const [asking, setAsking] = useState(false);
  const [packages, setPackages] = useState<TeacherPkg[]>([]);
  const [upcoming, setUpcoming] = useState<ScheduledSessionLite[]>([]);
  const [bookedIds, setBookedIds] = useState<Set<string>>(new Set());
  const [bookingBusy, setBookingBusy] = useState<string | null>(null);
  const [msgText, setMsgText] = useState('');
  const [msgSent, setMsgSent] = useState(false);
  const [msgError, setMsgError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setError(true);
      return;
    }

    let cancelled = false;
    const loadTeacher = async () => {
      setLoading(true);
      setError(false);

      const [teacherResult, coursesResult, videosResult, reviewsResult, followResult, pageSettingsResult, liveResult, followersResult, subsResult, compsResult, qnaResult, myQuestionResult, packagesResult, sessionsResult, bookedResult] = await Promise.all([
        supabase.from('profiles').select(PROFILE_PUBLIC_COLUMNS).eq('id', id).eq('is_teacher', true).eq('is_approved', true).maybeSingle(),
        supabase.from('courses').select('*, category:categories(*)').eq('teacher_id', id).eq('is_published', true).order('sort_order', { ascending: true }).order('created_at', { ascending: false }),
        supabase.from('videos').select(`${VIDEO_PUBLIC_COLUMNS}, category:categories(*), course:courses(*)`).eq('teacher_id', id).order('created_at', { ascending: false }).limit(12),
        supabase.from('reviews').select('*, student:profiles(full_name)').eq('teacher_id', id).order('created_at', { ascending: false }).limit(12),
        user ? supabase.from('teacher_follows').select('id').eq('teacher_id', id).eq('student_id', user.id).maybeSingle() : Promise.resolve({ data: null, error: null }),
        supabase.from('teacher_page_settings').select('*').eq('teacher_id', id).maybeSingle(),
        supabase.from('live_sessions').select('*').eq('teacher_id', id).maybeSingle(),
        supabase.rpc('get_teacher_followers_count', { p_teacher_id: id }),
        user ? supabase.from('subscriptions').select('id, end_date, status, payment_status').eq('student_id', user.id).eq('teacher_id', id).order('created_at', { ascending: false }).limit(25) : Promise.resolve({ data: null, error: null }),
        supabase.from('competitions').select('*').eq('teacher_id', id).eq('status', 'published').order('created_at', { ascending: false }),
        supabase.from('teacher_questions').select('*, student:profiles!teacher_questions_student_id_fkey(full_name)').eq('teacher_id', id).not('answer', 'is', null).order('created_at', { ascending: false }).limit(20),
        user ? supabase.from('teacher_questions').select('id').eq('teacher_id', id).eq('student_id', user.id).is('answer', null).maybeSingle() : Promise.resolve({ data: null, error: null }),
        supabase.from('teacher_packages').select('*').eq('teacher_id', id).eq('is_active', true).order('created_at', { ascending: false }),
        supabase.from('scheduled_sessions').select('*').eq('teacher_id', id).in('status', ['scheduled', 'live']).order('scheduled_at', { ascending: true }).limit(20),
        user ? supabase.from('live_session_bookings').select('session_id').eq('student_id', user.id) : Promise.resolve({ data: null, error: null }),
      ]);

      if (cancelled) return;
      if (teacherResult.error || !teacherResult.data) {
        setError(true);
        setLoading(false);
        return;
      }

      setTeacherCompetitions((compsResult.data as Competition[]) ?? []);
      setQuestions(((qnaResult.data ?? []) as unknown as TeacherQnA[]));
      setMyQuestionId((myQuestionResult.data?.id as string | null) ?? null);
      setPackages((packagesResult.data ?? []) as TeacherPkg[]);
      setUpcoming((sessionsResult.data ?? []) as ScheduledSessionLite[]);
      setBookedIds(new Set(((bookedResult.data ?? []) as Array<{ session_id: string }>).map((b) => b.session_id)));

      setTeacher(teacherResult.data as Profile);
      setCourses((coursesResult.data as Course[]) ?? []);
      setVideos((videosResult.data as unknown as Video[]) ?? []);
      setReviews((reviewsResult.data as Review[]) ?? []);
      setIsFollowing(Boolean(followResult.data));
      setPageSettings((pageSettingsResult.data as TeacherPageSettings | null) ?? null);
      const session = (liveResult.data as LiveSession | null) ?? null;
      setLiveSession(session);
      setLiveTitle(session?.title ?? '');
      setLiveUrl(session?.room_url ?? '');
      setFollowersCount((followersResult.data as number) ?? 0);
      // A subscriber is a student with an active + paid subscription to this teacher
      // (or whose subscription end date hasn't passed), regardless of course.
      const mySubs = (subsResult.data as Array<{ end_date: string | null; status: string; payment_status: string }> | null) ?? [];
      setIsSubscribed(mySubs.some((s) => s.status === 'active' && s.payment_status === 'paid' && (!s.end_date || new Date(s.end_date) >= new Date())));
      setLoading(false);

      // Resolve playback URL for the pinned intro video (free videos are public).
      const pinned = (videosResult.data as unknown as Video[]).find((v) => v.is_pinned);
      if (pinned) {
        const { data: path } = await supabase.rpc('get_video_playback_url', { target_video_id: pinned.id });
        if (typeof path === 'string' && path) {
          if (path.startsWith('http')) {
            setFeaturedPlaybackUrl(path);
          } else {
            const { data: signedUrl } = await supabase.storage.from('videos').createSignedUrl(path, 3600);
            setFeaturedPlaybackUrl(signedUrl?.signedUrl ?? null);
          }
        } else {
          setFeaturedLocked(true);
        }
      }
    };

    void loadTeacher().catch((caught) => {
      if (!cancelled) {
        setError(true);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [id, user]);

  const featuredVideo = useMemo(() => videos.find((v) => v.is_pinned) ?? null, [videos]);

  if (loading) {
    return <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
<div className="mx-auto max-w-6xl animate-pulse px-4 py-12"><div className="h-72 rounded-3xl bg-slate-200 dark:bg-slate-800" /></div></div>;
  }

  if (error || !teacher) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 pt-[4.5rem] dark:bg-slate-950">
        <div className="text-center">
          <GraduationCap className="mx-auto mb-4 h-14 w-14 text-slate-300" />
          <h1 className="mb-3 text-2xl font-bold text-slate-800 dark:text-white">المدرس غير موجود</h1>
          <p className="mb-6 text-slate-500 dark:text-slate-400">قد يكون الملف غير متاح أو لم تتم الموافقة عليه بعد.</p>
          <Link to="/teachers" className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-bold text-white hover:bg-blue-700">العودة للمدرسين <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </div>
    );
  }

  const averageRating = reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0;
  const totalViews = videos.reduce((sum, v) => sum + (v.views_count || 0), 0);
  const trust = isTrustedTeacher(teacher, averageRating, reviews.length);

  const shareProfile = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: teacher.full_name, text: `تعرف على ${teacher.full_name} في Noona`, url });
      return;
    }
    await navigator.clipboard?.writeText(url);
    setShareMessage('تم نسخ رابط الملف');
    window.setTimeout(() => setShareMessage(''), 2500);
  };

  const saveLive = async (nextLive: boolean) => {
    setSavingLive(true);
    setLiveError(null);
    const row = {
      teacher_id: teacher.id,
      title: liveTitle.trim() || null,
      room_url: liveUrl.trim() || null,
      is_live: nextLive,
      started_at: nextLive ? new Date().toISOString() : (liveSession?.started_at ?? null),
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase.from('live_sessions').upsert(row, { onConflict: 'teacher_id' }).select().single();
    setSavingLive(false);
    if (error) {
      setLiveError(error.message);
      return;
    }
    setLiveSession(data as LiveSession);
  };

  const isOwner = user?.id === teacher.id;
  const showLiveRoom = isOwner || isSubscribed || (liveSession?.is_live && Boolean(liveSession.room_url));

  const askQuestion = async () => {
    if (!user) {
      setLiveError('يجب تسجيل الدخول أولاً لإرسال سؤال');
      return;
    }
    const text = questionText.trim();
    if (!text) return;
    setAsking(true);
    const { data, error } = await supabase.from('teacher_questions').insert({ teacher_id: teacher.id, student_id: user.id, question: text }).select('id').single();
    setAsking(false);
    if (error || !data) {
      setLiveError(error?.message ?? 'تعذر إرسال السؤال');
      return;
    }
    setMyQuestionId(data.id);
    setQuestionText('');
  };

  const toggleBooking = async (sessionId: string) => {
    if (!user) {
      setLiveError('يجب تسجيل الدخول أولاً لحجز الحصة');
      return;
    }
    setBookingBusy(sessionId);
    const booked = bookedIds.has(sessionId);
    let error: { message: string } | null = null;
    if (booked) {
      const res = await supabase.from('live_session_bookings').delete().eq('session_id', sessionId).eq('student_id', user.id);
      error = res.error;
    } else {
      const res = await supabase.from('live_session_bookings').insert({ session_id: sessionId, student_id: user.id });
      error = res.error;
    }
    setBookingBusy(null);
    if (error) {
      setLiveError(error.message);
      return;
    }
    const next = new Set(bookedIds);
    if (booked) next.delete(sessionId); else next.add(sessionId);
    setBookedIds(next);
  };

  const sendMessage = async () => {
    if (!user) return;
    const body = msgText.trim();
    if (!body) return;
    setMsgError(null);
    const { error } = await supabase.from('messages').insert({ sender_id: user.id, receiver_id: teacher.id, body });
    if (error) {
      setMsgError(error.message);
      return;
    }
    setMsgText('');
    setMsgSent(true);
  };

  return (
    <div data-teacher-root="1" className="min-h-screen bg-slate-50 pt-[4.5rem] dark:bg-slate-950">
      <MetaTags title={`${teacher.full_name} | Noona`} description={teacher.bio ?? `تعرف على ${teacher.full_name}`} />
      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8 lg:py-8">
        <Link to="/teachers" className="mb-4 inline-flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-700 sm:mb-6 sm:text-sm"><ArrowRight className="h-3 w-3 sm:h-4 sm:w-4" /> كل المدرسين</Link>

        {/* ===== Header / Cover ===== */}
        <section className="overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-l from-blue-700 via-blue-600 to-cyan-500 px-4 py-6 text-white sm:px-6 sm:py-10 dark:border-slate-800 dark:from-slate-950 dark:via-blue-950 dark:to-slate-900">
            {teacher.cover_url ? <div className="absolute inset-0 scale-110 bg-cover bg-center" style={{ backgroundImage: `url(${teacher.cover_url})` }} /> : teacher.avatar_url ? <div className="absolute inset-0 scale-110 bg-cover bg-center opacity-20 blur-xl dark:opacity-30" style={{ backgroundImage: `url(${teacher.avatar_url})` }} /> : null}
            <div className="absolute inset-0 bg-gradient-to-l from-blue-950/70 via-blue-900/40 to-purple-900/40 dark:from-slate-950/60 dark:via-blue-950/40 dark:to-slate-950/60" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/20 dark:bg-white/5" />
            <div className="relative flex flex-col items-center gap-4 text-center sm:flex-row sm:gap-5 sm:text-right">
              <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-white/70 bg-white/20 text-3xl font-bold shadow-lg dark:border-slate-700 dark:bg-slate-800/60 sm:h-28 sm:w-28 sm:text-4xl">
                {teacher.avatar_url ? <img src={teacher.avatar_url} alt={teacher.full_name} className="h-full w-full object-cover" loading="lazy" decoding="async" /> : teacher.full_name.charAt(0)}
                {trust.trusted && (
                  <span className="absolute -bottom-1 -left-1 rounded-full bg-emerald-500 p-1 ring-2 ring-white/70">
                    <BadgeCheck className="h-4 w-4 text-white sm:h-5 sm:w-5" />
                  </span>
                )}
              </div>
              <div className="flex-1">
                <div className="mb-1.5 flex flex-wrap items-center justify-center gap-1.5 sm:mb-2 sm:justify-start sm:gap-2">
                  <h1 className="text-2xl font-extrabold sm:text-3xl">{teacher.full_name}</h1>
                  {trust.trusted && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/90 px-2 py-0.5 text-[10px] font-bold ring-1 ring-white/30 sm:px-2.5 sm:py-1 sm:text-xs"><BadgeCheck className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> مدرس موثق</span>}
                </div>
                <p className="text-sm font-medium text-blue-50 dark:text-slate-300 sm:text-base sm:lg">{teacher.specialization ?? 'مدرس محترف'}</p>
                <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5 sm:mt-3 sm:justify-start sm:gap-2">
                  <TrustedTeacherBadge teacher={teacher} avgRating={averageRating} reviewCount={reviews.length} className="bg-white/15 text-white ring-1 ring-white/20 dark:bg-white/10" />
                  {teacher.location && <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-blue-50 ring-1 ring-white/15 dark:text-slate-300 dark:ring-slate-700 sm:px-3 sm:py-1 sm:text-xs"><MapPin className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> {teacher.location}</span>}
                  {liveSession?.is_live && <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/90 px-2 py-0.5 text-[10px] font-bold ring-1 ring-white/30 sm:px-3 sm:py-1 sm:text-xs"><span className="h-1 w-1 animate-pulse rounded-full bg-white sm:h-1.5 sm:w-1.5" /> مباشر الآن</span>}
                </div>
                <div className="mt-3 flex flex-wrap justify-center gap-1.5 sm:mt-5 sm:justify-start sm:gap-2">
                  <FollowButton teacherId={teacher.id} isFollowing={isFollowing} onFollowChange={setIsFollowing} variant="secondary" />
                  {pageSettings?.slug && pageSettings.is_published && (
                    <Link to={`/academy/${pageSettings.slug}`} className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-bold text-blue-700 shadow-sm transition hover:bg-blue-50 dark:bg-blue-600/90 dark:text-white dark:hover:bg-blue-500 sm:px-4 sm:py-2 sm:text-sm"><GraduationCap className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> زيارة منصة المدرس</Link>
                  )}
                  <button type="button" onClick={() => void shareProfile()} className="inline-flex items-center gap-2 rounded-xl border border-white/40 bg-white/10 px-3 py-2 text-xs font-bold text-white backdrop-blur-sm transition hover:bg-white/20 dark:border-slate-700 dark:bg-slate-900/60 dark:hover:bg-slate-800 sm:px-4 sm:py-2 sm:text-sm"><Share2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> مشاركة الملف</button>
                </div>
                {shareMessage && <p className="mt-2 text-center text-[10px] text-blue-50 dark:text-slate-400 sm:text-right sm:text-xs">{shareMessage}</p>}
              </div>
            </div>
          </div>

          {/* Stats strip */}
          <div className="grid gap-3 border-b border-slate-200 bg-slate-50/70 p-4 sm:gap-4 sm:grid-cols-2 sm:p-6 lg:grid-cols-4 dark:border-slate-800 dark:bg-slate-900/60">
            <div className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2.5 shadow-sm dark:bg-slate-800 sm:gap-3 sm:px-4 sm:py-3"><Star className="h-5 w-5 shrink-0 fill-amber-400 text-amber-400 sm:h-6 sm:w-6" /><span><strong className="text-lg sm:text-xl">{averageRating ? averageRating.toFixed(1) : '—'}</strong><small className="mr-1 text-[10px] text-slate-500 sm:mr-1.5 sm:text-xs">({reviews.length} تقييم)</small></span></div>
            <div className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2.5 shadow-sm dark:bg-slate-800 sm:gap-3 sm:px-4 sm:py-3"><Users className="h-5 w-5 shrink-0 text-cyan-600 sm:h-6 sm:w-6" /><span><strong className="text-lg sm:text-xl">{followersCount}</strong><small className="mr-1 text-[10px] text-slate-500 sm:mr-1.5 sm:text-xs">متابع</small></span></div>
            <div className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2.5 shadow-sm dark:bg-slate-800 sm:gap-3 sm:px-4 sm:py-3"><BookOpen className="h-5 w-5 shrink-0 text-blue-600 sm:h-6 sm:w-6" /><span><strong className="text-lg sm:text-xl">{courses.length}</strong><small className="mr-1 text-[10px] text-slate-500 sm:mr-1.5 sm:text-xs">دورة</small></span></div>
            <div className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2.5 shadow-sm dark:bg-slate-800 sm:gap-3 sm:px-4 sm:py-3"><Play className="h-5 w-5 shrink-0 text-emerald-600 sm:h-6 sm:w-6" /><span><strong className="text-lg sm:text-xl">{videos.length}</strong><small className="mr-1 text-[10px] text-slate-500 sm:mr-1.5 sm:text-xs">فيديو</small></span></div>
          </div>

          <div className="grid gap-8 p-6 lg:grid-cols-[1fr_18rem] lg:p-10">
            <div>
              {/* ===== Featured / Intro video ===== */}
              {featuredVideo && (
                <section className="mb-10 overflow-hidden rounded-3xl border border-slate-200 bg-slate-900 shadow-md dark:border-slate-700">
                  <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-5 py-4">
                    <h2 className="flex items-center gap-2 text-lg font-extrabold text-white"><VideoIcon className="h-5 w-5 text-violet-400" /> الفيديو المميز</h2>
                    {featuredLocked && !featuredVideo.is_free && <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-400">للمشتركين</span>}
                    {featuredVideo.is_free && <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-400">مجاني</span>}
                  </div>
                  <div className="aspect-video bg-black">
                    {featuredPlaybackUrl ? (
                      <video src={featuredPlaybackUrl} controls controlsList="nodownload" className="h-full w-full" />
                    ) : featuredLocked && !featuredVideo.is_free ? (
                      <div className="relative h-full w-full">
                        {featuredVideo.thumbnail_url && <img src={featuredVideo.thumbnail_url} alt={featuredVideo.title} className="h-full w-full object-cover opacity-60" loading="lazy" decoding="async" />}
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-950/70 px-6">
                          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm">
                            <Lock className="h-8 w-8 text-amber-400" />
                          </div>
                          <div className="text-center">
                            <p className="text-base font-bold text-white">هذا الفيديو متاح لمشتركي الدورة فقط</p>
                            <p className="mt-1 text-sm text-white/70">
                              {featuredVideo.course
                                ? `اشترك في دورة «${featuredVideo.course.title}» لعرض هذا الفيديو وجميع دروس الدورة.`
                                : 'اشترك مع هذا المدرس لعرض هذا الفيديو وجميع دروسه.'}
                            </p>
                          </div>
                          {featuredVideo.course && (
                            <div className="flex flex-wrap items-center justify-center gap-2">
                              {featuredVideo.course.subscription_price > 0 && <span className="rounded-full bg-white/10 px-4 py-1.5 text-sm font-bold text-white">اشتراك شهري: {featuredVideo.course.subscription_price} جنيه</span>}
                              {featuredVideo.course.price > 0 && <span className="rounded-full bg-amber-400/90 px-4 py-1.5 text-sm font-bold text-slate-900">الدفع الكامل: {featuredVideo.course.price} جنيه</span>}
                            </div>
                          )}
                          <Link
                            to={featuredVideo.course ? `/course/${featuredVideo.course.id}` : `/video/${featuredVideo.id}`}
                            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-l from-blue-600 to-cyan-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/30 transition hover:opacity-90"
                          >
                            <BookOpen className="h-4 w-4" /> الاشتراك في الدورة
                          </Link>
                        </div>
                      </div>
                    ) : (
                      <Link to={`/video/${featuredVideo.id}`} className="relative block h-full w-full">
                        {featuredVideo.thumbnail_url ? <img src={featuredVideo.thumbnail_url} alt={featuredVideo.title} className="h-full w-full object-cover" loading="lazy" decoding="async" /> : <div className="flex h-full items-center justify-center bg-gradient-to-br from-blue-700/40 to-purple-700/40" />}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 transition hover:bg-black/20">
                          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/90 shadow-xl transition group-hover:scale-105">
                            <Play className="h-10 w-10 fill-blue-600 text-blue-600" />
                          </div>
                        </div>
                      </Link>
                    )}
                  </div>
                  <div className="bg-slate-800/60 px-5 py-4">
                    <h3 className="font-bold text-white">{featuredVideo.title}</h3>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-300">
                      {featuredVideo.duration_seconds > 0 && <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {formatDuration(featuredVideo.duration_seconds)}</span>}
                      <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> {formatViews(featuredVideo.views_count)} مشاهدة</span>
                      {featuredVideo.category && <span className="rounded-full bg-white/10 px-2.5 py-0.5">{featuredVideo.category.name_ar}</span>}
                    </div>
                  </div>
                </section>
              )}

              {/* ===== About ===== */}
              <div className="mb-8 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-md"><Quote className="h-5 w-5" /></div>
                <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white">نبذة عن المدرس</h2>
              </div>
              <p className="leading-8 text-slate-600 dark:text-slate-300">{teacher.bio || 'لم تتم إضافة نبذة عن هذا المدرس بعد.'}</p>
              <div className="mt-6 flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                {teacher.years_experience > 0 && <span className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 shadow-sm dark:bg-slate-800"><Clock className="h-4 w-4 text-blue-500" /> {teacher.years_experience} سنوات خبرة</span>}
                <span className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 shadow-sm dark:bg-slate-800"><Calendar className="h-4 w-4 text-cyan-500" /> انضم {new Date(teacher.created_at).toLocaleDateString('ar-EG')}</span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {teacher.education_stage && <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">{getEducationStageLabel(teacher.education_stage)}</span>}
                {teacher.curriculum && <span className="rounded-full bg-cyan-50 px-3 py-1.5 text-xs font-bold text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300">{getCurriculumLabel(teacher.curriculum)}</span>}
                {teacher.teaching_stages?.slice(0, 4).map((stage) => <span key={stage} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">{getEducationStageLabel(stage)}</span>)}
              </div>

              {/* ===== Teacher Competitions ===== */}
              {teacherCompetitions.length > 0 && (
                <>
                  <div className="mb-6 mt-12 flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 via-blue-600 to-cyan-500 text-white shadow-md">
                      <Swords className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white">
                        تحديات ومنافسات المدرس
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        أسئلة وتحديات حصرية أعدّها المدرس لاختبار مهارات طلابه
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    {teacherCompetitions.map((comp) => {
                      const isLocked = comp.allowed_subscribers_only && !isSubscribed;
                      return (
                        <div
                          key={comp.id}
                          className={`rounded-2xl border p-5 transition ${
                            isLocked
                              ? 'border-amber-200/80 bg-amber-50/40 dark:border-amber-900/40 dark:bg-amber-950/20'
                              : 'border-slate-200 bg-white shadow-sm hover:border-cyan-400 dark:border-slate-700 dark:bg-slate-900'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300">
                                <Gamepad2 className="h-5 w-5" />
                              </span>
                              <span className="text-sm font-bold text-slate-900 dark:text-white">{comp.title}</span>
                            </div>

                            {comp.allowed_subscribers_only ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                                <Lock className="h-3 w-3" /> خاص للمشتركين
                              </span>
                            ) : (
                              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                                🌐 تحدي عام
                              </span>
                            )}
                          </div>

                          <p className="mt-3 text-xs leading-5 text-slate-500 line-clamp-2 dark:text-slate-400">
                            {comp.description || 'تحدي تفاعلي خاص بمادة وتدريبات المدرس.'}
                          </p>

                          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                            {isLocked ? (
                              <div className="flex flex-col gap-2">
                                <p className="text-[11px] font-bold text-amber-800 dark:text-amber-300">
                                  🔒 هذا التحدي مخصص حصرياً للمشتركين بباعد المدرس
                                </p>
                                <a
                                  href="#courses"
                                  className="inline-flex items-center justify-center gap-1 rounded-xl bg-amber-500 px-4 py-2 text-xs font-extrabold text-white shadow-sm hover:bg-amber-600"
                                >
                                  اشترك الآن لفتح الساحة
                                </a>
                              </div>
                            ) : (
                              <Link
                                to={`/competitions?comp=${comp.id}`}
                                className="inline-flex items-center justify-center gap-1.5 w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2.5 text-xs font-extrabold text-white shadow-md hover:scale-[1.02] transition-transform"
                              >
                                ⚔️ دخول التحدي والمواجهة الآن
                              </Link>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {/* ===== Courses ===== */}
              <div className="mb-6 mt-12 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-600 to-cyan-500 text-white shadow-md"><BookOpen className="h-5 w-5" /></div>
                <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white">الدورات المتاحة</h2>
              </div>
              {courses.length ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {courses.map((course) => (
                    <Link key={course.id} to={`/course/${course.id}`} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-lg dark:border-slate-700 dark:bg-slate-900">
                      <h3 className="font-bold text-slate-800 group-hover:text-blue-600 dark:text-white">{course.title}</h3>
                      <p className="mt-2 line-clamp-2 text-sm text-slate-500">{course.description || 'دورة تعليمية متخصصة'}</p>
                      <div className="mt-4 flex items-center justify-between">
                        <div className="flex flex-wrap items-center gap-2">
                          {course.price === 0 ? (
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">مجانية</span>
                          ) : (
                            <span className="rounded-full bg-amber-500/10 px-3 py-1 text-sm font-bold text-amber-600 dark:text-amber-400">{course.price} جنيه</span>
                          )}
                          {course.subscription_price > 0 && (
                            <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-600 dark:text-blue-400">{course.subscription_price} جنيه/شهر</span>
                          )}
                        </div>
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-400"><Eye className="h-3.5 w-3.5" /> {formatViews(course.views_count ?? 0)}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">لا توجد دورات منشورة حاليًا.</p>}

              {/* ===== Videos ===== */}
              <div className="mb-6 mt-12 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-500 text-white shadow-md"><Play className="h-5 w-5" /></div>
                <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white">فيديوهات المدرس</h2>
              </div>
              {videos.length ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {videos.slice(0, 6).map((video) => (
                    <Link key={video.id} to={`/video/${video.id}`} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-400 hover:shadow-lg dark:border-slate-700 dark:bg-slate-900">
                      <div className="relative aspect-video bg-slate-100 dark:bg-slate-800">
                        {video.thumbnail_url ? <img src={video.thumbnail_url} alt={video.title} className="h-full w-full object-cover" loading="lazy" decoding="async" /> : <div className="flex h-full items-center justify-center"><Play className="h-10 w-10 text-emerald-600" /></div>}
                        {video.is_pinned && <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-violet-600 px-2 py-0.5 text-[11px] font-bold text-white"><VideoIcon className="h-3 w-3" /> المميز</span>}
                        {!video.is_free && <div className="absolute left-2 top-2 rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-bold text-white">مدفوع</div>}
                        <div className="absolute bottom-2 left-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[11px] font-bold text-white">{formatDuration(video.duration_seconds)}</div>
                      </div>
                      <div className="p-4">
                        <h3 className="line-clamp-1 font-bold text-slate-800 group-hover:text-emerald-600 dark:text-white">{video.title}</h3>
                        <p className="mt-1 text-xs text-slate-400"><Eye className="ml-1 inline h-3.5 w-3.5" />{formatViews(video.views_count)} مشاهدة</p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">لا توجد فيديوهات منشورة حاليًا.</p>}

              {/* ===== Reviews ===== */}
              <div className="mb-6 mt-12 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-md"><Star className="h-5 w-5" /></div>
                <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white">آراء الطلاب</h2>
              </div>
              {reviews.length ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {reviews.slice(0, 6).map((review) => (
                    <div key={review.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                      <div className="flex items-center justify-between gap-3">
                        <span className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-cyan-100 text-sm font-bold text-blue-600 dark:from-blue-900 dark:to-cyan-900 dark:text-blue-300">{review.student?.full_name?.charAt(0) ?? 'ط'}</span>
                          {review.student?.full_name ?? 'طالب في المنصة'}
                        </span>
                        <span className="flex items-center gap-1 text-sm font-bold text-amber-500"><Star className="h-4 w-4 fill-amber-400" /> {review.rating}/5</span>
                      </div>
                      {review.comment && <p className="mt-3 text-sm leading-7 text-slate-500 dark:text-slate-400">{review.comment}</p>}
                    </div>
                  ))}
                </div>
              ) : <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">لا توجد تقييمات حتى الآن.</p>}

              {/* ===== Upcoming sessions ===== */}
              {(() => {
                const future = upcoming.filter((s) => s.status === 'live' || new Date(s.scheduled_at) >= new Date(new Date().setHours(0, 0, 0, 0)));
                if (!future.length) return null;
                return (
                  <div className="mt-12">
                    <h2 className="mb-4 flex items-center gap-2 text-xl font-extrabold text-slate-900 dark:text-white"><Calendar className="h-5 w-5 text-blue-500" /> الحصص المباشرة القادمة</h2>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {future.slice(0, 6).map((s) => {
                        const booked = bookedIds.has(s.id);
                        return (
                          <div key={s.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                            <div className="min-w-0">
                              <p className="truncate font-bold text-slate-800 dark:text-white">{s.title}</p>
                              <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400"><Clock className="h-3.5 w-3.5" /> {new Date(s.scheduled_at).toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' })} - {new Date(s.scheduled_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}{s.status === 'live' ? ' • مباشر الآن' : ''} • {s.duration_minutes} دقيقة</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => void toggleBooking(s.id)}
                              disabled={bookingBusy === s.id || isOwner}
                              className={`shrink-0 rounded-xl px-4 py-2 text-sm font-bold transition ${booked ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-900/30 dark:text-rose-300' : 'bg-blue-600 text-white hover:bg-blue-700'} disabled:cursor-not-allowed disabled:opacity-60`}
                            >
                              {bookingBusy === s.id ? <Loader2 className="h-4 w-4 animate-spin" /> : booked ? 'إلغاء الحجز' : <span className="flex items-center gap-1.5"><Ticket className="h-4 w-4" /> احجز</span>}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* ===== Packages ===== */}
              {packages.length > 0 && (
                <div className="mt-12">
                  <h2 className="mb-4 flex items-center gap-2 text-xl font-extrabold text-slate-900 dark:text-white"><GraduationCap className="h-5 w-5 text-emerald-500" /> باقات العروض</h2>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {packages.map((p) => (
                      <div key={p.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
                        <div className="flex items-center justify-between gap-2 bg-gradient-to-l from-emerald-500/10 to-teal-500/10 px-4 py-3">
                          <p className="font-bold text-slate-800 dark:text-white">{p.title}</p>
                          <span className="shrink-0 rounded-full bg-emerald-500 px-3 py-1 text-sm font-extrabold text-white">{p.price} ج.م</span>
                        </div>
                        <div className="flex items-center justify-between gap-2 px-4 py-3">
                          <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">{p.description || 'باقة تعليمية مميزة مع المدرس'}</p>
                          <span className="shrink-0 text-xs font-bold text-slate-400">{p.duration_days} يوم</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ===== Q&A ===== */}
              {(questions.length > 0 || user) && (
                <div className="mt-12">
                  <h2 className="mb-4 flex items-center gap-2 text-xl font-extrabold text-slate-900 dark:text-white"><MessageSquare className="h-5 w-5 text-amber-500" /> سؤال وجواب</h2>
                  {user && !isOwner && (
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                      {myQuestionId ? (
                        <p className="flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700 dark:bg-amber-900/20 dark:text-amber-300"><Clock className="h-4 w-4" /> تم إرسال سؤالك وهو بانتظار إجابة المدرس.</p>
                      ) : (
                        <>
                          <textarea
                            value={questionText}
                            onChange={(event) => setQuestionText(event.target.value)}
                            rows={2}
                            placeholder="اكتب سؤالك للمدرس هنا..."
                            className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-7 text-slate-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                          />
                          <button
                            type="button"
                            onClick={() => void askQuestion()}
                            disabled={asking || !questionText.trim()}
                            className="mt-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-amber-600 disabled:opacity-60"
                          >
                            {asking ? <Loader2 className="h-4 w-4 animate-spin" /> : 'إرسال السؤال'}
                          </button>
                        </>
                      )}
                    </div>
                  )}
                  <div className="mt-4 space-y-3">
                    {questions.map((q) => (
                      <div key={q.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                        <p className="font-bold text-slate-800 dark:text-white">{q.question}</p>
                        <p className="mt-2 flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-sm leading-6 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                          <span>{q.answer}</span>
                        </p>
                        <p className="mt-2 text-xs text-slate-400">سؤال من {q.student?.full_name ?? 'طالب'} • {new Date(q.created_at).toLocaleDateString('ar-EG')}</p>
                      </div>
                    ))}
                    {questions.length === 0 && <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">لا توجد أسئلة مُجابة بعد.</p>}
                  </div>
                </div>
              )}

              {/* ===== Summary stats ===== */}
              <div className="mt-12 grid gap-4 rounded-3xl border border-slate-200 bg-gradient-to-l from-blue-50 to-cyan-50 p-6 sm:grid-cols-3 dark:border-slate-700 dark:from-slate-900 dark:to-slate-900">
                <div><p className="text-3xl font-extrabold text-blue-700 dark:text-blue-400">{formatViews(totalViews)}</p><p className="mt-1 text-sm font-bold text-slate-500">إجمالي المشاهدات</p></div>
                <div><p className="text-3xl font-extrabold text-cyan-700 dark:text-cyan-400">{followersCount}</p><p className="mt-1 text-sm font-bold text-slate-500">متابع للمدرس</p></div>
                <div><p className="text-3xl font-extrabold text-emerald-700 dark:text-emerald-400">{reviews.length}</p><p className="mt-1 text-sm font-bold text-slate-500">تقييم الطلاب</p></div>
              </div>
            </div>

            {/* ===== Sidebar ===== */}
            <aside className="h-fit space-y-5">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <h2 className="mb-4 flex items-center gap-2 text-base font-extrabold text-slate-800 dark:text-white">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-sm dark:from-sky-600 dark:to-blue-700"><MessageSquare size={18} /></span>
                  تواصل
                </h2>
                {teacher.website
                  ? <a href={teacher.website} target="_blank" rel="noreferrer" className="mb-3 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-blue-600 transition hover:border-blue-400 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-800 dark:text-blue-400 dark:hover:bg-slate-700"><Link2 className="h-4 w-4" /> الموقع الشخصي</a>
                  : <p className="flex items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400"><span className="h-2 w-2 rounded-full bg-slate-400" /> لا توجد وسائل تواصل مضافة حاليًا</p>}
                {user && !isOwner && (
                  <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-700">
                    {msgSent ? (
                      <p className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-sm font-bold text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">تم إرسال رسالتك للمدرس.</p>
                    ) : (
                      <>
                        <textarea
                          value={msgText}
                          onChange={(event) => { setMsgText(event.target.value); setMsgSent(false); setMsgError(null); }}
                          rows={2}
                          placeholder="رسالة مباشرة للمدرس..."
                          className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm leading-6 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        />
                        {msgError && <p className="mt-1 text-xs font-bold text-rose-500">{msgError}</p>}
                        <button
                          type="button"
                          onClick={() => void sendMessage()}
                          disabled={!msgText.trim()}
                          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-60"
                        >
                          <Send className="h-4 w-4" /> إرسال رسالة
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <h2 className="mb-4 flex items-center gap-2 text-base font-extrabold text-slate-800 dark:text-white">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-sm dark:from-violet-600 dark:to-purple-700"><BadgeCheck size={18} /></span>
                  المعرفات
                </h2>
                <div className="flex flex-wrap gap-2">
                  {teacher.specialization ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 ring-1 ring-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:ring-blue-900/50"><GraduationCap className="h-3.5 w-3.5" /> {teacher.specialization}</span>
                  ) : <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">التخصص: عام</span>}
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-50 px-3 py-1.5 text-xs font-bold text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300"><BadgeCheck className="h-3.5 w-3.5" /> مدرس {trust.trusted ? 'موثق' : 'على المنصة'}</span>
                </div>
              </div>
            </aside>
          </div>
        </section>

        {liveError && <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-300">{liveError}</div>}

        {showLiveRoom && (
          <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className={`flex items-center justify-between border-b border-slate-100 px-6 py-5 dark:border-slate-700 ${isOwner ? 'bg-slate-50 dark:bg-slate-800/60' : ''}`}>
              <div>
                <h2 className="flex items-center gap-2 text-xl font-extrabold text-slate-900 dark:text-white"><Radio className="h-5 w-5 text-red-500" /> غرفة البث المباشر</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">أدر رابط الحصة وحالتها للطلاب</p>
              </div>
              <span className={`flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${liveSession?.is_live ? 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}>
                <span className={`h-2 w-2 rounded-full ${liveSession?.is_live ? 'animate-pulse bg-red-500' : 'bg-slate-400'}`} />
                {liveSession?.is_live ? 'مباشر الآن' : 'غير نشط'}
              </span>
            </div>
            {isOwner ? (
              <div className="space-y-4 p-6">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
                  عنوان الجلسة
                  <input
                    value={liveTitle}
                    onChange={(event) => setLiveTitle(event.target.value)}
                    placeholder="مثال: مراجعة نهائية للرياضيات"
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </label>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
                  رابط غرفة البث
                  <input
                    value={liveUrl}
                    onChange={(event) => setLiveUrl(event.target.value)}
                    placeholder="https://..."
                    dir="ltr"
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </label>
                {liveError && <p className="text-sm text-red-600 dark:text-red-400">{liveError}</p>}
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => void saveLive(true)}
                    disabled={savingLive || !liveTitle.trim() || !liveUrl.trim()}
                    className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-red-500/30 transition hover:shadow-red-500/40 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingLive ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radio className="h-4 w-4" />}
                    بدء البث
                  </button>
                  {liveSession?.is_live && (
                    <button
                      onClick={() => void saveLive(false)}
                      disabled={savingLive}
                      className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:border-red-300 hover:text-red-600 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                    >
                      إيقاف البث
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-6">
                <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-800 dark:text-white">{liveSession?.title || 'البث المباشر للمدرس'}</h3>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{liveSession?.viewers_count ?? 0} متصل الآن</p>
                  </div>
                  {isOwner || isSubscribed ? (
                    liveSession?.room_url && (
                      <a
                        href={liveSession.room_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-red-500/30 transition hover:shadow-red-500/40"
                      >
                        <ExternalLink className="h-4 w-4" /> دخول الحصة المباشرة
                      </a>
                    )
                  ) : (
                    <Link
                      to={courses.length ? `/courses` : `/teachers`}
                      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-500/30 transition hover:shadow-blue-500/40"
                    >
                      <Lock className="h-4 w-4" /> اشترك مع المدرس للدخول
                    </Link>
                  )}
                </div>
                {!isOwner && !isSubscribed && (
                  <p className="mt-3 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                    غرفة البث المباشر متاحة للمشتركين مع المدرس فقط. اشترك الآن لتتمكن من دخول الحصة ومتابعة دروسك المباشرة.
                  </p>
                )}
              </div>
            )}
          </section>
        )}
        <TeacherPublicExtras teacherId={teacher.id} settings={pageSettings} />
      </div>
    </div>
  );
}