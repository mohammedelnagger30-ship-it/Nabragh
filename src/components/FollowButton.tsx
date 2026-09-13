import { useState } from 'react';
import { UserPlus, UserCheck, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

interface FollowButtonProps {
  teacherId: string;
  isFollowing: boolean;
  onFollowChange?: (isFollowing: boolean) => void;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

export default function FollowButton({
  teacherId,
  isFollowing: initialIsFollowing,
  onFollowChange,
  variant = 'primary',
  size = 'md',
}: FollowButtonProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [isLoading, setIsLoading] = useState(false);

  const handleFollow = async () => {
    if (!user) {
      toast('يجب تسجيل الدخول لمتابعة المدرسين', 'error');
      return;
    }

    setIsLoading(true);
    try {
      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from('teacher_follows')
          .delete()
          .eq('teacher_id', teacherId)
          .eq('student_id', user.id);
        
        if (error) throw error;
        
        setIsFollowing(false);
        onFollowChange?.(false);
        toast('تم إلغاء المتابعة', 'success');
      } else {
        // Follow
        const { error } = await supabase
          .from('teacher_follows')
          .insert({
            teacher_id: teacherId,
            student_id: user.id,
          });
        
        if (error) throw error;
        
        setIsFollowing(true);
        onFollowChange?.(true);
        toast('تمت المتابعة بنجاح', 'success');
      }
    } catch (error) {
      console.error('Error following teacher:', error);
      toast('حدث خطأ أثناء المتابعة', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
  };

  const variantClasses = {
    primary: isFollowing
      ? 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
      : 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: isFollowing
      ? 'bg-slate-500/20 text-white hover:bg-slate-500/30 ring-1 ring-white/30 dark:ring-slate-600'
      : 'bg-white text-blue-700 shadow-sm hover:bg-blue-50 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-500',
    outline: isFollowing
      ? 'border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
      : 'border-blue-600 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20',
  };

  return (
    <button
    aria-label={isFollowing ? 'إلغاء متابعة المعلم' : 'متابعة المعلم'}
      onClick={handleFollow}
      disabled={isLoading}
      className={`inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${sizeClasses[size]} ${variantClasses[variant]}`}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : isFollowing ? (
        <>
          <UserCheck className="w-4 h-4" />
          متابَع
        </>
      ) : (
        <>
          <UserPlus className="w-4 h-4" />
          متابعة
        </>
      )}
    </button>
  );
}
