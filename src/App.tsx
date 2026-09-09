import { BrowserRouter, Routes, Route } from 'react-router-dom';
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
import VideoPlayerPage from '@/pages/VideoPlayerPage';
import CourseDetailPage from '@/pages/CourseDetailPage';
import CoursesPage from '@/pages/CoursesPage';
import CategoriesPage from '@/pages/CategoriesPage';
import AdminPage from '@/pages/AdminPage';
import PricingPage from '@/pages/PricingPage';
import DashboardPage from '@/pages/DashboardPage';
import SearchPage from '@/pages/SearchPage';
import SignInPage from '@/pages/SignInPage';
import SignUpPage from '@/pages/SignUpPage';
import ForgotPasswordPage from '@/pages/ForgotPasswordPage';
import InfoPage from '@/pages/InfoPage';
import NotFoundPage from '@/pages/NotFoundPage';
import CompetitionsPage from '@/pages/CompetitionsPage';
import CertificatePage from '@/pages/CertificatePage';

function App() {
  return (
    <HelmetProvider>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <BrowserRouter>
              <ScrollToTop />
              <ErrorBoundary>
                <div dir="rtl" className="min-h-screen bg-white dark:bg-slate-900 font-sans transition-colors duration-200">
                  <Navbar />
                  <main>
                    <Routes>
                      <Route path="/" element={<LandingPage />} />
                      <Route path="/teachers" element={<TeachersPage />} />
                      <Route path="/teacher/:id" element={<TeacherProfilePage />} />
                      <Route path="/video/:id" element={<VideoPlayerPage />} />
                      <Route path="/course/:id" element={<CourseDetailPage />} />
                      <Route path="/courses" element={<CoursesPage />} />
                      <Route path="/categories" element={<CategoriesPage />} />
                      <Route path="/competitions" element={<CompetitionsPage />} />
                      <Route path="/search" element={<SearchPage />} />
                      <Route path="/pricing" element={<PricingPage />} />
                      <Route path="/dashboard" element={<DashboardPage />} />
                      <Route path="/admin" element={<AdminPage />} />
                      <Route path="/signin" element={<SignInPage />} />
                      <Route path="/signup" element={<SignUpPage />} />
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
            </BrowserRouter>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </HelmetProvider>
  );
}

export default App;
