import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';
import { ThemeProvider } from '@/context/ThemeContext';
import ScrollToTop from '@/components/ScrollToTop';
import LoadingBar from '@/components/LoadingBar';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ErrorBoundary from '@/components/ErrorBoundary';
import PwaInstallPrompt from '@/components/PwaInstallPrompt';
import { lazy, Suspense } from 'react';
import { ArrowLeft, LockKeyhole } from 'lucide-react';
import LoadingScreen from '@/components/LoadingScreen';

// Lazy load large pages
const LandingPage = lazy(() => import('@/pages/LandingPage'));
const TeachersPage = lazy(() => import('@/pages/TeachersPage'));
const TeacherProfilePage = lazy(() => import('@/pages/TeacherProfilePage'));
const AcademyPage = lazy(() => import('@/pages/AcademyPage'));
const VideoPlayerPage = lazy(() => import('@/pages/VideoPlayerPage'));
const CourseDetailPage = lazy(() => import('@/pages/CourseDetailPage'));
const CoursesPage = lazy(() => import('@/pages/CoursesPage'));
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const SearchPage = lazy(() => import('@/pages/SearchPage'));
const CompetitionsPage = lazy(() => import('@/pages/CompetitionsPage'));
const CheckoutPage = lazy(() => import('@/pages/CheckoutPage'));
const PaymentStatusPage = lazy(() => import('@/pages/PaymentStatusPage'));

// Load smaller pages normally
import CategoriesPage from '@/pages/CategoriesPage';
import SignInPage from '@/pages/SignInPage';
import SignUpPage from '@/pages/SignUpPage';
import ForgotPasswordPage from '@/pages/ForgotPasswordPage';
import InfoPage from '@/pages/InfoPage';
import NotFoundPage from '@/pages/NotFoundPage';
import CertificatePage from '@/pages/CertificatePage';
import BecomeTeacherPage from '@/pages/BecomeTeacherPage';
import ContactPage from '@/pages/ContactPage';
import AdminPortalShell from '@/components/AdminPortalShell';
import AdminEntryPage from '@/pages/AdminEntryPage';
import TeacherAdminPage from '@/pages/TeacherAdminPage';
import { homePath } from '@/lib/roles';
import { useAuth } from '@/context/AuthContext';

function SettingsRedirect() {
  const { profile, isAdmin, loading } = useAuth();
  if (loading) return <LoadingScreen message="جاري تجهيز مساحتك..." />;
  return <Navigate to={isAdmin ? '/admin' : `${homePath(profile, isAdmin)}?tab=account`} replace />;
}

function RootLandingRoute() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen message="جاري تجهيز Noona..." />;
  
  // Check if running in Capacitor (mobile app)
  const isMobile = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } })?.Capacitor?.isNativePlatform?.();
  
  if (!user) {
    // On mobile, require sign in. On web, show landing page.
    return isMobile ? <SignInPage /> : <LandingPage />;
  }
  return <LandingPage />;
}

function AuthGuard({ children }: { children: JSX.Element }) {
  const { user, loading, profile, isAdmin } = useAuth();
  if (loading) return <LoadingScreen message="جاري التحقق من الحساب..." />;
  if (user && !profile) return <LoadingScreen message="جاري تجهيز مساحتك..." />;
  if (user) return <Navigate to={homePath(profile, isAdmin)} replace />;
  return children;
}

