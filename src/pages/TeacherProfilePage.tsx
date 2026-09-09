import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, BookOpen, CheckCircle, Clock, GraduationCap, Link2, MapPin, Play, Share2, Star, Users } from 'lucide-react';
import { supabase, PROFILE_PUBLIC_COLUMNS, VIDEO_PUBLIC_COLUMNS } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { Course, Profile, Review, Video } from '@/types';
import MetaTags from '@/components/MetaTags';
import FollowButton from '@/components/FollowButton';
import TeacherPublicExtras from '@/components/TeacherPublicExtras';
import { getCurriculumLabel, getEducationStageLabel } from '@/lib/education';

export default function TeacherProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [teacher, setTeacher] = useState<Profile | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [shareMessage, setShareMessage] = useState('');

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

      const [teacherResult, coursesResult, videosResult, reviewsResult, followResult] = await Promise.all([
        supabase.from('profiles').select(PROFILE_PUBLIC_COLUMNS).eq('id', id).eq('is_teacher', true).eq('is_approved', true).maybeSingle(),
        supabase.from('courses').select('*, category:categories(*)').eq('teacher_id', id).eq('is_published', true).order('created_at', { ascending: false }),
        supabase.from('videos').select(VIDEO_PUBLIC_COLUMNS).eq('teacher_id', id).order('created_at', { ascending: false }).limit(12),
        supabase.from('reviews').select('*').eq('teacher_id', id).order('created_at', { ascending: false }).limit(12),
        user ? supabase.from('teacher_follows').select('id').eq('teacher_id', id).eq('student_id', user.id).maybeSingle() : Promise.resolve({ data: null, error: null }),
      ]);

      if (cancelled) return;
      if (teacherResult.error || !teacherResult.data) {
        setError(true);
        setLoading(false);
        return;
      }

      setTeacher(teacherResult.data as Profile);
      setCourses((coursesResult.data as Course[]) ?? []);
      setVideos((videosResult.data as unknown as Video[]) ?? []);
      setReviews((reviewsResult.data as Review[]) ?? []);
      setIsFollowing(Boolean(followResult.data));
      setLoading(false);
    };

    void loadTeacher().catch(() => {
      if (!cancelled) {
        setError(true);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return <div className="min-h-screen bg-slate-50 pt-[4.5rem] dark:bg-slate-950"><div className="mx-auto max-w-5xl animate-pulse px-4 py-12"><div className="h-64 rounded-3xl bg-slate-200 dark:bg-slate-800" /></div></div>;
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

  const shareProfile = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: teacher.full_name, text: `تعرف على ${teacher.full_name} في منصة العلم`, url });
      return;
    }
    await navigator.clipboard?.writeText(url);
    setShareMessage('تم نسخ رابط الملف');
    window.setTimeout(() => setShareMessage(''), 2500);
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-[4.5rem] dark:bg-slate-950">
      <MetaTags title={`${teacher.full_name} | منصة العلم`} description={teacher.bio ?? `تعرف على ${teacher.full_name}`} />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <Link to="/teachers" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700"><ArrowRight className="h-4 w-4" /> كل المدرسين</Link>
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="bg-gradient-to-l from-blue-700 to-cyan-500 px-6 py-10 text-white sm:px-10">
            <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:text-right">
              <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-white/70 bg-white/20 text-4xl font-bold shadow-lg">
                {teacher.avatar_url ? <img src={teacher.avatar_url} alt={teacher.full_name} className="h-full w-full object-cover" /> : teacher.full_name.charAt(0)}
              </div>
              <div>
                <div className="mb-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start"><h1 className="text-3xl font-extrabold">{teacher.full_name}</h1><CheckCircle className="h-6 w-6 text-emerald-200" aria-label="مدرس موثق" /></div>
                <p className="text-lg text-blue-50">{teacher.specialization ?? 'مدرس محترف'}</p>
                {teacher.location && <p className="mt-2 flex items-center justify-center gap-1 text-sm text-blue-100 sm:justify-start"><MapPin className="h-4 w-4" /> {teacher.location}</p>}
                <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
                  <FollowButton teacherId={teacher.id} isFollowing={isFollowing} onFollowChange={setIsFollowing} variant="secondary" />
                  <button type="button" onClick={() => void shareProfile()} className="inline-flex items-center gap-2 rounded-xl border border-white/40 bg-white/10 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/20"><Share2 className="h-4 w-4" /> مشاركة الملف</button>
                </div>
                {shareMessage && <p className="mt-2 text-center text-xs text-blue-100 sm:text-right">{shareMessage}</p>}
              </div>
            </div>
          </div>
          <div className="grid gap-4 border-b border-slate-200 p-6 sm:grid-cols-4 dark:border-slate-800">
            <div className="flex items-center gap-3"><Star className="h-6 w-6 fill-amber-400 text-amber-400" /><span><strong>{averageRating ? averageRating.toFixed(1) : '-'}</strong><small className="mr-1 text-slate-500">({reviews.length} تقييم)</small></span></div>
            <div className="flex items-center gap-3"><BookOpen className="h-6 w-6 text-blue-600" /><span><strong>{courses.length}</strong><small className="mr-1 text-slate-500">دورة</small></span></div>
            <div className="flex items-center gap-3"><Play className="h-6 w-6 text-emerald-600" /><span><strong>{videos.length}</strong><small className="mr-1 text-slate-500">فيديو</small></span></div>
            <div className="flex items-center gap-3"><Users className="h-6 w-6 text-cyan-600" /><span><strong>{teacher.years_experience || 0}</strong><small className="mr-1 text-slate-500">سنة خبرة</small></span></div>
          </div>
          <div className="grid gap-8 p-6 lg:grid-cols-[1fr_18rem] lg:p-10">
            <div>
              <h2 className="mb-3 text-2xl font-bold text-slate-800 dark:text-white">نبذة عن المدرس</h2>
              <p className="leading-8 text-slate-600 dark:text-slate-300">{teacher.bio || 'لم تتم إضافة نبذة عن هذا المدرس بعد.'}</p>
              {teacher.years_experience > 0 && <p className="mt-4 flex items-center gap-2 text-sm text-slate-500"><Clock className="h-4 w-4" /> {teacher.years_experience} سنوات من الخبرة</p>}
              <div className="mt-6 flex flex-wrap gap-2">
                {teacher.education_stage && <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">{getEducationStageLabel(teacher.education_stage)}</span>}
                {teacher.curriculum && <span className="rounded-full bg-cyan-50 px-3 py-1.5 text-xs font-bold text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300">{getCurriculumLabel(teacher.curriculum)}</span>}
                {teacher.teaching_stages?.slice(0, 4).map((stage) => <span key={stage} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">{getEducationStageLabel(stage)}</span>)}
              </div>
              <h2 className="mb-4 mt-10 text-2xl font-bold text-slate-800 dark:text-white">الدورات المتاحة</h2>
              {courses.length ? <div className="grid gap-4 sm:grid-cols-2">{courses.map((course) => <Link key={course.id} to={`/course/${course.id}`} className="rounded-2xl border border-slate-200 p-4 transition hover:border-blue-400 hover:shadow-md dark:border-slate-700"><h3 className="font-bold text-slate-800 dark:text-white">{course.title}</h3><p className="mt-2 line-clamp-2 text-sm text-slate-500">{course.description || 'دورة تعليمية متخصصة'}</p><span className="mt-3 block font-bold text-blue-600">{course.price === 0 ? 'مجانية' : `${course.price} ر.س`}</span></Link>)}</div> : <p className="text-slate-500">لا توجد دورات منشورة حاليًا.</p>}
              <h2 className="mb-4 mt-10 text-2xl font-bold text-slate-800 dark:text-white">فيديوهات مجانية</h2>
              {videos.length ? <div className="grid gap-3 sm:grid-cols-2">{videos.slice(0, 6).map((video) => <Link key={video.id} to={`/video/${video.id}`} className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3 transition hover:border-emerald-400 hover:shadow-md dark:border-slate-700"><div className="flex h-12 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">{video.thumbnail_url ? <img src={video.thumbnail_url} alt="" className="h-full w-full object-cover" /> : <Play className="h-5 w-5 text-emerald-600" />}</div><span className="line-clamp-2 text-sm font-bold text-slate-700 dark:text-slate-200">{video.title}</span></Link>)}</div> : <p className="text-slate-500">لا توجد فيديوهات منشورة حاليًا.</p>}
              <h2 className="mb-4 mt-10 text-2xl font-bold text-slate-800 dark:text-white">آراء الطلاب</h2>
              {reviews.length ? <div className="space-y-3">{reviews.slice(0, 5).map((review) => <div key={review.id} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700"><div className="flex items-center justify-between gap-3"><span className="text-sm font-bold text-slate-700 dark:text-slate-200">طالب في المنصة</span><span className="flex items-center gap-1 text-sm font-bold text-amber-500"><Star className="h-4 w-4 fill-amber-400" /> {review.rating}/5</span></div>{review.comment && <p className="mt-2 text-sm leading-7 text-slate-500 dark:text-slate-400">{review.comment}</p>}</div>)}</div> : <p className="text-slate-500">لا توجد تقييمات حتى الآن.</p>}
            </div>
            <aside className="h-fit rounded-2xl bg-slate-50 p-5 dark:bg-slate-800">
              <h2 className="mb-4 font-bold text-slate-800 dark:text-white">تواصل</h2>
              {teacher.website && <a href={teacher.website} target="_blank" rel="noreferrer" className="mb-3 flex items-center gap-2 text-sm text-blue-600"><Link2 className="h-4 w-4" /> الموقع الشخصي</a>}
              {!teacher.website && <p className="text-sm text-slate-500">لا توجد وسائل تواصل مضافة حاليًا.</p>}
            </aside>
          </div>
        </section>
        <TeacherPublicExtras teacherId={teacher.id} settings={null} />
      </div>
    </div>
  );
}
