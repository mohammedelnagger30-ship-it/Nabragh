import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';
import { ThemeProvider } from '@/context/ThemeContext';
import ScrollToTop from '@/components/ScrollToTop';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ErrorBoundary from '@/components/ErrorBoundary';
import PwaInstallPrompt from '@/components/PwaInstallPrompt';
import LandingPage from '@/pages/LandingPage';
import TeachersPage from '@/pages/TeachersPage';
import TeacherProfilePage from '@/pages/TeacherProfilePage';
import AcademyPage from '@/pages/AcademyPage';
import VideoPlayerPage from '@/pages/VideoPlayerPage';
import CourseDetailPage from '@/pages/CourseDetailPage';
import CoursesPage from '@/pages/CoursesPage';
import CategoriesPage from '@/pages/CategoriesPage';
import DashboardPage from '@/pages/DashboardPage';
import SearchPage from '@/pages/SearchPage';
import SignInPage from '@/pages/SignInPage';
import SignUpPage from '@/pages/SignUpPage';
import ForgotPasswordPage from '@/pages/ForgotPasswordPage';
import InfoPage from '@/pages/InfoPage';
import NotFoundPage from '@/pages/NotFoundPage';
import CompetitionsPage from '@/pages/CompetitionsPage';
import CertificatePage from '@/pages/CertificatePage';
import AdminPortalShell from '@/components/AdminPortalShell';
import AdminEntryPage from '@/pages/AdminEntryPage';
import TeacherAdminPage from '@/pages/TeacherAdminPage';
import { homePath } from '@/lib/roles';
import { useAuth } from '@/context/AuthContext';

function SettingsRedirect() {
  const { profile, isAdmin, loading } = useAuth();
  if (loading) return null;
  return <Navigate to={isAdmin ? '/admin' : `${homePath(profile, isAdmin)}?tab=account`} replace />;
}

function RootLandingRoute() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) {
    return <SignUpPage />;
  }
  return <LandingPage />;
}

function AuthGuard({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return children;
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
  return (
    <>
      <ScrollToTop />
      <ErrorBoundary>
        <div dir="rtl" className="min-h-screen bg-white dark:bg-slate-900 font-sans transition-colors duration-200">
          <Navbar />
          <main className="overflow-x-clip pb-[4.5rem] md:pb-0">
            <Routes>
              <Route path="/" element={<RootLandingRoute />} />
              <Route path="/teachers" element={<TeachersPage />} />
              <Route path="/teacher/:id" element={<TeacherProfilePage />} />
              <Route path="/academy/:slug" element={<AcademyPage />} />
              <Route path="/video/:id" element={<VideoPlayerPage />} />
              <Route path="/course/:id" element={<CourseDetailPage />} />
              <Route path="/courses" element={<CoursesPage />} />
              <Route path="/categories" element={<CategoriesPage />} />
              <Route path="/competitions" element={<CompetitionsPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/settings" element={<SettingsRedirect />} />
              <Route path="/signin" element={<AuthGuard><SignInPage /></AuthGuard>} />
              <Route path="/signup" element={<AuthGuard><SignUpPage /></AuthGuard>} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/about" element={<InfoPage />} />
              <Route path="/privacy" element={<InfoPage />} />
              <Route path="/terms" element={<InfoPage />} />
              <Route path="/certificate/:id" element={<CertificatePage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
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
