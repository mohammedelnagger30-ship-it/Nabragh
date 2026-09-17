import { useState, useEffect, useCallback } from 'react';
import { BellOff, BellRing, Loader2, Save } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/context/ToastContext';

const CATEGORIES = [
  { key: 'enrollment', label: 'التسجيل في الدورات', description: 'إشعار عند تسجيلك في دورة جديدة' },
  { key: 'achievement', label: 'الإنجازات', description: 'إشعار عند إكمال دورة أو الحصول على شهادة' },
  { key: 'course', label: 'تحديثات الدورات', description: 'إشعار عند إضافة محتوى جديد لدوراتك' },
  { key: 'competition', label: 'المنافسات', description: 'إشعار عند بدء منافسة جديدة أو نتائجها' },
  { key: 'payment', label: 'المدفوعات', description: 'إشعار بتأكيد الدفع أو الفواتير' },
  { key: 'system', label: 'إشعارات النظام', description: 'تحديثات هامة حول المنصة' },
  { key: 'social', label: 'التواصل الاجتماعي', description: 'إشعار عند متابعة أو تعليق جديد' },
  { key: 'reminder', label: 'التذكيرات', description: 'تذكير بمواعيد الدورات والاختبارات' },
  { key: 'security', label: 'الأمان', description: 'تنبيهات أمنية حول حسابك' },
] as const;

interface NotificationSettingsProps {
  userId: string;
}

export default function NotificationSettings({ userId }: NotificationSettingsProps) {
  const { toast } = useToast();
  const [prefs, setPrefs] = useState<Record<string, { in_app: boolean; push: boolean; email: boolean }>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tableExists, setTableExists] = useState(true);

  const fetchPreferences = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        setTableExists(false);
        const defaults: Record<string, { in_app: boolean; push: boolean; email: boolean }> = {};
        for (const cat of CATEGORIES) {
          defaults[cat.key] = { in_app: true, push: cat.key === 'security' || cat.key === 'payment', email: false };
        }
        setPrefs(defaults);
      } else {
        const map: Record<string, { in_app: boolean; push: boolean; email: boolean }> = {};
        for (const cat of CATEGORIES) {
          const existing = (data ?? []).find((p: { category: string }) => p.category === cat.key);
          map[cat.key] = {
            in_app: existing?.channel_in_app ?? true,
            push: existing?.channel_push ?? false,
            email: existing?.channel_email ?? false,
          };
        }
        setPrefs(map);
      }
    } catch {
      setTableExists(false);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => { void fetchPreferences(); }, [fetchPreferences]);

  const updatePref = (cat: string, field: 'in_app' | 'push' | 'email', value: boolean) => {
    setPrefs((prev) => ({ ...prev, [cat]: { ...prev[cat], [field]: value } }));
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      if (tableExists) {
        for (const [cat, pref] of Object.entries(prefs)) {
          await supabase.rpc('update_notification_preference', {
            p_user_id: userId,
            p_category: cat,
            p_channel_in_app: pref.in_app,
            p_channel_push: pref.push,
            p_channel_email: pref.email,
          }).throwOnError();
        }
      }
      toast('تم حفظ إعدادات الإشعارات بنجاح', 'success');
    } catch {
      toast('حدث خطأ أثناء الحفظ. قد تحتاج لتطبيق التحديثات على قاعدة البيانات أولاً.', 'error');
    }
    setSaving(false);
  };

  const enableAll = () => {
    setPrefs((prev) => {
      const next = { ...prev };
      for (const cat of CATEGORIES) {
        next[cat.key] = { in_app: true, push: true, email: true };
      }
      return next;
    });
  };

  const disableAll = () => {
    setPrefs((prev) => {
      const next = { ...prev };
      for (const cat of CATEGORIES) {
        next[cat.key] = { in_app: false, push: false, email: false };
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-[20vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-extrabold text-slate-800 dark:text-white">إعدادات الإشعارات</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">تحكم في أنواع الإشعارات التي تتلقاها</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={enableAll} className="rounded-xl px-3 py-1.5 text-xs font-semibold text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20">
            <BellRing className="inline h-3.5 w-3.5" /> تشغيل الكل
          </button>
          <button onClick={disableAll} className="rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700">
            <BellOff className="inline h-3.5 w-3.5" /> إيقاف الكل
          </button>
          <button
            onClick={saveAll}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            حفظ
          </button>
        </div>
      </div>

      {!tableExists && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
          تنبيه: جدول إعدادات الإشعارات غير موجود بعد. قم بتطبيق migration على قاعدة البيانات لتفعيل هذه الميزة بالكامل.
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
              <th className="px-4 py-3 text-right text-xs font-bold text-slate-600 dark:text-slate-300">النوع</th>
              <th className="px-4 py-3 text-center text-xs font-bold text-slate-600 dark:text-slate-300">التطبيق</th>
              <th className="px-4 py-3 text-center text-xs font-bold text-slate-600 dark:text-slate-300">الدفع</th>
              <th className="px-4 py-3 text-center text-xs font-bold text-slate-600 dark:text-slate-300">البريد</th>
            </tr>
          </thead>
          <tbody>
            {CATEGORIES.map((cat) => {
              const pref = prefs[cat.key] ?? { in_app: true, push: false, email: false };
              return (
                <tr key={cat.key} className="border-b border-slate-100 dark:border-slate-800 last:border-0">
                  <td className="px-4 py-3">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{cat.label}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">{cat.description}</p>
                  </td>
                  {(['in_app', 'push', 'email'] as const).map((field) => (
                    <td key={field} className="px-4 py-3 text-center">
                      <label className="relative inline-flex cursor-pointer items-center">
                        <input
                          type="checkbox"
                          checked={pref[field]}
                          onChange={(e) => updatePref(cat.key, field, e.target.checked)}
                          className="peer sr-only"
                        />
                        <div className="h-5 w-9 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all peer-checked:bg-blue-600 peer-checked:after:translate-x-full dark:bg-slate-600" />
                      </label>
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