function RequireAuth({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <LoadingScreen message="نتحقق من حسابك..." />;
  if (!user) return <AccessRequiredScreen pathname={`${location.pathname}${location.search}`} />;
  return children;
}

function AccessRequiredScreen({ pathname }: { pathname: string }) {
  const signInUrl = `/signin?next=${encodeURIComponent(pathname)}`;
  return (
    <div className="flex min-h-[calc(100vh-9rem)] items-center justify-center bg-slate-50 px-4 py-16 dark:bg-slate-950">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-xl shadow-slate-200/50 dark:border-slate-700 dark:bg-slate-900 dark:shadow-none sm:p-9">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
          <LockKeyhole className="h-8 w-8" />
        </div>
        <h1 className="mt-5 text-2xl font-extrabold text-slate-900 dark:text-white">سجّل دخولك للمتابعة</h1>
        <p className="mt-2 text-sm leading-7 text-slate-500 dark:text-slate-400">هذه الصفحة متاحة للأعضاء. سجّل الدخول لتصفح المدرسين والدورات ومتابعة رحلتك التعليمية.</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link to={signInUrl} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700"><LockKeyhole className="h-4 w-4" /> تسجيل الدخول</Link>
          <Link to="/" className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"><ArrowLeft className="h-4 w-4" /> العودة للرئيسية</Link>
        </div>
        <p className="mt-5 text-xs text-slate-400 dark:text-slate-500">ليس لديك حساب؟ <Link to="/signup" className="font-bold text-blue-600 hover:underline">أنشئ حسابًا جديدًا</Link></p>
      </div>
    </div>
  );
}

function AppRoutes() {
  const location = useLocation();
  if (location.pathname.startsWith('/admin')) {
    if (location.pathname.startsWith('/admin/teacher')) {
      return <AdminPortalShell mode="teacher"><Routes><Route path="/admin/teacher" element={<TeacherAdminPage />} /></Routes></AdminPortalShell>;
    }
    return <Routes><Route path="/admin" element={<AdminEntryPage />} /></Routes>;
  }
  return <PublicApp />;
}

function PublicApp() {
  const location = useLocation();
  const transitionKey = `${location.pathname}${location.search}`;

  return (
    <>
      <ScrollToTop />
      <LoadingBar />
      <ErrorBoundary>
        <div dir="rtl" className="min-h-screen bg-white dark:bg-slate-900 font-sans transition-colors duration-200">
          <Navbar />
          <main className="pt-[4rem] overflow-x-clip pb-[4.5rem] md:pt-[4.5rem] md:pb-0">
            <Suspense fallback={<LoadingScreen />}>
              <div key={transitionKey} className="route-transition">
                <Routes>
                  <Route path="/" element={<RootLandingRoute />} />
                  <Route path="/teachers" element={<TeachersPage />} />
                  <Route path="/teacher/:id" element={<TeacherProfilePage />} />
                  <Route path="/academy/:slug" element={<AcademyPage />} />
                  <Route path="/video/:id" element={<VideoPlayerPage />} />
                  <Route path="/course/:id" element={<RequireAuth><CourseDetailPage /></RequireAuth>} />
                  <Route path="/courses" element={<CoursesPage />} />
                  <Route path="/categories" element={<CategoriesPage />} />
                  <Route path="/competitions" element={<RequireAuth><CompetitionsPage /></RequireAuth>} />
                  <Route path="/search" element={<SearchPage />} />
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/settings" element={<SettingsRedirect />} />
                  <Route path="/signin" element={<AuthGuard><SignInPage /></AuthGuard>} />
                  <Route path="/signup" element={<AuthGuard><SignUpPage /></AuthGuard>} />
                  <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                  <Route path="/about" element={<InfoPage />} />
                  <Route path="/privacy" element={<InfoPage />} />
                  <Route path="/terms" element={<InfoPage />} />
                  <Route path="/become-teacher" element={<BecomeTeacherPage />} />
                  <Route path="/contact" element={<ContactPage />} />
                  <Route path="/certificate/:id" element={<CertificatePage />} />
                  <Route path="/checkout" element={<RequireAuth><CheckoutPage /></RequireAuth>} />
                  <Route path="/payment-status" element={<RequireAuth><PaymentStatusPage /></RequireAuth>} />
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </div>
            </Suspense>
          </main>
          <Footer />
          <PwaInstallPrompt />
        </div>
      </ErrorBoundary>
    </>
  );
}

function App() {
  return (
    <HelmetProvider>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </HelmetProvider>
  );
}

export default App;
