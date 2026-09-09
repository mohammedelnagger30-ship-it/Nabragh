import { Link } from 'react-router-dom';
import { GraduationCap, ArrowRight } from 'lucide-react';

export default function TeacherProfilePage() {
  return (
    <div className="pt-[4.5rem] min-h-screen flex items-center justify-center">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-4">إحصائيات المعلم</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-100 p-4 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold">عدد الطلاب</h3>
            <p className="text-2xl font-bold">{totalStudents}</p>
          </div>
          <div className="bg-green-100 p-4 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold">عدد الدورات</h3>
            <p className="text-2xl font-bold">{courses.length}</p>
          </div>
          <div className="bg-yellow-100 p-4 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold">عدد المراجعات</h3>
            <p className="text-2xl font-bold">{reviews.length}</p>
          </div>
          <div className="bg-red-100 p-4 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold">متوسط التقييم</h3>
            <p className="text-2xl font-bold">{avgRating.toFixed(1)}</p>
          </div>
        </div>
      </div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-4">إحصائيات المعلم</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-100 p-4 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold">عدد الطلاب</h3>
            <p className="text-2xl font-bold">{totalStudents}</p>
          </div>
          <div className="bg-green-100 p-4 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold">عدد الدورات</h3>
            <p className="text-2xl font-bold">{courses.length}</p>
          </div>
          <div className="bg-yellow-100 p-4 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold">عدد المراجعات</h3>
            <p className="text-2xl font-bold">{reviews.length}</p>
          </div>
          <div className="bg-red-100 p-4 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold">متوسط التقييم</h3>
            <p className="text-2xl font-bold">{avgRating.toFixed(1)}</p>
          </div>
        </div>
      </div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-4">إحصائيات المعلم</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-100 p-4 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold">عدد الطلاب</h3>
            <p className="text-2xl font-bold">{totalStudents}</p>
          </div>
          <div className="bg-green-100 p-4 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold">عدد الدورات</h3>
            <p className="text-2xl font-bold">{courses.length}</p>
          </div>
          <div className="bg-yellow-100 p-4 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold">عدد المراجعات</h3>
            <p className="text-2xl font-bold">{reviews.length}</p>
          </div>
          <div className="bg-red-100 p-4 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold">متوسط التقييم</h3>
            <p className="text-2xl font-bold">{avgRating.toFixed(1)}</p>
          </div>
        </div>
      </div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-4">إحصائيات المعلم</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-100 p-4 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold">عدد الطلاب</h3>
            <p className="text-2xl font-bold">{totalStudents}</p>
          </div>
          <div className="bg-green-100 p-4 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold">عدد الدورات</h3>
            <p className="text-2xl font-bold">{courses.length}</p>
          </div>
          <div className="bg-yellow-100 p-4 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold">عدد المراجعات</h3>
            <p className="text-2xl font-bold">{reviews.length}</p>
          </div>
          <div className="bg-red-100 p-4 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold">متوسط التقييم</h3>
            <p className="text-2xl font-bold">{avgRating.toFixed(1)}</p>
          </div>
        </div>
      </div>
        <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <GraduationCap className="w-10 h-10 text-blue-600 dark:text-blue-400" />
        </div>
        <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-4">{teacher.full_name}</h2>
        <p className="text-slate-600 dark:text-slate-300 mb-6">{teacher.bio || 'مدرس محترف'}</p>
        <p className="text-slate-600 dark:text-slate-300 mb-6">صفحة المدرس قيد التطوير</p>
        <p className="text-slate-600 dark:text-slate-300 mb-6">{teacher.bio || 'مدرس محترف'}</p>
        <p className="text-slate-600 dark:text-slate-300 mb-6">صفحة المدرس قيد التطوير</p>
        <p className="text-slate-600 dark:text-slate-300 mb-6">{teacher.bio || 'مدرس محترف'}</p>
        <p className="text-slate-600 dark:text-slate-300 mb-6">صفحة المدرس قيد التطوير</p>
        <p className="text-slate-600 dark:text-slate-300 mb-6">{teacher.bio || 'مدرس محترف'}</p>
        <p className="text-slate-600 dark:text-slate-300 mb-6">صفحة المدرس قيد التطوير</p>
        <Link
          to="/teachers"
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
        >
          <ArrowRight className="w-4 h-4 rotate-180" /> العودة للمدرسين
        </Link>
      </div>
    </div>
      </div>
    </div>
      </div>
    </div>
      </div>
    </div>
  );
}

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
      const { data: revData } = await supabase
        .from('reviews')
        .select('*, student:profiles!reviews_student_id_fkey(id, full_name, avatar_url)')
        .eq('teacher_id', id)
        .order('created_at', { ascending: false });
      const revList = revData as Review[] ?? [];
      setReviews(revList);
      if (revList.length > 0) setAvgRating(revList.reduce((s, r) => s + r.rating, 0) / revList.length);
    }
  };

  const toggleFavorite = (videoId: string) => {
    setFavoriteVideos(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(videoId)) {
        newFavorites.delete(videoId);
      } else {
        newFavorites.add(videoId);
      }
      return newFavorites;
    });
  };

  const filteredVideos = useMemo(() => {
    let filtered = videos;

    // Apply category filter
    if (selectedCategory) {
      filtered = filtered.filter(v => v.category?.id === selectedCategory);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(v =>
        v.title.toLowerCase().includes(query) ||
        (v.description && v.description.toLowerCase().includes(query))
      );
    }

    // Apply duration filter
    if (durationFilter !== 'all') {
      filtered = filtered.filter(v => {
        const minutes = v.duration_seconds / 60;
        switch (durationFilter) {
          case 'short': return minutes < 10;
          case 'medium': return minutes >= 10 && minutes < 30;
          case 'long': return minutes >= 30;
          default: return true;
        }
      });
    }

    // Apply date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const cutoffDate = new Date();
      switch (dateFilter) {
        case 'week': cutoffDate.setDate(now.getDate() - 7); break;
        case 'month': cutoffDate.setMonth(now.getMonth() - 1); break;
        case 'year': cutoffDate.setFullYear(now.getFullYear() - 1); break;
        default: break;
      }
      filtered = filtered.filter(v => new Date(v.created_at) >= cutoffDate);
    }

    // Apply sorting
    switch (sortBy) {
      case 'newest':
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'oldest':
        filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case 'popular':
        filtered.sort((a, b) => (b.views_count || 0) - (a.views_count || 0));
        break;
      case 'rating':
        filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
    }

    return filtered;
  }, [videos, selectedCategory, searchQuery, durationFilter, dateFilter, sortBy]);

  if (loading) {
    return (
      <div className="pt-[4.5rem] min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-slate-500 dark:text-slate-400">جاري تحميل صفحة المدرس...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pt-[4.5rem] min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-10 h-10 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-4">حدث خطأ</h2>
          <p className="text-slate-600 dark:text-slate-300 mb-6">{error}</p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
            >
              إعادة المحاولة
            </button>
            <Link
              to="/teachers"
              className="px-6 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            >
              العودة للمدرسين
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Check if admin is trying to access teacher page
  if (isAdmin && user) {
    return (
      <div className="pt-[4.5rem] min-h-screen flex items-center justify-center">
        <div className="max-w-md mx-auto text-center bg-white dark:bg-slate-800 rounded-3xl shadow-xl p-8 border border-slate-200 dark:border-slate-700">
          <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <Shield className="w-10 h-10 text-amber-600 dark:text-amber-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-4">يجب تسجيل الخروج أولاً</h2>
          <p className="text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
            أنت مسجل حالياً كأدمن النظام. للوصول إلى صفحة المدرس، يجب تسجيل الخروج أولاً ثم تسجيل الدخول بحساب مدرس.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={signOut}
              className="w-full px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold rounded-xl hover:from-amber-600 hover:to-amber-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/30"
            >
              <LogOut className="w-5 h-5" /> تسجيل الخروج
            </button>
            <Link
              to="/admin"
              className="w-full px-6 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-all flex items-center justify-center gap-2"
            >
              <Shield className="w-5 h-5" /> العودة للوحة الإدارة
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="pt-[4.5rem] min-h-screen flex flex-col items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <GraduationCap className="w-10 h-10 text-slate-400 dark:text-slate-600" />
          </div>
          <p className="text-slate-500 dark:text-slate-400 mb-4">المدرس غير موجود</p>
          <Link to="/teachers" className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors">
            <ArrowRight className="w-4 h-4 rotate-180" /> العودة للمدرسين
          </Link>
        </div>
      </div>
    );
  }

  const primary = settings?.primary_color ?? '#2563eb';
  const secondary = settings?.secondary_color ?? '#06b6d4';

  const totalViews = videos.reduce((sum, v) => sum + (v.views_count || 0), 0);
  const totalStudents = videos.reduce((sum, v) => sum + (v.views_count || 0), 0) / 10; // تقديري

  return (
    <div className="pt-[4.5rem] min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <MetaTags
        title={`${teacher.full_name} - مدرس | منصة العلم`}
        description={teacher.bio ?? teacher.specialization ?? `صفحة المدرس ${teacher.full_name} على منصة العلم`}
        url={`${window.location.origin}/teacher/${teacher.id}`}
      />

      {/* Hero Cover Section */}
      <div className="relative">
        <div className="h-64 md:h-80 bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-500 relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${primary}, ${secondary}, ${primary})` }}>
          {/* Animated background pattern */}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.08%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-30 animate-pulse" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/10" />
          {/* Floating elements */}
          <div className="absolute top-10 right-10 w-20 h-20 bg-white/10 rounded-full blur-xl animate-bounce" style={{ animationDuration: '3s' }} />
          <div className="absolute bottom-10 left-20 w-32 h-32 bg-white/10 rounded-full blur-xl animate-bounce" style={{ animationDuration: '4s', animationDelay: '1s' }} />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-32 relative z-10">
          {/* Profile Card */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-700 p-8 mb-8">
            <div className="flex flex-col lg:flex-row gap-8 items-start">
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div className="w-40 h-40 rounded-3xl overflow-hidden flex items-center justify-center ring-8 ring-white dark:ring-slate-800 shadow-2xl" style={{ background: `linear-gradient(135deg, ${primary}22, ${secondary}22)` }}>
                  {teacher.avatar_url ? (
                    <img src={teacher.avatar_url} alt={teacher.full_name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-6xl font-bold" style={{ color: primary }}>{teacher.full_name.charAt(0)}</span>
                  )}
                </div>
                {teacher.is_manager && (
                  <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center shadow-lg border-4 border-white dark:border-slate-800">
                    <Crown className="w-5 h-5 text-white" />
                  </div>
                )}
                {teacher.is_approved && (
                  <div className="absolute -bottom-2 -left-2 w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center shadow-lg border-4 border-white dark:border-slate-800">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                )}
              </div>

              {/* Teacher Info */}
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <h1 className="text-3xl md:text-4xl font-bold text-slate-800 dark:text-slate-100">{teacher.full_name}</h1>
                  <div className="flex items-center gap-2">
                    {teacher.is_manager && (
                      <span className="px-3 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-r from-amber-500 to-amber-600 shadow-md">
                        <Crown className="w-3 h-3 inline mr-1" /> مدير
                      </span>
                    )}
                    {teacher.is_approved && (
                      <span className="px-3 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-md">
                        <CheckCircle className="w-3 h-3 inline mr-1" /> معتمد
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-xl md:text-2xl font-bold mb-4" style={{ color: primary }}>{teacher.specialization ?? 'مدرس محترف'}</p>

                <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-6 line-clamp-3">
                  {teacher.bio || 'مدرس متخصص في تقديم أفضل المحتوى التعليمي للطلاب'}
                </p>

                {/* Enhanced Stats */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-2xl p-4 text-center hover:shadow-lg transition-all hover:scale-105 cursor-pointer group">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Star className="w-4 h-4 text-amber-400 fill-amber-400 group-hover:scale-110 transition-transform" />
                      <span className="text-xl font-bold text-slate-800 dark:text-slate-100">{avgRating.toFixed(1)}</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">التقييم</p>
                  </div>
                  <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-cyan-900/30 dark:to-cyan-800/30 rounded-2xl p-4 text-center hover:shadow-lg transition-all hover:scale-105 cursor-pointer group">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <VideoIcon className="w-4 h-4 text-cyan-600 group-hover:scale-110 transition-transform" />
                      <span className="text-xl font-bold text-slate-800 dark:text-slate-100">{videos.length}</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">فيديو</p>
                  </div>
                  <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-800/30 rounded-2xl p-4 text-center hover:shadow-lg transition-all hover:scale-105 cursor-pointer group">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Eye className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
                      <span className="text-xl font-bold text-slate-800 dark:text-slate-100">{totalViews.toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">مشاهدة</p>
                  </div>
                  <div className="bg-gradient-to-br from-violet-50 to-violet-100 dark:from-violet-900/30 dark:to-violet-800/30 rounded-2xl p-4 text-center hover:shadow-lg transition-all hover:scale-105 cursor-pointer group">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Users className="w-4 h-4 text-violet-600 group-hover:scale-110 transition-transform" />
                      <span className="text-xl font-bold text-slate-800 dark:text-slate-100">{Math.floor(totalStudents).toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">طالب</p>
                  </div>
                  <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/30 rounded-2xl p-4 text-center hover:shadow-lg transition-all hover:scale-105 cursor-pointer group">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <BookOpen className="w-4 h-4 text-amber-600 group-hover:scale-110 transition-transform" />
                      <span className="text-xl font-bold text-slate-800 dark:text-slate-100">{courses.length}</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">دورة</p>
                  </div>
                  <div className="bg-gradient-to-br from-rose-50 to-rose-100 dark:from-rose-900/30 dark:to-rose-800/30 rounded-2xl p-4 text-center hover:shadow-lg transition-all hover:scale-105 cursor-pointer group">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <MessageSquare className="w-4 h-4 text-rose-600 group-hover:scale-110 transition-transform" />
                      <span className="text-xl font-bold text-slate-800 dark:text-slate-100">{reviews.length}</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">تقييم</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-3">
                  {user && !profile?.is_teacher && user.id !== teacher.id && (
                    <>
                      <FollowButton teacherId={teacher.id} isFollowing={isFollowing} onFollowChange={setIsFollowing} />
                      <SocialShare title={teacher.full_name} description={teacher.specialization ?? 'مدرس على منصة العلم'} url={`${window.location.origin}/teacher/${teacher.id}`} />
                    </>
                  )}
                  {teacher.website && (
                    <a
                      href={teacher.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors flex items-center gap-2 text-sm font-medium"
                    >
                      <Globe className="w-4 h-4" /> الموقع الشخصي
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Info Bar */}
            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700">
              <div className="flex flex-wrap items-center gap-6 text-sm">
                {teacher.years_experience > 0 && (
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <Award className="w-4 h-4 text-amber-500" />
                    <span>{teacher.years_experience} سنوات خبرة</span>
                  </div>
                )}
                {teacher.location && (
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <MapPin className="w-4 h-4 text-rose-500" />
                    <span>{teacher.location}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <CalendarIcon className="w-4 h-4 text-blue-500" />
                  <span>انضم {new Date(teacher.created_at).toLocaleDateString('ar-EG')}</span>
                </div>
                {contact?.phone && (
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <Phone className="w-4 h-4 text-emerald-500" />
                    <span dir="ltr">{contact.phone}</span>
                  </div>
                )}
                {contact?.email && (
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <Mail className="w-4 h-4 text-violet-500" />
                    <span dir="ltr" className="truncate">{contact.email}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Videos Section */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-1">الدروس والفيديوهات</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{filteredVideos.length} من {videos.length} فيديو متاح</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-xl transition-colors ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}
                  >
                    <Grid className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-xl transition-colors ${viewMode === 'list' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}
                  >
                    <List className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Search and Filters */}
              <div className="space-y-4 mb-6">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="ابحث في الفيديوهات..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pr-10 pl-4 py-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute left-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4 text-slate-400" />
                    </button>
                  )}
                </div>

                {/* Category Filter */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                      selectedCategory === null
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                    }`}
                  >
                    الكل
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                        selectedCategory === cat.id
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                      }`}
                    >
                      {cat.name_ar}
                    </button>
                  ))}
                </div>

                {/* Advanced Filters Toggle */}
                <button
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <Filter className="w-4 h-4" />
                  {showAdvancedFilters ? 'إخفاء الفلاتر المتقدمة' : 'عرض الفلاتر المتقدمة'}
                  {showAdvancedFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {/* Advanced Filters */}
                {showAdvancedFilters && (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-slate-50 dark:bg-slate-700/30 rounded-xl">
                    {/* Sort By */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">ترتيب حسب</label>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      >
                        <option value="newest">الأحدث</option>
                        <option value="oldest">الأقدم</option>
                        <option value="popular">الأكثر مشاهدة</option>
                        <option value="rating">الأعلى تقييماً</option>
                      </select>
                    </div>

                    {/* Duration Filter */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">المدة</label>
                      <select
                        value={durationFilter}
                        onChange={(e) => setDurationFilter(e.target.value as any)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      >
                        <option value="all">الكل</option>
                        <option value="short">أقل من 10 دقائق</option>
                        <option value="medium">10-30 دقيقة</option>
                        <option value="long">أكثر من 30 دقيقة</option>
                      </select>
                    </div>

                    {/* Date Filter */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">تاريخ النشر</label>
                      <select
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value as any)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      >
                        <option value="all">الكل</option>
                        <option value="week">آخر أسبوع</option>
                        <option value="month">آخر شهر</option>
                        <option value="year">آخر سنة</option>
                      </select>
                    </div>

                    {/* Clear Filters */}
                    <div className="flex items-end">
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setSelectedCategory(null);
                          setSortBy('newest');
                          setDurationFilter('all');
                          setDateFilter('all');
                        }}
                        className="w-full px-3 py-2 bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors flex items-center justify-center gap-2"
                      >
                        <X className="w-4 h-4" />
                        مسح الفلاتر
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {filteredVideos.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <VideoIcon className="w-10 h-10 text-slate-400 dark:text-slate-500" />
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 mb-2">لا توجد فيديوهات</p>
                  {selectedCategory && (
                    <button
                      onClick={() => setSelectedCategory(null)}
                      className="text-blue-600 hover:underline text-sm"
                    >
                      عرض جميع الفيديوهات
                    </button>
                  )}
                </div>
              ) : viewMode === 'grid' ? (
                <div className="grid sm:grid-cols-2 gap-4">
                  {filteredVideos.map((video) => (
                    <div key={video.id} className="group relative">
                      <Link
                        to={`/video/${video.id}`}
                        className="block bg-gradient-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-xl hover:border-blue-300 dark:hover:border-blue-500/50 transition-all duration-300"
                      >
                        <div className="aspect-video bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-800 relative overflow-hidden">
                          {video.thumbnail_url ? (
                            <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                                <Play className="w-8 h-8 text-white fill-white ml-1" />
                              </div>
                            </div>
                          )}
                          {video.is_free && (
                            <span className="absolute top-3 right-3 px-3 py-1.5 bg-emerald-500 text-white text-xs font-bold rounded-full shadow-lg">مجاني</span>
                          )}
                          <div className="absolute bottom-3 left-3 px-2 py-1 bg-black/70 backdrop-blur-sm rounded-lg text-white text-xs flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {Math.floor(video.duration_seconds / 60)}:{(video.duration_seconds % 60).toString().padStart(2, '0')}
                          </div>
                        </div>
                        <div className="p-5">
                          <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">{video.title}</h3>
                          {video.description && (
                            <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">{video.description}</p>
                          )}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
                              <span className="flex items-center gap-1">
                                <Eye className="w-3 h-3" /> {video.views_count.toLocaleString()}
                              </span>
                              {video.category && (
                                <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded-md">{video.category.name_ar}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-slate-400">
                              <PlayCircle className="w-4 h-4" />
                            </div>
                          </div>
                        </div>
                      </Link>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          toggleFavorite(video.id);
                        }}
                        className="absolute top-3 left-3 p-2 bg-white/90 dark:bg-slate-800/90 rounded-full shadow-lg hover:bg-white dark:hover:bg-slate-800 transition-colors z-10"
                      >
                        <HeartIcon
                          className={`w-5 h-5 transition-colors ${
                            favoriteVideos.has(video.id) ? 'text-red-500 fill-red-500' : 'text-slate-400'
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredVideos.map((video) => (
                    <div key={video.id} className="group relative">
                      <Link
                        to={`/video/${video.id}`}
                        className="flex gap-4 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-500/50 transition-all"
                      >
                        <div className="w-32 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-800 relative">
                          {video.thumbnail_url ? (
                            <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover" loading="lazy" />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-10 h-10 rounded-full bg-blue-600/80 flex items-center justify-center">
                                <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                              </div>
                            </div>
                          )}
                          {video.is_free && (
                            <span className="absolute top-2 right-2 px-2 py-0.5 bg-emerald-500 text-white text-xs font-bold rounded-md">مجاني</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-1 line-clamp-1 group-hover:text-blue-600 transition-colors">{video.title}</h3>
                          {video.description && (
                            <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-1 mb-2">{video.description}</p>
                          )}
                          <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
                            <span className="flex items-center gap-1">
                              <Eye className="w-3 h-3" /> {video.views_count.toLocaleString()}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {Math.floor(video.duration_seconds / 60)}:{(video.duration_seconds % 60).toString().padStart(2, '0')}
                            </span>
                            {video.category && (
                              <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded-md">{video.category.name_ar}</span>
                            )}
                          </div>
                        </div>
                      </Link>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          toggleFavorite(video.id);
                        }}
                        className="absolute top-4 right-4 p-2 bg-white/90 dark:bg-slate-800/90 rounded-full shadow-lg hover:bg-white dark:hover:bg-slate-800 transition-colors z-10"
                      >
                        <HeartIcon
                          className={`w-5 h-5 transition-colors ${
                            favoriteVideos.has(video.id) ? 'text-red-500 fill-red-500' : 'text-slate-400'
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Featured Content Section */}
            {(teacher.is_featured || videos.some(v => v.is_featured)) && (
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-3xl border border-amber-200 dark:border-amber-700 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <FlameIcon className="w-6 h-6 text-amber-600" />
                  <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">المحتوى المميز</h2>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  {videos.filter(v => v.is_featured).slice(0, 4).map((video) => (
                    <Link
                      key={video.id}
                      to={`/video/${video.id}`}
                      className="group bg-white dark:bg-slate-800 rounded-2xl border border-amber-200 dark:border-amber-700 overflow-hidden hover:shadow-lg transition-all"
                    >
                      <div className="aspect-video bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/40 dark:to-orange-900/40 relative overflow-hidden">
                        {video.thumbnail_url ? (
                          <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                              <Play className="w-8 h-8 text-white fill-white ml-1" />
                            </div>
                          </div>
                        )}
                        <div className="absolute top-3 right-3 px-3 py-1.5 bg-amber-500 text-white text-xs font-bold rounded-full shadow-lg flex items-center gap-1">
                          <FlameIcon className="w-3 h-3" /> مميز
                        </div>
                      </div>
                      <div className="p-4">
                        <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-2 line-clamp-1 group-hover:text-amber-600 transition-colors">{video.title}</h3>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
                            <span className="flex items-center gap-1">
                              <Eye className="w-3 h-3" /> {video.views_count.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-amber-500">
                            <StarIcon className="w-4 h-4 fill-amber-500" />
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Courses Section */}
            {courses.length > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-1">الدورات التعليمية</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{courses.length} دورة متاحة</p>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  {courses.map((course) => (
                    <Link
                      key={course.id}
                      to={`/course/${course.id}`}
                      className="group bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-xl hover:border-blue-300 dark:hover:border-blue-500/50 transition-all"
                    >
                      <div className="aspect-video bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/40 dark:to-cyan-900/40 flex items-center justify-center relative overflow-hidden">
                        {course.thumbnail_url ? (
                          <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <BookOpen className="w-12 h-12 text-blue-300" />
                        )}
                        <span className={`absolute top-3 right-3 px-3 py-1.5 text-xs font-bold rounded-full shadow-lg ${
                          course.level === 'beginner' ? 'bg-emerald-500 text-white' :
                          course.level === 'intermediate' ? 'bg-amber-500 text-white' :
                          'bg-rose-500 text-white'
                        }`}>
                          {course.level === 'beginner' ? 'مبتدئ' : course.level === 'intermediate' ? 'متوسط' : 'متقدم'}
                        </span>
                      </div>
                      <div className="p-5">
                        <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-2 line-clamp-1 group-hover:text-blue-600 transition-colors">{course.title}</h3>
                        {course.description && (
                          <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">{course.description}</p>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-bold" style={{ color: primary }}>
                            {course.price === 0 ? 'مجاني' : `${course.price} ر.س`}
                          </span>
                          <div className="flex items-center gap-1 text-blue-600">
                            <ArrowRight className="w-4 h-4" />
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Manager Extras */}
            {teacher.is_manager ? (
              <TeacherPublicExtras teacherId={teacher.id} settings={settings} />
            ) : null}

            {/* Achievements Section */}
            {achievements.length > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-1">الإنجازات والتكريم</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{achievements.length} إنجاز</p>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {achievements.map((achievement) => (
                    <div key={achievement.id} className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 rounded-2xl border border-amber-200 dark:border-amber-700 p-5 hover:shadow-lg transition-shadow">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center flex-shrink-0">
                          <Trophy className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-1">{achievement.title}</h4>
                          <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">{achievement.description}</p>
                          <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                            <CalendarIcon className="w-3 h-3" />
                            {new Date(achievement.created_at).toLocaleDateString('ar-EG')}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Certificates Section */}
            {certificates.length > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-1">الشهادات والاعتمادات</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{certificates.length} شهادة</p>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  {certificates.map((cert) => (
                    <div key={cert.id} className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-2xl border border-blue-200 dark:border-blue-700 p-5 hover:shadow-lg transition-shadow">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-cyan-600 flex items-center justify-center flex-shrink-0">
                          <Certificate className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-1">{cert.title}</h4>
                          <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">{cert.issuer}</p>
                          <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                            <CalendarIcon className="w-3 h-3" />
                            {new Date(cert.issue_date).toLocaleDateString('ar-EG')}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews Section */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-1">التقييمات والمراجعات</h2>
                  {reviews.length > 0 && (
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                        <span className="font-bold text-slate-700 dark:text-slate-200">{avgRating.toFixed(1)}</span>
                        <span>من {reviews.length} تقييم</span>
                      </span>
                    </p>
                  )}
                </div>
              </div>

              {/* Add Review */}
              {user && profile && !profile.is_teacher && (
                <div className="bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-800 dark:to-blue-900/20 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 mb-6">
                  <h3 className="font-bold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-blue-500" /> أضف تقييمك
                  </h3>
                  <div className="flex items-center gap-2 mb-4">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setReviewRating(star)}
                        className="transition-transform hover:scale-110 active:scale-95"
                      >
                        <Star className={`w-7 h-7 ${star <= reviewRating ? 'text-amber-400 fill-amber-400' : 'text-slate-300 dark:text-slate-600'}`} />
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    placeholder="اكتب مراجعتك وخبرتك مع هذا المدرس..."
                    rows={4}
                    className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors resize-none"
                  />
                  <button
                    onClick={submitReview}
                    disabled={submitting}
                    className="mt-4 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-60 flex items-center gap-2 shadow-lg shadow-blue-500/30"
                  >
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    نشر التقييم
                  </button>
                </div>
              )}

              {reviews.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageSquare className="w-10 h-10 text-slate-400 dark:text-slate-500" />
                  </div>
                  <p className="text-slate-500 dark:text-slate-400">لا توجد تقييمات بعد. كن أول من يقيّم هذا المدرس!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <div key={review.id} className="bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/40 dark:to-cyan-900/40 flex items-center justify-center flex-shrink-0">
                          {review.student?.avatar_url ? (
                            <img src={review.student.avatar_url} alt={review.student.full_name} className="w-full h-full object-cover rounded-full" />
                          ) : (
                            <span className="text-lg font-bold text-blue-600">
                              {review.student?.full_name?.charAt(0) ?? 'ط'}
                            </span>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-bold text-slate-700 dark:text-slate-200">{review.student?.full_name ?? 'طالب'}</h4>
                            <div className="flex items-center gap-0.5">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star key={s} className={`w-4 h-4 ${s <= review.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200 dark:text-slate-600'}`} />
                              ))}
                            </div>
                          </div>
                          <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">{review.comment}</p>
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-3 flex items-center gap-1">
                            <CalendarIcon className="w-3 h-3" />
                            {new Date(review.created_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact Card */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                <Mail className="w-5 h-5 text-blue-500" /> معلومات الاتصال
              </h3>
              <div className="space-y-4">
                {contact?.email && (
                  <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                      <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-500 dark:text-slate-400">البريد الإلكتروني</p>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate" dir="ltr">{contact.email}</p>
                    </div>
                  </div>
                )}
                {contact?.phone && (
                  <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                    <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                      <Phone className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-500 dark:text-slate-400">رقم الهاتف</p>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200" dir="ltr">{contact.phone}</p>
                    </div>
                  </div>
                )}
                {teacher.location && (
                  <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                    <div className="w-10 h-10 bg-rose-100 dark:bg-rose-900/30 rounded-lg flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-500 dark:text-slate-400">الموقع</p>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{teacher.location}</p>
                    </div>
                  </div>
                )}
                {teacher.website && (
                  <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                    <div className="w-10 h-10 bg-violet-100 dark:bg-violet-900/30 rounded-lg flex items-center justify-center">
                      <Globe className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-500 dark:text-slate-400">الموقع الإلكتروني</p>
                      <a href={teacher.website} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-blue-600 hover:underline truncate" dir="ltr">{teacher.website}</a>
                    </div>
                  </div>
                )}
              </div>
              {contact?.cv_url && (
                <a
                  href={contact.cv_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30"
                >
                  <Download className="w-4 h-4" /> تحميل السيرة الذاتية
                </a>
              )}
            </div>

            {/* Social Media Links */}
            {socialLinks && (Object.values(socialLinks).some(link => link)) && (
              <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                  <Share2 className="w-5 h-5 text-blue-500" /> وسائل التواصل الاجتماعي
                </h3>
                <div className="flex flex-wrap gap-3">
                  {socialLinks.linkedin && (
                    <a href={socialLinks.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors">
                      <Linkedin className="w-5 h-5" />
                      <span className="text-sm font-medium">LinkedIn</span>
                    </a>
                  )}
                  {socialLinks.twitter && (
                    <a href={socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-300 rounded-xl hover:bg-sky-100 dark:hover:bg-sky-900/50 transition-colors">
                      <Twitter className="w-5 h-5" />
                      <span className="text-sm font-medium">Twitter</span>
                    </a>
                  )}
                  {socialLinks.facebook && (
                    <a href={socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors">
                      <Facebook className="w-5 h-5" />
                      <span className="text-sm font-medium">Facebook</span>
                    </a>
                  )}
                  {socialLinks.instagram && (
                    <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 bg-pink-50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-300 rounded-xl hover:bg-pink-100 dark:hover:bg-pink-900/50 transition-colors">
                      <Instagram className="w-5 h-5" />
                      <span className="text-sm font-medium">Instagram</span>
                    </a>
                  )}
                  {socialLinks.youtube && (
                    <a href={socialLinks.youtube} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors">
                      <Youtube className="w-5 h-5" />
                      <span className="text-sm font-medium">YouTube</span>
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Quick Contact Section */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-blue-500" /> تواصل مباشر
              </h3>
              <div className="space-y-3">
                {contact?.email && (
                  <a
                    href={`mailto:${contact.email}`}
                    className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                      <MailIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-slate-500 dark:text-slate-400">البريد الإلكتروني</p>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200" dir="ltr">{contact.email}</p>
                    </div>
                    <Send className="w-4 h-4 text-slate-400" />
                  </a>
                )}
                {contact?.phone && (
                  <a
                    href={`tel:${contact.phone}`}
                    className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                      <PhoneIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-slate-500 dark:text-slate-400">رقم الهاتف</p>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200" dir="ltr">{contact.phone}</p>
                    </div>
                    <Send className="w-4 h-4 text-slate-400" />
                  </a>
                )}
                {teacher.website && (
                  <a
                    href={teacher.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    <div className="w-10 h-10 bg-violet-100 dark:bg-violet-900/30 rounded-lg flex items-center justify-center">
                      <GlobeIcon className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-slate-500 dark:text-slate-400">الموقع الإلكتروني</p>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate" dir="ltr">{teacher.website}</p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-slate-400" />
                  </a>
                )}
              </div>
            </div>

            {/* Subscription Card */}
            <div className="rounded-3xl p-6 text-white shadow-xl" style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}>
              <div className="flex items-center gap-3 mb-3">
                <Crown className="w-8 h-8" />
                <h3 className="font-bold text-xl">اشترك مع هذا المدرس</h3>
              </div>
              <p className="text-blue-50 text-sm mb-5 leading-relaxed">احصل على وصول كامل لجميع الفيديوهات والمحتوى الحصري من هذا المدرس المتميز</p>
              <Link
                to="/pricing"
                className="w-full px-4 py-3 bg-white dark:bg-slate-800 font-bold rounded-xl hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 shadow-lg"
                style={{ color: primary }}
              >
                عرض الباقات <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Achievements */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-500" /> الإنجازات
              </h3>
              <div className="space-y-3">
                {teacher.years_experience > 0 && (
                  <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                    <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
                      <Award className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{teacher.years_experience} سنوات خبرة</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">خبرة تعليمية</p>
                    </div>
                  </div>
                )}
                {reviews.length > 0 && avgRating >= 4.5 && (
                  <div className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                    <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                      <Star className="w-5 h-5 text-emerald-600 dark:text-emerald-400 fill-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">تقييم ممتاز</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{avgRating.toFixed(1)} من 5</p>
                    </div>
                  </div>
                )}
                {totalViews > 1000 && (
                  <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                      <Eye className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{(totalViews / 1000).toFixed(1)}K+ مشاهدة</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">محتوى مشهور</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
