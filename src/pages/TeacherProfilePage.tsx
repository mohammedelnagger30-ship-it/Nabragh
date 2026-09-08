import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Star, Award, Mail, Phone, Globe, MapPin, Calendar, Video as VideoIcon,
  Play, ArrowRight, FileText, Loader2, MessageSquare, BookOpen, Bell, BellOff
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import type { Profile, Video, Review, Course } from '@/types';

export default function TeacherProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [teacher, setTeacher] = useState<Profile | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [avgRating, setAvgRating] = useState(0);
  const [loading, setLoading] = useState(true);
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data: teacherData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      setTeacher(teacherData as Profile | null);

      const { data: vidData } = await supabase
        .from('videos')
        .select('*, category:categories(*)')
        .eq('teacher_id', id)
        .order('created_at', { ascending: false });
      setVideos(vidData as Video[] ?? []);

      const { data: courseData } = await supabase
        .from('courses')
        .select('*, category:categories(*)')
        .eq('teacher_id', id)
        .order('created_at', { ascending: false });
      setCourses(courseData as Course[] ?? []);

      const { data: revData } = await supabase
        .from('reviews')
        .select('*, student:profiles!reviews_student_id_fkey(*)')
        .eq('teacher_id', id)
        .order('created_at', { ascending: false });
      const revList = revData as Review[] ?? [];
      setReviews(revList);
      if (revList.length > 0) {
        setAvgRating(revList.reduce((sum, r) => sum + r.rating, 0) / revList.length);
      }
      if (user && id && !profile?.is_teacher) {
        const { data: follow } = await supabase
          .from('teacher_follows')
          .select('id')
          .eq('student_id', user.id)
          .eq('teacher_id', id)
          .maybeSingle();
        setIsFollowing(!!follow);
      }
      setLoading(false);
    })();
  }, [id, profile?.is_teacher, user]);

  const toggleFollow = async () => {
    if (!user || !id) return;
    setFollowLoading(true);
    if (isFollowing) {
      const { error } = await supabase.from('teacher_follows').delete().eq('student_id', user.id).eq('teacher_id', id);
      if (!error) {
        setIsFollowing(false);
        toast('تم إلغاء متابعة المدرس', 'info');
      }
    } else {
      const { error } = await supabase.from('teacher_follows').insert({ student_id: user.id, teacher_id: id });
      if (!error) {
        setIsFollowing(true);
        toast('ستصلك تنبيهات عند نشر دروس جديدة', 'success');
      }
    }
    setFollowLoading(false);
  };

  const submitReview = async () => {
    if (!user || !profile || !id) return;
    setSubmitting(true);
    const { error } = await supabase.from('reviews').upsert({
      teacher_id: id,
      student_id: user.id,
      rating: reviewRating,
      comment: reviewText,
    });
    setSubmitting(false);
    if (!error) {
      setReviewText('');
      // Refresh reviews
      const { data: revData } = await supabase
        .from('reviews')
        .select('*, student:profiles!reviews_student_id_fkey(*)')
        .eq('teacher_id', id)
        .order('created_at', { ascending: false });
      const revList = revData as Review[] ?? [];
      setReviews(revList);
      if (revList.length > 0) setAvgRating(revList.reduce((s, r) => s + r.rating, 0) / revList.length);
    }
  };

  if (loading) {
    return (
      <div className="pt-[4.5rem] min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="pt-[4.5rem] min-h-screen flex flex-col items-center justify-center">
        <p className="text-slate-500 mb-4">المدرس غير موجود</p>
        <Link to="/teachers" className="text-blue-600 hover:underline">العودة للمدرسين</Link>
      </div>
    );
  }

  return (
    <div className="pt-[4.5rem] min-h-screen bg-gradient-to-br from-slate-50 to-white">
      {/* Cover */}
      <div className="h-48 bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-500 relative">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.05%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-30" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 relative">
        {/* Profile Header */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 mb-8">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <div className="w-32 h-32 rounded-2xl overflow-hidden bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center flex-shrink-0 ring-4 ring-white shadow-lg">
              {teacher.avatar_url ? (
                <img src={teacher.avatar_url} alt={teacher.full_name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-5xl font-bold text-blue-600">{teacher.full_name.charAt(0)}</span>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap mb-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">{teacher.full_name}</h1>
                <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">مدرس</span>
              </div>
              <p className="text-lg text-blue-600 mb-3">{teacher.specialization ?? 'مدرس'}</p>
              <div className="flex items-center gap-4 flex-wrap text-sm text-slate-500">
                {reviews.length > 0 ? (
                  <span className="flex items-center gap-1">
                    <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                    <span className="font-bold text-slate-700">{avgRating.toFixed(1)}</span>
                    <span>({reviews.length} تقييم)</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-slate-400">
                    <Star className="w-5 h-5" /> لا تقييمات بعد
                  </span>
                )}
                {teacher.years_experience > 0 && (
                  <span className="flex items-center gap-1">
                    <Award className="w-4 h-4" /> {teacher.years_experience} سنوات خبرة
                  </span>
                )}
                {teacher.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" /> {teacher.location}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <VideoIcon className="w-4 h-4" /> {videos.length} فيديو
                </span>
              </div>
              {user && !profile?.is_teacher && user.id !== teacher.id && (
                <button type="button" onClick={toggleFollow} disabled={followLoading} className={`mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${isFollowing ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-blue-600 text-white hover:bg-blue-700'} disabled:opacity-60`}>
                  {isFollowing ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                  {isFollowing ? 'إلغاء المتابعة' : 'متابعة المدرس'}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* About */}
            {teacher.bio && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-xl font-bold text-slate-800 mb-4">نبذة تعريفية</h2>
                <p className="text-slate-600 leading-relaxed whitespace-pre-line">{teacher.bio}</p>
              </div>
            )}

            {/* Videos */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-800">الدروس والفيديوهات</h2>
                <span className="text-sm text-slate-400">{videos.length} فيديو</span>
              </div>
              {videos.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                  <VideoIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">لا توجد فيديوهات بعد</p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                  {videos.map((video) => (
                    <Link
                      key={video.id}
                      to={`/video/${video.id}`}
                      className="group bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-lg hover:border-blue-200 transition-all"
                    >
                      <div className="aspect-video bg-gradient-to-br from-slate-100 to-slate-200 relative overflow-hidden">
                        {video.thumbnail_url ? (
                          <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-14 h-14 rounded-full bg-blue-600/80 flex items-center justify-center group-hover:scale-110 transition-transform">
                              <Play className="w-6 h-6 text-white fill-white" />
                            </div>
                          </div>
                        )}
                        {!video.thumbnail_url && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-14 h-14 rounded-full bg-blue-600/80 flex items-center justify-center group-hover:scale-110 transition-transform">
                              <Play className="w-6 h-6 text-white fill-white" />
                            </div>
                          </div>
                        )}
                        {video.is_free && (
                          <span className="absolute top-2 right-2 px-2 py-1 bg-emerald-500 text-white text-xs font-medium rounded-md">مجاني</span>
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="font-bold text-slate-800 mb-1 line-clamp-1 group-hover:text-blue-600 transition-colors">{video.title}</h3>
                        {video.description && (
                          <p className="text-sm text-slate-500 line-clamp-2 mb-2">{video.description}</p>
                        )}
                        <div className="flex items-center gap-3 text-xs text-slate-400">
                          <span className="flex items-center gap-1">
                            <Play className="w-3 h-3" /> {video.views_count} مشاهدة
                          </span>
                          {video.category && (
                            <span className="px-2 py-0.5 bg-slate-100 rounded-md">{video.category.name_ar}</span>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Courses */}
            {courses.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-slate-800 mb-4">الدورات</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {courses.map((course) => (
                    <Link
                      key={course.id}
                      to={`/course/${course.id}`}
                      className="group bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-lg hover:border-blue-200 transition-all"
                    >
                      <div className="aspect-video bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center relative">
                        {course.thumbnail_url ? (
                          <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
                        ) : (
                          <BookOpen className="w-10 h-10 text-blue-300" />
                        )}
                        <span className={`absolute top-2 right-2 px-2 py-0.5 text-xs rounded-md ${
                          course.level === 'beginner' ? 'bg-green-100 text-green-700' :
                          course.level === 'intermediate' ? 'bg-amber-100 text-amber-700' :
                          'bg-rose-100 text-rose-700'
                        }`}>
                          {course.level === 'beginner' ? 'مبتدئ' : course.level === 'intermediate' ? 'متوسط' : 'متقدم'}
                        </span>
                      </div>
                      <div className="p-4">
                        <h3 className="font-bold text-slate-800 mb-1 line-clamp-1 group-hover:text-blue-600 transition-colors">{course.title}</h3>
                        {course.description && (
                          <p className="text-sm text-slate-500 line-clamp-2 mb-2">{course.description}</p>
                        )}
                        <span className="text-sm font-medium text-blue-600">
                          {course.price === 0 ? 'مجاني' : `${course.price} ر.س`}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-800">التقييمات والمراجعات</h2>
                {reviews.length > 0 && (
                  <span className="flex items-center gap-1 text-sm">
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                    <span className="font-bold text-slate-700">{avgRating.toFixed(1)}</span>
                    <span className="text-slate-400">({reviews.length})</span>
                  </span>
                )}
              </div>

              {/* Add Review */}
              {user && profile && !profile.is_teacher && (
                <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-4">
                  <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-blue-500" /> أضف تقييمك
                  </h3>
                  <div className="flex items-center gap-1 mb-3">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setReviewRating(star)}
                        className="transition-transform hover:scale-110"
                      >
                        <Star className={`w-6 h-6 ${star <= reviewRating ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}`} />
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    placeholder="اكتب مراجعتك..."
                    rows={3}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors resize-none"
                  />
                  <button
                    onClick={submitReview}
                    disabled={submitting}
                    className="mt-3 px-6 py-2 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-60 flex items-center gap-2"
                  >
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    نشر التقييم
                  </button>
                </div>
              )}

              {reviews.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
                  <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500">لا توجد تقييمات بعد. كن أول من يقيّم هذا المدرس!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reviews.map((review) => (
                    <div key={review.id} className="bg-white rounded-2xl border border-slate-200 p-5">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-bold text-blue-600">
                            {review.student?.full_name?.charAt(0) ?? 'ط'}
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-bold text-slate-700">{review.student?.full_name ?? 'طالب'}</h4>
                            <div className="flex items-center gap-0.5">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star key={s} className={`w-4 h-4 ${s <= review.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />
                              ))}
                            </div>
                          </div>
                          <p className="text-slate-600 text-sm leading-relaxed">{review.comment}</p>
                          <p className="text-xs text-slate-400 mt-2">
                            {new Date(review.created_at).toLocaleDateString('ar-EG')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar - CV & Contact */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-500" /> السيرة الذاتية
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2 text-slate-600">
                  <Award className="w-4 h-4 text-slate-400" />
                  <span>الخبرة: {teacher.years_experience} سنوات</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span>انضم في {new Date(teacher.created_at).toLocaleDateString('ar-EG')}</span>
                </div>
                {teacher.phone && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <span dir="ltr">{teacher.phone}</span>
                  </div>
                )}
                {teacher.email && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <span dir="ltr" className="truncate">{teacher.email}</span>
                  </div>
                )}
                {teacher.website && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Globe className="w-4 h-4 text-slate-400" />
                    <a href={teacher.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate" dir="ltr">{teacher.website}</a>
                  </div>
                )}
                {teacher.location && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <span>{teacher.location}</span>
                  </div>
                )}
              </div>
              {teacher.cv_url && (
                <a
                  href={teacher.cv_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 w-full px-4 py-2.5 bg-blue-50 text-blue-700 font-medium rounded-xl hover:bg-blue-100 transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  <FileText className="w-4 h-4" /> تحميل السيرة الذاتية
                </a>
              )}
            </div>

            <div className="bg-gradient-to-br from-blue-600 to-cyan-500 rounded-2xl p-6 text-white">
              <h3 className="font-bold text-lg mb-2">اشترك مع هذا المدرس</h3>
              <p className="text-blue-50 text-sm mb-4">احصل على وصول كامل لجميع الفيديوهات والمحتوى الحصري</p>
              <Link
                to="/pricing"
                className="w-full px-4 py-2.5 bg-white text-blue-600 font-semibold rounded-xl hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
              >
                عرض الباقات <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
