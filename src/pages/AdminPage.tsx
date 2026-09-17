import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Loader2,
  Users,
  BookOpen,
  GraduationCap,
  Check,
  X,
  Plus,
  DollarSign,
  Search,
  ArrowUp,
  ArrowDown,
  Settings,
  Star,
  Film,
  Globe,
  TrendingUp,
  BarChart3,
  Eye,
  UserCheck,
  CreditCard,
  AlertTriangle,
  RefreshCw,
  Shield,
  Zap,
  Activity,
  Phone,
  Facebook,
  Youtube,
  Instagram,
  Music2,
  Send,
  Twitter,
  Type,
  Home,
  Globe2,
  Save,
  CheckCircle2,
  Link2,
  EyeOff,
  MessageSquare,
  FileDown,
  Swords,
  Clock,
  Trophy,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { SITE_SETTINGS_DEFAULTS, invalidateSiteSettingsCache, type SiteSettings } from '@/lib/siteSettings';
import { downloadExcel } from '@/lib/excelExport';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import AdminConfirmModal from '@/components/AdminConfirmModal';
import AdminPagination from '@/components/AdminPagination';

type TabId = 'home' | 'overview' | 'analytics' | 'teachers' | 'students' | 'courses' | 'videos' | 'exams' | 'moderation' | 'subscriptions' | 'broadcast' | 'admins' | 'reports' | 'settings' | 'performance' | 'audit' | 'devices';

interface AdminSubscriptionRow {
  id: string;
  student_name: string | null;
  course_title: string | null;
  access_type: string | null;
  plan_name: string | null;
  price: number | null;
  status: string | null;
  payment_status: string | null;
  end_date: string | null;
  created_at: string;
}

interface AdminTeacherRow {
  id: string;
  full_name: string | null;
  email: string | null;
  specialization: string | null;
  is_approved: boolean;
  is_verified: boolean;
  created_at: string;
  course_count: number;
  student_count: number;
  revenue: number;
}

interface AdminStudentRow {
  id: string;
  full_name: string | null;
  email: string | null;
  created_at: string;
  enrollment_count: number;
  total_spent: number;
}

interface AdminVideoRow {
  id: string;
  title: string;
  is_free: boolean;
  views_count: number;
  duration_seconds: number;
  created_at: string;
  teacher_name: string | null;
  course_title: string | null;
}

interface ModCommentRow {
  id: string;
  comment: string;
  created_at: string;
  student_name: string | null;
  video_title: string | null;
}

interface ModReviewRow {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  student_name: string | null;
  teacher_name: string | null;
  course_title: string | null;
}

interface AdminUserRow {
  user_id: string;
  email: string | null;
  full_name: string | null;
  created_at: string | null;
}

interface QuizRow {
  id: string;
  title: string;
  passing_score: number;
  created_at: string;
  course_title: string | null;
}

interface CompetitionRow {
  id: string;
  title: string;
  status: string;
  created_at: string;
  teacher_name: string | null;
}

interface DailyPoint {
  date: string;
  signups: number;
  subscriptions: number;
  revenue: number;
}

interface TeacherPayoutRow {
  id: string;
  teacher_id: string;
  teacher_name: string | null;
  email: string | null;
  period_start: string;
  period_end: string;
  total_gross: number;
  total_discounts: number;
  total_refunds: number;
  total_platform_fee: number;
  total_teacher_payout: number;
  status: string;
  payment_method: string;
  paid_at: string | null;
  created_at: string;
}

interface AdminCourseRow {
  id: string;
  title: string;
  price: number;
  is_published: boolean;
  is_featured: boolean;
  is_visible: boolean;
  sort_order: number;
  education_stage: string | null;
  teacher_name: string | null;
  enrollment_count: number;
  revenue: number;
  views_count: number;
}

interface OverviewSnapshot {
  counts: {
    students: number;
    teachers: number;
    courses: number;
    videos: number;
    revenue: number;
    pending_payments: number;
    active_subscriptions: number;
    total_views: number;
  };
  recent_subscriptions: Array<{ student_name: string | null; course_title: string | null; amount: number | null; status: string | null; created_at: string }>;
  recent_payments: Array<{ student_name: string | null; amount: number | null; status: string | null; created_at: string }>;
  top_courses: Array<{ id?: string; title?: string; course_title?: string; enrollments?: number; revenue?: number }>;
  top_teachers: Array<{ id?: string; name?: string; teacher_name?: string; courses?: number; students?: number; revenue?: number; avg_rating?: number }>;
}

const TABS: Array<{ id: TabId; label: string; icon: LucideIcon }> = [
  { id: 'home', label: 'الصفحة الرئيسية', icon: Globe },
  { id: 'overview', label: 'نظرة عامة', icon: BarChart3 },
  { id: 'analytics', label: 'التحليلات', icon: TrendingUp },
  { id: 'teachers', label: 'المدرسون', icon: GraduationCap },
  { id: 'students', label: 'الطلاب', icon: Users },
  { id: 'courses', label: 'الدورات', icon: BookOpen },
  { id: 'videos', label: 'الفيديوهات', icon: Film },
  { id: 'exams', label: 'الامتحانات والمنافسات', icon: Swords },
  { id: 'moderation', label: 'التعليقات والتقييمات', icon: MessageSquare },
  { id: 'subscriptions', label: 'الاشتراكات والمدفوعات', icon: CreditCard },
  { id: 'performance', label: 'أداء المدرسين', icon: Trophy },
  { id: 'broadcast', label: 'إشعار للجميع', icon: Send },
  { id: 'admins', label: 'الإداريون', icon: Shield },
  { id: 'audit', label: 'سجل العمليات', icon: Clock },
  { id: 'devices', label: 'الأجهزة والحماية', icon: Shield },
  { id: 'reports', label: 'التقارير', icon: FileDown },
  { id: 'settings', label: 'الإعدادات', icon: Settings },
];

const TONE_MAP: Record<string, string> = {
  cyan: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-300',
  emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300',
  amber: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300',
  violet: 'bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300',
  blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300',
  rose: 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-300',
};

export default function AdminPage() {
  const navigate = useNavigate();
  const { profile, loading: authLoading, isAdmin, signOut } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState<TabId>('overview');

  useEffect(() => {
    if (authLoading) return;
    if (!profile) { navigate('/signin?next=/admin', { replace: true }); return; }
    if (!isAdmin) { navigate(profile.is_teacher ? '/admin/teacher' : '/dashboard', { replace: true }); return; }
  }, [profile, isAdmin, authLoading, navigate]);

  const [subscriptions, setSubscriptions] = useState<AdminSubscriptionRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{ title: string; description: string; variant: 'danger' | 'warning' | 'info'; action: () => void }>({ title: '', description: '', variant: 'danger', action: () => {} });

  const askConfirm = useCallback((config: { title: string; description: string; variant: 'danger' | 'warning' | 'info'; action: () => void }) => {
    setConfirmConfig(config);
    setConfirmOpen(true);
  }, []);

  const logAdminAction = useCallback(async (action: string, targetType: string, targetId?: string, details?: Record<string, unknown>) => {
    await supabase.rpc('admin_log_action', { p_action: action, p_target_type: targetType, p_target_id: targetId ?? null, p_details: details ? JSON.stringify(details) : null });
  }, []);

  const loadSubscriptions = useCallback(async () => {
    const { data } = await supabase.rpc('admin_subscriptions_list');
    setSubscriptions((data ?? []) as AdminSubscriptionRow[]);
  }, []);

  const loadAll = useCallback(async () => {
    setBusy(true);
    await Promise.all([loadSubscriptions()]);
    setBusy(false);
  }, [loadSubscriptions]);

  useEffect(() => { void loadAll(); }, [loadAll]);

  const approveSubscription = async (row: AdminSubscriptionRow) => {
    setBusy(true);
    await supabase.rpc('admin_set_subscription_status', { target_id: row.id, new_status: 'active', paid: true });
    await loadSubscriptions();
    setBusy(false);
  };

  const rejectSubscription = async (row: AdminSubscriptionRow) => {
    setBusy(true);
    await supabase.rpc('admin_set_subscription_status', { target_id: row.id, new_status: 'expired', paid: false });
    await loadSubscriptions();
    setBusy(false);
  };

  const blockUser = async (id: string) => {
    const { error } = await supabase.rpc('admin_set_approved', { target_id: id, approved: false });
    if (error) {
      toast('تعذر حظر المستخدم', 'error');
      return;
    }
    toast('تم حظر المستخدم بنجاح', 'success');
    loadAll();
  };

  if (authLoading || !profile || !isAdmin) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
  }

  return (
    <AdminPortalShell onNavigate={(t) => setTab(t)} onSignOut={() => { void signOut(); navigate('/signin?next=/admin', { replace: true }); }} activeTab={tab} onRefresh={loadAll}>
      <AdminConfirmModal
        open={confirmOpen}
        title={confirmConfig.title}
        description={confirmConfig.description}
        variant={confirmConfig.variant}
        confirmLabel={confirmConfig.variant === 'danger' ? 'نعم، حذف' : confirmConfig.variant === 'warning' ? 'نعم، تنفيذ' : 'تأكيد'}
        onConfirm={() => { confirmConfig.action(); setConfirmOpen(false); }}
        onCancel={() => setConfirmOpen(false)}
      />
      {tab === 'home' && <HomepageManager logAction={logAdminAction} />}
      {tab === 'overview' && <OverviewPanel />}
      {tab === 'analytics' && <AnalyticsPanel />}
      {tab === 'teachers' && <TeachersPanel busy={busy} onApprove={async (t) => { const { error } = await supabase.rpc('admin_set_approved', { target_id: t.id, approved: true }); if (error) { toast('تعذر قبول المدرس', 'error'); } else { await logAdminAction('approve_teacher', 'teacher', t.id); toast('تم قبول المدرس بنجاح', 'success'); loadAll(); } }} onReject={async (t) => { askConfirm({ title: 'رفض المدرس', description: `هل تريد رفض "${t.full_name ?? ''}" وحذفه من قائمة المدرسين؟`, variant: 'warning', action: async () => { const { error } = await supabase.rpc('admin_reject_teacher', { target_id: t.id }); if (error) { toast('تعذر رفض المدرس', 'error'); } else { await logAdminAction('reject_teacher', 'teacher', t.id); toast('تم رفض المدرس', 'info'); loadAll(); } } }); }} onBlock={(t) => { askConfirm({ title: 'حظر المدرس', description: `هل تريد حظر "${t.full_name ?? ''}" وإيقافه؟`, variant: 'danger', action: async () => { await blockUser(t.id); await logAdminAction('block_teacher', 'teacher', t.id); } }); }} />}
      {tab === 'students' && <StudentsPanel onBlock={async (s) => { askConfirm({ title: 'حظر الطالب', description: `هل تريد حظر "${s.full_name ?? ''}" وإزالته من قائمة الطلاب؟`, variant: 'danger', action: async () => { await blockUser(s.id); await logAdminAction('block_student', 'student', s.id); } }); }} />}
      {tab === 'courses' && <CoursesPanel />}
      {tab === 'videos' && <VideosPanel />}
      {tab === 'exams' && <ExamsPanel />}
      {tab === 'moderation' && <ModerationPanel />}
      {tab === 'subscriptions' && (
        <SubscriptionsPanel
          subscriptions={subscriptions}
          busy={busy}
          onRefresh={loadSubscriptions}
          onApprove={approveSubscription}
          onReject={rejectSubscription}
        />
      )}
      {tab === 'performance' && <PerformancePanel logAction={logAdminAction} />}
      {tab === 'broadcast' && <BroadcastPanel />}
      {tab === 'admins' && <AdminUsersPanel />}
      {tab === 'audit' && <AuditLogPanel />}
      {tab === 'devices' && <DeviceSecurityPanel />}
      {tab === 'reports' && <ReportsPanel />}
      {tab === 'settings' && <SiteSettingsPanel />}
    </AdminPortalShell>
  );
}

