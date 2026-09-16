import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowRight, BookOpen, LockKeyhole, Play, Users } from 'lucide-react';
import { supabase, PROFILE_PUBLIC_COLUMNS, VIDEO_PUBLIC_COLUMNS } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import type { Course, Profile, TeacherPageSettings, Video } from '@/types';
import MetaTags from '@/components/MetaTags';
import FollowButton from '@/components/FollowButton';

export default function AcademyPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [settings, setSettings] = useState<TeacherPageSettings | null>(null);
  const [teacher, setTeacher] = useState<Profile | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [membershipStatus, setMembershipStatus] = useState<'pending' | 'active' | 'rejected' | 'blocked' | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  const loadAcademy = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    const { data: settingsData } = await supabase.from('teacher_page_settings').select('*').eq('slug', slug).maybeSingle();
    const academySettings = settingsData as TeacherPageSettings | null;
    if (!academySettings) {
      setSettings(null);
      setLoading(false);
      return;
    }

    const [{ data: profileData }, { data: courseData }, { data: videoData }, membershipResult] = await Promise.all([
      supabase.from('profiles').select(PROFILE_PUBLIC_COLUMNS).eq('id', academySettings.teacher_id).maybeSingle(),
      supabase.from('courses').select('*, category:categories(*)').eq('teacher_id', academySettings.teacher_id).eq('is_published', true).eq('is_visible', true).order('sort_order', { ascending: true }).order('created_at', { ascending: false }),
      supabase.from('videos').select(VIDEO_PUBLIC_COLUMNS).eq('teacher_id', academySettings.teacher_id).order('created_at', { ascending: false }).limit(12),
      user ? supabase.from('academy_memberships').select('status').eq('teacher_id', academySettings.teacher_id).eq('student_id', user.id).maybeSingle() : Promise.resolve({ data: null, error: null }),
    ]);

    setSettings(academySettings);
    setTeacher(profileData as Profile | null);
    setCourses((courseData as Course[]) ?? []);
    setVideos((videoData as unknown as Video[]) ?? []);
    setMembershipStatus((membershipResult.data?.status as typeof membershipStatus) ?? null);
    setLoading(false);
  }, [slug, user]);

  useEffect(() => { void loadAcademy(); }, [loadAcademy]);

  const joinAcademy = async () => {
    if (!settings) return;
    if (!user) {
      navigate(`/signin?redirect=/academy/${settings.slug}`);
      return;
    }
    setJoining(true);
    const inviteCode = searchParams.get('invite');
    if (inviteCode) {
      const { data: inviteStatus, error: inviteError } = await supabase.rpc('redeem_academy_invite', { invite_code: inviteCode });
      setJoining(false);
      if (inviteError) {
        toast('كود الدعوة غير صالح أو منتهي', 'error');
        return;
      }
      toast(inviteStatus === 'active' ? 'تم قبول دعوتك للمنصة' : 'تم إرسال طلبك للمدرس', 'success');
      await loadAcademy();
      return;
    }
    const status = settings.access_mode === 'public' && !settings.require_approval ? 'active' : 'pending';
    const { error } = await supabase.from('academy_memberships').upsert({ teacher_id: settings.teacher_id, student_id: user.id, status }, { onConflict: 'teacher_id,student_id' });
    setJoining(false);
    if (error) {
      toast('تعذر إرسال طلب الانضمام', 'error');
      return;
    }
    toast(status === 'active' ? 'تم الانضمام للمنصة' : 'تم إرسال طلب الانضمام', 'success');
    await loadAcademy();
  };

  if (loading) return <div className="min-h-screen bg-slate-50 dark:bg-slate-950"><div className="mx-auto max-w-6xl animate-pulse px-4 py-10"><div className="h-72 rounded-3xl bg-slate-200 dark:bg-slate-800" /></div></div>;

  if (!settings || !teacher) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950"><div className="text-center"><LockKeyhole className="mx-auto h-12 w-12 text-slate-300" /><h1 className="mt-4 text-2xl font-extrabold text-slate-800 dark:text-white">المنصة غير متاحة</h1><p className="mt-2 text-slate-500">الرابط غير صحيح أو المنصة غير منشورة.</p><Link to="/teachers" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-bold text-white">استكشاف المدرسين <ArrowRight className="h-4 w-4" /></Link></div></div>;
  }

  if (!settings.is_published && user?.id !== settings.teacher_id) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950"><div className="text-center"><LockKeyhole className="mx-auto h-12 w-12 text-slate-300" /><h1 className="mt-4 text-2xl font-extrabold text-slate-800 dark:text-white">المنصة قيد الإعداد</h1><p className="mt-2 text-slate-500">هذه المنصة لم تُنشر بعد. عد لاحقاً لمشاهدتها.</p><Link to="/teachers" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-bold text-white">استكشاف المدرسين <ArrowRight className="h-4 w-4" /></Link></div></div>;
  }

  const isRestricted = settings.access_mode !== 'public';
  const canBrowse = !isRestricted || membershipStatus === 'active' || user?.id === settings.teacher_id;
  const actionLabel = !user ? 'تسجيل الدخول والانضمام' : settings.require_approval || settings.access_mode === 'invite' ? 'طلب الانضمام للمنصة' : 'الانضمام للمنصة';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <MetaTags title={`${settings.academy_name} | منصة العلم`} description={teacher.bio ?? `منصة ${teacher.full_name}`} />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <Link to="/teachers" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-blue-600"><ArrowRight className="h-4 w-4" /> كل المدرسين</Link>
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="relative bg-gradient-to-l from-blue-700 to-cyan-500 px-6 py-10 text-white sm:px-10">
            <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4"><div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-white/40 bg-white/15 text-3xl font-extrabold">{teacher.avatar_url ? <img src={teacher.avatar_url} alt={teacher.full_name} className="h-full w-full object-cover" loading="lazy" decoding="async" /> : teacher.full_name.charAt(0)}</div><div><p className="text-sm font-bold text-blue-100">منصة تعليمية مستقلة</p><h1 className="mt-1 text-3xl font-extrabold">{settings.academy_name}</h1><p className="mt-1 text-blue-50">بإدارة {teacher.full_name}</p></div></div>
              <div className="flex flex-wrap gap-2">{isRestricted && !canBrowse ? <button type="button" onClick={() => void joinAcademy()} disabled={joining || membershipStatus === 'pending'} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-extrabold text-blue-700 disabled:opacity-60">{membershipStatus === 'pending' ? 'طلبك قيد المراجعة' : actionLabel}</button> : <FollowButton teacherId={teacher.id} isFollowing={false} variant="secondary" />}</div>
            </div>
          </div>

          {!canBrowse && isRestricted ? (
            <div className="px-6 py-16 text-center sm:px-10"><LockKeyhole className="mx-auto h-12 w-12 text-slate-300" /><h2 className="mt-4 text-2xl font-extrabold text-slate-800 dark:text-white">هذه منصة خاصة بطلاب المدرس</h2><p className="mx-auto mt-2 max-w-lg leading-7 text-slate-500">انضم إلى المنصة للوصول إلى الدورات والفيديوهات والامتحانات الخاصة بـ {teacher.full_name}.</p>{membershipStatus === 'rejected' && <p className="mt-3 text-sm font-bold text-rose-600">تم رفض طلب الانضمام. تواصل مع المدرس لمزيد من المعلومات.</p>}<button type="button" onClick={() => void joinAcademy()} disabled={joining || membershipStatus === 'pending'} className="mt-6 rounded-xl bg-blue-600 px-6 py-3 font-bold text-white hover:bg-blue-700 disabled:opacity-60">{membershipStatus === 'pending' ? 'طلبك قيد المراجعة' : actionLabel}</button></div>
          ) : (
            <div className="p-6 sm:p-10"><div className="mb-8 grid gap-4 sm:grid-cols-3"><Stat icon={BookOpen} value={courses.length} label="دورة" /><Stat icon={Play} value={videos.length} label="فيديو" /><Stat icon={Users} value={settings.access_mode === 'public' ? 'مفتوحة' : 'للأعضاء'} label="العضوية" /></div><h2 className="mb-4 text-2xl font-extrabold text-slate-800 dark:text-white">الدورات داخل المنصة</h2>{courses.length ? <div className="grid gap-4 md:grid-cols-2">{courses.map((course) => <Link key={course.id} to={`/course/${course.id}`} className="rounded-2xl border border-slate-200 p-5 transition hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-md dark:border-slate-700"><h3 className="font-bold text-slate-800 dark:text-white">{course.title}</h3><p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">{course.description || 'دورة تعليمية داخل المنصة'}</p><span className="mt-4 block font-bold text-blue-600">{course.price === 0 ? 'مجانية' : `${course.price} جنيه`}</span></Link>)}</div> : <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">لم تُنشر دورات بعد.</p>}</div>
          )}
        </section>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, value, label }: { icon: typeof BookOpen; value: number | string; label: string }) {
  return <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800"><Icon className="h-6 w-6 text-blue-600" /><div><strong className="block text-xl text-slate-800 dark:text-white">{value}</strong><span className="text-xs text-slate-500">{label}</span></div></div>;
}
