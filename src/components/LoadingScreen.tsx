import { Loader2, GraduationCap } from 'lucide-react';

interface LoadingScreenProps {
  message?: string;
  fullScreen?: boolean;
}

export default function LoadingScreen({ message = 'جاري التحميل...', fullScreen = true }: LoadingScreenProps) {
  const content = (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping" />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 shadow-lg shadow-blue-500/30">
          <GraduationCap className="h-8 w-8 text-white animate-spin" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{message}</p>
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm">
        {content}
      </div>
    );
  }

  return (
    <div className="flex min-h-[200px] items-center justify-center">
      {content}
    </div>
  );
}
