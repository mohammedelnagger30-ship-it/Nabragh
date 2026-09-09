import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { BookOpen, Play, Eye, Clock, Loader2, Lock, Award, BarChart3, Star } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import CourseQuiz from '@/components/CourseQuiz';
import CourseReviews from '@/components/CourseReviews';
import SocialShare from '@/components/SocialShare';
import MetaTags from '@/components/MetaTags';
import StructuredData, { generateCourseStructuredData } from '@/components/StructuredData';
import type { Course, Video, CourseEnrollment, Certificate } from '@/types';

export default function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [enrollment, setEnrollment] = useState<CourseEnrollment | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [issuing, setIssuing] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data: courseData } = await supabase
        .from('courses')
        .select('*, category:categories(*), teacher:profiles!courses_teacher_id_fkey(*)')
        .eq('id', id)
        .maybeSingle();
      setCourse(courseData as Course | null);

      const { data: vidData } = await supabase
        .from('videos')
        .select('*, category:categories(*)')
        .eq('course_id', id)
        .order('created_at', { ascending: true });
      setVideos(vidData as Video[] ?? []);

      if (user) {
        const [{ data: enrData }, { data: certData }] = await Promise.all([
          supabase.from('course_enrollments').select('*').eq('student_id', user.id).eq('course_id', id).maybeSingle(),
          supabase.from('certificates').select('*').eq('student_id', user.id).eq('course_id', id).maybeSingle(),
        ]);
        setEnrollment(enrData as CourseEnrollment | null);
        setCertificate(certData as Certificate | null);
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
    }
  };

  const issueCertificate = async () => {
    if (!user || !id || !enrollment) return;
    setIssuing(true);
    const number = `ILM-${id.slice(0, 6).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
    const { data, error } = await supabase.from('certificates').insert({
      student_id: user.id,
      course_id: id,
      certificate_number: number,
    }).select().single();
    setIssuing(false);
    if (!error && data) {
      setCertificate(data as Certificate);
      await supabase.from('course_enrollments').update({ status: 'completed', completed_at: new Date().toISOString(), progress_percent: 100 }).eq('id', enrollment.id);
      setEnrollment({ ...enrollment, status: 'completed', progress_percent: 100 });
    }
  };

  if (loading) {
    return <div className="pt-[4.5rem] min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;
  }

  if (!course) {
    return (
      <div className="pt-[4.5rem] min-h-screen flex flex-col items-center justify-center">
        <p className="text-slate-500 mb-4">الدورة غير موجودة</p>
        <Link to="/" className="text-blue-600 hover:underline">العودة للرئيسية</Link>
      </div>
    );
  }

  const levelLabels: Record<string, string> = { beginner: 'مبتدئ', intermediate: 'متوسط', advanced: 'متقدم' };
  const levelColors: Record<string, string> = {
    beginner: 'bg-green-50 text-green-600', intermediate: 'bg-amber-50 text-amber-600', advanced: 'bg-rose-50 text-rose-600',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white pt-[4.5rem] dark:from-slate-900 dark:to-slate-950">
      <MetaTags title={`${course.title} | منصة العلم`} description={course.description ?? 'دورة تدريبية على منصة العلم'} />
      <StructuredData data={generateCourseStructuredData(course)} />
      {/* Course Header */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center gap-2 text-sm text-slate-400 mb-4">
            <Link to="/" className="hover:text-white transition-colors">الرئيسية</Link>
            <span>/</span>
            <Link to="/teachers" className="hover:text-white transition-colors">الدورات</Link>
            <span>/</span>
            <span className="text-slate-300 truncate">{course.title}</span>
          </div>
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${levelColors[course.level]}`}>
                  {levelLabels[course.level]}
                </span>
                {course.category && (
                  <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-medium">{course.category.name_ar}</span>
                )}
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold mb-4">{course.title}</h1>
              {course.description && <p className="mb-4 text-lg leading-relaxed text-slate-300">{course.description}</p>}
              <SocialShare title={course.title} description={course.description ?? undefined} />
              {course.live_url && (
                <a href={course.live_url} target="_blank" rel="noreferrer" className="mt-4 inline-flex rounded-xl bg-cyan-500 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-cyan-400">دخول الحصة المباشرة</a>
              )}
              <div className="flex items-center gap-6 text-sm text-slate-400">
                <span className="flex items-center gap-1"><BookOpen className="w-4 h-4" /> {videos.length} درس</span>
                <span className="flex items-center gap-1"><Eye className="w-4 h-4" /> {videos.reduce((s, v) => s + v.views_count, 0)} مشاهدة</span>
                {course.teacher && (
                  <Link to={`/teacher/${course.teacher_id}`} className="flex items-center gap-2 hover:text-white transition-colors">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-cyan-300 flex items-center justify-center text-xs font-bold">
                      {course.teacher.full_name.charAt(0)}
                    </div>
                    {course.teacher.full_name}
                  </Link>
                )}
              </div>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              {enrollment ? (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-slate-300">تقدمك في الدورة</span>
                    <span className="text-2xl font-bold text-white">{enrollment.progress_percent}%</span>
                  </div>
                  <div className="h-3 bg-white/10 rounded-full overflow-hidden mb-4">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all" style={{ width: `${enrollment.progress_percent}%` }} />
                  </div>
                  <p className="text-sm text-slate-400 mb-4">
                    {enrollment.status === 'completed' ? 'أكملت هذه الدورة!' : 'استمر في التعلم!'}
                  </p>
                  {videos.length > 0 && (
                    <Link to={`/video/${videos[0].id}`}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-3 font-semibold text-white">
                      <Play className="h-5 w-5" /> {enrollment.progress_percent > 0 ? 'متابعة التعلم' : 'ابدأ الآن'}
                    </Link>
                  )}
                  {certificate ? (
                    <Link to={`/certificate/${certificate.id}`} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-amber-400/40 px-4 py-3 text-sm font-bold text-amber-300">عرض الشهادة</Link>
                  ) : (
                    <button type="button" onClick={() => void issueCertificate()} disabled={issuing} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-3 text-sm font-bold text-white hover:bg-white/20 disabled:opacity-60">
                      {issuing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Award className="h-4 w-4" />} إصدار شهادة الإتمام
                    </button>
                  )}
                </div>
              ) : (
                <div>
                  <p className="text-slate-300 text-sm mb-4">سجل في هذه الدورة للوصول الكامل لجميع الدروس وتتبع تقدمك</p>
                  <button onClick={enroll} disabled={enrolling || !user}
                    className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold rounded-xl hover:shadow-lg transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                    {enrolling ? <Loader2 className="w-5 h-5 animate-spin" /> : <BookOpen className="w-5 h-5" />}
                    {user ? 'التسجيل في الدورة' : 'سجل دخولك أولاً'}
                  </button>
                  {!user && <p className="text-xs text-slate-400 text-center mt-3"><Link to="/signin" className="text-blue-400 hover:underline">تسجيل الدخول</Link> أو <Link to="/signup" className="text-blue-400 hover:underline">إنشاء حساب</Link></p>}
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
            <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-500" /> محتوى الدورة
            </h2>
            {videos.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">لا توجد دروس في هذه الدورة بعد</p>
              </div>
            ) : (
              <div className="space-y-3">
                {videos.map((v, i) => {
                  const hasAccess = v.is_free || !!enrollment;
                  return (
                    <Link
                      key={v.id}
                      to={hasAccess ? `/video/${v.id}` : '#'}
                      className={`group flex items-center gap-4 bg-white rounded-2xl border border-slate-200 p-4 transition-all ${
                        hasAccess ? 'hover:shadow-lg hover:border-blue-200' : 'opacity-60 cursor-not-allowed'
                      }`}
                    >
                      <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                        {hasAccess ? (
                          v.is_free ? <Play className="w-5 h-5 text-blue-600" /> : <Play className="w-5 h-5 text-blue-600" />
                        ) : (
                          <Lock className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-400">{i + 1}.</span>
                          <h3 className="font-bold text-slate-800 line-clamp-1 group-hover:text-blue-600 transition-colors">{v.title}</h3>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                          <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {v.views_count}</span>
                          {v.duration_seconds > 0 && (
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {Math.floor(v.duration_seconds / 60)} دقيقة</span>
                          )}
                          {v.is_free && <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-md">مجاني</span>}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
            {enrollment && user && <div className="mt-8"><CourseQuiz courseId={course.id} studentId={user.id} /></div>}
            <div className="mt-10 pt-2 border-t border-slate-200 dark:border-slate-700">
              <h2 className="mb-6 text-xl font-bold text-slate-800 flex items-center gap-2 dark:text-white">
                <Star className="w-5 h-5 text-amber-400" /> تقييمات الدورة
              </h2>
              <CourseReviews courseId={course.id} />
            </div>
          </div>

          <div>
            <div className="bg-white rounded-2xl border border-slate-200 p-6 sticky top-20">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Award className="w-5 h-5 text-blue-500" /> معلومات الدورة
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">عدد الدروس</span>
                  <span className="font-bold text-slate-800">{videos.length}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">المستوى</span>
                  <span className="font-bold text-slate-800">{levelLabels[course.level]}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">المشاهدات</span>
                  <span className="font-bold text-slate-800">{videos.reduce((s, v) => s + v.views_count, 0)}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-slate-500">السعر</span>
                  <span className="font-bold text-slate-800">{course.price === 0 ? 'مجاني' : `${course.price} ر.س`}</span>
                </div>
              </div>
              {course.teacher && (
                <Link to={`/teacher/${course.teacher_id}`}
                  className="mt-4 flex items-center gap-3 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center">
                    <span className="text-sm font-bold text-blue-600">{course.teacher.full_name.charAt(0)}</span>
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">{course.teacher.full_name}</p>
                    <p className="text-xs text-slate-400">{course.teacher.specialization ?? 'مدرس'}</p>
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
