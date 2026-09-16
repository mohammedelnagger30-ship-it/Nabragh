import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { BookOpen, Play, Eye, Clock, Loader2, Lock, Award, BarChart3, Star, BadgeCheck, Loader, ShieldCheck } from 'lucide-react';
import { supabase, PROFILE_PUBLIC_COLUMNS, VIDEO_PUBLIC_COLUMNS } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import CourseQuiz from '@/components/CourseQuiz';
import CourseReviews from '@/components/CourseReviews';
import SocialShare from '@/components/SocialShare';
import MetaTags from '@/components/MetaTags';
import StructuredData from '@/components/StructuredData';
import { generateCourseStructuredData } from '@/components/structuredDataUtils';
import type { Course, Video, CourseEnrollment, Certificate, Subscription } from '@/types';
import { getEducationStageLabel } from '@/lib/education';

export default function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [course, setCourse] = useState<Course | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [enrollment, setEnrollment] = useState<CourseEnrollment | null>(null);
  const [courseSub, setCourseSub] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [requesting, setRequesting] = useState<'subscription' | 'purchase' | null>(null);
  const [certificate, setCertificate] = useState<Certificate | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data: courseData } = await supabase
        .from('courses')
        .select(`*, category:categories(*), teacher:profiles!courses_teacher_id_fkey(${PROFILE_PUBLIC_COLUMNS})`)
        .eq('id', id)
        .maybeSingle();
      setCourse(courseData as Course | null);

      const { data: vidData } = await supabase
        .from('videos')
        .select(`${VIDEO_PUBLIC_COLUMNS}, category:categories(*)`)
        .eq('course_id', id)
        .order('created_at', { ascending: true });
      setVideos(vidData as unknown as Video[] ?? []);

      if (user) {
        const [{ data: enrData }, { data: certData }, { data: subData }] = await Promise.all([
          supabase.from('course_enrollments').select('*').eq('student_id', user.id).eq('course_id', id).maybeSingle(),
          supabase.from('certificates').select('*').eq('student_id', user.id).eq('course_id', id).maybeSingle(),
          supabase.from('subscriptions').select('*').eq('student_id', user.id).eq('course_id', id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        ]);
        setEnrollment(enrData as CourseEnrollment | null);
        setCertificate(certData as Certificate | null);
        setCourseSub(subData as Subscription | null);
      }
      setLoading(false);
    })();
  }, [id, user]);

  const enroll = async () => {
    if (!user || !id) return;
    setEnrolling(true);
    const { data, error } = await supabase.from('course_enrollments').insert({
      student_id: user.id,
      course_id: id,
      status: 'active',
      progress_percent: 0,
    }).select().single();
    setEnrolling(false);
    if (!error && data) {
      setEnrollment(data as CourseEnrollment);
      toast('تم تسجيلك في الدورة', 'success');
    } else {
      toast('تعذر التسجيل في الدورة', 'error');
    }
  };

  const requestAccess = async (type: 'subscription' | 'purchase') => {
    if (!user || !id || !course) return;
    setRequesting(type);
    const teacherId = course.teacher_id;
    const endDate = type === 'subscription'
      ? new Date(Date.now() + Math.max(1, course.subscription_duration_months || 1) * 30 * 24 * 60 * 60 * 1000).toISOString()
      : null;
    const amount = type === 'purchase' ? course.price : course.subscription_price;
    const { data: subRow, error: subErr } = await supabase.from('subscriptions').insert({
      student_id: user.id,
      teacher_id: teacherId,
      course_id: id,
      access_type: type,
      status: 'pending',
      payment_status: 'pending',
      start_date: new Date().toISOString(),
      end_date: endDate,
      notes: type === 'purchase' ? 'شراء نهائي للدورة' : 'اشتراك دوري في الدورة',
    }).select().single();
    if (subErr || !subRow) {
      setRequesting(null);
      toast('تعذر إرسال الطلب', 'error');
      return;
    }
    const { data: paymentRow, error: paymentError } = await supabase.from('payments').insert({
      subscription_id: (subRow as Subscription).id,
      student_id: user.id,
      teacher_id: teacherId,
      amount,
      method: 'manual',
      status: 'pending',
      notes: `طلب وصول لدورة: ${course.title}`,
    }).select('id').single();
    if (paymentError || !paymentRow) {
      setRequesting(null);
      toast('تم إنشاء الطلب لكن تعذر تجهيز رابط الدفع', 'error');
      return;
    }

    const { data: paymentLink, error: linkError } = await supabase.functions.invoke('create-paymob-payment-link', {
      body: { paymentId: paymentRow.id },
    });
    setRequesting(null);
    setCourseSub(subRow as Subscription);
    if (linkError || !paymentLink?.paymentUrl) {
      toast('تم إنشاء الطلب لكن تعذر تجهيز رابط الدفع. تواصل مع الإدارة.', 'error');
      return;
    }
    window.location.assign(paymentLink.paymentUrl as string);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;
  }

  if (!course) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <p className="text-slate-500 dark:text-slate-400 mb-4">الدورة غير موجودة</p>
        <Link to="/" className="text-blue-600 hover:underline">العودة للرئيسية</Link>
      </div>
    );
  }

  const isFreeCourse = course.price === 0 && course.subscription_price === 0;
  const subIsActive = !!courseSub && courseSub.status === 'active' && courseSub.payment_status === 'paid'
    && (courseSub.end_date == null || new Date(courseSub.end_date).getTime() > Date.now());
  const hasFullAccess = isFreeCourse || !!enrollment || subIsActive;
  const hasPendingRequest = !!courseSub && courseSub.status === 'pending';

  const levelLabels: Record<string, string> = { beginner: 'مبتدئ', intermediate: 'متوسط', advanced: 'متقدم' };
  const levelColors: Record<string, string> = {
    beginner: 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    intermediate: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
    advanced: 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-950">
      <MetaTags title={`${course.title} | منصة العلم`} description={course.description ?? 'دورة تدريبية على منصة العلم'} />
      <StructuredData data={generateCourseStructuredData(course)} />
      {/* Course Header */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 mb-3 sm:mb-4 sm:text-sm">
            <Link to="/" className="hover:text-white transition-colors">الرئيسية</Link>
            <span>/</span>
            <Link to="/teachers" className="hover:text-white transition-colors">الدورات</Link>
            <span>/</span>
            <span className="text-slate-300 dark:text-slate-600 truncate">{course.title}</span>
          </div>
          <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
            <div className="lg:col-span-2">
              <div className="flex flex-wrap items-center gap-2 mb-3 sm:mb-4">
                {course.education_stage && (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-medium sm:px-3 sm:py-1 sm:text-xs bg-blue-500/20 text-blue-300 border border-blue-400/30">
                    {getEducationStageLabel(course.education_stage)}
                  </span>
                )}
                {course.category && (
                  <span className="px-2.5 py-1 bg-white/10 rounded-full text-[10px] font-medium sm:px-3 sm:py-1 sm:text-xs">{course.category.name_ar}</span>
                )}
              </div>
              <h1 className="text-2xl font-bold mb-3 sm:text-3xl sm:mb-4">{course.title}</h1>
              {course.description && <p className="mb-4 text-sm leading-relaxed text-slate-300 dark:text-slate-600 sm:text-base sm:leading-7 sm:text-lg">{course.description}</p>}
              <SocialShare title={course.title} description={course.description ?? undefined} />
              {course.live_url && (
                <a href={course.live_url} target="_blank" rel="noreferrer" className="mt-4 inline-flex rounded-xl bg-cyan-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-400 sm:text-sm">دخول الحصة المباشرة</a>
              )}
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 dark:text-slate-500 sm:gap-6 sm:text-sm">
                <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> {videos.length} درس</span>
                <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> {videos.reduce((s, v) => s + v.views_count, 0)} مشاهدة</span>
                {course.teacher && (
                  <Link to={`/teacher/${course.teacher_id}`} className="flex items-center gap-2 hover:text-white transition-colors">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-cyan-300 flex items-center justify-center text-[10px] font-bold sm:w-8 sm:h-8 sm:text-xs">
                      {course.teacher.full_name.charAt(0)}
                    </div>
                    <span className="truncate max-w-[120px] sm:max-w-none">{course.teacher.full_name}</span>
                  </Link>
                )}
              </div>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-white/10">
              {hasFullAccess ? (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-slate-300 dark:text-slate-600">تقدمك في الدورة</span>
                    <span className="text-2xl font-bold text-white">{enrollment?.progress_percent ?? 0}%</span>
                  </div>
                  <div className="h-3 bg-white/10 rounded-full overflow-hidden mb-4">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all" style={{ width: `${enrollment?.progress_percent ?? 0}%` }} />
                  </div>
                  <p className="text-sm text-slate-400 dark:text-slate-500 mb-4">
                    {enrollment?.status === 'completed' ? 'أكملت هذه الدورة!' : subIsActive ? 'لديك وصول كامل — استمر في التعلم!' : 'استمر في التعلم!'}
                  </p>
                  {videos.length > 0 && (
                    <Link to={`/video/${videos[0].id}`}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-3 font-semibold text-white">
                      <Play className="h-5 w-5" /> {enrollment && enrollment.progress_percent > 0 ? 'متابعة التعلم' : 'ابدأ الآن'}
                    </Link>
                  )}
                  {!enrollment && (
                    <button onClick={enroll} disabled={enrolling}
                      className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-white/20 px-4 py-3 text-sm font-bold text-white hover:bg-white/10 transition-colors">
                      {enrolling ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookOpen className="w-4 h-4" />} تسجيل في الدورة لمتابعة تقدمك
                    </button>
                  )}
                  {certificate ? (
                    <Link to={`/certificate/${certificate.id}`} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-amber-400/40 px-4 py-3 text-sm font-bold text-amber-300">عرض الشهادة</Link>
                  ) : (
                    <p className="mt-3 rounded-xl bg-white/10 px-4 py-3 text-center text-xs text-slate-300">ستصدر الشهادة تلقائيًا بعد إكمال الدورة واجتياز الاختبار</p>
                  )}
                </div>
              ) : hasPendingRequest ? (
                <div className="text-center">
                  <Loader className="w-10 h-10 text-amber-300 mx-auto mb-3" />
                  <h3 className="text-lg font-bold text-white mb-2">طلبك قيد الاعتماد</h3>
                  <p className="text-sm text-slate-300 dark:text-slate-500 leading-relaxed">
                    {courseSub?.access_type === 'purchase' ? 'طلب الشراء النهائي' : 'طلب الاشتراك'} أُرسل بنجاح.
                    <br />سيُفتح لك الوصول فور اعتماد الإدارة أو المدرس للدفع.
                  </p>
                  <Link to="/dashboard?tab=subscriptions" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white/10 border border-white/20 px-4 py-2.5 text-sm font-bold text-white hover:bg-white/20 transition-colors">
                    متابعة طلباتي
                  </Link>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                    <h3 className="text-lg font-bold text-white">الوصول إلى الدورة</h3>
                  </div>
                  <p className="text-sm text-slate-300 dark:text-slate-500 mb-4 leading-relaxed">
                    الفيديوهات المجانية متاحة للجميع، والفيديوهات المحمية تُفتح بعد دفع الاشتراك واعتماده.
                  </p>
                  {course.subscription_price > 0 && (
                    <button onClick={() => requestAccess('subscription')} disabled={requesting !== null || !user}
                      className="mb-3 w-full rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-3 font-semibold text-white hover:shadow-lg transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                      {requesting === 'subscription' ? <Loader2 className="w-5 h-5 animate-spin" /> : <BookOpen className="w-5 h-5" />}
                      اشترك شهريًا — {course.subscription_price} جنيه
                    </button>
                  )}
                  {course.price > 0 && (
                    <button onClick={() => requestAccess('purchase')} disabled={requesting !== null || !user}
                      className="mb-3 w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3 font-semibold text-white hover:shadow-lg transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                      {requesting === 'purchase' ? <Loader2 className="w-5 h-5 animate-spin" /> : <BadgeCheck className="w-5 h-5" />}
                      شراء الدورة نهائيًا — {course.price} جنيه
                    </button>
                  )}
                  {!user ? (
                    <p className="text-xs text-slate-400 dark:text-slate-500 text-center"><Link to="/signin" className="text-blue-400 hover:underline">تسجيل الدخول</Link> أو <Link to="/signup" className="text-blue-400 hover:underline">إنشاء حساب</Link> أولاً</p>
                  ) : (
                    <p className="text-xs text-slate-400 dark:text-slate-500 text-center">بعد إرسال الطلب، ينتظر اعتماد الإدارة أو المدرس لفتح المحتوى.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Course Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-500" /> محتوى الدورة
            </h2>
            {videos.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center">
                <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-slate-500 dark:text-slate-400">لا توجد دروس في هذه الدورة بعد</p>
              </div>
            ) : (
              <div className="space-y-3">
                {videos.map((v, i) => {
                  const hasAccess = v.is_free || hasFullAccess;
                  return (
                    <Link
                      key={v.id}
                      to={hasAccess ? `/video/${v.id}` : '#'}
                      className={`group flex items-center gap-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 transition-all ${
                        hasAccess ? 'hover:shadow-lg hover:border-blue-200 dark:hover:border-blue-500/50' : 'opacity-60 cursor-not-allowed'
                      }`}
                    >
                      <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                        {hasAccess ? (
                          <Play className="w-5 h-5 text-blue-600" />
                        ) : (
                          <Lock className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-400 dark:text-slate-500">{i + 1}.</span>
                          <h3 className="font-bold text-slate-800 dark:text-slate-100 line-clamp-1 group-hover:text-blue-600 transition-colors">{v.title}</h3>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500 mt-1">
                          <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {v.views_count}</span>
                          {v.duration_seconds > 0 && (
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {Math.floor(v.duration_seconds / 60)} دقيقة</span>
                          )}
                          {v.is_free && <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300 rounded-md">مجاني</span>}
                          {!v.is_free && !hasAccess && <span className="px-2 py-0.5 bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300 rounded-md flex items-center gap-1">مقفول — اشترك</span>}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
            {enrollment && user && <div className="mt-8"><CourseQuiz courseId={course.id} /></div>}
            <div className="mt-10 pt-2 border-t border-slate-200 dark:border-slate-700">
              <h2 className="mb-6 text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-400" /> تقييمات الدورة
              </h2>
              <CourseReviews courseId={course.id} />
            </div>
          </div>

          <div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 sticky top-20">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                <Award className="w-5 h-5 text-blue-500" /> معلومات الدورة
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700">
                  <span className="text-slate-500 dark:text-slate-400">عدد الدروس</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">{videos.length}</span>
                </div>
                {course.education_stage && (
                  <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700">
                    <span className="text-slate-500 dark:text-slate-400">المرحلة الدراسية</span>
                    <span className="font-bold text-slate-800 dark:text-slate-100">{getEducationStageLabel(course.education_stage)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700">
                  <span className="text-slate-500 dark:text-slate-400">المشاهدات</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">{videos.reduce((s, v) => s + v.views_count, 0)}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-slate-500 dark:text-slate-400">السعر</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">
                    {isFreeCourse
                      ? 'مجانية'
                      : [course.subscription_price > 0 && `${course.subscription_price} جنيه/شهر`, course.price > 0 && `${course.price} جنيه`].filter(Boolean).join(' • ')}
                  </span>
                </div>
              </div>
              {course.teacher && (
                <Link to={`/teacher/${course.teacher_id}`}
                  className="mt-4 flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center">
                    <span className="text-sm font-bold text-blue-600">{course.teacher.full_name.charAt(0)}</span>
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 dark:text-slate-100 text-sm">{course.teacher.full_name}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">{course.teacher.specialization ?? 'مدرس'}</p>
                  </div>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
