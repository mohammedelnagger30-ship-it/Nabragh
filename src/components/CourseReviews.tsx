import { useState, useEffect } from 'react';
import { Star, MessageSquare, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import type { CourseReview } from '@/types';

interface CourseReviewsProps {
  courseId: string;
}

export default function CourseReviews({ courseId }: CourseReviewsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reviews, setReviews] = useState<CourseReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userReview, setUserReview] = useState<CourseReview | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadReviews();
  }, [courseId]);

  const loadReviews = async () => {
    try {
      const { data } = await supabase
        .from('course_reviews')
        .select('*, student:profiles(*)')
        .eq('course_id', courseId)
        .order('created_at', { ascending: false })
        .limit(10);
      
      setReviews((data as CourseReview[]) ?? []);

      if (user) {
        const { data: userReviewData } = await supabase
          .from('course_reviews')
          .select('*, student:profiles(*)')
          .eq('course_id', courseId)
          .eq('student_id', user.id)
          .maybeSingle();
        setUserReview(userReviewData as CourseReview | null);
      }
    } catch (error) {
      console.error('Error loading reviews:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || rating === 0) return;

    setIsSubmitting(true);
    try {
      if (userReview) {
        // Update existing review
        const { error } = await supabase
          .from('course_reviews')
          .update({ rating, comment })
          .eq('id', userReview.id);
        
        if (error) throw error;
        toast('تم تحديث تقييمك بنجاح', 'success');
      } else {
        // Create new review
        const { error } = await supabase
          .from('course_reviews')
          .insert({
            course_id: courseId,
            student_id: user.id,
            rating,
            comment,
          });
        
        if (error) throw error;
        toast('تم إضافة تقييمك بنجاح', 'success');
      }

      setShowForm(false);
      setRating(0);
      setComment('');
      loadReviews();
    } catch (error) {
      console.error('Error submitting review:', error);
      toast('حدث خطأ أثناء إرسال التقييم', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  const ratingCounts = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: reviews.filter(r => r.rating === star).length,
    percentage: reviews.length > 0 ? (reviews.filter(r => r.rating === star).length / reviews.length) * 100 : 0,
  }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Rating Summary */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
        <div className="grid md:grid-cols-2 gap-8">
          <div className="text-center md:text-right">
            <div className="text-5xl font-bold text-slate-900 dark:text-white mb-2">
              {averageRating.toFixed(1)}
            </div>
            <div className="flex items-center justify-center md:justify-start gap-1 mb-2">
              {[1, 2, 3, 4, 5].map(star => (
                <Star
                  key={star}
                  className={`w-5 h-5 ${star <= Math.round(averageRating) ? 'text-amber-400 fill-amber-400' : 'text-slate-300 dark:text-slate-600'}`}
                />
              ))}
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">
              {reviews.length} تقييم
            </div>
          </div>

          <div className="space-y-2">
            {ratingCounts.map(({ star, count, percentage }) => (
              <div key={star} className="flex items-center gap-3">
                <div className="flex items-center gap-1 w-16">
                  <span className="text-sm text-slate-600 dark:text-slate-300">{star}</span>
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                </div>
                <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded-full transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400 w-8 text-left">
                  {count}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add Review Button */}
      {user && !userReview && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          <Star className="w-5 h-5" />
          أضف تقييمك لهذه الدورة
        </button>
      )}

      {/* Review Form */}
      {showForm && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
            {userReview ? 'تعديل تقييمك' : 'أضف تقييمك'}
          </h3>
          <form onSubmit={handleSubmitReview} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                التقييم
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 transition-transform hover:scale-110"
                  >
                    <Star
                      className={`w-8 h-8 ${star <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-300 dark:text-slate-600'}`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                تعليقك (اختياري)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="شارك تجربتك مع هذه الدورة..."
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isSubmitting || rating === 0}
                className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-600 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    جاري الإرسال...
                  </>
                ) : (
                  <>
                    <Star className="w-5 h-5" />
                    {userReview ? 'تحديث التقييم' : 'إرسال التقييم'}
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setRating(userReview?.rating ?? 0); setComment(userReview?.comment ?? ''); }}
                className="px-6 py-3 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Reviews List */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">التقييمات الأخيرة</h3>
        
        {reviews.length === 0 ? (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
            <p>لا توجد تقييمات بعد</p>
            <p className="text-sm mt-1">كن أول من يقيّم هذه الدورة!</p>
          </div>
        ) : (
          reviews.map((review) => (
            <div
              key={review.id}
              className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
                  {review.student?.avatar_url ? (
                    <img
                      src={review.student.avatar_url}
                      alt={review.student.full_name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    review.student?.full_name?.charAt(0) || 'U'
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {review.student?.full_name || 'مستخدم'}
                    </span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map(star => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${star <= review.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-300 dark:text-slate-600'}`}
                        />
                      ))}
                    </div>
                  </div>
                  
                  {review.comment && (
                    <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                      {review.comment}
                    </p>
                  )}
                  
                  <div className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                    {new Date(review.created_at).toLocaleDateString('ar-SA', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
