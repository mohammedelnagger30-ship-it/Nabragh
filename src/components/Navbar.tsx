import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { GraduationCap, Menu, X, User, LogOut, LayoutDashboard, Search, Moon, Sun, Bell, Home, BookOpen, Layers } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { homePath } from '@/lib/roles';
import { supabase } from '@/lib/supabase';
import { useSiteSettings } from '@/lib/siteSettings';

export default function Navbar() {
  const { user, profile, isAdmin, signOut } = useAuth();
  const { setTheme, actualTheme } = useTheme();
  const siteSettings = useSiteSettings();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setUnreadCount(0);
      return;
    }
    const loadUnread = async () => {
      try {
        const { count } = await supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_read', false).limit(1);
        if (!cancelled) setUnreadCount(count ?? 0);
      } catch {
        if (!cancelled) setUnreadCount(0);
      }
    };
    void loadUnread();
    const channel = supabase
      .channel('navbar-notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, () => void loadUnread())
      .subscribe();
    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const navLinks = [
    { to: '/', label: 'الرئيسية' },
    { to: '/teachers', label: 'المدرسون' },
    { to: '/courses', label: 'الدورات' },
    { to: '/categories', label: 'التخصصات' },
    { to: '/search', label: 'البحث' },
  ];

  return (
    <>
      {/* Mobile Top Navigation Bar (formerly bottom) */}
      <div className="fixed top-0 left-0 right-0 z-[60] border-b border-slate-200/80 bg-white dark:border-slate-800/80 dark:bg-slate-900 shadow-2xl md:hidden" style={{ paddingTop: 'max(0px, env(safe-area-inset-top))' }}>
        <div className="grid grid-cols-5 gap-2 items-center max-w-lg mx-auto px-4 py-2">
          {[
            { to: '/', label: 'الرئيسية', icon: Home },
            { to: '/teachers', label: 'المدرسون', icon: GraduationCap },
            { to: '/courses', label: 'الدورات', icon: BookOpen },
            { to: '/categories', label: 'التخصصات', icon: Layers },
            { to: user ? homePath(profile, isAdmin) : '/signin', label: user ? 'حسابي' : 'دخول', icon: user ? LayoutDashboard : User },
          ].map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-col items-center justify-center gap-1 rounded-xl py-2.5 px-1 transition-all duration-200 ${
                  active 
                    ? 'bg-gradient-to-br from-blue-50 to-cyan-50 text-blue-600 dark:from-blue-900/30 dark:to-cyan-900/30 dark:text-blue-400 scale-105 shadow-sm' 
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <div className={`relative ${active ? 'scale-110' : ''}`}>
                  <Icon className={`h-5 w-5 transition-transform ${active ? 'text-blue-600 dark:text-blue-400' : ''}`} aria-hidden="true" />
                  {active && (
                    <span className="absolute -top-1 -right-1 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-bold">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Desktop Navigation Bar (at top for desktop) */}
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-slate-200/70 bg-white/95 dark:border-slate-700/70 dark:bg-slate-900/95 shadow-[0_8px_30px_rgba(15,23,42,0.05)] backdrop-blur-sm hidden md:block" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-[4.5rem] items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-gradient-to-br from-brand-600 via-brand-600 to-brand-cyan-500 shadow-lg shadow-blue-500/25 transition-transform group-hover:scale-105">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-lg font-extrabold tracking-normal text-slate-800 dark:text-white sm:text-xl">{String(siteSettings.site_name ?? 'Noona')}</span>
              <span className="hidden text-[11px] font-medium text-slate-400 dark:text-slate-500 sm:block">{String(siteSettings.site_tagline ?? 'منصتك التعليمية الشاملة')}</span>
            </div>
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                aria-label={link.label}
                aria-current={location.pathname === link.to ? 'page' : undefined}
                className={`rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors ${
                  location.pathname === link.to ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'text-slate-600 dark:text-slate-300 hover:text-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-900/20'
                }`}
              >
                {link.to === '/search' ? <span className="flex items-center"><Search className="h-5 w-5" aria-hidden="true" /><span className="sr-only">البحث</span></span> : link.label}
              </Link>
            ))}
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <button
              onClick={() => setTheme(actualTheme === 'dark' ? 'light' : 'dark')}
              className="rounded-xl p-2 text-slate-600 dark:text-slate-300 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label={actualTheme === 'dark' ? 'الوضع الفاتح' : 'الوضع الليلي'}
              title={actualTheme === 'dark' ? 'الوضع الفاتح' : 'الوضع الليلي'}
            >
              {actualTheme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            {user ? (
              <>
                {!profile?.is_teacher && (
                  <Link
                    to="/dashboard?tab=notifications"
                    className="relative flex items-center justify-center rounded-xl p-2 text-slate-600 dark:text-slate-300 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                    aria-label="الإشعارات"
                    title="الإشعارات"
                  >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -left-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </Link>
                )}
                <Link
                  to={`${homePath(profile, isAdmin)}?tab=account`}
                  className="flex items-center gap-2 rounded-xl bg-slate-100/90 dark:bg-slate-800/90 px-2.5 py-1.5 transition-colors hover:bg-slate-200 dark:hover:bg-slate-700"
                  title="الإعدادات"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-brand-cyan-400 flex items-center justify-center text-white text-sm font-bold overflow-hidden">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt={profile?.full_name ?? 'avatar'} className="w-full h-full object-cover" decoding="async" />
                    ) : (
                      profile?.full_name?.charAt(0) ?? 'U'
                    )}
                  </div>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200 max-w-[120px] truncate">
                    {profile?.full_name}
                  </span>
                </Link>
                <button
                  onClick={handleSignOut}
                  className="rounded-xl p-2 text-slate-500 dark:text-slate-400 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 dark:hover:text-red-400"
                  title="تسجيل الخروج"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/signin"
                  className="flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <User className="w-4 h-4" />
                  تسجيل الدخول
                </Link>
                <Link
                  to="/signup"
                  className="rounded-xl bg-gradient-to-r from-brand-600 to-brand-cyan-500 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-500/25 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-500/30"
                >
                  انضم الآن
                </Link>
              </>
            )}
          </div>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="rounded-xl p-2 text-slate-600 dark:text-slate-300 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden"
            aria-label={mobileOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {mobileOpen && (
          <div className="space-y-1 border-t border-slate-200/80 dark:border-slate-700/80 py-4 md:hidden">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                aria-current={location.pathname === link.to ? 'page' : undefined}
                className={`block px-4 py-3 text-sm font-medium rounded-lg transition-colors ${location.pathname === link.to ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'text-slate-600 dark:text-slate-300 hover:text-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-900/20'}`}
              >
                {link.label}
              </Link>
            ))}
            <button
              onClick={() => setTheme(actualTheme === 'dark' ? 'light' : 'dark')}
              className="flex items-center gap-2 w-full px-4 py-3 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              {actualTheme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              {actualTheme === 'dark' ? 'الوضع الفاتح' : 'الوضع الليلي'}
            </button>
            {user ? (
              <>
                <Link
                  to={`${homePath(profile, isAdmin)}?tab=account`}
                  onClick={() => setMobileOpen(false)}
                  className="block px-4 py-3 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                >
                  الإعدادات
                </Link>
                <button
                  onClick={() => { handleSignOut(); setMobileOpen(false); }}
                  className="block w-full text-right px-4 py-3 text-sm font-medium text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  تسجيل الخروج
                </button>
              </>
            ) : (
              <div className="flex flex-col gap-2 px-4 pt-2">
                <Link
                  to="/signin"
                  onClick={() => setMobileOpen(false)}
                  className="px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-lg text-center"
                >
                  تسجيل الدخول
                </Link>
                <Link
                  to="/signup"
                  onClick={() => setMobileOpen(false)}
                  className="px-4 py-3 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-cyan-500 rounded-lg text-center"
                >
                  انضم الآن
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
    </>
  );
}