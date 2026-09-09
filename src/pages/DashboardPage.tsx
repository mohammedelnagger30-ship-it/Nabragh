import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, User, Video as VideoIcon, Upload, Eye, Trash2,
  Plus, Save, Loader2, FileText, Calendar, Crown, Play, BookOpen,
  TrendingUp, Heart, Clock, Award, Bell,
  BarChart3, FolderPlus, Settings, Palette, Medal, Users as UsersIcon
  , Gamepad2, ListPlus
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { uploadFile } from '@/lib/storage';
import { curricula, educationStages } from '@/lib/education';
import { TeacherPageSettings as TeacherPageSettingsPanel, TeacherStudents, TeacherHonors, TeacherLeaderboards } from '@/components/TeacherManagerTools';
import type { Video, Subscription, Category, Course, CourseEnrollment, Favorite, WatchHistoryItem, Notification, Competition, CompetitionQuestion } from '@/types';

type Tab = 'overview' | 'profile' | 'videos' | 'courses' | 'competitions' | 'page' | 'students' | 'honors' | 'subscriptions' | 'favorites' | 'history' | 'notifications';

export default function DashboardPage() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [videos, setVideos] = useState<Video[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [enrollments, setEnrollments] = useState<CourseEnrollment[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [history, setHistory] = useState<WatchHistoryItem[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [showVideoForm, setShowVideoForm] = useState(false);
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Profile form state
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [yearsExp, setYearsExp] = useState(0);
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [website, setWebsite] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [cvUrl, setCvUrl] = useState('');
  const [profileStage, setProfileStage] = useState('');
  const [profileCurriculum, setProfileCurriculum] = useState('');

  // Video form state
  const [videoTitle, setVideoTitle] = useState('');
  const [videoDesc, setVideoDesc] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoThumb, setVideoThumb] = useState('');
  const [videoCategory, setVideoCategory] = useState<string | null>(null);
  const [videoCourse, setVideoCourse] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoIsFree, setVideoIsFree] = useState(true);
  const [videoStage, setVideoStage] = useState('');
  const [videoCurriculum, setVideoCurriculum] = useState('');

  // Course form state
  const [courseTitle, setCourseTitle] = useState('');
  const [courseDesc, setCourseDesc] = useState('');
  const [courseCategory, setCourseCategory] = useState<string | null>(null);
  const [courseLevel, setCourseLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [coursePrice, setCoursePrice] = useState(0);
  const [courseThumb, setCourseThumb] = useState('');
  const [courseStage, setCourseStage] = useState('');
  const [courseCurriculum, setCourseCurriculum] = useState('');

  useEffect(() => {
    if (!loading && !user) navigate('/signin');
  }, [user, loading, navigate]);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? '');
      setBio(profile.bio ?? '');
      setSpecialization(profile.specialization ?? '');
      setYearsExp(profile.years_experience ?? 0);
      setPhone(profile.phone ?? '');
      setLocation(profile.location ?? '');
      setWebsite(profile.website ?? '');
      setAvatarUrl(profile.avatar_url ?? '');
      setCvUrl(profile.cv_url ?? '');
      setProfileStage(profile.education_stage ?? profile.teaching_stages?.[0] ?? '');
      setProfileCurriculum(profile.curriculum ?? profile.teaching_curricula?.[0] ?? '');
    }
  }, [profile]);

  const fetchDashboardData = useCallback(async () => {
    if (!user) return;
    const { data: catData } = await supabase.from('categories').select('*').order('sort_order', { ascending: true });
    setCategories(catData as Category[] ?? []);

    if (profile?.is_teacher) {
      const { data: vidData } = await supabase
        .from('videos')
        .select('*, category:categories(*), course:courses(*)')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false });
      setVideos(vidData as Video[] ?? []);

      const { data: courseData } = await supabase
        .from('courses')
        .select('*, category:categories(*)')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false });
      setCourses(courseData as Course[] ?? []);

      const { count } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('teacher_id', user.id)
        .eq('status', 'active');
      setSubscriberCount(count ?? 0);
    }

    // Subscriptions
    const { data: subData } = await supabase
      .from('subscriptions')
      .select('*, teacher:profiles!subscriptions_teacher_id_fkey(*), plan:subscription_plans(*)')
      .eq('student_id', user.id)
      .order('created_at', { ascending: false });
    setSubscriptions(subData as Subscription[] ?? []);

    // Enrollments
    const { data: enrollData } = await supabase
      .from('course_enrollments')
      .select('*, course:courses(*, category:categories(*))')
      .eq('student_id', user.id)
      .order('enrolled_at', { ascending: false });
    setEnrollments(enrollData as CourseEnrollment[] ?? []);

    // Favorites
    const { data: favData } = await supabase
      .from('favorites')
      .select('*, video:videos(*, category:categories(*), teacher:profiles!videos_teacher_id_fkey(*))')
      .eq('student_id', user.id)
      .order('created_at', { ascending: false });
    setFavorites(favData as Favorite[] ?? []);

    // Watch history
    const { data: histData } = await supabase
      .from('watch_history')
      .select('*, video:videos(*, category:categories(*), teacher:profiles!videos_teacher_id_fkey(*))')
      .eq('student_id', user.id)
      .order('watched_at', { ascending: false })
      .limit(20);
    setHistory(histData as WatchHistoryItem[] ?? []);

    const { data: notificationData } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30);
    setNotifications(notificationData as Notification[] ?? []);
  }, [user, profile]);

  useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);

  const saveProfile = async () => {
    setSaving(true);
    const { error } = await supabase.from('profiles').update({
      full_name: fullName, bio, specialization, years_experience: yearsExp,
      phone, location, website, avatar_url: avatarUrl, cv_url: cvUrl,
      education_stage: profile?.is_teacher ? null : profileStage || null,
      curriculum: profile?.is_teacher ? null : profileCurriculum || null,
      teaching_stages: profile?.is_teacher && profileStage ? [profileStage] : [],
      teaching_curricula: profile?.is_teacher && profileCurriculum ? [profileCurriculum] : [],
      updated_at: new Date().toISOString(),
    }).eq('id', user!.id);
    setSaving(false);
    if (!error) {
      await refreshProfile();
      toast('تم حفظ التغييرات بنجاح', 'success');
    } else {
      toast('حدث خطأ أثناء الحفظ', 'error');
    }
  };

  const handleVideoUpload = async () => {
    if (!user || !videoTitle || !videoFile) return;
    setSaving(true);
    setUploadProgress(0);

    const videoUrl = await uploadFile('videos', videoFile, user.id, setUploadProgress);
    if (!videoUrl) {
      setSaving(false);
      setUploadProgress(0);
      toast('فشل رفع الفيديو. حاول مرة أخرى', 'error');
      return;
    }

    const { error } = await supabase.from('videos').insert({
      teacher_id: user.id,
      title: videoTitle,
      description: videoDesc,
      video_url: videoUrl,
      thumbnail_url: videoThumb || null,
      category_id: videoCategory || null,
      course_id: videoCourse || null,
      duration_seconds: videoDuration,
      is_free: videoIsFree,
      education_stage: videoStage || null,
      curriculum: videoCurriculum || null,
    });

    setSaving(false);
    setUploadProgress(0);

    if (!error) {
      setShowVideoForm(false);
      setVideoTitle(''); setVideoDesc(''); setVideoFile(null); setVideoThumb('');
      setVideoCategory(null); setVideoCourse(null); setVideoDuration(0); setVideoIsFree(true); setVideoStage(''); setVideoCurriculum('');
      fetchDashboardData();
      toast('تم رفع الفيديو بنجاح', 'success');
    } else {
      toast('حدث خطأ أثناء رفع الفيديو', 'error');
    }
  };

  const handleCourseCreate = async () => {
    if (!user || !courseTitle) return;
    setSaving(true);
    const { error } = await supabase.from('courses').insert({
      teacher_id: user.id,
      title: courseTitle,
      description: courseDesc,
      category_id: courseCategory || null,
      level: courseLevel,
      price: coursePrice,
      thumbnail_url: courseThumb || null,
      education_stage: courseStage || null,
      curriculum: courseCurriculum || null,
    });
    setSaving(false);
    if (!error) {
      setShowCourseForm(false);
      setCourseTitle(''); setCourseDesc(''); setCourseCategory(null);
      setCourseLevel('beginner'); setCoursePrice(0); setCourseThumb(''); setCourseStage(''); setCourseCurriculum('');
      fetchDashboardData();
      toast('تم إنشاء الدورة بنجاح', 'success');
    } else {
      toast('حدث خطأ أثناء إنشاء الدورة', 'error');
    }
  };

  const deleteVideo = async (vidId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الفيديو؟')) return;
    await supabase.from('videos').delete().eq('id', vidId);
    setVideos(videos.filter(v => v.id !== vidId));
    toast('تم حذف الفيديو', 'info');
  };

  const deleteCourse = async (courseId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الدورة؟ سيتم حذف جميع الفيديوهات المرتبطة بها.')) return;
    await supabase.from('courses').delete().eq('id', courseId);
    setCourses(courses.filter(c => c.id !== courseId));
    toast('تم حذف الدورة', 'info');
  };

  const handleAvatarUpload = async (file: File) => {
    if (!user) return;
    const url = await uploadFile('avatars', file, user.id);
    if (url) {
      setAvatarUrl(url);
      toast('تم رفع الصورة الشخصية', 'success');
    }
  };

  const handleCvUpload = async (file: File) => {
    if (!user) return;
    const url = await uploadFile('cvs', file, user.id);
    if (url) {
      setCvUrl(url);
      toast('تم رفع السيرة الذاتية', 'success');
    }
  };

  if (loading) {
    return (
      <div className="pt-[4.5rem] min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!profile) return null;

  const totalViews = videos.reduce((sum, v) => sum + v.views_count, 0);
  const activeEnrollments = enrollments.filter(e => e.status === 'active').length;
  const completedCourses = enrollments.filter(e => e.status === 'completed').length;

  const teacherTabs: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
    { id: 'overview', label: 'نظرة عامة', icon: LayoutDashboard },
    { id: 'profile', label: 'الملف الشخصي', icon: User },
    { id: 'videos', label: 'الفيديوهات', icon: VideoIcon },
    { id: 'courses', label: 'الدورات', icon: BookOpen },
    { id: 'competitions', label: 'المنافسات', icon: Gamepad2 },
    ...(profile.is_manager ? [
      { id: 'page' as Tab, label: 'إعدادات صفحتي', icon: Palette },
      { id: 'students' as Tab, label: 'طلابي', icon: UsersIcon },
      { id: 'honors' as Tab, label: 'التكريم', icon: Medal },
    ] : []),
  ];

  const studentTabs: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
    { id: 'overview', label: 'نظرة عامة', icon: LayoutDashboard },
    { id: 'profile', label: 'الملف الشخصي', icon: User },
    { id: 'subscriptions', label: 'اشتراكاتي', icon: Crown },
    { id: 'favorites', label: 'المفضلة', icon: Heart },
    { id: 'history', label: 'سجل المشاهدة', icon: Clock },
    { id: 'notifications', label: 'الإشعارات', icon: Bell },
  ];

  const tabs = profile.is_teacher ? teacherTabs : studentTabs;

  return (
    <div className="pt-[4.5rem] min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800">لوحة التحكم</h1>
          <p className="text-slate-500 mt-1">
            مرحباً، {profile.full_name} — {profile.is_teacher ? 'مدرس' : 'طالب'}
          </p>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sticky top-20">
              <div className="flex items-center gap-3 mb-6 p-2">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white text-lg font-bold overflow-hidden">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
                  ) : (
                    profile.full_name.charAt(0)
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-slate-800 text-sm truncate">{profile.full_name}</p>
                  <p className="text-xs text-slate-400 truncate">{profile.email}</p>
                </div>
              </div>
              <nav className="space-y-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      activeTab === tab.id ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-3">
                  {profile.is_teacher ? (
                    <>
                      <StatCard icon={VideoIcon} label="الفيديوهات" value={videos.length} color="blue" />
                      <StatCard icon={Eye} label="إجمالي المشاهدات" value={totalViews} color="cyan" />
                      <StatCard icon={BookOpen} label="الدورات" value={courses.length} color="emerald" />
                      <StatCard icon={Crown} label="المشتركون النشطون" value={subscriberCount} color="amber" />
                    </>
                  ) : (
                    <>
                      <StatCard icon={Crown} label="الاشتراكات النشطة" value={subscriptions.filter(s => s.status === 'active').length} color="blue" />
                      <StatCard icon={BookOpen} label="الدورات المسجلة" value={activeEnrollments} color="cyan" />
                      <StatCard icon={Award} label="دورات مكتملة" value={completedCourses} color="emerald" />
                    </>
                  )}
                </div>

                {/* Recent activity */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-500" />
                    {profile.is_teacher ? 'أحدث الفيديوهات' : 'آخر ما شاهدته'}
                  </h3>
                  {profile.is_teacher ? (
                    videos.length === 0 ? (
                      <EmptyState icon={VideoIcon} text="لم ترفع أي فيديو بعد" action={
                        <button onClick={() => setActiveTab('videos')} className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors">ارفع أول فيديو</button>
                      } />
                    ) : (
                      <div className="space-y-3">
                        {videos.slice(0, 5).map((v) => (
                          <Link key={v.id} to={`/video/${v.id}`} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                            <div className="w-16 aspect-video rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                              <Play className="w-5 h-5 text-slate-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-slate-800 text-sm line-clamp-1">{v.title}</p>
                              <p className="text-xs text-slate-400">{v.views_count} مشاهدة</p>
                            </div>
                            <span className={`px-2 py-0.5 text-xs rounded-md ${v.is_free ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                              {v.is_free ? 'مجاني' : 'مدفوع'}
                            </span>
                          </Link>
                        ))}
                      </div>
                    )
                  ) : history.length === 0 ? (
                    <EmptyState icon={Play} text="لم تشاهد أي فيديو بعد" action={
                      <Link to="/teachers" className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors">تصفح المدرسين</Link>
                    } />
                  ) : (
                    <div className="space-y-3">
                      {history.slice(0, 5).map((h) => (
                        <Link key={h.id} to={`/video/${h.video_id}`} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                          <div className="w-16 aspect-video rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                            <Play className="w-5 h-5 text-slate-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-800 text-sm line-clamp-1">{h.video?.title ?? 'فيديو'}</p>
                            <p className="text-xs text-slate-400">{h.video?.teacher?.full_name ?? ''}</p>
                          </div>
                          <span className="text-xs text-slate-400">{new Date(h.watched_at).toLocaleDateString('ar-EG')}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                {/* Enrollments progress (students) */}
                {!profile.is_teacher && enrollments.length > 0 && (
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-blue-500" /> تقدم الدورات
                    </h3>
                    <div className="space-y-4">
                      {enrollments.slice(0, 5).map((enr) => (
                        <div key={enr.id}>
                          <div className="flex items-center justify-between mb-1.5">
                            <Link to={`/course/${enr.course_id}`} className="text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors line-clamp-1">
                              {enr.course?.title ?? 'دورة'}
                            </Link>
                            <span className="text-sm font-bold text-slate-600">{enr.progress_percent}%</span>
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${enr.status === 'completed' ? 'bg-emerald-500' : 'bg-gradient-to-r from-blue-600 to-cyan-500'}`}
                              style={{ width: `${enr.progress_percent}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'notifications' && !profile.is_teacher && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <h3 className="flex items-center gap-2 font-bold text-slate-800"><Bell className="h-5 w-5 text-blue-500" /> الإشعارات</h3>
                  {notifications.some((notification) => !notification.is_read) && (
                    <button type="button" onClick={async () => {
                      await supabase.from('notifications').update({ is_read: true }).eq('user_id', user!.id).eq('is_read', false);
                      setNotifications((items) => items.map((item) => ({ ...item, is_read: true })));
                    }} className="text-xs font-semibold text-blue-600 hover:text-blue-700">تحديد الكل كمقروء</button>
                  )}
                </div>
                {notifications.length === 0 ? (
                  <div className="py-12 text-center text-sm text-slate-500">لا توجد إشعارات جديدة.</div>
                ) : (
                  <div className="space-y-2">
                    {notifications.map((notification) => (
                      <Link key={notification.id} to={notification.link ?? '#'} onClick={() => {
                        if (!notification.is_read) {
                          supabase.from('notifications').update({ is_read: true }).eq('id', notification.id);
                          setNotifications((items) => items.map((item) => item.id === notification.id ? { ...item, is_read: true } : item));
                        }
                      }} className={`block rounded-xl border p-4 transition hover:border-blue-200 ${notification.is_read ? 'border-slate-100 bg-white' : 'border-blue-100 bg-blue-50/50'}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div><p className="font-semibold text-slate-800">{notification.title}</p>{notification.body && <p className="mt-1 text-sm leading-6 text-slate-500">{notification.body}</p>}</div>
                          <span className="shrink-0 text-xs text-slate-400">{new Date(notification.created_at).toLocaleDateString('ar-EG')}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'profile' && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-blue-500" /> تعديل الملف الشخصي
                </h3>
                <div className="grid sm:grid-cols-2 gap-5">
                  <Field label="الاسم الكامل" value={fullName} onChange={setFullName} />
                  <Field label="التخصص" value={specialization} onChange={setSpecialization} placeholder="مثال: مدرس رياضيات" />
                  <div><label className="block text-sm font-medium text-slate-700 mb-1.5">{profile.is_teacher ? 'الصف الذي تدرّسه' : 'الصف الدراسي'}</label><select value={profileStage} onChange={(e) => setProfileStage(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700"><option value="">كل المراحل</option>{educationStages.map((stage) => <option key={stage.value} value={stage.value}>{stage.label}</option>)}</select></div>
                  <div><label className="block text-sm font-medium text-slate-700 mb-1.5">{profile.is_teacher ? 'المنهج الذي تدرّسه' : 'نوع المنهج'}</label><select value={profileCurriculum} onChange={(e) => setProfileCurriculum(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700"><option value="">كل المناهج</option>{curricula.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
                  <Field label="الهاتف" value={phone} onChange={setPhone} placeholder="+966..." dir="ltr" />
                  <Field label="الموقع" value={location} onChange={setLocation} placeholder="الرياض، السعودية" />
                  <Field label="الموقع الإلكتروني" value={website} onChange={setWebsite} placeholder="https://..." dir="ltr" />
                  <Field label="سنوات الخبرة" value={String(yearsExp)} onChange={(v) => setYearsExp(parseInt(v) || 0)} type="number" />
                </div>

                {/* Avatar upload */}
                <div className="mt-5">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">الصورة الشخصية</label>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center overflow-hidden">
                      {avatarUrl ? <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" /> : <User className="w-6 h-6 text-blue-400" />}
                    </div>
                    <label className="px-4 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-200 transition-colors cursor-pointer flex items-center gap-2">
                      <Upload className="w-4 h-4" /> رفع صورة
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAvatarUpload(f); }} />
                    </label>
                  </div>
                </div>

                {/* CV upload */}
                <div className="mt-5">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">السيرة الذاتية (CV)</label>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-500 truncate">
                      {cvUrl ? 'تم رفع السيرة الذاتية' : 'لم يتم رفع سيرة ذاتية بعد'}
                    </div>
                    <label className="px-4 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-200 transition-colors cursor-pointer flex items-center gap-2">
                      <FileText className="w-4 h-4" /> رفع CV
                      <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCvUpload(f); }} />
                    </label>
                  </div>
                </div>

                <div className="mt-5">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">نبذة تعريفية</label>
                  <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} placeholder="اكتب نبذة عنك وعن خبرتك في التدريس..."
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors resize-none" />
                </div>

                <button onClick={saveProfile} disabled={saving}
                  className="mt-6 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold rounded-xl shadow-md shadow-blue-500/25 hover:shadow-lg transition-all disabled:opacity-60 flex items-center gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} حفظ التغييرات
                </button>
              </div>
            )}

            {activeTab === 'videos' && profile.is_teacher && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2"><VideoIcon className="w-5 h-5 text-blue-500" /> إدارة الفيديوهات</h3>
                  <button onClick={() => setShowVideoForm(!showVideoForm)}
                    className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2">
                    <Plus className="w-4 h-4" /> إضافة فيديو
                  </button>
                </div>

                {showVideoForm && (
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
                    <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><Upload className="w-5 h-5 text-blue-500" /> رفع فيديو جديد</h4>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <Field label="عنوان الفيديو" value={videoTitle} onChange={setVideoTitle} placeholder="شرح درس..." />
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">التخصص</label>
                        <select value={videoCategory ?? ''} onChange={(e) => setVideoCategory(e.target.value || null)}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors">
                          <option value="">بدون تخصص</option>
                          {categories.map((c) => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">الدورة (اختياري)</label>
                        <select value={videoCourse ?? ''} onChange={(e) => setVideoCourse(e.target.value || null)}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors">
                          <option value="">بدون دورة</option>
                          {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                        </select>
                      </div>
                      <Field label="رابط الصورة المصغرة (اختياري)" value={videoThumb} onChange={setVideoThumb} placeholder="https://..." dir="ltr" />
                      <Field label="المدة بالثواني" value={String(videoDuration)} onChange={(v) => setVideoDuration(parseInt(v) || 0)} type="number" />
                      <div><label className="block text-sm font-medium text-slate-700 mb-1.5">المرحلة الدراسية</label><select value={videoStage} onChange={(e) => setVideoStage(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700"><option value="">كل المراحل</option>{educationStages.map((stage) => <option key={stage.value} value={stage.value}>{stage.label}</option>)}</select></div>
                      <div><label className="block text-sm font-medium text-slate-700 mb-1.5">المنهج</label><select value={videoCurriculum} onChange={(e) => setVideoCurriculum(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700"><option value="">كل المناهج</option>{curricula.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">نوع الوصول</label>
                        <div className="flex gap-3">
                          <button type="button" onClick={() => setVideoIsFree(true)}
                            className={`flex-1 px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${videoIsFree ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-600'}`}>مجاني</button>
                          <button type="button" onClick={() => setVideoIsFree(false)}
                            className={`flex-1 px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${!videoIsFree ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-slate-200 text-slate-600'}`}>للمشتركين</button>
                        </div>
                      </div>
                    </div>

                    {/* File upload */}
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">ملف الفيديو</label>
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-colors">
                        <div className="flex flex-col items-center gap-2">
                          <Upload className="w-8 h-8 text-slate-400" />
                          <span className="text-sm text-slate-500">
                            {videoFile ? videoFile.name : 'اختر ملف فيديو لرفعه'}
                          </span>
                        </div>
                        <input type="file" accept="video/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setVideoFile(f); }} />
                      </label>
                      {uploadProgress > 0 && uploadProgress < 100 && (
                        <div className="mt-3">
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-blue-600 to-cyan-500 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
                          </div>
                          <p className="text-xs text-slate-400 mt-1 text-center">جاري الرفع... {uploadProgress}%</p>
                        </div>
                      )}
                    </div>

                    <div className="mt-4">
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">وصف الفيديو</label>
                      <textarea value={videoDesc} onChange={(e) => setVideoDesc(e.target.value)} rows={3} placeholder="وصف محتوى الفيديو..."
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors resize-none" />
                    </div>

                    <div className="flex gap-3 mt-5">
                      <button onClick={handleVideoUpload} disabled={saving || !videoTitle || !videoFile}
                        className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-60 flex items-center gap-2">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} رفع الفيديو
                      </button>
                      <button onClick={() => setShowVideoForm(false)}
                        className="px-6 py-2.5 bg-slate-100 text-slate-600 font-medium rounded-xl hover:bg-slate-200 transition-colors">إلغاء</button>
                    </div>
                  </div>
                )}

                {videos.length === 0 && !showVideoForm ? (
                  <EmptyState icon={VideoIcon} text="لم ترفع أي فيديو بعد" />
                ) : (
                  <div className="space-y-3">
                    {videos.map((v) => (
                      <div key={v.id} className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-4">
                        <div className="w-20 aspect-video rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                          <Play className="w-6 h-6 text-slate-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <Link to={`/video/${v.id}`} className="font-bold text-slate-800 hover:text-blue-600 transition-colors line-clamp-1">{v.title}</Link>
                          <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                            <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {v.views_count}</span>
                            {v.category && <span className="px-2 py-0.5 bg-slate-100 rounded-md">{v.category.name_ar}</span>}
                            {v.course && <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-md">{v.course.title}</span>}
                            <span className={`px-2 py-0.5 rounded-md ${v.is_free ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                              {v.is_free ? 'مجاني' : 'مدفوع'}
                            </span>
                          </div>
                        </div>
                        <button onClick={() => deleteVideo(v.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'courses' && profile.is_teacher && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2"><BookOpen className="w-5 h-5 text-blue-500" /> إدارة الدورات</h3>
                  <button onClick={() => setShowCourseForm(!showCourseForm)}
                    className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2">
                    <FolderPlus className="w-4 h-4" /> إنشاء دورة
                  </button>
                </div>

                {showCourseForm && (
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
                    <h4 className="font-bold text-slate-700 mb-4">إنشاء دورة جديدة</h4>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <Field label="عنوان الدورة" value={courseTitle} onChange={setCourseTitle} placeholder="مثال: الرياضيات للصف الأول" />
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">التخصص</label>
                        <select value={courseCategory ?? ''} onChange={(e) => setCourseCategory(e.target.value || null)}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors">
                          <option value="">بدون تخصص</option>
                          {categories.map((c) => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">المستوى</label>
                        <select value={courseLevel} onChange={(e) => setCourseLevel(e.target.value as typeof courseLevel)}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors">
                          <option value="beginner">مبتدئ</option>
                          <option value="intermediate">متوسط</option>
                          <option value="advanced">متقدم</option>
                        </select>
                      </div>
                      <Field label="السعر" value={String(coursePrice)} onChange={(v) => setCoursePrice(parseFloat(v) || 0)} type="number" />
                      <Field label="رابط صورة الدورة (اختياري)" value={courseThumb} onChange={setCourseThumb} placeholder="https://..." dir="ltr" />
                      <div><label className="block text-sm font-medium text-slate-700 mb-1.5">المرحلة الدراسية</label><select value={courseStage} onChange={(e) => setCourseStage(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700"><option value="">كل المراحل</option>{educationStages.map((stage) => <option key={stage.value} value={stage.value}>{stage.label}</option>)}</select></div>
                      <div><label className="block text-sm font-medium text-slate-700 mb-1.5">المنهج</label><select value={courseCurriculum} onChange={(e) => setCourseCurriculum(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700"><option value="">كل المناهج</option>{curricula.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
                    </div>
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">وصف الدورة</label>
                      <textarea value={courseDesc} onChange={(e) => setCourseDesc(e.target.value)} rows={3} placeholder="وصف محتوى الدورة..."
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors resize-none" />
                    </div>
                    <div className="flex gap-3 mt-5">
                      <button onClick={handleCourseCreate} disabled={saving || !courseTitle}
                        className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-60 flex items-center gap-2">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <FolderPlus className="w-4 h-4" />} إنشاء الدورة
                      </button>
                      <button onClick={() => setShowCourseForm(false)}
                        className="px-6 py-2.5 bg-slate-100 text-slate-600 font-medium rounded-xl hover:bg-slate-200 transition-colors">إلغاء</button>
                    </div>
                  </div>
                )}

                {courses.length === 0 && !showCourseForm ? (
                  <EmptyState icon={BookOpen} text="لم تنشئ أي دورة بعد" />
                ) : (
                  <div className="grid sm:grid-cols-2 gap-4">
                    {courses.map((c) => (
                      <div key={c.id} className="bg-white rounded-2xl border border-slate-200 p-5">
                        <div className="flex items-start justify-between mb-3">
                          <Link to={`/course/${c.id}`} className="font-bold text-slate-800 hover:text-blue-600 transition-colors line-clamp-1 flex-1">{c.title}</Link>
                          <button onClick={() => deleteCourse(c.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        {c.description && <p className="text-sm text-slate-500 line-clamp-2 mb-3">{c.description}</p>}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2 py-0.5 text-xs rounded-md ${
                            c.level === 'beginner' ? 'bg-green-50 text-green-600' :
                            c.level === 'intermediate' ? 'bg-amber-50 text-amber-600' :
                            'bg-rose-50 text-rose-600'
                          }`}>
                            {c.level === 'beginner' ? 'مبتدئ' : c.level === 'intermediate' ? 'متوسط' : 'متقدم'}
                          </span>
                          {c.category && <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-xs rounded-md">{c.category.name_ar}</span>}
                          <span className="text-xs text-slate-400">{videos.filter(v => v.course_id === c.id).length} فيديو</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'competitions' && profile.is_teacher && (
              <>
                <TeacherCompetitions userId={user!.id} categories={categories} />
                {profile.is_manager && <TeacherLeaderboards teacherId={user!.id} />}
              </>
            )}

            {activeTab === 'page' && profile.is_manager && <TeacherPageSettingsPanel teacherId={user!.id} />}

            {activeTab === 'students' && profile.is_manager && <TeacherStudents teacherId={user!.id} />}

            {activeTab === 'honors' && profile.is_manager && <TeacherHonors teacherId={user!.id} />}

            {activeTab === 'subscriptions' && !profile.is_teacher && (
              <div>
                <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><Crown className="w-5 h-5 text-blue-500" /> اشتراكاتي</h3>
                {subscriptions.length === 0 ? (
                  <EmptyState icon={Crown} text="لا توجد اشتراكات بعد" action={
                    <Link to="/pricing" className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors">عرض الباقات</Link>
                  } />
                ) : (
                  <div className="space-y-4">
                    {subscriptions.map((sub) => (
                      <div key={sub.id} className="bg-white rounded-2xl border border-slate-200 p-5">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center">
                              <Crown className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-bold text-slate-800">{sub.teacher?.full_name ?? 'مدرس'}</p>
                              <p className="text-sm text-slate-400">{sub.plan?.name_ar ?? 'باقة'}</p>
                            </div>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${sub.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                            {sub.status === 'active' ? 'نشط' : 'منتهي'}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-500 pt-3 border-t border-slate-100">
                          <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> بدأ: {new Date(sub.start_date).toLocaleDateString('ar-EG')}</span>
                          <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> ينتهي: {new Date(sub.end_date).toLocaleDateString('ar-EG')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'favorites' && !profile.is_teacher && (
              <div>
                <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><Heart className="w-5 h-5 text-rose-500" /> المفضلة</h3>
                {favorites.length === 0 ? (
                  <EmptyState icon={Heart} text="لا توجد فيديوهات في المفضلة" />
                ) : (
                  <div className="grid sm:grid-cols-2 gap-4">
                    {favorites.map((fav) => (
                      <Link key={fav.id} to={`/video/${fav.video_id}`}
                        className="group bg-white rounded-2xl border border-slate-200 p-4 hover:shadow-lg hover:border-blue-200 transition-all">
                        <div className="flex gap-3">
                          <div className="w-24 aspect-video rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                            <Play className="w-6 h-6 text-slate-400 group-hover:text-blue-500 transition-colors" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-800 line-clamp-1 group-hover:text-blue-600 transition-colors">{fav.video?.title}</p>
                            <p className="text-xs text-slate-400 mt-1">{fav.video?.teacher?.full_name}</p>
                            <p className="text-xs text-slate-300 mt-1">{new Date(fav.created_at).toLocaleDateString('ar-EG')}</p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'history' && !profile.is_teacher && (
              <div>
                <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><Clock className="w-5 h-5 text-blue-500" /> سجل المشاهدة</h3>
                {history.length === 0 ? (
                  <EmptyState icon={Clock} text="لا يوجد سجل مشاهدات بعد" action={
                    <Link to="/teachers" className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors">ابدأ المشاهدة</Link>
                  } />
                ) : (
                  <div className="space-y-3">
                    {history.map((h) => (
                      <Link key={h.id} to={`/video/${h.video_id}`}
                        className="group flex items-center gap-3 p-3 bg-white rounded-2xl border border-slate-200 hover:shadow-md transition-all">
                        <div className="w-20 aspect-video rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                          <Play className="w-6 h-6 text-slate-400 group-hover:text-blue-500 transition-colors" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-800 line-clamp-1 group-hover:text-blue-600 transition-colors">{h.video?.title}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{h.video?.teacher?.full_name}</p>
                        </div>
                        <span className="text-xs text-slate-400 flex-shrink-0">{new Date(h.watched_at).toLocaleDateString('ar-EG')}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TeacherCompetitions({ userId, categories }: { userId: string; categories: Category[] }) {
  const { toast } = useToast();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [selected, setSelected] = useState<Competition | null>(null);
  const [questions, setQuestions] = useState<CompetitionQuestion[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [correctOption, setCorrectOption] = useState(0);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from('competitions').select('*').eq('teacher_id', userId).order('created_at', { ascending: false });
    setCompetitions((data ?? []) as Competition[]);
  }, [userId]);
  useEffect(() => { void load(); }, [load]);

  const choose = async (competition: Competition) => {
    setSelected(competition);
    const { data } = await supabase.from('competition_questions').select('*').eq('competition_id', competition.id).order('sort_order', { ascending: true });
    setQuestions((data ?? []) as CompetitionQuestion[]);
  };
  const createCompetition = async () => {
    if (!title.trim()) return;
    setSaving(true);
    const { data, error } = await supabase.from('competitions').insert({ teacher_id: userId, title, description, category_id: categoryId || categories[0]?.id || null, status: 'published' }).select().single();
    setSaving(false);
    if (error || !data) { toast('تعذر إنشاء المنافسة', 'error'); return; }
    setTitle(''); setDescription(''); setCategoryId(''); await load(); await choose(data as Competition); toast('تم إنشاء المنافسة', 'success');
  };
  const addQuestion = async () => {
    if (!selected || !question.trim() || options.some((option) => !option.trim())) return;
    setSaving(true);
    const { data, error } = await supabase.from('competition_questions').insert({ competition_id: selected.id, question, options, correct_option: correctOption, sort_order: questions.length }).select().single();
    setSaving(false);
    if (error || !data) { toast('تعذر إضافة السؤال', 'error'); return; }
    setQuestions((items) => [...items, data as CompetitionQuestion]); setQuestion(''); setOptions(['', '', '', '']); setCorrectOption(0); toast('تمت إضافة السؤال', 'success');
  };
  const removeQuestion = async (id: string) => { await supabase.from('competition_questions').delete().eq('id', id); setQuestions((items) => items.filter((item) => item.id !== id)); };

  return <div className="space-y-6"><div className="flex items-center justify-between"><div><h3 className="flex items-center gap-2 font-bold text-slate-800"><Gamepad2 className="h-5 w-5 text-cyan-600" /> إدارة المنافسات</h3><p className="mt-1 text-sm text-slate-500">أنشئ تحدياتك وأضف أسئلة اختيار من متعدد للطلاب.</p></div></div><div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h4 className="mb-4 font-bold text-slate-800">منافسة جديدة</h4><div className="grid gap-4 sm:grid-cols-2"><Field label="اسم المنافسة" value={title} onChange={setTitle} placeholder="تحدي العلوم الأسبوعي" /><Field label="وصف مختصر" value={description} onChange={setDescription} placeholder="اختبر معلوماتك واجمع النقاط" /></div><button onClick={() => void createCompetition()} disabled={saving || !title.trim()} className="mt-4 flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-40"><FolderPlus className="h-4 w-4" /> إنشاء المنافسة</button></div><div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]"><div className="space-y-3">{competitions.map((competition) => <button key={competition.id} onClick={() => void choose(competition)} className={`w-full rounded-2xl border p-4 text-right transition ${selected?.id === competition.id ? 'border-cyan-400 bg-cyan-50' : 'border-slate-200 bg-white hover:border-cyan-200'}`}><div className="flex items-center justify-between gap-3"><span className="font-bold text-slate-800">{competition.title}</span><span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">منشورة</span></div><p className="mt-2 text-xs text-slate-400">اضغط لإدارة الأسئلة</p></button>)}{competitions.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-400">لم تنشئ منافسات بعد</div>}</div>{selected ? <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="mb-5 flex items-center justify-between"><div><h4 className="font-extrabold text-slate-800">أسئلة: {selected.title}</h4><p className="mt-1 text-xs text-slate-400">الإجابة الصحيحة لا تظهر للطلاب في الواجهة التعليمية.</p></div><ListPlus className="h-5 w-5 text-cyan-600" /></div><div className="space-y-3">{questions.map((item, index) => <div key={item.id} className="flex items-start justify-between gap-3 rounded-xl bg-slate-50 p-3"><div><p className="text-sm font-bold text-slate-700">{index + 1}. {item.question}</p><p className="mt-1 text-xs text-emerald-600">الإجابة الصحيحة: {item.options[item.correct_option]}</p></div><button onClick={() => void removeQuestion(item.id)} className="text-xs font-bold text-rose-500">حذف</button></div>)}</div><div className="mt-5 border-t border-slate-100 pt-5"><Field label="نص السؤال" value={question} onChange={setQuestion} placeholder="اكتب السؤال هنا" /><div className="mt-3 grid gap-2 sm:grid-cols-2">{options.map((option, index) => <input key={index} value={option} onChange={(event) => setOptions((items) => items.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} placeholder={`الإجابة ${index + 1}`} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-cyan-500" />)}</div><div className="mt-3 flex items-center gap-3"><label className="text-xs font-bold text-slate-600">الإجابة الصحيحة</label><select value={correctOption} onChange={(event) => setCorrectOption(Number(event.target.value))} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">{options.map((_, index) => <option key={index} value={index}>الإجابة {index + 1}</option>)}</select></div><button onClick={() => void addQuestion()} disabled={saving || !question.trim() || options.some((option) => !option.trim())} className="mt-4 flex items-center gap-2 rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-40"><Plus className="h-4 w-4" /> إضافة السؤال</button></div></div> : <div className="flex min-h-[260px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-400">اختر منافسة لإدارة أسئلتها</div>}</div></div>;
}

function StatCard({ icon: Icon, label, value, color }: { icon: typeof Eye; label: string; value: number | string; color: string }) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600', cyan: 'bg-cyan-50 text-cyan-600',
    amber: 'bg-amber-50 text-amber-600', emerald: 'bg-emerald-50 text-emerald-600',
  };
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
      <div className={`w-10 h-10 rounded-xl ${colorMap[color] ?? colorMap.blue} flex items-center justify-center mb-3`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      <p className="text-sm text-slate-400">{label}</p>
    </div>
  );
}

function EmptyState({ icon: Icon, text, action }: { icon: typeof Eye; text: string; action?: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
      <Icon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
      <p className="text-slate-500 mb-4">{text}</p>
      {action}
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text', dir }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; dir?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} dir={dir}
        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors" />
    </div>
  );
}
