import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell, Check, CheckCheck, Trash2, Archive, Loader2,
  BookOpen, Trophy, GraduationCap, Gamepad2, CreditCard, Users, Clock, ShieldCheck,
  Search, Inbox, Filter
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/context/ToastContext';

const CATEGORY_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  enrollment: { label: 'التسجيل', icon: BookOpen, color: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/30' },
  achievement: { label: 'الإنجازات', icon: Trophy, color: 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/30' },
  course: { label: 'الدورات', icon: GraduationCap, color: 'text-violet-600 bg-violet-50 dark:text-violet-400 dark:bg-violet-900/30' },
  competition: { label: 'المنافسات', icon: Gamepad2, color: 'text-cyan-600 bg-cyan-50 dark:text-cyan-400 dark:bg-cyan-900/30' },
  payment: { label: 'المدفوعات', icon: CreditCard, color: 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/30' },
  system: { label: 'النظام', icon: Bell, color: 'text-slate-600 bg-slate-50 dark:text-slate-400 dark:bg-slate-700/30' },
  social: { label: 'التواصل', icon: Users, color: 'text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-900/30' },
  reminder: { label: 'التذكيرات', icon: Clock, color: 'text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-900/30' },
  security: { label: 'الأمان', icon: ShieldCheck, color: 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/30' },
};

interface NotificationRow {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
  category?: string;
  priority?: string;
  action_label?: string | null;
  action_url?: string | null;
  archived_at?: string | null;
}

interface NotificationCenterProps {
  userId: string;
  onCountChange?: (count: number) => void;
  isTeacher?: boolean;
}

export default function NotificationCenter({ userId, onCountChange, isTeacher }: NotificationCenterProps) {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchMode, setBatchMode] = useState(false);
  const [newColumnsExist, setNewColumnsExist] = useState(true);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (filter === 'unread') {
        query = query.eq('is_read', false);
      } else if (filter !== 'all' && newColumnsExist) {
        query = query.eq('category', filter);
      }

      const { data, error } = await query;
      if (error) {
        if (error.message?.includes('column') || error.code === '42703') {
          setNewColumnsExist(false);
          const fallback = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(100);
          setNotifications((fallback.data ?? []) as NotificationRow[]);
        }
      } else {
        const rows = (data ?? []) as NotificationRow[];
        const filtered = rows.filter((n) => !n.archived_at);
        setNotifications(filtered);
      }
    } catch (err) {
      console.warn('Failed to fetch notifications:', err);
    }
    setLoading(false);
  }, [userId, filter, newColumnsExist]);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);
      const c = count ?? 0;
      setUnreadCount(c);
      onCountChange?.(c);
    } catch (err) {
      console.warn('Failed to fetch unread count:', err);
    }
  }, [userId, onCountChange]);

  useEffect(() => {
    void fetchNotifications();
    void fetchUnreadCount();
  }, [fetchNotifications, fetchUnreadCount]);

  useEffect(() => {
    const channel = supabase
      .channel('notification-center')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, () => {
        void fetchNotifications();
        void fetchUnreadCount();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, () => {
        void fetchNotifications();
        void fetchUnreadCount();
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [userId, fetchNotifications, fetchUnreadCount]);

  const markAsRead = useCallback(async (id: string) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount((prev) => Math.max(0, prev - 1));
    try { await supabase.rpc('mark_notification_read', { p_notification_id: id }).throwOnError(); } catch {
      await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
    onCountChange?.(0);
    try { await supabase.rpc('mark_all_notifications_read', { p_user_id: userId }).throwOnError(); } catch {
      await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId).eq('is_read', false);
    }
    toast('تم تعليم جميع الإشعارات كمقروءة', 'success');
  }, [userId, toast, onCountChange]);

  const deleteNotification = useCallback(async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try { await supabase.rpc('delete_notification', { p_notification_id: id }).throwOnError(); } catch {
      await supabase.from('notifications').delete().eq('id', id);
    }
  }, []);

  const archiveNotification = useCallback(async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try { await supabase.rpc('archive_notification', { p_notification_id: id }).throwOnError(); } catch {
      await supabase.from('notifications').update({ archived_at: new Date().toISOString() }).eq('id', id);
    }
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const batchMarkRead = useCallback(async () => {
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    }
    setNotifications((prev) => prev.map((n) => selectedIds.has(n.id) ? { ...n, is_read: true } : n));
    setSelectedIds(new Set());
    setBatchMode(false);
    void fetchUnreadCount();
    toast(`تم تعليم ${ids.length} إشعار كمقروء`, 'success');
  }, [selectedIds, fetchUnreadCount, toast]);

  const batchArchive = useCallback(async () => {
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      await supabase.from('notifications').update({ archived_at: new Date().toISOString() }).eq('id', id);
    }
    setNotifications((prev) => prev.filter((n) => !selectedIds.has(n.id)));
    setSelectedIds(new Set());
    setBatchMode(false);
    void fetchUnreadCount();
    toast(`تم أرشفة ${ids.length} إشعار`, 'success');
  }, [selectedIds, fetchUnreadCount, toast]);

  const batchDelete = useCallback(async () => {
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      await supabase.from('notifications').delete().eq('id', id);
    }
    setNotifications((prev) => prev.filter((n) => !selectedIds.has(n.id)));
    setSelectedIds(new Set());
    setBatchMode(false);
    void fetchUnreadCount();
    toast(`تم حذف ${ids.length} إشعار`, 'success');
  }, [selectedIds, fetchUnreadCount, toast]);

  const filteredNotifications = searchQuery.trim()
    ? notifications.filter((n) =>
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (n.body?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
      )
    : notifications;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);
    if (diffMin < 1) return 'الآن';
    if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
    if (diffHr < 24) return `منذ ${diffHr} ساعة`;
    if (diffDay < 7) return `منذ ${diffDay} يوم`;
    return d.toLocaleDateString('ar-EG', { dateStyle: 'medium' });
  };

  if (isTeacher) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-800">
        <Bell className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600" />
        <p className="mt-3 text-sm font-medium text-slate-500 dark:text-slate-400">إدارة الإشعارات متاحة من لوحة تحكم المدرس</p>
        <Link to="/admin/teacher?tab=notifications" className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-blue-600 hover:underline">
          فتح لوحة التحكم
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-extrabold text-slate-800 dark:text-white">الإشعارات</h2>
          {unreadCount > 0 && (
            <span className="inline-flex items-center justify-center rounded-full bg-red-500 px-2.5 py-0.5 text-xs font-bold text-white">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button onClick={markAllAsRead} className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20">
              <CheckCheck className="h-3.5 w-3.5" /> تعليم الكل كمقروء
            </button>
          )}
          <button onClick={() => { setBatchMode(!batchMode); setSelectedIds(new Set()); }} className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${batchMode ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
            <Filter className="h-3.5 w-3.5" /> {batchMode ? 'إلغاء' : 'تحديد'}
          </button>
        </div>
      </div>

      {batchMode && selectedIds.size > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">{selectedIds.size} محدد</span>
          <div className="mr-auto flex items-center gap-2">
            <button onClick={batchMarkRead} className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200">
              <Check className="inline h-3 w-3" /> مقروء
            </button>
            <button onClick={batchArchive} className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200">
              <Archive className="inline h-3 w-3" /> أرشفة
            </button>
            <button onClick={batchDelete} className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-red-600 shadow-sm hover:bg-red-50 dark:bg-slate-800 dark:text-red-400">
              <Trash2 className="inline h-3 w-3" /> حذف
            </button>
          </div>
        </div>
      )}

      <div className="relative">
        <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="بحث في الإشعارات..."
          className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pr-10 pl-4 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300">
            ✕
          </button>
        )}
      </div>

      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        <button
          onClick={() => setFilter('all')}
          className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${filter === 'all' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
        >
          الكل ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${filter === 'unread' ? 'bg-red-500 text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
        >
          غير مقروءة ({unreadCount})
        </button>
        {newColumnsExist && Object.keys(CATEGORY_META).map((cat) => {
          const meta = CATEGORY_META[cat];
          const catCount = notifications.filter((n) => n.category === cat).length;
          if (catCount === 0) return null;
          return (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`shrink-0 flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${filter === cat ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
            >
              {meta.label} ({catCount})
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="flex min-h-[30vh] flex-col items-center justify-center text-center">
          <Inbox className="h-16 w-16 text-slate-200 dark:text-slate-700" />
          <p className="mt-3 text-sm font-medium text-slate-400 dark:text-slate-500">
            {searchQuery ? 'لا توجد نتائج للبحث' : filter === 'unread' ? 'لا توجد إشعارات غير مقروءة' : 'لا توجد إشعارات'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredNotifications.map((n) => {
            const catMeta = CATEGORY_META[n.category ?? 'system'] ?? CATEGORY_META.system;
            const Icon = catMeta.icon;
            return (
              <div
                key={n.id}
                className={`group relative flex items-start gap-3 rounded-xl border p-4 transition ${
                  n.is_read
                    ? 'border-slate-100 bg-white dark:border-slate-700 dark:bg-slate-800'
                    : 'border-blue-100 bg-blue-50/50 dark:border-blue-900/40 dark:bg-blue-900/10'
                }`}
              >
                {batchMode && (
                  <input
                    type="checkbox"
                    checked={selectedIds.has(n.id)}
                    onChange={() => toggleSelect(n.id)}
                    className="mt-1 h-4 w-4 rounded border-slate-300 dark:border-slate-600"
                  />
                )}

                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${catMeta.color}`}>
                  <Icon className="h-4 w-4" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      to={n.action_url ?? n.link ?? '#'}
                      onClick={() => { if (!n.is_read) void markAsRead(n.id); }}
                      className="min-w-0 flex-1"
                    >
                      <p className={`text-sm font-semibold ${n.is_read ? 'text-slate-600 dark:text-slate-400' : 'text-slate-800 dark:text-white'}`}>
                        {n.title}
                      </p>
                      {n.body && (
                        <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400 line-clamp-2">{n.body}</p>
                      )}
                    </Link>
                    <span className="shrink-0 text-[10px] text-slate-400 dark:text-slate-500">{formatDate(n.created_at)}</span>
                  </div>

                  {n.action_label && n.action_url && (
                    <Link
                      to={n.action_url}
                      onClick={() => { if (!n.is_read) void markAsRead(n.id); }}
                      className="mt-2 inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1 text-[11px] font-bold text-white hover:bg-blue-700"
                    >
                      {n.action_label}
                    </Link>
                  )}
                </div>

                {!n.is_read && (
                  <span className="absolute left-2 top-2 h-2 w-2 rounded-full bg-blue-500" />
                )}

                <div className="absolute left-2 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-1">
                  {!n.is_read && (
                    <button onClick={() => void markAsRead(n.id)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-blue-600 dark:hover:bg-slate-700" title="مقروء">
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button onClick={() => void archiveNotification(n.id)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-amber-600 dark:hover:bg-slate-700" title="أرشفة">
                    <Archive className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => void deleteNotification(n.id)} className="rounded-lg p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20" title="حذف">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
