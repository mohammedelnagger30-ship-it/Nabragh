interface SkeletonLoaderProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  count?: number;
}

export default function SkeletonLoader({
  className = '',
  variant = 'rectangular',
  width,
  height,
  count = 1,
}: SkeletonLoaderProps) {
  const baseClasses = 'animate-pulse bg-slate-200 dark:bg-slate-700';
  
  const variantClasses = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded',
    rounded: 'rounded-lg',
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  if (count === 1) {
    return (
      <div
        className={`${baseClasses} ${variantClasses[variant]} ${className}`}
        style={style}
      />
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`${baseClasses} ${variantClasses[variant]}`}
          style={style}
        />
      ))}
    </div>
  );
}

// Predefined skeleton components
export function CardSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <SkeletonLoader variant="rectangular" className="w-full aspect-video" />
      <div className="p-4 space-y-3">
        <SkeletonLoader variant="text" width="70%" />
        <SkeletonLoader variant="text" width="40%" />
      </div>
    </div>
  );
}

export function TeacherCardSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-slate-100 dark:border-slate-700 overflow-hidden">
      <SkeletonLoader variant="rectangular" className="w-full aspect-square" />
      <div className="p-5 space-y-3">
        <SkeletonLoader variant="text" width="60%" />
        <SkeletonLoader variant="text" width="40%" />
        <div className="flex items-center gap-2">
          <SkeletonLoader variant="circular" width={16} height={16} />
          <SkeletonLoader variant="text" width="30%" />
        </div>
      </div>
    </div>
  );
}

export function VideoCardSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <SkeletonLoader variant="rectangular" className="w-full aspect-video" />
      <div className="p-4 space-y-2">
        <SkeletonLoader variant="text" width="80%" />
        <SkeletonLoader variant="text" width="50%" />
        <div className="flex items-center gap-3 pt-2">
          <SkeletonLoader variant="text" width="20%" />
          <SkeletonLoader variant="text" width="15%" />
        </div>
      </div>
    </div>
  );
}

export function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <SkeletonLoader variant="circular" width={48} height={48} />
          <div className="flex-1 space-y-2">
            <SkeletonLoader variant="text" width="60%" />
            <SkeletonLoader variant="text" width="40%" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <SkeletonLoader variant="circular" width={56} height={56} />
        <div className="space-y-2">
          <SkeletonLoader variant="text" width="200px" height={24} />
          <SkeletonLoader variant="text" width="140px" height={16} />
        </div>
      </div>
      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800 space-y-2">
            <SkeletonLoader variant="rectangular" className="h-8 w-8 rounded-lg" />
            <SkeletonLoader variant="text" width="50%" height={28} />
            <SkeletonLoader variant="text" width="70%" />
          </div>
        ))}
      </div>
      {/* Content area */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800 space-y-3">
          <SkeletonLoader variant="text" width="40%" height={20} />
          <SkeletonLoader variant="rectangular" className="h-32 rounded-lg" />
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800 space-y-3">
          <SkeletonLoader variant="text" width="40%" height={20} />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <SkeletonLoader variant="circular" width={32} height={32} />
              <SkeletonLoader variant="text" width="70%" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
