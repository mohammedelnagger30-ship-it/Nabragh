import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, GraduationCap, Crown, LogOut, Home, Moon, Sun } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';

export default function AdminPortalShell({ children, mode = 'site' }: { children: ReactNode; mode?: 'site' | 'teacher' }) {
  const { user, profile, signOut } = useAuth();
  const { actualTheme, setTheme } = useTheme();
  const isTeacher = mode === 'teacher';

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 font-sans text-slate-900 dark:text-slate-100">
      <header className="sticky top-0 z-50 border-b border-white/20 bg-white/80 backdrop-blur-xl dark:bg-slate-900/80">
        <div className="mx-auto max-w-[1800px] px-4 sm:px-6 lg:px-8">
          <div className="flex h-20 items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={isTeacher ? "/admin/teacher" : "/admin"} className="flex items-center gap-3 group">
                <div className={`flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-lg transition-all group-hover:scale-105 ${
                  isTeacher
                    ? 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/30'
                    : 'bg-gradient-to-br from-blue-600 to-indigo-600 shadow-blue-500/30'
                }`}>
                  {isTeacher ? <GraduationCap className="h-7 w-7" /> : <ShieldCheck className="h-7 w-7" />}
                </div>
                <div>
                  <h1 className={`text-base font-extrabold bg-clip-text text-transparent sm:text-2xl ${
                    isTeacher
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400'
                      : 'bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400'
                  }`}>
                    {isTeacher ? 'مساحة إدارة المدرس' : 'مركز إدارة منصة العلم'}
                  </h1>
                  <p className="hidden text-sm text-slate-500 dark:text-slate-400 sm:block">
                    {isTeacher ? 'إدارة محتواك وطلابك' : 'لوحة المدير العام - إدارة مستقلة وآمنة'}
                  </p>
                </div>
              </Link>
            </div>

            <div className="flex items-center gap-3">
              <Link to="/" aria-label="العودة للموقع" title="العودة للموقع" className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-blue-600 dark:text-slate-300 dark:hover:bg-slate-800">
                <Home className="h-5 w-5" />
              </Link>
              <button type="button" onClick={() => setTheme(actualTheme === 'dark' ? 'light' : 'dark')} aria-label={actualTheme === 'dark' ? 'الوضع الفاتح' : 'الوضع الليلي'} title={actualTheme === 'dark' ? 'الوضع الفاتح' : 'الوضع الليلي'} className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-blue-600 dark:text-slate-300 dark:hover:bg-slate-800">
                {actualTheme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
              <div className={`flex items-center gap-2 rounded-xl px-4 py-2 border ${
                isTeacher
                  ? 'bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-emerald-200 dark:border-emerald-700'
                  : 'bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-700 border-slate-200 dark:border-slate-600'
              }`}>
                <div className={`h-2 w-2 rounded-full animate-pulse ${isTeacher ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                <span className="hidden text-sm font-semibold text-slate-700 dark:text-slate-200 sm:inline">
                  {profile?.full_name || user?.user_metadata?.full_name || 'المستخدم'}
                </span>
              </div>

              <button
                onClick={signOut}
                className="flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-800 px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span className="text-sm font-medium">خروج</span>
              </button>
            </div>
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}