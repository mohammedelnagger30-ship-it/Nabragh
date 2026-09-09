import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { GraduationCap, Menu, X, User, LogOut, LayoutDashboard, Search, Shield } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function Navbar() {
  const { user, profile, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const navLinks = [
    { to: '/', label: 'الرئيسية' },
    { to: '/teachers', label: 'المدرسون' },
    { to: '/courses', label: 'الدورات' },
    { to: '/categories', label: 'التخصصات' },
    { to: '/competitions', label: 'المنافسات' },
    { to: '/search', label: 'البحث' },
    { to: '/pricing', label: 'الباقات' },
  ];

  return (
    <nav className="fixed inset-x-0 top-0 z-50 border-b border-slate-200/70 bg-white/90 shadow-[0_8px_30px_rgba(15,23,42,0.05)] backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-[4.5rem] items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-gradient-to-br from-blue-600 via-blue-600 to-cyan-500 shadow-lg shadow-blue-500/25 transition-transform group-hover:scale-105">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <span className="text-lg font-extrabold tracking-normal text-slate-800 sm:text-xl">منصة العلم</span>
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                aria-current={location.pathname === link.to ? 'page' : undefined}
                className={`rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors ${
                  location.pathname === link.to ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50/50'
                }`}
              >
                {link.to === '/search' ? <Search className="h-5 w-5" aria-label="البحث" /> : link.label}
              </Link>
            ))}
          </div>

          <div className="hidden items-center gap-2 md:flex">
            {user ? (
              <>
                {isAdmin && (
                  <Link
                    to="/admin"
                    className="flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
                  >
                    <Shield className="w-4 h-4" />
                    الإدارة
                  </Link>
                )}
                <Link
                  to="/dashboard"
                  className="flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  لوحة التحكم
                </Link>
                <div className="flex items-center gap-2 rounded-xl bg-slate-100/90 px-2.5 py-1.5">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white text-sm font-bold">
                    {profile?.full_name?.charAt(0) ?? 'U'}
                  </div>
                  <span className="text-sm font-medium text-slate-700 max-w-[120px] truncate">
                    {profile?.full_name}
                  </span>
                </div>
                <button
                  onClick={handleSignOut}
                  className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-red-50 hover:text-red-500"
                  title="تسجيل الخروج"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/signin"
                  className="flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
                >
                  <User className="w-4 h-4" />
                  تسجيل الدخول
                </Link>
                <Link
                  to="/signup"
                  className="rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-500/25 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-500/30"
                >
                  انضم الآن
                </Link>
              </>
            )}
          </div>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="rounded-xl p-2 text-slate-600 transition-colors hover:bg-slate-100 md:hidden"
            aria-label={mobileOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {mobileOpen && (
          <div className="space-y-1 border-t border-slate-200/80 py-4 md:hidden">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                aria-current={location.pathname === link.to ? 'page' : undefined}
                className={`block px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${location.pathname === link.to ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50/50'}`}
              >
                {link.label}
              </Link>
            ))}
            {user ? (
              <>
                {isAdmin && (
                  <Link
                    to="/admin"
                    onClick={() => setMobileOpen(false)}
                    className="block px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50/50 rounded-lg transition-colors"
                  >
                    الإدارة
                  </Link>
                )}
                <Link
                  to="/dashboard"
                  onClick={() => setMobileOpen(false)}
                  className="block px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50/50 rounded-lg transition-colors"
                >
                  لوحة التحكم
                </Link>
                <button
                  onClick={() => { handleSignOut(); setMobileOpen(false); }}
                  className="block w-full text-right px-4 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  تسجيل الخروج
                </button>
              </>
            ) : (
              <div className="flex flex-col gap-2 px-4 pt-2">
                <Link
                  to="/signin"
                  onClick={() => setMobileOpen(false)}
                  className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg text-center"
                >
                  تسجيل الدخول
                </Link>
                <Link
                  to="/signup"
                  onClick={() => setMobileOpen(false)}
                  className="px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-cyan-500 rounded-lg text-center"
                >
                  انضم الآن
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
