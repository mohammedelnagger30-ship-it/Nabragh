import { useEffect, useRef } from 'react';
import { AlertTriangle, Trash2, Shield, X } from 'lucide-react';

interface AdminConfirmModalProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const VARIANT_STYLES = {
  danger: {
    bg: 'bg-rose-50 dark:bg-rose-900/20',
    icon: 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-300',
    btn: 'bg-rose-600 hover:bg-rose-700 text-white',
    IconComponent: Trash2,
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    icon: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300',
    btn: 'bg-amber-600 hover:bg-amber-700 text-white',
    IconComponent: AlertTriangle,
  },
  info: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    icon: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300',
    btn: 'bg-blue-600 hover:bg-blue-700 text-white',
    IconComponent: Shield,
  },
};

export default function AdminConfirmModal({ open, title, description, confirmLabel = 'تأكيد', variant = 'danger', loading = false, onConfirm, onCancel }: AdminConfirmModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onCancel]);

  if (!open) return null;

  const v = VARIANT_STYLES[variant];
  const IconComp = v.IconComponent;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" dir="rtl">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div ref={dialogRef} className="relative w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${v.icon}`}>
              <IconComp className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">{title}</h3>
          </div>
          <button type="button" onClick={onCancel} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-5">
          <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">{description}</p>
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4 dark:border-slate-800">
          <button type="button" onClick={onCancel} disabled={loading} className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
            إلغاء
          </button>
          <button type="button" onClick={onConfirm} disabled={loading} className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition disabled:opacity-50 ${v.btn}`}>
            {loading ? '...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
