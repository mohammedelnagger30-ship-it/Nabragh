import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export default function PwaInstallPrompt() {
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const install = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
    setVisible(false);
  };

  if (!visible || !installEvent) return null;

  return (
    <aside className="fixed bottom-4 left-4 right-4 z-40 mx-auto flex max-w-lg items-center gap-3 rounded-2xl border border-blue-100 bg-white p-4 shadow-xl shadow-slate-900/10 dark:border-blue-900/40 dark:bg-slate-800" dir="rtl">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
        <Download className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-slate-800 dark:text-slate-100">ثبّت Noona على جهازك</p>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">وصول أسرع وتجربة أقرب للتطبيق</p>
      </div>
      <button type="button" onClick={install} className="shrink-0 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700">
        تثبيت
      </button>
      <button type="button" onClick={() => setVisible(false)} className="shrink-0 rounded-lg p-2 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-300" aria-label="إغلاق">
        <X className="h-4 w-4" />
      </button>
    </aside>
  );
}
