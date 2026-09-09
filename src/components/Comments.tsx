import { useState, useEffect } from 'react';
import { MessageSquare, Reply, Send, Loader2, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import type { Comment } from '@/types';

interface CommentsProps {
  videoId: string;
}

export default function Comments({ videoId }: CommentsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    void loadComments();
  }, [videoId]);

  const loadComments = async () => {
    const { data } = await supabase
      .from('comments')
      .select('*, student:profiles!comments_student_id_fkey(*)')
      .eq('video_id', videoId)
      .is('parent_id', null)
      .order('created_at', { ascending: false });
    setComments((data as Comment[]) ?? []);
    setIsLoading(false);
  };

  const handleSubmitComment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || !newComment.trim()) return;
    setIsSubmitting(true);
    const { data, error } = await supabase
      .from('comments')
      .insert({
        comment: newComment.trim(),
        video_id: videoId,
        student_id: user.id,
        parent_id: replyTo,
      })
      .select('*, student:profiles!comments_student_id_fkey(*)')
      .single();

    setIsSubmitting(false);
    if (error || !data) {
      toast('حدث خطأ أثناء إضافة التعليق', 'error');
      return;
    }

    if (replyTo) {
      setComments((prev) => prev.map((item) => (
        item.id === replyTo ? { ...item, replies: [...(item.replies || []), data as Comment] } : item
      )));
      setReplyTo(null);
    } else {
      setComments((prev) => [data as Comment, ...prev]);
    }
    setNewComment('');
    toast('تم إضافة التعليق بنجاح', 'success');
  };

  const deleteComment = async (commentId: string) => {
    if (!confirm('هل تريد حذف هذا التعليق؟')) return;
    await supabase.from('comments').delete().eq('id', commentId);
    setComments((prev) => prev.filter((item) => item.id !== commentId));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {user ? (
        <form onSubmit={handleSubmitComment} className="space-y-4">
          {replyTo && (
            <div className="flex items-center justify-between rounded-lg bg-slate-100 p-3 dark:bg-slate-800">
              <span className="text-sm text-slate-600 dark:text-slate-300">الرد على تعليق</span>
              <button type="button" onClick={() => setReplyTo(null)} className="text-sm text-slate-500">إلغاء</button>
            </div>
          )}
          <textarea
            value={newComment}
            onChange={(event) => setNewComment(event.target.value)}
            placeholder="اكتب تعليقك هنا..."
            rows={3}
            className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          />
          <div className="flex justify-end">
            <button type="submit" disabled={isSubmitting || !newComment.trim()} className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              إرسال
            </button>
          </div>
        </form>
      ) : (
        <p className="text-sm text-slate-500 dark:text-slate-400">سجّل دخولك لإضافة تعليق.</p>
      )}

      <div className="flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-slate-600 dark:text-slate-400" />
        <h3 className="font-semibold text-slate-900 dark:text-white">التعليقات ({comments.length})</h3>
      </div>

      {comments.length === 0 ? (
        <div className="py-8 text-center text-slate-500 dark:text-slate-400">
          <p>لا توجد تعليقات بعد. كن أول من يعلق!</p>
        </div>
      ) : (
        comments.map((comment) => (
          <div key={comment.id} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="font-semibold text-slate-900 dark:text-white">{comment.student?.full_name || 'مستخدم'}</span>
              <span className="text-xs text-slate-400">{new Date(comment.created_at).toLocaleDateString('ar-EG')}</span>
            </div>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{comment.comment}</p>
            <div className="mt-2 flex gap-3">
              {user && (
                <button type="button" onClick={() => setReplyTo(comment.id)} className="flex items-center gap-1 text-sm text-slate-500">
                  <Reply className="h-4 w-4" /> رد
                </button>
              )}
              {comment.student_id === user?.id && (
                <button type="button" onClick={() => void deleteComment(comment.id)} className="flex items-center gap-1 text-sm text-red-500">
                  <Trash2 className="h-4 w-4" /> حذف
                </button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