function AdminPortalShell({ children, onNavigate, onSignOut, activeTab, onRefresh }: {
  children: React.ReactNode;
  onNavigate: (tab: TabId) => void;
  onSignOut: () => void;
  activeTab: TabId;
  onRefresh: () => void;
}) {
  const { profile } = useAuth();
  const { actualTheme, setTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const darkMode = actualTheme === 'dark';

  const toggleTheme = () => {
    const next = !darkMode;
    setTheme(next ? 'dark' : 'light');
  };

  return (
    <div dir="rtl" className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 font-sans">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside className={`fixed inset-y-0 right-0 z-50 flex w-72 flex-col border-l border-slate-200 bg-white shadow-2xl transition-transform duration-200 dark:border-slate-800 dark:bg-slate-900 lg:static lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex h-14 items-center justify-between border-b border-slate-200 px-4 dark:border-slate-800 sm:h-16 sm:px-5">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-xs font-bold text-white sm:h-8 sm:w-8 sm:text-sm">م</div>
            <div>
              <div className="text-xs font-extrabold text-slate-900 dark:text-white sm:text-sm">لوحة التحكم</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 sm:text-xs">إدارة المنصة التعليمية</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 lg:hidden"
          >
            <X className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-2 sm:p-3">
          {TABS.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => { onNavigate(id); setSidebarOpen(false); }}
                className={`mb-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-start text-xs transition sm:gap-3 sm:px-3 sm:py-2.5 sm:text-sm ${isActive ? 'bg-blue-50 font-bold text-blue-600 dark:bg-blue-900/30 dark:text-blue-300' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'}`}
              >
                <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>{label}</span>
              </button>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 p-2 dark:border-slate-800 sm:p-3">
          <button
            type="button"
            onClick={() => { onRefresh(); }}
            className="mb-2 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-start text-xs text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white sm:gap-3 sm:py-2.5 sm:text-sm"
          >
            <RefreshCw className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span>تحديث البيانات</span>
          </button>
          <div className="mb-2 flex items-center gap-2 rounded-xl px-3 py-2 sm:gap-3 sm:py-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white sm:h-9 sm:w-9 sm:text-sm">
              {(profile?.full_name ?? 'م')[0]}
            </div>
            <div className="min-w-0">
              <div className="truncate text-xs font-bold text-slate-900 dark:text-white sm:text-sm">{profile?.full_name ?? 'مدير'}</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 sm:text-xs">مدير النظام</div>
            </div>
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            className="mb-2 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-start text-xs text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white sm:gap-3 sm:py-2.5 sm:text-sm"
          >
            <Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span>{darkMode ? 'الوضع الفاتح' : 'الوضع الداكن'}</span>
          </button>
          <button
            type="button"
            onClick={onSignOut}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-start text-xs text-rose-500 transition hover:bg-rose-50 dark:hover:bg-rose-900/20 sm:gap-3 sm:py-2.5 sm:text-sm"
          >
            <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900 sm:h-16 lg:px-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden sm:p-2"
            >
              <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="hidden text-sm font-extrabold text-slate-900 dark:text-white lg:block sm:text-lg">لوحة تحكم المسؤول</h1>
          </div>
          <div className="flex items-center gap-2">
            <a href="/" className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 sm:gap-2 sm:px-4 sm:py-2 sm:text-sm">
              <Globe className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">الصفحة الرئيسية</span>
              <span className="sm:hidden">الرئيسية</span>
            </a>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 pb-20 sm:p-6 sm:pb-24 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Overview Panel (Enhanced)
// ──────────────────────────────────────────────
function OverviewPanel() {
  const [stats, setStats] = useState<OverviewSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.rpc('admin_dashboard_snapshot');
    setStats((data ?? null) as OverviewSnapshot | null);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (loading || !stats) {
    return <div className="flex min-h-[40vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
  }

  const c = stats.counts;

  return (
    <div className="space-y-8">
      <PanelHeading icon={BarChart3} title="نظرة عامة على المنصة" description="إحصائيات شاملة عن أداء المنصة ونشاط المستخدمين." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InsightCard icon={Users} label="إجمالي الطلاب" value={c.students} tone="cyan" />
        <InsightCard icon={GraduationCap} label="إجمالي المدرسين" value={c.teachers} tone="emerald" />
        <InsightCard icon={BookOpen} label="إجمالي الدورات" value={c.courses} tone="violet" />
        <InsightCard icon={Film} label="إجمالي الفيديوهات" value={c.videos} tone="blue" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InsightCard icon={DollarSign} label="إجمالي الإيرادات" value={`${Number(c.revenue).toLocaleString('ar-EG')} جنيه`} tone="emerald" />
        <InsightCard icon={CreditCard} label="مدفوعات معلقة" value={c.pending_payments} tone="amber" />
        <InsightCard icon={UserCheck} label="اشتراكات نشطة" value={c.active_subscriptions} tone="cyan" />
        <InsightCard icon={Eye} label="إجمالي المشاهدات" value={Number(c.total_views).toLocaleString('ar-EG')} tone="violet" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h3 className="font-extrabold text-slate-900 dark:text-white">آخر الاشتراكات</h3>
          </div>
          {stats.recent_subscriptions.filter((e) => Boolean(e.student_name)).length === 0 ? (
            <EmptyAdminState title="لا توجد اشتراكات بعد" />
          ) : (
            <div className="space-y-3">
              {stats.recent_subscriptions.filter((e) => Boolean(e.student_name)).map((e, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 dark:border-slate-700">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
                    {(e.student_name ?? 'ط')[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold text-slate-900 dark:text-white">{e.student_name}</div>
                    <div className="text-xs text-slate-500">{e.course_title ?? 'اشتراك'}</div>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${e.status === 'active' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'}`}>
                    {e.status === 'active' ? 'نشط' : 'معلق'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="mb-4 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <h3 className="font-extrabold text-slate-900 dark:text-white">آخر المدفوعات</h3>
          </div>
          {stats.recent_payments.filter((e) => Boolean(e.student_name)).length === 0 ? (
            <EmptyAdminState title="لا توجد مدفوعات بعد" />
          ) : (
            <div className="space-y-3">
              {stats.recent_payments.filter((e) => Boolean(e.student_name)).map((p, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 dark:border-slate-700">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-sm font-bold text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300">
                    {(p.student_name ?? 'ط')[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold text-slate-900 dark:text-white">{p.student_name}</div>
                    <div className="text-xs text-slate-500">{Number(p.amount).toLocaleString('ar-EG')} جنيه</div>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${p.status === 'paid' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'}`}>
                    {p.status === 'paid' ? 'مدفوع' : 'معلق'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="mb-4 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            <h3 className="font-extrabold text-slate-900 dark:text-white">الدورات الأكثر اشتراكاً</h3>
          </div>
          {stats.top_courses.length === 0 ? (
            <EmptyAdminState title="لا توجد اشتراكات مسجلة بعد" />
          ) : (
            <div className="space-y-3">
              {stats.top_courses.map((crs, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 dark:border-slate-700">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-xs font-bold text-violet-600 dark:bg-violet-900/30 dark:text-violet-300">
                    #{i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold text-slate-900 dark:text-white">{crs.title}</div>
                    <div className="text-xs text-slate-500">{crs.enrollments} طالب • إيراد {Number(crs.revenue).toLocaleString('ar-EG')} جنيه</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="mb-4 flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h3 className="font-extrabold text-slate-900 dark:text-white">أفضل المدرسين إيراداً</h3>
          </div>
          {stats.top_teachers.length === 0 ? (
            <EmptyAdminState title="لا يوجد مدرسون بعد" />
          ) : (
            <div className="space-y-3">
              {stats.top_teachers.map((t, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 dark:border-slate-700">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
                    {(t.name ?? 'م')[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold text-slate-900 dark:text-white">{t.name}</div>
                    <div className="text-xs text-slate-500">{t.courses} دورات • {t.students} طالب • {Number(t.revenue).toLocaleString('ar-EG')} جنيه</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Teachers Panel (Enhanced)
// ──────────────────────────────────────────────
function TeachersPanel({ busy, onApprove, onReject, onBlock }: { busy: boolean; onApprove: (t: AdminTeacherRow) => Promise<unknown>; onReject: (t: AdminTeacherRow) => Promise<unknown>; onBlock: (t: AdminTeacherRow) => void }) {
  const [rows, setRows] = useState<AdminTeacherRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const PER_PAGE = 20;

  const applyAction = async (t: AdminTeacherRow, action: () => Promise<unknown>) => {
    setActionId(t.id);
    try {
      await action();
      await load();
    } finally {
      setActionId(null);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.rpc('admin_teacher_stats');
    setRows((data ?? []) as AdminTeacherRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    if (!query.trim()) return rows;
    const q = query.trim().toLowerCase();
    return rows.filter((t) => (t.full_name ?? '').toLowerCase().includes(q) || (t.email ?? '').toLowerCase().includes(q));
  }, [rows, query]);

  const pending = filtered.filter((t) => !t.is_approved);
  const approved = filtered.filter((t) => t.is_approved);
  const paginatedApproved = useMemo(() => {
    const start = (page - 1) * PER_PAGE;
    return approved.slice(start, start + PER_PAGE);
  }, [approved, page]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedApproved.length) { setSelectedIds(new Set()); } else { setSelectedIds(new Set(paginatedApproved.map((t) => t.id))); }
  };

  if (loading) {
    return <div className="flex min-h-[40vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
  }

  return (
    <div className="space-y-6">
      <PanelHeading icon={GraduationCap} title="إدارة المدرسين" description="مراجعة طلبات الانضمام ومتابعة أداء المدرسين." />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث عن مدرس بالاسم أو البريد..."
            className="h-11 w-full rounded-xl border border-slate-200 bg-white ps-10 pe-4 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>
        <button type="button" onClick={load} disabled={busy} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
          <RefreshCw className={`ml-1 inline h-4 w-4 ${busy ? 'animate-spin' : ''}`} /> تحديث
        </button>
      </div>

      {pending.length > 0 && (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-900/40 dark:bg-amber-900/20">
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <h3 className="font-extrabold text-amber-800 dark:text-amber-200">{pending.length} طلبات انتظار الاعتماد</h3>
          </div>
          <div className="space-y-3">
            {pending.map((t) => (
              <div key={t.id} className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-800">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                  {(t.full_name ?? 'م')[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-bold text-slate-900 dark:text-white">{t.full_name}</div>
                  <div className="text-xs text-slate-500">{t.email} • {t.specialization ?? 'غير محدد'}</div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button type="button" onClick={() => void applyAction(t, () => onApprove(t))} disabled={busy || actionId === t.id} className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
                    <Check className="ml-1 inline h-3.5 w-3.5" /> {actionId === t.id ? '...' : 'اعتماد'}
                  </button>
                  <button type="button" onClick={() => void applyAction(t, () => onReject(t))} disabled={busy || actionId === t.id} className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-100 disabled:opacity-50 dark:bg-rose-900/20 dark:text-rose-300">
                    {actionId === t.id ? '...' : 'رفض'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {approved.length === 0 && pending.length === 0 ? (
        <EmptyAdminState title="لا يوجد مدرسون" />
      ) : (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-700">
              <thead className="bg-slate-50 dark:bg-slate-900">
                <tr>
                  <th className="px-4 py-3"><input type="checkbox" checked={selectedIds.size === paginatedApproved.length && paginatedApproved.length > 0} onChange={toggleSelectAll} className="h-4 w-4 rounded border-slate-300" /></th>
                  <th className="px-6 py-3 text-start text-xs font-bold text-slate-500 dark:text-slate-400">المدرس</th>
                  <th className="px-6 py-3 text-start text-xs font-bold text-slate-500 dark:text-slate-400">التخصص</th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 dark:text-slate-400">الدورات</th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 dark:text-slate-400">الطلاب</th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 dark:text-slate-400">الإيراد</th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 dark:text-slate-400">الحالة</th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 dark:text-slate-400">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {paginatedApproved.map((t) => (
                  <tr key={t.id} className={`transition hover:bg-slate-50 dark:hover:bg-slate-700/50 ${selectedIds.has(t.id) ? 'bg-blue-50 dark:bg-blue-900/10' : ''}`}>
                    <td className="px-4 py-4"><input type="checkbox" checked={selectedIds.has(t.id)} onChange={() => toggleSelect(t.id)} className="h-4 w-4 rounded border-slate-300" /></td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
                          {(t.full_name ?? 'م')[0]}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">{t.full_name}</div>
                          <div className="text-xs text-slate-500">{t.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{t.specialization ?? 'غير محدد'}</td>
                    <td className="px-6 py-4 text-center text-sm font-bold text-slate-900 dark:text-white">{t.course_count}</td>
                    <td className="px-6 py-4 text-center text-sm font-bold text-slate-900 dark:text-white">{t.student_count}</td>
                    <td className="px-6 py-4 text-center text-sm font-bold text-emerald-600 dark:text-emerald-400">{Number(t.revenue).toLocaleString('ar-EG')} جنيه</td>
                    <td className="px-6 py-4 text-center">
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">{t.is_verified ? 'موثق' : 'معتمد'}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button type="button" onClick={() => onBlock(t)} disabled={busy} className="rounded-lg bg-rose-50 p-2 text-rose-600 transition hover:bg-rose-100 disabled:opacity-50 dark:bg-rose-900/20 dark:text-rose-300" title="حظر">
                        <X className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-slate-100 px-4 py-3 dark:border-slate-700">
            <AdminPagination page={page} total={approved.length} perPage={PER_PAGE} onPageChange={setPage} />
          </div>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// Students Panel (NEW)
// ──────────────────────────────────────────────
function StudentsPanel({ onBlock }: { onBlock: (s: AdminStudentRow) => Promise<unknown> }) {
  const [rows, setRows] = useState<AdminStudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const PER_PAGE = 20;

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.rpc('admin_student_stats');
    setRows((data ?? []) as AdminStudentRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleBlock = async (s: AdminStudentRow) => {
    setActionId(s.id);
    try {
      await onBlock(s);
      await load();
    } finally {
      setActionId(null);
    }
  };

  const filtered = useMemo(() => {
    if (!query.trim()) return rows;
    const q = query.trim().toLowerCase();
    return rows.filter((s) => (s.full_name ?? '').toLowerCase().includes(q) || (s.email ?? '').toLowerCase().includes(q));
  }, [rows, query]);

  const paginated = useMemo(() => {
    const start = (page - 1) * PER_PAGE;
    return filtered.slice(start, start + PER_PAGE);
  }, [filtered, page]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === paginated.length) { setSelectedIds(new Set()); } else { setSelectedIds(new Set(paginated.map((s) => s.id))); }
  };

  const totalSpent = rows.reduce((sum, s) => sum + Number(s.total_spent), 0);
  const totalEnrollments = rows.reduce((sum, s) => sum + s.enrollment_count, 0);

  if (loading) {
    return <div className="flex min-h-[40vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
  }

  return (
    <div className="space-y-6">
      <PanelHeading icon={Users} title="إدارة الطلاب" description="عرض وإدارة حسابات الطلاب والاشتراكات والمدفوعات." />

      <div className="grid gap-4 sm:grid-cols-3">
        <InsightCard icon={Users} label="إجمالي الطلاب" value={rows.length} tone="cyan" />
        <InsightCard icon={BookOpen} label="إجمالي الاشتراكات" value={totalEnrollments} tone="violet" />
        <InsightCard icon={DollarSign} label="إجمالي المدفوعات" value={`${Number(totalSpent).toLocaleString('ar-EG')} جنيه`} tone="emerald" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
            placeholder="ابحث عن طالب بالاسم أو البريد..."
            className="h-11 w-full rounded-xl border border-slate-200 bg-white ps-10 pe-4 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>
        <button type="button" onClick={load} disabled={loading} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
          <RefreshCw className={`ml-1 inline h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> تحديث
        </button>
        {selectedIds.size > 0 && (
          <button type="button" onClick={() => { const ids = [...selectedIds]; ids.forEach((id) => { void onBlock({ id } as AdminStudentRow); }); setSelectedIds(new Set()); }} className="flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-700">
            <Shield className="h-4 w-4" /> حظر المحدد ({selectedIds.size})
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyAdminState title="لا يوجد طلاب" />
      ) : (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-700">
              <thead className="bg-slate-50 dark:bg-slate-900">
                <tr>
                  <th className="px-4 py-3"><input type="checkbox" checked={selectedIds.size === paginated.length && paginated.length > 0} onChange={toggleSelectAll} className="h-4 w-4 rounded border-slate-300" /></th>
                  <th className="px-6 py-3 text-start text-xs font-bold text-slate-500 dark:text-slate-400">الطالب</th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 dark:text-slate-400">الاشتراكات</th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 dark:text-slate-400">المدفوعات</th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 dark:text-slate-400">تاريخ التسجيل</th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 dark:text-slate-400">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {paginated.map((s) => (
                  <tr key={s.id} className={`transition hover:bg-slate-50 dark:hover:bg-slate-700/50 ${selectedIds.has(s.id) ? 'bg-blue-50 dark:bg-blue-900/10' : ''}`}>
                    <td className="px-4 py-4"><input type="checkbox" checked={selectedIds.has(s.id)} onChange={() => toggleSelect(s.id)} className="h-4 w-4 rounded border-slate-300" /></td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cyan-50 text-sm font-bold text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-300">
                          {(s.full_name ?? 'ط')[0]}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">{s.full_name}</div>
                          <div className="text-xs text-slate-500">{s.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center text-sm font-bold text-slate-900 dark:text-white">{s.enrollment_count}</td>
                    <td className="px-6 py-4 text-center text-sm font-bold text-emerald-600 dark:text-emerald-400">{Number(s.total_spent).toLocaleString('ar-EG')} جنيه</td>
                    <td className="px-6 py-4 text-center text-xs text-slate-500">{s.created_at ? new Date(s.created_at).toLocaleDateString('ar-EG') : '-'}</td>
                    <td className="px-6 py-4 text-center">
                      <button type="button" onClick={() => void handleBlock(s)} disabled={actionId === s.id} className="rounded-lg bg-rose-50 p-2 text-rose-600 transition hover:bg-rose-100 disabled:opacity-50 dark:bg-rose-900/20 dark:text-rose-300" title="حظر وإزالة من القائمة">
                          <X className="h-4 w-4" />
                        </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-slate-100 px-4 py-3 dark:border-slate-700">
            <AdminPagination page={page} total={filtered.length} perPage={PER_PAGE} onPageChange={setPage} />
          </div>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// Courses Panel (NEW)
// ──────────────────────────────────────────────
function CoursesPanel() {
  const [rows, setRows] = useState<AdminCourseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.rpc('admin_course_stats');
    setRows((data ?? []) as AdminCourseRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    if (!query.trim()) return rows;
    const q = query.trim().toLowerCase();
    return rows.filter((c) => c.title.toLowerCase().includes(q) || (c.teacher_name ?? '').toLowerCase().includes(q));
  }, [rows, query]);

  const totalRevenue = rows.reduce((sum, c) => sum + Number(c.revenue), 0);
  const publishedCount = rows.filter((c) => c.is_published).length;
  const featuredCount = rows.filter((c) => c.is_featured).length;

  const togglePublish = async (course: AdminCourseRow) => {
    setBusy(true);
    await supabase.from('courses').update({ is_published: !course.is_published }).eq('id', course.id);
    await load();
    setBusy(false);
  };

  const toggleFeatured = async (course: AdminCourseRow) => {
    setBusy(true);
    await supabase.from('courses').update({ is_featured: !course.is_featured }).eq('id', course.id);
    await load();
    setBusy(false);
  };

  const toggleVisible = async (course: AdminCourseRow) => {
    setBusy(true);
    await supabase.from('courses').update({ is_visible: !course.is_visible }).eq('id', course.id);
    await load();
    setBusy(false);
  };

  const moveCourse = async (course: AdminCourseRow, direction: 'up' | 'down') => {
    const index = filtered.findIndex((c) => c.id === course.id);
    const neighbor = direction === 'up' ? filtered[index - 1] : filtered[index + 1];
    if (!neighbor) return;
    setBusy(true);
    const a = course.sort_order;
    const b = neighbor.sort_order;
    await supabase.from('courses').update({ sort_order: b }).eq('id', course.id);
    await supabase.from('courses').update({ sort_order: a }).eq('id', neighbor.id);
    await load();
    setBusy(false);
  };

  const deleteCourse = async (course: AdminCourseRow) => {
    if (!confirm(`هل تريد حذف الدورة "${course.title}"؟`)) return;
    setBusy(true);
    await supabase.from('courses').delete().eq('id', course.id);
    await load();
    setBusy(false);
  };

  if (loading) {
    return <div className="flex min-h-[40vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
  }

  return (
    <div className="space-y-6">
      <PanelHeading icon={BookOpen} title="إدارة الدورات" description="عرض وإدارة جميع الدورات التعليمية في المنصة." />

      <div className="grid gap-4 sm:grid-cols-4">
        <InsightCard icon={BookOpen} label="إجمالي الدورات" value={rows.length} tone="violet" />
        <InsightCard icon={Globe} label="الدورات المنشورة" value={publishedCount} tone="emerald" />
        <InsightCard icon={Star} label="الدورات المميزة" value={featuredCount} tone="amber" />
        <InsightCard icon={DollarSign} label="إجمالي الإيرادات" value={`${Number(totalRevenue).toLocaleString('ar-EG')} جنيه`} tone="blue" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث عن دورة بالاسم أو المدرس..."
            className="h-11 w-full rounded-xl border border-slate-200 bg-white ps-10 pe-4 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>
        <button type="button" onClick={load} disabled={busy} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
          <RefreshCw className={`ml-1 inline h-4 w-4 ${busy ? 'animate-spin' : ''}`} /> تحديث
        </button>
      </div>

      {filtered.length === 0 ? (
        <EmptyAdminState title="لا توجد دورات" />
      ) : (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-700">
              <thead className="bg-slate-50 dark:bg-slate-900">
                <tr>
                  <th className="px-6 py-3 text-start text-xs font-bold text-slate-500 dark:text-slate-400">الترتيب</th>
                  <th className="px-6 py-3 text-start text-xs font-bold text-slate-500 dark:text-slate-400">الدورة</th>
                  <th className="px-6 py-3 text-start text-xs font-bold text-slate-500 dark:text-slate-400">المدرس</th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 dark:text-slate-400">السعر</th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 dark:text-slate-400">المشاهدات</th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 dark:text-slate-400">الاشتراكات</th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 dark:text-slate-400">الإيراد</th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 dark:text-slate-400">الحالة</th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 dark:text-slate-400">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filtered.map((c) => (
                  <tr key={c.id} className="transition hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => void moveCourse(c, 'up')} disabled={busy || filtered[0]?.id === c.id} className="rounded bg-slate-50 p-1 text-slate-500 transition hover:bg-slate-100 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-30 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600" title="تحريك لأعلى">
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" onClick={() => void moveCourse(c, 'down')} disabled={busy || filtered[filtered.length - 1]?.id === c.id} className="rounded bg-slate-50 p-1 text-slate-500 transition hover:bg-slate-100 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-30 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600" title="تحريك لأسفل">
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                        <span className="mr-1 text-xs font-bold text-slate-400 dark:text-slate-500">{c.sort_order}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white">{c.title}</div>
                        <div className="text-xs text-slate-500">{c.education_stage ?? ''}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{c.teacher_name ?? '-'}</td>
                    <td className="px-6 py-4 text-center text-sm font-bold text-slate-900 dark:text-white">{c.price === 0 ? 'مجانية' : `${Number(c.price).toLocaleString('ar-EG')} جنيه`}</td>
                    <td className="px-6 py-4 text-center text-sm font-bold text-blue-600 dark:text-blue-400">{Number(c.views_count).toLocaleString('ar-EG')}</td>
                    <td className="px-6 py-4 text-center text-sm font-bold text-violet-600 dark:text-violet-400">{c.enrollment_count}</td>
                    <td className="px-6 py-4 text-center text-sm font-bold text-emerald-600 dark:text-emerald-400">{Number(c.revenue).toLocaleString('ar-EG')} جنيه</td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${c.is_published ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                          {c.is_published ? 'منشورة' : 'مسودة'}
                        </span>
                        {c.is_published && !c.is_visible && (
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                            <EyeOff className="ml-0.5 inline h-3 w-3" /> مخفية
                          </span>
                        )}
                        {c.is_featured && (
                          <span className="rounded-full bg-violet-50 px-2 py-0.5 text-xs font-bold text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                            <Star className="ml-0.5 inline h-3 w-3" /> مميزة
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-1">
                        <button type="button" onClick={() => void togglePublish(c)} disabled={busy} className={`rounded-lg p-1.5 transition disabled:opacity-50 ${c.is_published ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300'}`} title={c.is_published ? 'تحويل لمسودة (إخفاء كلياً)' : 'نشر'}>
                          {c.is_published ? <Globe className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                        <button type="button" onClick={() => void toggleVisible(c)} disabled={busy} className={`rounded-lg p-1.5 transition disabled:opacity-50 ${c.is_visible ? 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300' : 'bg-amber-50 text-amber-600 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-300'}`} title={c.is_visible ? 'إخفاء من الموقع (تظهر في صفحة المدرس فقط)' : 'إظهار في الموقع'}>
                          <EyeOff className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => void toggleFeatured(c)} disabled={busy} className={`rounded-lg p-1.5 transition disabled:opacity-50 ${c.is_featured ? 'bg-violet-50 text-violet-600 hover:bg-violet-100 dark:bg-violet-900/20 dark:text-violet-300' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300'}`} title={c.is_featured ? 'إلغاء التمييز' : 'تمييز'}>
                          <Star className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => void deleteCourse(c)} disabled={busy} className="rounded-lg bg-rose-50 p-1.5 text-rose-600 transition hover:bg-rose-100 disabled:opacity-50 dark:bg-rose-900/20 dark:text-rose-300" title="حذف">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// Homepage Manager
// ──────────────────────────────────────────────
interface FeaturedItem {
  id: string;
  title: string;
  subtitle: string;
  featured_order: number;
}

type FeaturedPool = 'courses' | 'profiles' | 'videos';

function HomepageManager({ logAction: _logAction }: { logAction?: (action: string, targetType: string, targetId?: string, details?: Record<string, unknown>) => Promise<void> }) {
  const [pools, setPools] = useState<Record<FeaturedPool, FeaturedItem[]>>({ courses: [], profiles: [], videos: [] } as Record<FeaturedPool, FeaturedItem[]>);
  const [queries, setQueries] = useState<Record<FeaturedPool, string>>({ courses: '', profiles: '', videos: '' });
  const [results, setResults] = useState<Record<FeaturedPool, FeaturedItem[]>>({ courses: [], profiles: [], videos: [] } as Record<FeaturedPool, FeaturedItem[]>);
  const [searching, setSearching] = useState<FeaturedPool | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [courses, profiles, videos] = await Promise.all([
      supabase.from('courses').select('id,title,price,featured_order,teacher:profiles!courses_teacher_id_fkey(full_name)').eq('is_featured', true).eq('is_visible', true).order('featured_order', { ascending: true }).limit(50),
      supabase.from('profiles').select('id,full_name,specialization,featured_order').eq('is_teacher', true).eq('is_featured', true).order('featured_order', { ascending: true }).limit(50),
      supabase.from('videos').select('id,title,is_free,featured_order').eq('is_featured', true).order('featured_order', { ascending: true }).limit(50),
    ]);
    setPools({
      courses: (courses.data ?? []).map((c) => ({ id: c.id, title: c.title, subtitle: `${c.price === 0 ? 'مجانية' : `${c.price} جنيه`} • ${(c.teacher as { full_name?: string } | null)?.full_name ?? ''}`, featured_order: c.featured_order ?? 0 })),
      profiles: (profiles.data ?? []).map((p) => ({ id: p.id, title: p.full_name ?? '', subtitle: p.specialization ?? 'مدرس', featured_order: p.featured_order ?? 0 })),
      videos: (videos.data ?? []).map((v) => ({ id: v.id, title: v.title, subtitle: v.is_free ? 'مجاني' : 'مدفوع', featured_order: v.featured_order ?? 0 })),
    });
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const search = async (pool: FeaturedPool, raw: string) => {
    const q = raw.trim();
    setQueries((c) => ({ ...c, [pool]: raw }));
    if (!q) { setResults((c) => ({ ...c, [pool]: [] })); return; }
    setSearching(pool);
    let data: FeaturedItem[] = [];
    if (pool === 'courses') {
      const { data: rows } = await supabase.from('courses').select('id,title,price,featured_order,teacher:profiles!courses_teacher_id_fkey(full_name)').eq('is_published', true).eq('is_visible', true).eq('is_featured', false).ilike('title', `%${q}%`).limit(8);
      data = (rows ?? []).map((c) => ({ id: c.id, title: c.title, subtitle: `${c.price === 0 ? 'مجانية' : `${c.price} جنيه`} • ${(c.teacher as { full_name?: string } | null)?.full_name ?? ''}`, featured_order: 0 }));
    } else if (pool === 'profiles') {
      const { data: rows } = await supabase.from('profiles').select('id,full_name,specialization,featured_order').eq('is_teacher', true).eq('is_approved', true).eq('is_featured', false).ilike('full_name', `%${q}%`).limit(8);
      data = (rows ?? []).map((p) => ({ id: p.id, title: p.full_name ?? '', subtitle: p.specialization ?? 'مدرس', featured_order: 0 }));
    } else {
      const { data: rows } = await supabase.from('videos').select('id,title,is_free,featured_order').eq('is_featured', false).ilike('title', `%${q}%`).limit(8);
      data = (rows ?? []).map((v) => ({ id: v.id, title: v.title, subtitle: v.is_free ? 'مجاني' : 'مدفوع', featured_order: 0 }));
    }
    setResults((c) => ({ ...c, [pool]: data }));
    setSearching(null);
  };

  const api = async (pool: FeaturedPool, id: string, featured: boolean, order: number) => {
    await supabase.rpc('admin_set_featured', { target_table: pool, target_id: id, featured, sort_order: order });
  };

  const add = async (pool: FeaturedPool, item: FeaturedItem) => {
    const maxOrder = pools[pool].reduce((max, x) => Math.max(max, x.featured_order), -1);
    await api(pool, item.id, true, maxOrder + 1);
    setQueries((c) => ({ ...c, [pool]: '' }));
    setResults((c) => ({ ...c, [pool]: [] }));
    await load();
  };

  const remove = async (pool: FeaturedPool, item: FeaturedItem) => {
    await api(pool, item.id, false, 0);
    await load();
  };

  const move = async (pool: FeaturedPool, index: number, dir: -1 | 1) => {
    const list = [...pools[pool]];
    const to = index + dir;
    if (to < 0 || to >= list.length) return;
    const a = list[index];
    const b = list[to];
    await Promise.all([
      api(pool, a.id, true, b.featured_order),
      api(pool, b.id, true, a.featured_order),
    ]);
    await load();
  };

  const poolMeta: Array<{ pool: FeaturedPool; label: string; icon: typeof Star; hint: string; empty: string }> = [
    { pool: 'courses', label: 'الدورات المميزة', icon: BookOpen, hint: 'تظهر أولاً في قسم الدورات بالصفحة الرئيسية', empty: 'لا توجد دورات مميزة بعد' },
    { pool: 'profiles', label: 'المدرسون المميزون', icon: GraduationCap, hint: 'تظهر أولاً في قسم المدرسين بالصفحة الرئيسية', empty: 'لا يوجد مدرسون مميزون بعد' },
    { pool: 'videos', label: 'الفيديوهات المميزة', icon: Film, hint: 'تظهر أولاً في قسم الفيديوهات بالصفحة الرئيسية', empty: 'لا توجد فيديوهات مميزة بعد' },
  ];

  if (loading) {
    return <div className="flex min-h-[40vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
  }

  return (
    <div className="space-y-8">
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-500 p-8 text-white shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2"><span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold backdrop-blur-sm"><Star className="ml-1 inline h-3 w-3" /> مركز تنسيق الصفحة الرئيسية</span></div>
            <h2 className="text-3xl font-extrabold leading-tight">أين يظهر المحتوى أولاً في المنصة؟</h2>
            <p className="mt-3 max-w-2xl text-blue-100">اختر الدورات والمدرسين والفيديوهات التي تظهر للطلاب في مقدمة الصفحة الرئيسية، ورتّبها حسب أولويتك بالأسهم.</p>
          </div>
        </div>
      </div>

      {poolMeta.map(({ pool, label, icon: Icon, hint, empty }) => (
        <div key={pool} className="overflow-hidden rounded-3xl bg-white shadow-xl shadow-slate-200/50 dark:bg-slate-800 dark:shadow-slate-900/50">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 px-6 py-5">
            <div>
              <h3 className="flex items-center gap-2 text-xl font-extrabold text-slate-900 dark:text-white"><Icon className="h-5 w-5 text-violet-500" /> {label}</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{hint}</p>
            </div>
            <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">{pools[pool].length} عنصر</span>
          </div>
          <div className="p-6">
            <div className="relative mb-4">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={queries[pool]}
                onChange={(e) => void search(pool, e.target.value)}
                placeholder={`ابحث عن ${pool === 'courses' ? 'دورة' : pool === 'profiles' ? 'مدرس' : 'فيديو'} وأضفه للمميزين...`}
                className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 ps-10 pe-4 text-sm text-slate-900 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
              {searching === pool && <Loader2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-violet-500" />}
            </div>

            {results[pool].length > 0 && (
              <div className="mb-4 rounded-2xl border border-violet-100 bg-violet-50 p-3 dark:border-violet-900/40 dark:bg-violet-900/20">
                {results[pool].map((r) => (
                  <button key={r.id} onClick={() => void add(pool, r)} className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-start transition hover:bg-white dark:hover:bg-slate-800">
                    <span className="min-w-0"><span className="block truncate text-sm font-bold text-slate-800 dark:text-slate-100">{r.title}</span><span className="block text-xs text-slate-500">{r.subtitle}</span></span>
                    <span className="flex shrink-0 items-center gap-1 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-bold text-white"><Plus className="h-3 w-3" /> أضف</span>
                  </button>
                ))}
              </div>
            )}

            {pools[pool].length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center dark:border-slate-600"><Icon className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" /><p className="mt-3 font-bold text-slate-500 dark:text-slate-400">{empty}</p></div>
            ) : (
              <div className="space-y-2">
                {pools[pool].map((item, index) => (
                  <div key={item.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-extrabold text-slate-600 dark:bg-slate-700 dark:text-slate-300">{index + 1}</div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold text-slate-900 dark:text-white">{item.title}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{item.subtitle}</div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button onClick={() => void move(pool, index, -1)} disabled={index === 0} className="rounded-lg bg-slate-100 p-1.5 text-slate-600 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600" title="تحريك لاعلى"><ArrowUp className="h-4 w-4" /></button>
                      <button onClick={() => void move(pool, index, 1)} disabled={index === pools[pool].length - 1} className="rounded-lg bg-slate-100 p-1.5 text-slate-600 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600" title="تحريك لاسفل"><ArrowDown className="h-4 w-4" /></button>
                      <button onClick={() => void remove(pool, item)} className="rounded-lg bg-rose-50 p-1.5 text-rose-600 transition hover:bg-rose-100 dark:bg-rose-900/20 dark:text-rose-300" title="إزالة من المميزين"><X className="h-4 w-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ──────────────────────────────────────────────
// Site Settings Panel
// ──────────────────────────────────────────────
const SETTINGS_SECTION_NAMES: Record<string, string> = { teachers: 'قسم المدرسين', courses: 'قسم الدورات', videos: 'قسم الفيديوهات', categories: 'قسم التخصصات', champions: 'قسم الأوائل' };

function SettingsField({ label, value, onChange, hint, dir, type = 'text', icon: Icon }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  dir?: string;
  type?: string;
  icon?: LucideIcon;
}) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1.5 text-sm font-bold text-slate-700 dark:text-slate-200">
        {Icon && <Icon className="h-4 w-4 text-slate-400" />}
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        dir={dir}
        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
      />
      {hint && <p className="mt-1.5 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

function SettingsCard({ icon: Icon, title, description, onSave, saving, children }: {
  icon: LucideIcon;
  title: string;
  description: string;
  onSave: () => void;
  saving: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 dark:text-white">{title}</h3>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{description}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="flex shrink-0 items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-60"
        >
          <Save className={`h-4 w-4 ${saving ? 'animate-pulse' : ''}`} /> {saving ? 'جاري الحفظ...' : 'حفظ'}
        </button>
      </div>
      <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </div>
  );
}

function SiteSettingsPanel() {
  const [draft, setDraft] = useState<SiteSettings>(() => JSON.parse(JSON.stringify(SITE_SETTINGS_DEFAULTS)));
  const [loaded, setLoaded] = useState(false);
  const [savingKeys, setSavingKeys] = useState<string[]>([]);
  const [savedToast, setSavedToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from('site_settings').select('key,value');
    setDraft((prev) => {
      const next: SiteSettings = { ...prev };
      for (const row of data ?? []) next[row.key] = row.value;
      return next;
    });
    setLoaded(true);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const isSaving = (keys: string[]) => keys.some((k) => savingKeys.includes(k));

  const save = async (keys: string[], label: string) => {
    setSavingKeys((p) => [...p, ...keys]);
    try {
      for (const key of keys) {
        await supabase.rpc('admin_update_site_setting', { p_key: key, p_value: draft[key] });
      }
      invalidateSiteSettingsCache();
      setSavedToast(`تم حفظ ${label}`);
      setTimeout(() => setSavedToast(null), 3000);
    } finally {
      setSavingKeys((p) => p.filter((k) => !keys.includes(k)));
    }
  };

  const setFlat = (key: string) => (value: string | number) => setDraft((p) => ({ ...p, [key]: value }));
  const setSection = (key: string) => (field: string) => (value: string) =>
    setDraft((p) => ({ ...p, [key]: { ...((p[key] ?? {}) as Record<string, unknown>), [field]: value } }));
  const toggleSection = (field: string) => (value: boolean) =>
    setDraft((p) => ({ ...p, homepage_sections: { ...(p.homepage_sections ?? {}), [field]: value } }));

  const contactData = (draft.contact ?? {}) as Record<string, string>;
  const texts = (draft.homepage_texts ?? {}) as Record<string, string>;
  const footerTxt = (draft.footer_texts ?? {}) as Record<string, string>;
  const sections = (draft.homepage_sections ?? {}) as Record<string, boolean>;

  if (!loaded) {
    return <div className="flex items-center justify-center py-24 text-slate-400"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <PanelHeading icon={Settings} title="إعدادات الموقع" description="تحكم في هوية الموقع وبيانات التواصل والنصوص الظاهرة للزوار." />
        {savedToast && (
          <span className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4" /> {savedToast}
          </span>
        )}
      </div>

      <SettingsCard icon={Type} title="هوية الموقع والعلامة التجارية" description="اسم الموقع والوصف الذي يظهر في محركات البحث والفوتر." onSave={() => void save(['site_name', 'site_tagline', 'site_description'], 'هوية الموقع')} saving={isSaving(['site_name', 'site_tagline', 'site_description'])}>
        <SettingsField label="اسم الموقع" value={String(draft.site_name ?? '')} onChange={setFlat('site_name')} hint="يظهر في شريط التنقل وبداية الفوتر." />
        <SettingsField label="الوصف المختصر (Tagline)" value={String(draft.site_tagline ?? '')} onChange={setFlat('site_tagline')} hint="جملة تعريفية قصيرة عن المنصة." />
        <SettingsField label="وصف الموقع" value={String(draft.site_description ?? '')} onChange={setFlat('site_description')} hint="يستخدم في وصف محركات البحث." />
      </SettingsCard>

      <SettingsCard icon={Phone} title="بيانات التواصل الأساسية" description="رقم الهاتف والبريد الإلكتروني والمدينة — تظهر في الفوتر." onSave={() => void save(['contact'], 'بيانات التواصل')} saving={isSaving(['contact'])}>
        <SettingsField label="البريد الإلكتروني" value={contactData.email} onChange={setSection('contact')('email')} dir="ltr" />
        <SettingsField label="الرقم الظاهر للزوار" value={contactData.phone_display} onChange={setSection('contact')('phone_display')} dir="ltr" hint="مثال: +966 50 123 4567" />
        <SettingsField label="رقم الاتصال المباشر" value={contactData.phone_tel} onChange={setSection('contact')('phone_tel')} dir="ltr" hint="بدون مسافات، يستخدم في روابط tel: مثل +966501234567" />
        <SettingsField label="رقم واتساب" value={contactData.whatsapp} onChange={setSection('contact')('whatsapp')} dir="ltr" hint="بدون + — مثال 966501234567" />
        <SettingsField label="المدينة والعنوان" value={contactData.city} onChange={setSection('contact')('city')} />
      </SettingsCard>

      <SettingsCard icon={Link2} title="روابط مواقع التواصل الاجتماعي" description="تظهر كأيقونات في الفوتر. اترك الحقل فارغاً لإخفاء أي منصة." onSave={() => void save(['contact'], 'رابط التواصل الاجتماعي')} saving={isSaving(['contact'])}>
        <SettingsField icon={Facebook} label="فيسبوك" value={contactData.facebook} onChange={setSection('contact')('facebook')} dir="ltr" />
        <SettingsField icon={Youtube} label="يوتيوب" value={contactData.youtube} onChange={setSection('contact')('youtube')} dir="ltr" />
        <SettingsField icon={Instagram} label="انستجرام" value={contactData.instagram} onChange={setSection('contact')('instagram')} dir="ltr" />
        <SettingsField icon={Music2} label="تيك توك" value={contactData.tiktok} onChange={setSection('contact')('tiktok')} dir="ltr" />
        <SettingsField icon={Send} label="تيليجرام" value={contactData.telegram} onChange={setSection('contact')('telegram')} dir="ltr" />
        <SettingsField icon={Twitter} label="إكس (تويتر)" value={contactData.x} onChange={setSection('contact')('x')} dir="ltr" />
      </SettingsCard>

      <SettingsCard icon={Home} title="نصوص الصفحة الرئيسية" description="العناوين والعبارات الرئيسية في واجهة الموقع — قابلة للتعديل مباشرة." onSave={() => void save(['homepage_texts'], 'نصوص الصفحة الرئيسية')} saving={isSaving(['homepage_texts'])}>
        <SettingsField label="شارة القسم الأول (Hero)" value={texts.hero_badge} onChange={setSection('homepage_texts')('hero_badge')} />
        <SettingsField label="عنوان Hero — السطر الأول" value={texts.hero_title_1} onChange={setSection('homepage_texts')('hero_title_1')} />
        <SettingsField label="عنوان Hero — السطر الثاني" value={texts.hero_title_2} onChange={setSection('homepage_texts')('hero_title_2')} />
        <SettingsField label="الوصف تحت العنوان" value={texts.hero_subtitle} onChange={setSection('homepage_texts')('hero_subtitle')} />
        <SettingsField label="زر الدعوة الأول" value={texts.cta_primary} onChange={setSection('homepage_texts')('cta_primary')} />
        <SettingsField label="زر الدعوة الثاني" value={texts.cta_secondary} onChange={setSection('homepage_texts')('cta_secondary')} />
        <SettingsField label="شارة قسم التخصصات" value={texts.categories_badge} onChange={setSection('homepage_texts')('categories_badge')} />
        <SettingsField label="عنوان قسم التخصصات" value={texts.categories_title} onChange={setSection('homepage_texts')('categories_title')} />
        <SettingsField label="وصف قسم التخصصات" value={texts.categories_subtitle} onChange={setSection('homepage_texts')('categories_subtitle')} />
        <SettingsField label="شارة قسم المدرسين" value={texts.teachers_badge} onChange={setSection('homepage_texts')('teachers_badge')} />
        <SettingsField label="عنوان قسم المدرسين" value={texts.teachers_title} onChange={setSection('homepage_texts')('teachers_title')} />
        <SettingsField label="وصف قسم المدرسين" value={texts.teachers_subtitle} onChange={setSection('homepage_texts')('teachers_subtitle')} />
        <SettingsField label="شارة المواهب الجديدة" value={texts.rising_badge} onChange={setSection('homepage_texts')('rising_badge')} />
        <SettingsField label="عنوان المواهب الجديدة" value={texts.rising_title} onChange={setSection('homepage_texts')('rising_title')} />
      </SettingsCard>

      <SettingsCard icon={Globe2} title="نصوص الفوتر" description="عنوان قسم التواصل والنص التعريفي وسطر الحقوق." onSave={() => void save(['footer_texts'], 'نصوص الفوتر')} saving={isSaving(['footer_texts'])}>
        <SettingsField label="عنوان قسم التواصل" value={footerTxt.contact_heading} onChange={setSection('footer_texts')('contact_heading')} />
        <SettingsField label="النص التعريفي" value={footerTxt.about} onChange={setSection('footer_texts')('about')} />
        <SettingsField label="سطر الحقوق" value={footerTxt.copyright} onChange={setSection('footer_texts')('copyright')} />
      </SettingsCard>

      <SettingsCard icon={Eye} title="أقسام الصفحة الرئيسية" description="أظهر أو أخفِ أقسام الواجهة للزوار." onSave={() => void save(['homepage_sections'], 'أقسام الصفحة الرئيسية')} saving={isSaving(['homepage_sections'])}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(SETTINGS_SECTION_NAMES).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => toggleSection(key)(!sections[key])}
              disabled={isSaving(['homepage_sections'])}
              className={`flex items-center justify-between rounded-2xl border p-4 text-start transition disabled:opacity-60 ${sections[key] ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-900/20' : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900'}`}
            >
              <span className="font-bold text-slate-800 dark:text-slate-100">{label}</span>
              <span className={`text-xs font-bold ${sections[key] ? 'text-emerald-600 dark:text-emerald-300' : 'text-slate-400'}`}>{sections[key] ? 'ظاهر' : 'مخفي'}</span>
            </button>
          ))}
        </div>
      </SettingsCard>

      <SettingsCard icon={BarChart3} title="حدود العرض الافتراضية" description="عدد العناصر المعروضة في أقسام الصفحة الرئيسية." onSave={() => void save(['default_teacher_limit', 'default_course_limit', 'default_video_limit'], 'حدود العرض')} saving={isSaving(['default_teacher_limit', 'default_course_limit', 'default_video_limit'])}>
        <SettingsField type="number" label="عدد المدرسين" value={String(draft.default_teacher_limit ?? 12)} onChange={(v) => setFlat('default_teacher_limit')(Number(v) || 0)} />
        <SettingsField type="number" label="عدد الدورات" value={String(draft.default_course_limit ?? 6)} onChange={(v) => setFlat('default_course_limit')(Number(v) || 0)} />
        <SettingsField type="number" label="عدد الفيديوهات" value={String(draft.default_video_limit ?? 6)} onChange={(v) => setFlat('default_video_limit')(Number(v) || 0)} />
      </SettingsCard>
    </div>
  );
}

// ──────────────────────────────────────────────
// Subscriptions Panel
// ──────────────────────────────────────────────
function SubscriptionsPanel({
  subscriptions,
  busy,
  onRefresh,
  onApprove,
  onReject,
}: {
  subscriptions: AdminSubscriptionRow[];
  busy: boolean;
  onRefresh: () => void;
  onApprove: (subscription: AdminSubscriptionRow) => void;
  onReject: (subscription: AdminSubscriptionRow) => void;
}) {
  const pending = subscriptions.filter((s) => s.status === 'pending');
  const totalConfirmed = subscriptions.filter((s) => s.status === 'active').reduce((sum, s) => sum + Number(s.price ?? 0), 0);
  return (
    <div className="space-y-6">
      <PanelHeading icon={DollarSign} title="الاشتراكات والمدفوعات" description="راجع الطلبات المعلقة وفعّل الوصول بعد التأكد من الدفع." />
      <div className="grid gap-4 sm:grid-cols-3">
        <InsightCard icon={CreditCard} label="إجمالي الطلبات" value={subscriptions.length} tone="cyan" />
        <InsightCard icon={AlertTriangle} label="طلبات معلقة" value={pending.length} tone="amber" />
        <InsightCard icon={DollarSign} label="إيراد الاشتراكات النشطة" value={`${Number(totalConfirmed).toLocaleString('ar-EG')} جنيه`} tone="emerald" />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-900/20">
        <div><p className="font-bold text-amber-800 dark:text-amber-200">{pending.length} طلبات تحتاج مراجعة</p><p className="mt-1 text-xs text-amber-700 dark:text-amber-300">تفعيل الطلب يفتح المحتوى المدفوع للطالب.</p></div>
        <button type="button" onClick={onRefresh} disabled={busy} className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-amber-800 shadow-sm hover:bg-amber-100 disabled:opacity-50 dark:bg-slate-800 dark:text-amber-200"><RefreshCw className={`ml-1 inline h-4 w-4 ${busy ? 'animate-spin' : ''}`} /> تحديث</button>
      </div>
      {subscriptions.length === 0 ? <EmptyAdminState title="لا توجد طلبات اشتراك" /> : <div className="grid gap-4 lg:grid-cols-2">{subscriptions.map((subscription) => {
        const isPending = subscription.status === 'pending';
        const accessLabel = subscription.access_type === 'purchase' ? 'شراء نهائي' : subscription.access_type === 'subscription' ? 'اشتراك' : 'اشتراك عام';
        return (
          <div key={subscription.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white">{subscription.student_name ?? 'طالب'}</h3>
                <p className="mt-1 text-sm text-slate-500">{subscription.course_title ? `دورة: ${subscription.course_title}` : (subscription.plan_name ?? 'اشتراك عام')} • {Number(subscription.price ?? 0).toLocaleString('ar-EG')} جنيه • {accessLabel}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${isPending ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' : subscription.status === 'active' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                {isPending ? 'معلق' : subscription.status === 'active' ? 'نشط' : subscription.status}
              </span>
            </div>
            <p className="mt-3 text-xs text-slate-400">{subscription.end_date ? `ينتهي في ${new Date(subscription.end_date).toLocaleDateString('ar-EG')} • ` : 'وصول دائم • '}الدفع: {subscription.payment_status === 'paid' ? 'مدفوع' : 'قيد المراجعة'}</p>
            {isPending && <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => onApprove(subscription)} disabled={busy} className="flex-1 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"><Check className="ml-1 inline h-4 w-4" /> اعتماد وتفعيل</button>
              <button type="button" onClick={() => onReject(subscription)} disabled={busy} className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-bold text-rose-600 hover:bg-rose-100 disabled:opacity-50 dark:bg-rose-900/20 dark:text-rose-300">رفض</button>
            </div>}
          </div>
        );
      })}</div>}
    </div>
  );
}

// ──────────────────────────────────────────────
// Analytics Panel
// ──────────────────────────────────────────────
function ChartSeries({ points, barClass, format }: { points: DailyPoint[]; barClass: string; format: (p: DailyPoint) => number }) {
  const values = points.map(format);
  const max = Math.max(1, ...values);
  return (
    <div className="flex h-36 items-end gap-px">
      {points.map((p) => {
        const v = format(p);
        return <div key={p.date} title={`${p.date} — ${v}`} className="flex-1 rounded-t" style={{ height: `${Math.max(2, (v / max) * 100)}%`, background: barClass }} />;
      })}
    </div>
  );
}

function AnalyticsPanel() {
  const [daily, setDaily] = useState<DailyPoint[]>([]);
  const [snapshot, setSnapshot] = useState<OverviewSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: d }, { data: s }] = await Promise.all([
      supabase.rpc('admin_analytics_daily'),
      supabase.rpc('admin_dashboard_snapshot'),
    ]);
    setDaily((d ?? []) as DailyPoint[]);
    setSnapshot((s ?? null) as OverviewSnapshot | null);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const totalSignups = daily.reduce((s, p) => s + p.signups, 0);
  const totalSubs = daily.reduce((s, p) => s + p.subscriptions, 0);
  const totalRevenue = daily.reduce((s, p) => s + Number(p.revenue), 0);

  return (
    <section id="analytics-panel" className="space-y-4">
      <PanelHeading icon={TrendingUp} title="التحليلات" description="رسوم بيانية لآخر 30 يوم من الاشتراكات والإيرادات والتسجيلات الجديدة." />
      {loading ? <Loader2 className="mx-auto mt-16 h-8 w-8 animate-spin text-blue-600" /> : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <InsightCard icon={Users} label="مستخدم جديد (30 يوم)" value={totalSignups.toLocaleString('ar-EG')} tone="cyan" />
            <InsightCard icon={CreditCard} label="اشتراكات (30 يوم)" value={totalSubs.toLocaleString('ar-EG')} tone="emerald" />
            <InsightCard icon={DollarSign} label="إيرادات (30 يوم)" value={`${Number(totalRevenue).toLocaleString('ar-EG')} جنيه`} tone="amber" />
            <InsightCard icon={BookOpen} label="دورات" value={snapshot?.counts?.courses ?? 0} tone="violet" />
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <h4 className="mb-3 text-sm font-bold text-slate-700 dark:text-slate-200">التسجيلات اليومية</h4>
              <ChartSeries points={daily} barClass="bg-sky-400" format={(p) => p.signups} />
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <h4 className="mb-3 text-sm font-bold text-slate-700 dark:text-slate-200">الاشتراكات اليومية</h4>
              <ChartSeries points={daily} barClass="bg-emerald-400" format={(p) => p.subscriptions} />
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <h4 className="mb-3 text-sm font-bold text-slate-700 dark:text-slate-200">الإيرادات اليومية (جنيه)</h4>
              <ChartSeries points={daily} barClass="bg-amber-400" format={(p) => Number(p.revenue)} />
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <h4 className="mb-3 text-sm font-bold text-slate-700 dark:text-slate-200">أعلى المدرسين تقييماً</h4>
              <div className="space-y-2">
                {snapshot?.top_teachers?.map((t, idx) => (
                  <div key={t.id ?? t.name ?? idx} className="flex items-center justify-between text-sm"><span className="font-semibold text-slate-700 dark:text-slate-200">{t.teacher_name ?? t.name ?? 'مدرس'}</span><span className="text-slate-500 dark:text-slate-400">{(Number(t.avg_rating ?? 0)).toFixed(1)} ★</span></div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <h4 className="mb-3 text-sm font-bold text-slate-700 dark:text-slate-200">أعلى الدورات إيراداً</h4>
              <div className="space-y-2">
                {snapshot?.top_courses?.map((c, idx) => (
                  <div key={c.id ?? c.title ?? idx} className="flex items-center justify-between text-sm"><span className="font-semibold text-slate-700 dark:text-slate-200">{c.course_title ?? c.title ?? 'دورة'}</span><span className="text-slate-500 dark:text-slate-400">{Number(c.revenue ?? 0).toLocaleString('ar-EG')} جنيه</span></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

// ──────────────────────────────────────────────
// Videos Panel
// ──────────────────────────────────────────────
function VideosPanel() {
  const [rows, setRows] = useState<AdminVideoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('videos')
      .select('id,title,is_free,views_count,duration_seconds,created_at,teacher:profiles!videos_teacher_id_fkey(full_name),course:courses!videos_course_id_fkey(title)')
      .order('created_at', { ascending: false })
      .limit(300);
    setRows((data ?? []) as unknown as AdminVideoRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const toggleFree = async (v: AdminVideoRow) => {
    setBusyId(v.id);
    await supabase.from('videos').update({ is_free: !v.is_free }).eq('id', v.id);
    await load();
    setBusyId(null);
  };

  const remove = async (v: AdminVideoRow) => {
    if (!confirm(`حذف الفيديو "${v.title}" نهائياً؟`)) return;
    setBusyId(v.id);
    await supabase.from('videos').delete().eq('id', v.id);
    await load();
    setBusyId(null);
  };

  const fmtDuration = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

  return (
    <section id="videos-panel" className="space-y-4">
      <PanelHeading icon={Film} title="الفيديوهات" description="إدارة فيديوهات المدرسين: التحكم في الوصول المجاني أو حذف فيديوهات مخالفة." />
      {loading ? <Loader2 className="mx-auto mt-16 h-8 w-8 animate-spin text-blue-600" /> : rows.length === 0 ? <EmptyAdminState title="لا توجد فيديوهات" /> : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <table className="w-full text-start text-sm"><thead><tr className="border-b border-slate-200 text-xs font-bold text-slate-400 dark:border-slate-700 dark:text-slate-500">
            <th className="px-4 py-3">الفيديو</th><th className="px-4 py-3">المدرس</th><th className="px-4 py-3">المشاهدات</th><th className="px-4 py-3">المدة</th><th className="px-4 py-3">الوصول</th><th className="px-4 py-3">الإجراءات</th>
          </tr></thead><tbody>
            {rows.map((v) => (
              <tr key={v.id} className="border-b border-slate-100 text-slate-600 last:border-0 dark:border-slate-700 dark:text-slate-300">
                <td className="px-4 py-3"><div className="font-bold text-slate-900 dark:text-white">{v.title}</div>{v.course_title && <div className="text-xs text-slate-400">{v.course_title}</div>}</td>
                <td className="px-4 py-3">{v.teacher_name ?? '—'}</td>
                <td className="px-4 py-3">{v.views_count.toLocaleString('ar-EG')}</td>
                <td className="px-4 py-3">{fmtDuration(v.duration_seconds)}</td>
                <td className="px-4 py-3">
                  <button type="button" onClick={() => { void toggleFree(v); }} disabled={busyId === v.id} className={`rounded-full px-3 py-1 text-xs font-bold ${v.is_free ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300'}`}>
                    {v.is_free ? 'مجاني' : 'مدفوع'}
                  </button>
                </td>
                <td className="px-4 py-3"><button type="button" onClick={() => { void remove(v); }} disabled={busyId === v.id} className="rounded-xl bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-100 disabled:opacity-50 dark:bg-rose-900/20 dark:text-rose-300">حذف</button></td>
              </tr>
            ))}
          </tbody></table>
        </div>
      )}
    </section>
  );
}

// ──────────────────────────────────────────────
// Moderation Panel (comments & reviews)
// ──────────────────────────────────────────────
function ModerationPanel() {
  const [section, setSection] = useState<'comments' | 'teacher-reviews' | 'course-reviews'>('comments');
  const [comments, setComments] = useState<ModCommentRow[]>([]);
  const [teacherReviews, setTeacherReviews] = useState<ModReviewRow[]>([]);
  const [courseReviews, setCourseReviews] = useState<ModReviewRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [{ data: c }, { data: tr }, { data: cr }] = await Promise.all([
      supabase.from('comments').select('id,comment,created_at,student:profiles!comments_student_id_fkey(full_name),video:videos(title)', { count: 'exact' }).order('created_at', { ascending: false }).limit(300),
      supabase.from('reviews').select('id,rating,comment,created_at,student:profiles!reviews_student_id_fkey(full_name),teacher:profiles!reviews_teacher_id_fkey(full_name)', { count: 'exact' }).order('created_at', { ascending: false }).limit(300),
      supabase.from('course_reviews').select('id,rating,comment,created_at,student:profiles!course_reviews_student_id_fkey(full_name),course:courses(title)', { count: 'exact' }).order('created_at', { ascending: false }).limit(300),
    ]);
    setComments((c ?? []) as unknown as ModCommentRow[]);
    setTeacherReviews((tr ?? []) as unknown as ModReviewRow[]);
    setCourseReviews((cr ?? []) as unknown as ModReviewRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { void loadAll(); }, [loadAll]);

  const deleteComment = async (id: string) => {
    if (!confirm('حذف هذا التعليق؟')) return;
    await supabase.from('comments').delete().eq('id', id);
    await loadAll();
  };

  const deleteReview = async (table: 'reviews' | 'course_reviews', id: string) => {
    if (!confirm('حذف هذا التقييم؟')) return;
    await supabase.from(table).delete().eq('id', id);
    await loadAll();
  };

  const stars = (n: number) => '★'.repeat(Math.max(1, Math.min(5, n))) + '☆'.repeat(Math.max(0, 5 - Math.max(1, Math.min(5, n))));

  return (
    <section id="moderation-panel" className="space-y-4">
      <PanelHeading icon={MessageSquare} title="التعليقات والتقييمات" description="مراجعة وحذف التعليقات والتقييمات المخالفة." />
      <div className="flex gap-2">
        {([
          ['comments', `التعليقات (${comments.length})`],
          ['teacher-reviews', `تقييمات المدرسين (${teacherReviews.length})`],
          ['course-reviews', `تقييمات الدورات (${courseReviews.length})`],
        ] as const).map(([id, label]) => (
          <button key={id} type="button" onClick={() => setSection(id)} className={`rounded-xl px-4 py-2 text-sm font-bold ${section === id ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 shadow-sm dark:bg-slate-800 dark:text-slate-300'}`}>{label}</button>
        ))}
      </div>
      {loading ? <Loader2 className="mx-auto mt-16 h-8 w-8 animate-spin text-blue-600" /> : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <table className="w-full text-start text-sm"><thead><tr className="border-b border-slate-200 text-xs font-bold text-slate-400 dark:border-slate-700 dark:text-slate-500">
            <th className="px-4 py-3">المستخدم</th><th className="px-4 py-3">المحتوى</th><th className="px-4 py-3">على</th><th className="px-4 py-3">التاريخ</th><th className="px-4 py-3">حذف</th>
          </tr></thead><tbody>
            {section === 'comments' && comments.map((c) => (
              <tr key={c.id} className="border-b border-slate-100 text-slate-600 last:border-0 dark:border-slate-700 dark:text-slate-300">
                <td className="px-4 py-3 font-semibold">{c.student_name ?? 'طالب'}</td>
                <td className="max-w-md px-4 py-3">{c.comment}</td>
                <td className="px-4 py-3">{c.video_title ?? '—'}</td>
                <td className="px-4 py-3 text-xs">{new Date(c.created_at).toLocaleDateString('ar-EG')}</td>
                <td className="px-4 py-3"><button type="button" onClick={() => { void deleteComment(c.id); }} className="rounded-xl bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-100 dark:bg-rose-900/20 dark:text-rose-300">حذف</button></td>
              </tr>
            ))}
            {section === 'teacher-reviews' && teacherReviews.map((r) => (
              <tr key={r.id} className="border-b border-slate-100 text-slate-600 last:border-0 dark:border-slate-700 dark:text-slate-300">
                <td className="px-4 py-3 font-semibold">{r.student_name ?? 'طالب'}</td>
                <td className="max-w-md px-4 py-3"><div className="text-amber-500">{stars(r.rating)}</div><div>{r.comment ?? ''}</div></td>
                <td className="px-4 py-3">مدرس: {r.teacher_name ?? '—'}</td>
                <td className="px-4 py-3 text-xs">{new Date(r.created_at).toLocaleDateString('ar-EG')}</td>
                <td className="px-4 py-3"><button type="button" onClick={() => { void deleteReview('reviews', r.id); }} className="rounded-xl bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-100 dark:bg-rose-900/20 dark:text-rose-300">حذف</button></td>
              </tr>
            ))}
            {section === 'course-reviews' && courseReviews.map((r) => (
              <tr key={r.id} className="border-b border-slate-100 text-slate-600 last:border-0 dark:border-slate-700 dark:text-slate-300">
                <td className="px-4 py-3 font-semibold">{r.student_name ?? 'طالب'}</td>
                <td className="max-w-md px-4 py-3"><div className="text-amber-500">{stars(r.rating)}</div><div>{r.comment ?? ''}</div></td>
                <td className="px-4 py-3">دورة: {r.course_title ?? '—'}</td>
                <td className="px-4 py-3 text-xs">{new Date(r.created_at).toLocaleDateString('ar-EG')}</td>
                <td className="px-4 py-3"><button type="button" onClick={() => { void deleteReview('course_reviews', r.id); }} className="rounded-xl bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-100 dark:bg-rose-900/20 dark:text-rose-300">حذف</button></td>
              </tr>
            ))}
          </tbody></table>
        </div>
      )}
    </section>
  );
}

// ──────────────────────────────────────────────
// Broadcast Panel
// ──────────────────────────────────────────────
function BroadcastPanel() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [link, setLink] = useState('');
  const [type, setType] = useState('broadcast');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<number | null>(null);

  const send = async () => {
    if (!title.trim()) return;
    setBusy(true);
    const { count } = await supabase.from('profiles').select('id', { count: 'exact', head: true });
    const { error } = await supabase.rpc('admin_broadcast_notification', { p_title: title.trim(), p_body: body.trim() || null, p_link: link.trim() || null, p_type: type });
    setBusy(false);
    if (!error) {
      setSent(count ?? 0);
      setTitle(''); setBody(''); setLink('');
    }
  };

  return (
    <section id="broadcast-panel" className="space-y-4">
      <PanelHeading icon={Send} title="إشعار للجميع" description="بث إشعار فوري لجميع مستخدمي المنصة." />
      <div className="max-w-2xl space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div>
          <label className="mb-1 block text-sm font-bold text-slate-700 dark:text-slate-200">العنوان *</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثال: تخفيضات على الاشتراكات" className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-bold text-slate-700 dark:text-slate-200">النص</label>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder="نص الإشعار..." className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-bold text-slate-700 dark:text-slate-200">الرابط (اختياري)</label>
          <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="/" className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-bold text-slate-700 dark:text-slate-200">النوع</label>
          <select value={type} onChange={(e) => setType(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white">
            <option value="broadcast">عام</option>
            <option value="announcement">إعلان</option>
            <option value="new_course">دورة جديدة</option>
            <option value="event">حدث</option>
            <option value="promotion">عرض</option>
          </select>
        </div>
        <button type="button" onClick={() => { void send(); }} disabled={busy || !title.trim()} className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"><Send className="h-4 w-4" /> {busy ? 'جارٍ الإرسال...' : 'إرسال للجميع'}</button>
        {sent !== null && <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">تم إرسال الإشعار إلى {sent.toLocaleString('ar-EG')} مستخدم.</p>}
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────
// Admin Users Panel
// ──────────────────────────────────────────────
function AdminUsersPanel() {
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState('');
  const [found, setFound] = useState<{ id: string; full_name: string | null } | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [selfId, setSelfId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [{ data }, { data: u }] = await Promise.all([
      supabase.rpc('admin_list_admins'),
      supabase.auth.getUser(),
    ]);
    setRows((data ?? []) as unknown as AdminUserRow[]);
    setSelfId(u?.user?.id ?? null);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const lookup = async () => {
    if (!email.trim()) return;
    setLookingUp(true);
    const { data } = await supabase.rpc('admin_find_user_by_email', { p_email: email.trim().toLowerCase() });
    setFound((data as unknown as { id: string; full_name: string | null }) ?? null);
    setLookingUp(false);
    if (!data) setNotice('لم يتم العثور على مستخدم بهذا البريد.');
    else setNotice(null);
  };

  const add = async () => {
    if (!found) return;
    setBusy(true);
    await supabase.rpc('admin_set_admin', { target_id: found.id, value: true });
    setFound(null); setEmail('');
    await load();
    setBusy(false);
    setNotice('تمت إضافة الإداري بنجاح.');
  };

  const remove = async (r: AdminUserRow) => {
    if (r.user_id === selfId) { setNotice('لا يمكنك إزالة حسابك من قائمة الإداريين.'); return; }
    if (!confirm(`إزالة ${r.full_name ?? 'هذا الإداري'} من قائمة الإداريين؟`)) return;
    setBusy(true);
    await supabase.rpc('admin_set_admin', { target_id: r.user_id, value: false });
    await load();
    setBusy(false);
  };

  return (
    <section id="admins-panel" className="space-y-4">
      <PanelHeading icon={Shield} title="الإداريون" description="إدارة حسابات الإداريين على المنصة." />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <h4 className="mb-3 text-sm font-bold text-slate-700 dark:text-slate-200">إضافة إداري جديد</h4>
          <div className="flex gap-2">
            <input value={email} onChange={(e) => { setEmail(e.target.value); setFound(null); setNotice(null); }} placeholder="البريد الإلكتروني للمستخدم" className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white" />
            <button type="button" onClick={() => { void lookup(); }} disabled={lookingUp || !email.trim()} className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-200 disabled:opacity-50 dark:bg-slate-700 dark:text-slate-200">{lookingUp ? <Loader2 className="h-4 w-4 animate-spin" /> : 'بحث'}</button>
          </div>
          {found && (
            <div className="mt-3 flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3 dark:bg-emerald-900/30">
              <span className="text-sm font-bold text-emerald-800 dark:text-emerald-300">{found.full_name ?? found.id}</span>
              <button type="button" onClick={() => { void add(); }} disabled={busy} className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50">إضافة إداري</button>
            </div>
          )}
          {notice && <p className="mt-3 text-sm font-bold text-slate-500 dark:text-slate-400">{notice}</p>}
        </div>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <table className="w-full text-start text-sm"><thead><tr className="border-b border-slate-200 text-xs font-bold text-slate-400 dark:border-slate-700 dark:text-slate-500"><th className="px-4 py-3">الإداري</th><th className="px-4 py-3">الإجراءات</th></tr></thead><tbody>
            {loading ? <Loader2 className="mx-auto mt-8 h-8 w-8 animate-spin text-blue-600" /> : rows.map((r) => (
              <tr key={r.user_id} className="border-b border-slate-100 text-slate-600 last:border-0 dark:border-slate-700 dark:text-slate-300">
                <td className="px-4 py-3"><div className="font-bold text-slate-900 dark:text-white">{r.full_name ?? 'إداري'}</div>{r.email && <div className="text-xs text-slate-400">{r.email}</div>}{r.user_id === selfId && <span className="mt-1 inline-block rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">أنت</span>}</td>
                <td className="px-4 py-3"><button type="button" onClick={() => { void remove(r); }} disabled={busy} className="rounded-xl bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-100 disabled:opacity-50 dark:bg-rose-900/20 dark:text-rose-300">إزالة</button></td>
              </tr>
            ))}
          </tbody></table>
        </div>
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────
// Reports Panel (CSV export)
// ──────────────────────────────────────────────
function downloadCSV(filename: string, headers: string[], rows: (string | number | null)[][]) {
  const esc = (v: string | number | null) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const csv = [headers.map(esc).join(','), ...rows.map((r) => r.map(esc).join(','))].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function ReportsPanel() {
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [payoutRows, setPayoutRows] = useState<TeacherPayoutRow[]>([]);
  const [payoutLoading, setPayoutLoading] = useState(true);
  const [payoutPeriodStart, setPayoutPeriodStart] = useState(() => {
    const date = new Date();
    date.setUTCDate(1);
    return date.toISOString().slice(0, 10);
  });
  const [payoutPeriodEnd, setPayoutPeriodEnd] = useState(() => new Date().toISOString().slice(0, 10));
  const [payoutGenerationLoading, setPayoutGenerationLoading] = useState(false);
  const [payoutGenerationNotice, setPayoutGenerationNotice] = useState<string | null>(null);
  const [serviceTeachers, setServiceTeachers] = useState<Array<{ id: string; full_name: string | null; email: string | null; teacher_tier: string | null }>>([]);
  const [serviceTeacherId, setServiceTeacherId] = useState('');
  const [serviceKey, setServiceKey] = useState<'managed_video_uploads' | 'consultations'>('managed_video_uploads');
  const [serviceRecording, setServiceRecording] = useState(false);
  const [serviceNotice, setServiceNotice] = useState<string | null>(null);

  const loadPayouts = useCallback(async () => {
    setPayoutLoading(true);
    const { data } = await supabase.rpc('admin_teacher_payouts_list');
    setPayoutRows((data ?? []) as TeacherPayoutRow[]);
    setPayoutLoading(false);
  }, []);

  useEffect(() => { void loadPayouts(); }, [loadPayouts]);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id,full_name,email,teacher_tier')
        .eq('is_teacher', true)
        .order('full_name');
      setServiceTeachers((data ?? []) as Array<{ id: string; full_name: string | null; email: string | null; teacher_tier: string | null }>);
    })();
  }, []);

  const recordServiceUsage = async () => {
    if (!serviceTeacherId) {
      setServiceNotice('اختر مدرسًا أولًا.');
      return;
    }
    setServiceRecording(true);
    setServiceNotice(null);
    const { error } = await supabase.rpc('admin_record_teacher_service_usage', {
      target_teacher: serviceTeacherId,
      target_service: serviceKey,
      increment_by: 1,
    });
    setServiceRecording(false);
    setServiceNotice(error ? (error.message.includes('service_limit') ? 'تم الوصول إلى الحد الشهري لهذه الخدمة.' : 'تعذر تسجيل الخدمة.') : 'تم تسجيل الخدمة بنجاح.');
  };

  const generatePayouts = async () => {
    if (!payoutPeriodStart || !payoutPeriodEnd || payoutPeriodStart >= payoutPeriodEnd) {
      setPayoutGenerationNotice('اختر فترة صحيحة بحيث يكون تاريخ البداية قبل النهاية.');
      return;
    }

    setPayoutGenerationLoading(true);
    setPayoutGenerationNotice(null);
    const { data, error } = await supabase.rpc('admin_generate_teacher_payouts_for_period', {
      p_period_start: `${payoutPeriodStart}T00:00:00.000Z`,
      p_period_end: `${payoutPeriodEnd}T23:59:59.999Z`,
      p_payment_method: 'bank',
    });
    setPayoutGenerationLoading(false);

    if (error) {
      setPayoutGenerationNotice('تعذر توليد دفعات المدرسين. راجع صلاحيات الأدمن وسجل قاعدة البيانات.');
      return;
    }

    await loadPayouts();
    setPayoutGenerationNotice(`تمت معالجة الفترة وإنشاء أو تأكيد ${Array.isArray(data) ? data.length : 0} دفعة.`);
  };

  const run = async (key: string, rpc: string, filename: string, headers: string[], map: (r: Record<string, unknown>) => (string | number | null)[]) => {
    setLoadingKey(key);
    const { data } = (await supabase.rpc(rpc)) as unknown as { data: Record<string, unknown>[] | null };
    const rowsRaw = (data ?? []) as Record<string, unknown>[];
    downloadCSV(filename, headers, rowsRaw.map(map));
    setCounts((c) => ({ ...c, [key]: rowsRaw.length }));
    setLoadingKey(null);
  };

  const runExcel = async (key: string, rpc: string, filename: string, headers: string[], map: (r: Record<string, unknown>) => (string | number | null)[]) => {
    setLoadingKey(key);
    const { data } = (await supabase.rpc(rpc)) as unknown as { data: Record<string, unknown>[] | null };
    const rowsRaw = (data ?? []) as Record<string, unknown>[];
    downloadExcel(filename, headers, rowsRaw.map(map));
    setCounts((c) => ({ ...c, [key]: rowsRaw.length }));
    setLoadingKey(null);
  };

  const argDate = (d: string | null) => (d ? new Date(d).toLocaleDateString('ar-EG') : '');

  const payoutTotalGross = payoutRows.reduce((sum, row) => sum + Number(row.total_gross ?? 0), 0);
  const payoutTotalPlatform = payoutRows.reduce((sum, row) => sum + Number(row.total_platform_fee ?? 0), 0);
  const payoutTotalTeacher = payoutRows.reduce((sum, row) => sum + Number(row.total_teacher_payout ?? 0), 0);
  const pendingPayouts = payoutRows.filter((row) => row.status === 'pending').length;

  const buttons: Array<{ key: string; label: string; rpc: string; filename: string; headers: string[]; map: (r: Record<string, unknown>) => (string | number | null)[] }> = [
    { key: 'students', label: 'تصدير الطلاب', rpc: 'admin_student_stats', filename: 'students.csv', headers: ['الاسم', 'البريد', 'تاريخ التسجيل', 'الدورات', 'الإجمالي المنفق'], map: (r) => [r.full_name as string, r.email as string, argDate(r.created_at as string), r.enrollment_count as number, r.total_spent as number] },
    { key: 'teachers', label: 'تصدير المدرسين', rpc: 'admin_teacher_stats', filename: 'teachers.csv', headers: ['الاسم', 'البريد', 'الحالة', 'الدورات', 'الفيديوهات', 'الإيرادات'], map: (r) => [r.full_name as string, r.email as string, r.is_approved ? 'معتمد' : 'غير معتمد', r.course_count as number, r.video_count as number, r.total_earnings as number] },
    { key: 'courses', label: 'تصدير الدورات', rpc: 'admin_course_stats', filename: 'courses.csv', headers: ['الدورة', 'المدرس', 'الطلاب', 'الإيرادات', 'المشاهدات', 'الحالة'], map: (r) => [r.title as string, r.teacher_name as string, r.students_count as number, r.revenue as number, r.views_count as number, r.is_published ? 'منشورة' : 'مسودة'] },
    { key: 'subscriptions', label: 'تصدير الاشتراكات', rpc: 'admin_subscriptions_list', filename: 'subscriptions.csv', headers: ['الطالب', 'المدرس', 'الدورة', 'الحالة', 'السعر', 'تاريخ البداية'], map: (r) => [r.student_name as string, r.teacher_name as string, r.course_title as string, r.status as string, r.price as number, argDate(r.start_date as string)] },
    { key: 'payments', label: 'تصدير المدفوعات', rpc: 'admin_payments_list', filename: 'payments.csv', headers: ['الطالب', 'المدرس', 'المبلغ', 'العمولة', 'رسوم المنصة', 'مستحق المدرس', 'الحالة', 'التاريخ'], map: (r) => [r.student_name as string, r.teacher_name as string, r.gross_amount as number, r.amount as number, r.platform_fee as number, r.teacher_payout as number, r.status as string, argDate((r.created_at as string) ?? null)] },
    { key: 'payouts', label: 'تصدير دفعات المدرسين', rpc: 'admin_teacher_payouts_list', filename: 'teacher-payouts.csv', headers: ['المدرس', 'البريد', 'الفترة', 'الإيراد الكلي', 'رسوم المنصة', 'مستحق المدرس', 'الحالة'], map: (r) => [r.teacher_name as string, r.email as string, `${argDate(r.period_start as string)} / ${argDate(r.period_end as string)}`, r.total_gross as number, r.total_platform_fee as number, r.total_teacher_payout as number, r.status as string] },
  ];

  return (
    <section id="reports-panel" className="space-y-6">
      <PanelHeading icon={FileDown} title="التقارير" description="تصدير تقارير المنصة بصيغة CSV ومتابعة مستحقات المدرسين." />

      <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5 shadow-sm dark:border-amber-500/30 dark:bg-amber-900/10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h3 className="font-black text-amber-900 dark:text-amber-200">تسجيل خدمات Premium Plus</h3>
            <p className="mt-1 text-sm text-amber-800/80 dark:text-amber-300/80">سجّل رفع فيديو أو جلسة استشارة، وسيُخصم الاستخدام من حد المدرس الشهري.</p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-sm font-bold text-slate-600 dark:text-slate-300">المدرس
              <select value={serviceTeacherId} onChange={(event) => setServiceTeacherId(event.target.value)} className="mt-1 block min-w-56 rounded-xl border border-amber-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-amber-500/30 dark:bg-slate-900 dark:text-white">
                <option value="">اختر المدرس</option>
                {serviceTeachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.full_name ?? teacher.email ?? teacher.id} {teacher.teacher_tier === 'premium_plus' ? '(Plus)' : ''}</option>)}
              </select>
            </label>
            <label className="text-sm font-bold text-slate-600 dark:text-slate-300">الخدمة
              <select value={serviceKey} onChange={(event) => setServiceKey(event.target.value as typeof serviceKey)} className="mt-1 block rounded-xl border border-amber-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-amber-500/30 dark:bg-slate-900 dark:text-white">
                <option value="managed_video_uploads">رفع فيديو بواسطة الفريق</option>
                <option value="consultations">جلسة استشارة</option>
              </select>
            </label>
            <button type="button" onClick={() => { void recordServiceUsage(); }} disabled={serviceRecording} className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-amber-600 disabled:opacity-50">{serviceRecording ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} تسجيل الاستخدام</button>
          </div>
        </div>
        {serviceNotice && <p className="mt-3 text-sm font-bold text-slate-600 dark:text-slate-300">{serviceNotice}</p>}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h3 className="font-black text-slate-900 dark:text-white">توليد دفعات فترة</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">يتم احتساب المدفوعات المؤهلة مرة واحدة فقط لكل مدرس وفترة.</p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-sm font-bold text-slate-600 dark:text-slate-300">من
              <input type="date" value={payoutPeriodStart} onChange={(event) => setPayoutPeriodStart(event.target.value)} className="mt-1 block rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white" />
            </label>
            <label className="text-sm font-bold text-slate-600 dark:text-slate-300">إلى
              <input type="date" value={payoutPeriodEnd} onChange={(event) => setPayoutPeriodEnd(event.target.value)} className="mt-1 block rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white" />
            </label>
            <button type="button" onClick={() => { void generatePayouts(); }} disabled={payoutGenerationLoading} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
              {payoutGenerationLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} توليد الدفعات
            </button>
          </div>
        </div>
        {payoutGenerationNotice && <p className="mt-3 text-sm font-bold text-slate-500 dark:text-slate-400">{payoutGenerationNotice}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <InsightCard icon={DollarSign} label="إجمالي الإيراد" value={`${Number(payoutTotalGross).toLocaleString('ar-EG')} جنيه`} tone="emerald" />
        <InsightCard icon={CreditCard} label="رسوم المنصة" value={`${Number(payoutTotalPlatform).toLocaleString('ar-EG')} جنيه`} tone="amber" />
        <InsightCard icon={TrendingUp} label="مستحقات المدرسين" value={`${Number(payoutTotalTeacher).toLocaleString('ar-EG')} جنيه`} tone="cyan" />
        <InsightCard icon={AlertTriangle} label="دفعات معلقة" value={pendingPayouts.toLocaleString('ar-EG')} tone="violet" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {buttons.map((b) => (
          <div key={b.key} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <h4 className="text-base font-black text-slate-900 dark:text-white">{b.label}</h4>
            {typeof counts[b.key] === 'number' && <p className="mt-1 text-xs text-slate-400">آخر تصدير: {counts[b.key].toLocaleString('ar-EG')} صف</p>}
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => { void run(b.key, b.rpc, b.filename, b.headers, b.map); }} disabled={loadingKey !== null} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50">{loadingKey === b.key ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />} CSV</button>
              <button type="button" onClick={() => { void runExcel(b.key, b.rpc, b.filename.replace('.csv', ''), b.headers, b.map); }} disabled={loadingKey !== null} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200">{loadingKey === b.key ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />} Excel</button>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <h3 className="text-lg font-black text-slate-900 dark:text-white">ملخص دفعات المدرسين</h3>
        </div>

        {payoutLoading ? (
          <div className="flex min-h-[180px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
        ) : payoutRows.length === 0 ? (
          <div className="p-5"><EmptyAdminState title="لا توجد دفعات مدرسين حتى الآن" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-start text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900">
                <tr>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400">المدرس</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400">الفترة</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400">الإيراد</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400">رسوم المنصة</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400">مستحق المدرس</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {payoutRows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900 dark:text-white">{row.teacher_name ?? 'مدرس'}</div>
                      <div className="text-xs text-slate-500">{row.email ?? '—'}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">{argDate(row.period_start)} - {argDate(row.period_end)}</td>
                    <td className="px-4 py-3 font-bold text-emerald-700 dark:text-emerald-300">{Number(row.total_gross).toLocaleString('ar-EG')} جنيه</td>
                    <td className="px-4 py-3 font-bold text-amber-700 dark:text-amber-300">{Number(row.total_platform_fee).toLocaleString('ar-EG')} جنيه</td>
                    <td className="px-4 py-3 font-bold text-blue-700 dark:text-blue-300">{Number(row.total_teacher_payout).toLocaleString('ar-EG')} جنيه</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${row.status === 'paid' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : row.status === 'pending' ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200'}`}>
                        {row.status === 'pending' ? 'قيد الانتظار' : row.status === 'paid' ? 'مدفوع' : row.status === 'approved' ? 'موافق عليه' : row.status === 'processing' ? 'قيد التنفيذ' : row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────
// Exams Panel (quizzes & competitions)
// ──────────────────────────────────────────────
function ExamsPanel() {
  const [quizzes, setQuizzes] = useState<QuizRow[]>([]);
  const [competitions, setCompetitions] = useState<CompetitionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [q, c] = await Promise.all([
      supabase.from('quizzes').select('id,title,passing_score,created_at,course:courses!quizzes_course_id_fkey(title)').order('created_at', { ascending: false }).limit(300),
      supabase.from('competitions').select('id,title,status,created_at,teacher:profiles!competitions_teacher_id_fkey(full_name)').order('created_at', { ascending: false }).limit(300),
    ]);
    setQuizzes((q.data ?? []) as unknown as QuizRow[]);
    setCompetitions((c.data ?? []) as unknown as CompetitionRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const deleteQuiz = async (z: QuizRow) => {
    if (!confirm(`حذف الامتحان "${z.title}"؟ سيتم حذف الأسئلة والنتائج.`)) return;
    setBusyId(z.id);
    await supabase.rpc('admin_delete_quiz', { p_quiz_id: z.id });
    await load();
    setBusyId(null);
  };

  const deleteCompetition = async (c: CompetitionRow) => {
    if (!confirm(`حذف المنافسة "${c.title}"؟ سيتم حذف الأسئلة والنتائج.`)) return;
    setBusyId(c.id);
    await supabase.rpc('admin_delete_competition', { p_competition_id: c.id });
    await load();
    setBusyId(null);
  };

  const setStatus = async (c: CompetitionRow, status: string) => {
    setBusyId(c.id);
    await supabase.rpc('admin_set_competition_status', { p_competition_id: c.id, p_status: status });
    await load();
    setBusyId(null);
  };

  const statusBadge = (s: string) => {
    const meta: Record<string, string> = {
      published: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
      draft: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
      archived: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    };
    return <span className={`rounded-full px-3 py-1 text-xs font-bold ${meta[s] ?? meta.draft}`}>{s === 'published' ? 'منشورة' : s === 'draft' ? 'مسودة' : 'مؤرشفة'}</span>;
  };

  return (
    <section id="exams-panel" className="space-y-4">
      <PanelHeading icon={Swords} title="الامتحانات والمنافسات" description="إدارة امتحانات الدورات والمنافسات: الحذف أو تغيير حالة النشر." />
      {loading ? <Loader2 className="mx-auto mt-16 h-8 w-8 animate-spin text-blue-600" /> : (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <h4 className="border-b border-slate-200 px-4 py-3 text-sm font-black text-slate-900 dark:border-slate-700 dark:text-white">الامتحانات <span className="text-xs font-bold text-slate-400">({quizzes.length})</span></h4>
            <table className="w-full text-start text-sm"><thead><tr className="border-b border-slate-200 text-xs font-bold text-slate-400 dark:border-slate-700 dark:text-slate-500"><th className="px-4 py-2">الامتحان</th><th className="px-4 py-2">الحد الأدنى</th><th className="px-4 py-2">حذف</th></tr></thead><tbody>
              {quizzes.length === 0 && <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-400">لا توجد امتحانات</td></tr>}
              {quizzes.map((z) => (
                <tr key={z.id} className="border-b border-slate-100 text-slate-600 last:border-0 dark:border-slate-700 dark:text-slate-300">
                  <td className="px-4 py-3"><div className="font-bold text-slate-900 dark:text-white">{z.title}</div>{z.course_title && <div className="text-xs text-slate-400">{z.course_title}</div>}</td>
                  <td className="px-4 py-3">{z.passing_score}%</td>
                  <td className="px-4 py-3"><button type="button" onClick={() => { void deleteQuiz(z); }} disabled={busyId === z.id} className="rounded-xl bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-100 disabled:opacity-50 dark:bg-rose-900/20 dark:text-rose-300">حذف</button></td>
                </tr>
              ))}
            </tbody></table>
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <h4 className="border-b border-slate-200 px-4 py-3 text-sm font-black text-slate-900 dark:border-slate-700 dark:text-white">المنافسات <span className="text-xs font-bold text-slate-400">({competitions.length})</span></h4>
            <table className="w-full text-start text-sm"><thead><tr className="border-b border-slate-200 text-xs font-bold text-slate-400 dark:border-slate-700 dark:text-slate-500"><th className="px-4 py-2">المنافسة</th><th className="px-4 py-2">الحالة</th><th className="px-4 py-2">نشر/حذف</th></tr></thead><tbody>
              {competitions.length === 0 && <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-400">لا توجد منافسات</td></tr>}
              {competitions.map((c) => (
                <tr key={c.id} className="border-b border-slate-100 text-slate-600 last:border-0 dark:border-slate-700 dark:text-slate-300">
                  <td className="px-4 py-3"><div className="font-bold text-slate-900 dark:text-white">{c.title}</div>{c.teacher_name && <div className="text-xs text-slate-400">{c.teacher_name}</div>}</td>
                  <td className="px-4 py-3">{statusBadge(c.status)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {c.status !== 'published' && <button type="button" onClick={() => { void setStatus(c, 'published'); }} disabled={busyId === c.id} className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 dark:bg-emerald-900/30 dark:text-emerald-300">نشر</button>}
                      {c.status !== 'archived' && <button type="button" onClick={() => { void setStatus(c, 'archived'); }} disabled={busyId === c.id} className="rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 hover:bg-amber-100 disabled:opacity-50 dark:bg-amber-900/30 dark:text-amber-300">أرشفة</button>}
                      {c.status !== 'draft' && <button type="button" onClick={() => { void setStatus(c, 'draft'); }} disabled={busyId === c.id} className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 hover:bg-slate-200 disabled:opacity-50 dark:bg-slate-700 dark:text-slate-300">مسودة</button>}
                      <button type="button" onClick={() => { void deleteCompetition(c); }} disabled={busyId === c.id} className="rounded-lg bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-600 hover:bg-rose-100 disabled:opacity-50 dark:bg-rose-900/20 dark:text-rose-300">حذف</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody></table>
          </div>
        </div>
      )}
    </section>
  );
}

// ──────────────────────────────────────────────
// Teacher Performance Panel
// ──────────────────────────────────────────────
function PerformancePanel({ logAction }: { logAction?: (action: string, targetType: string, targetId?: string, details?: Record<string, unknown>) => Promise<void> }) {
  const [rows, setRows] = useState<Array<{ teacher_id: string; full_name: string | null; email: string | null; score: number; rating_avg: number | null; rating_count: number; student_count: number; course_count: number; revenue_total: number; calculated_at: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.rpc('admin_teacher_performance_list');
    setRows((data ?? []) as unknown as typeof rows);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const recalculate = async () => {
    setRecalculating(true);
    const { error } = await supabase.rpc('admin_recalculate_teacher_scores');
    setRecalculating(false);
    if (error) { toast('تعذر إعادة الحساب', 'error'); return; }
    if (logAction) await logAction('recalculate_scores', 'system');
    toast('تم إعادة حساب درجات المدرسين', 'success');
    await load();
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-900/30';
    if (score >= 50) return 'text-amber-600 bg-amber-50 dark:text-amber-300 dark:bg-amber-900/30';
    return 'text-rose-600 bg-rose-50 dark:text-rose-300 dark:bg-rose-900/30';
  };

  return (
    <div className="space-y-6">
      <PanelHeading icon={Trophy} title="أداء المدرسين" description="نظام تقييم شامل يعتمد على التقييمات والمبيعات والنشاط." />

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">{rows.length} مدرس • آخر تحديث: {rows[0]?.calculated_at ? new Date(rows[0].calculated_at).toLocaleString('ar-EG') : '-'}</p>
        <button type="button" onClick={() => void recalculate()} disabled={recalculating} className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50">
          {recalculating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} إعادة حساب الدرجات
        </button>
      </div>

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
      ) : rows.length === 0 ? (
        <EmptyAdminState title="لا توجد بيانات أداء" />
      ) : (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-700">
              <thead className="bg-slate-50 dark:bg-slate-900">
                <tr>
                  <th className="px-6 py-3 text-start text-xs font-bold text-slate-500 dark:text-slate-400">المدرس</th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 dark:text-slate-400">الدرجة</th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 dark:text-slate-400">متوسط التقييم</th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 dark:text-slate-400">الطلاب</th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 dark:text-slate-400">الدورات</th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 dark:text-slate-400">الإيراد</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {rows.map((r) => (
                  <tr key={r.teacher_id} className="transition hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">{(r.full_name ?? 'م')[0]}</div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">{r.full_name}</div>
                          <div className="text-xs text-slate-500">{r.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-extrabold ${getScoreColor(r.score)}`}>
                        {r.score.toFixed(0)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-sm font-bold text-amber-600 dark:text-amber-400">
                      {r.rating_avg ? `${r.rating_avg.toFixed(1)} ★ (${r.rating_count})` : '-'}
                    </td>
                    <td className="px-6 py-4 text-center text-sm font-bold text-slate-900 dark:text-white">{r.student_count}</td>
                    <td className="px-6 py-4 text-center text-sm font-bold text-slate-900 dark:text-white">{r.course_count}</td>
                    <td className="px-6 py-4 text-center text-sm font-bold text-emerald-600 dark:text-emerald-400">{Number(r.revenue_total).toLocaleString('ar-EG')} ج.م</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// Device Security Panel
// ──────────────────────────────────────────────
interface LockedAccount {
  user_id: string;
  full_name: string | null;
  email: string | null;
  locked_device_fingerprint: string | null;
  device_lock_enabled: boolean;
  device_count: number;
  last_seen: string | null;
}

interface DeviceDetail {
  device_id: string;
  fingerprint: string;
  device_name: string;
  user_agent: string | null;
  is_current: boolean;
  last_seen_at: string;
  created_at: string;
}

function DeviceSecurityPanel() {
  const [accounts, setAccounts] = useState<LockedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<LockedAccount | null>(null);
  const [devices, setDevices] = useState<DeviceDetail[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [confirmReset, setConfirmReset] = useState<LockedAccount | null>(null);
  const { toast } = useToast();

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.rpc('admin_get_locked_accounts');
    setAccounts((data ?? []) as LockedAccount[]);
    setLoading(false);
  }, []);

  useEffect(() => { void loadAccounts(); }, [loadAccounts]);

  const viewDevices = async (acc: LockedAccount) => {
    setSelectedUser(acc);
    setLoadingDevices(true);
    const { data } = await supabase.rpc('admin_get_user_device_details', { p_user_id: acc.user_id });
    setDevices((data ?? []) as DeviceDetail[]);
    setLoadingDevices(false);
  };

  const resetDeviceLock = async (userId: string) => {
    const { error } = await supabase.rpc('admin_reset_device_lock', { p_user_id: userId });
    if (error) { toast('تعذر إعادة تعيين القفل', 'error'); return; }
    toast('تم إعادة تعيين قفل الجهاز — يمكن للطالب تسجيل الدخول من جهاز جديد', 'success');
    setConfirmReset(null);
    setSelectedUser(null);
    void loadAccounts();
  };

  return (
    <div className="space-y-6">
      <PanelHeading icon={Shield} title="الأمان وحماية الأجهزة" description="تقييد الحسابات بجهاز واحد لمنع مشاركة الاشتراكات" />

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="text-sm font-bold text-amber-800 dark:text-amber-300">حماية الاشتراكات</p>
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">الحسابات مقيدة بجهاز واحد. عند إعادة التعيين، يسجل الطالب الدخول من جهازه الجديد ويصبح هو الجهاز المعتمد.</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>
      ) : accounts.length === 0 ? (
        <EmptyAdminState title="لا توجد حسابات مقيدة حالياً" />
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500 dark:text-slate-400">{accounts.length} حساب مقيد</p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                <thead className="bg-slate-50 dark:bg-slate-900">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-bold text-slate-500">الطالب</th>
                    <th className="px-6 py-3 text-center text-xs font-bold text-slate-500">الأجهزة المسجلة</th>
                    <th className="px-6 py-3 text-center text-xs font-bold text-slate-500">آخر ظهور</th>
                    <th className="px-6 py-3 text-center text-xs font-bold text-slate-500">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {accounts.map((acc) => (
                    <tr key={acc.user_id} className="transition hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{acc.full_name ?? 'غير معروف'}</p>
                        <p className="text-xs text-slate-500" dir="ltr">{acc.email}</p>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                          {acc.device_count} جهاز
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center text-xs text-slate-500">
                        {acc.last_seen ? new Date(acc.last_seen).toLocaleString('ar-EG') : '—'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => void viewDevices(acc)} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600">
                            <Eye className="inline h-3.5 w-3.5 ml-1" />عرض الأجهزة
                          </button>
                          <button onClick={() => setConfirmReset(acc)} className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:hover:bg-rose-900/40">
                            إعادة تعيين
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Device Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">أجهزة {selectedUser.full_name}</h3>
              <button onClick={() => setSelectedUser(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"><X className="h-5 w-5" /></button>
            </div>

            {loadingDevices ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-blue-500" /></div>
            ) : devices.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">لا توجد أجهزة مسجلة</p>
            ) : (
              <div className="space-y-3">
                {devices.map((d) => (
                  <div key={d.device_id} className={`rounded-xl border p-4 ${d.is_current ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/30' : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-slate-800 dark:text-white">{d.device_name}</p>
                        <p className="mt-0.5 text-[10px] text-slate-500" dir="ltr">{d.user_agent?.slice(0, 60)}...</p>
                      </div>
                      {d.is_current && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">الجهاز الحالي</span>}
                    </div>
                    <p className="mt-2 text-[10px] text-slate-400">آخر ظهور: {new Date(d.last_seen_at).toLocaleString('ar-EG')}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 flex justify-end">
              <button onClick={() => setSelectedUser(null)} className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300">إغلاق</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Reset Modal */}
      {confirmReset && (
        <AdminConfirmModal
          isOpen={true}
          onClose={() => setConfirmReset(null)}
          onConfirm={() => void resetDeviceLock(confirmReset.user_id)}
          title="إعادة تعيين قفل الجهاز"
          message={`هل تريد السماح للطالب "${confirmReset.full_name}" بتسجيل الدخول من جهاز جديد؟ سيتم حذف جميع الأجهزة المسجلة.`}
          confirmLabel="إعادة تعيين"
          variant="danger"
        />
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// Audit Log Panel
// ──────────────────────────────────────────────
function AuditLogPanel() {
  const [rows, setRows] = useState<Array<{ id: string; admin_name: string | null; action: string; target_type: string; target_id: string | null; details: Record<string, unknown> | null; created_at: string }>>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.rpc('admin_audit_log_list', { p_limit: 200 });
    setRows((data ?? []) as unknown as typeof rows);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const ACTION_LABELS: Record<string, string> = {
    approve_teacher: 'اعتماد مدرس',
    reject_teacher: 'رفض مدرس',
    block_teacher: 'حظر مدرس',
    block_student: 'حظر طالب',
    soft_delete: 'حذف ناعم',
    restore: 'استعادة',
    block: 'حظر',
    unblock: 'إلغاء الحظر',
    recalculate_scores: 'إعادة حساب الدرجات',
    set_featured: 'تمييز',
    update_setting: 'تحديث إعداد',
    broadcast: 'إشعار جماعي',
    delete: 'حذف',
    approve_subscription: 'اعتماد اشتراك',
    reject_subscription: 'رفض اشتراك',
  };

  return (
    <div className="space-y-6">
      <PanelHeading icon={Clock} title="سجل العمليات" description="تتبع جميع إجراءات الإدارة على المنصة." />

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
      ) : rows.length === 0 ? (
        <EmptyAdminState title="لا توجد عمليات مسجلة" />
      ) : (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-700">
              <thead className="bg-slate-50 dark:bg-slate-900">
                <tr>
                  <th className="px-6 py-3 text-start text-xs font-bold text-slate-500 dark:text-slate-400">المسؤول</th>
                  <th className="px-6 py-3 text-start text-xs font-bold text-slate-500 dark:text-slate-400">العملية</th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 dark:text-slate-400">النوع</th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 dark:text-slate-400">التفاصيل</th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 dark:text-slate-400">التاريخ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {rows.map((r) => (
                  <tr key={r.id} className="transition hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="px-6 py-4 text-sm font-bold text-slate-900 dark:text-white">{r.admin_name ?? 'غير معروف'}</td>
                    <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">{ACTION_LABELS[r.action] ?? r.action}</td>
                    <td className="px-6 py-4 text-center text-xs text-slate-500">{r.target_type}</td>
                    <td className="px-6 py-4 text-center text-xs text-slate-400">{r.details ? JSON.stringify(r.details).slice(0, 50) : '-'}</td>
                    <td className="px-6 py-4 text-center text-xs text-slate-500">{new Date(r.created_at).toLocaleString('ar-EG')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// Shared Components
// ──────────────────────────────────────────────
function PanelHeading({ icon: Icon, title, description }: { icon: typeof Users; title: string; description: string }) {
  return <div className="flex items-center gap-4"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300"><Icon className="h-6 w-6" /></div><div><h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">{title}</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p></div></div>;
}

function EmptyAdminState({ title }: { title: string }) {
  return <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-800"><Activity className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" /><p className="mt-3 font-bold text-slate-600 dark:text-slate-300">{title}</p><p className="mt-1 text-sm text-slate-400">لا يوجد شيء لعرضه هنا حالياً.</p></div>;
}

function InsightCard({ icon: Icon, label, value, tone }: { icon: typeof Users; label: string; value: number | string; tone: 'cyan' | 'emerald' | 'amber' | 'violet' | 'blue' | 'rose' }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${TONE_MAP[tone] ?? TONE_MAP.cyan}`}><Icon className="h-5 w-5" /></div>
      <div><div className="text-xl font-extrabold text-slate-900 dark:text-white">{value}</div><div className="text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</div></div>
    </div>
  );
}
