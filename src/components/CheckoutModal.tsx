import { useState } from 'react';
import { X, CreditCard, Landmark, Smartphone, Wallet, ShieldCheck, Loader2 } from 'lucide-react';
import type { SubscriptionPlan } from '@/types';

type PaymentMethod = 'card' | 'bank' | 'mobile' | 'wallet';

const methods: { id: PaymentMethod; label: string; icon: typeof CreditCard; hint: string }[] = [
  { id: 'card', label: 'بطاقة بنكية', icon: CreditCard, hint: 'فيزا / ماستركارد' },
  { id: 'bank', label: 'تحويل بنكي', icon: Landmark, hint: 'إرسال إيصال التحويل' },
  { id: 'mobile', label: 'مدى', icon: Smartphone, hint: 'أو أي محفظة إلكترونية' },
  { id: 'wallet', label: 'الدفع النقدي', icon: Wallet, hint: 'تُنسق مع المدرس' },
];

interface Props {
  plan: SubscriptionPlan | null;
  onClose: () => void;
  onConfirm: (details: { method: PaymentMethod; phone: string }) => Promise<void>;
}

export default function CheckoutModal({ plan, onClose, onConfirm }: Props) {
  const [method, setMethod] = useState<PaymentMethod>('card');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');

  if (!plan) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onConfirm({ method, phone });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/60 p-4 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl sm:p-8 dark:bg-slate-800 dark:border dark:border-slate-700">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">إتمام الاشتراك</h3>
              <p className="text-xs text-slate-400">{plan.name_ar} · {plan.duration_months === 0 ? 'بدون التزام' : `${plan.duration_months} شهر`}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="إغلاق" className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-5 flex items-end justify-between rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4 dark:border-blue-900/40 dark:bg-blue-900/20">
          <div>
            <p className="text-xs font-medium text-blue-600 dark:text-blue-300">إجمالي الطلب</p>
            <p className="mt-1 text-2xl font-extrabold text-slate-800 dark:text-white">{plan.price} <span className="text-base font-semibold text-slate-500 dark:text-slate-400">ر.س</span></p>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">شامل ضريبة القيمة المضافة</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <p className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">طريقة الدفع</p>
            <div className="grid grid-cols-2 gap-2">
              {methods.map((m) => {
                const Icon = m.icon;
                const active = method === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMethod(m.id)}
                    className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2.5 text-sm font-medium transition-all ${active
                      ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-500'}`}
                  >
                    <Icon className={`h-5 w-5 flex-shrink-0 ${active ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`} />
                    <span className="text-left">
                      {m.label}
                      <span className="block text-[10px] font-normal text-slate-400">{m.hint}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {method === 'card' && (
            <div className="space-y-3">
              <input
                type="text"
                inputMode="numeric"
                required
                placeholder="رقم البطاقة"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  placeholder="MM/YY"
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                  className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                />
                <input
                  type="password"
                  required
                  maxLength={4}
                  placeholder="CVV"
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value)}
                  className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                />
              </div>
            </div>
          )}

          <div>
            <label htmlFor="checkout-phone" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">رقم الجوال (اختياري)</label>
            <input
              id="checkout-phone"
              type="tel"
              dir="ltr"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="05xxxxxxxx"
              className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
            />
          </div>

          <p className="text-xs leading-6 text-slate-400">ملاحظة: هذا نموذج تجريبي، ولن يُخصم أي مبلغ. بعد التأكيد سيُرسل طلبك للإدارة ويتم التواصل معك عبر واتساب لإتمام الدفع.</p>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full min-h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 font-bold text-white shadow-lg shadow-blue-500/25 transition-all hover:-translate-y-0.5 hover:shadow-xl disabled:opacity-60"
          >
            {loading && <Loader2 className="h-5 w-5 animate-spin" />}
            تأكيد الطلب وإرساله
          </button>
        </form>
      </div>
    </div>
  );
}