import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GraduationCap, Mail, User, Phone, AlertCircle, Loader2, MessageCircle, CheckCircle2, Users } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { curricula, getStagesForCurriculum } from '@/lib/education';
import { CONTACT, whatsappLink } from '@/lib/contact';
import PasswordField from '@/components/PasswordField';
import MetaTags from '@/components/MetaTags';

export default function SignUpPage() {
  const { signUp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [isTeacher, setIsTeacher] = useState(false);
  const [isGuardian, setIsGuardian] = useState(false);
  const [educationStage, setEducationStage] = useState('');
  const [curriculum, setCurriculum] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pendingTeacher, setPendingTeacher] = useState(false);
  const stageOptions = getStagesForCurriculum(curriculum);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await signUp(email, password, fullName, isTeacher, phone, guardianPhone, educationStage, curriculum, isGuardian);
    setLoading(false);
    if (error) {
      setError(error);
      toast(error, 'error');
    } else if (isTeacher) {
      setPendingTeacher(true);
      toast('تم إنشاء حسابك بنجاح! بانتظار مراجعة الإدارة.', 'success');
    } else {
      toast('تم إنشاء حسابك بنجاح! مرحباً بك في Noona', 'success');
      navigate('/dashboard');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-cyan-50/30 px-4 pb-8 pt-[4.5rem] dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 sm:pb-10 sm:pt-20">
      <MetaTags title="إنشاء حساب" description="انضم إلى Noona كطالب أو مدرس" />
      <div className="w-full max-w-md">
        {pendingTeacher ? (
          <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-xl shadow-slate-200/60 dark:border-slate-700 dark:bg-slate-800 dark:shadow-none sm:p-8">
            <div className="flex flex-col items-center text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-900/30 sm:mb-4 sm:h-16 sm:w-16">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 sm:h-10 sm:w-10" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-white sm:text-2xl">تم إنشاء حسابك بنجاح</h2>
              <p className="mt-2 max-w-sm text-xs leading-5 text-slate-500 sm:text-sm sm:leading-6">
                حسابك كمدرس قيد المراجعة من الإدارة. سيتم تفعيله خلال ساعات.
              </p>
              <div className="mt-4 w-full rounded-xl bg-amber-50 px-4 py-3 dark:bg-amber-900/20 sm:mt-6 sm:px-5 sm:py-4">
                <p className="text-xs font-bold text-amber-800 dark:text-amber-200 sm:text-sm">تواصل معنا للتأكيد السريع</p>
                <p className="mt-1 text-[10px] leading-4 text-amber-700 dark:text-amber-300 sm:text-xs sm:leading-5">
                  للتأكد من حسابك أو الاستفسار، تواصل معنا عبر الواتساب.
                </p>
                <a
                  href={whatsappLink('مرحباً، لقد قمت بإنشاء حساب كمدرس في Noona. أريد التأكيد وتفعيل الحساب.') }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-700 sm:mt-3 sm:px-4 sm:py-2.5 sm:text-sm"
                >
                  <MessageCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  تواصل عبر الواتساب
                </a>
              </div>
              <Link
                to="/signin"
                className="mt-4 text-xs font-semibold text-blue-600 hover:underline sm:mt-5 sm:text-sm"
              >
                العودة لتسجيل الدخول
              </Link>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200/60 bg-white p-4 shadow-xl shadow-slate-200/60 dark:border-slate-700 dark:bg-slate-800 dark:shadow-none sm:p-5 sm:p-8">
          <div className="flex flex-col items-center mb-6 sm:mb-8">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/30 mb-3 sm:w-14 sm:h-14 sm:mb-4">
              <GraduationCap className="w-7 h-7 text-white sm:w-8 sm:h-8" />
            </div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-white sm:text-2xl">إنشاء حساب جديد</h1>
            <p className="text-xs text-slate-500 mt-1 sm:text-sm">انضم إلى Noona اليوم</p>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 text-red-600 text-xs rounded-lg px-3 py-2.5 mb-4 dark:bg-red-900/20 dark:text-red-300 sm:text-sm sm:px-4 sm:py-3 sm:mb-6">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 sm:w-4 sm:h-4" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            <div>
              <label htmlFor="signup-name" className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-200 sm:mb-1.5 sm:text-sm">الاسم الكامل</label>
              <div className="relative">
                <User className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 sm:h-5 sm:w-5" />
                <input
                  id="signup-name"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-4 pr-10 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white sm:py-2.5 sm:pr-11 sm:text-sm"
                  placeholder="محمد أحمد"
                />
              </div>
            </div>

            {!isGuardian && (
              <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-200 sm:text-sm">
                  {isTeacher ? 'نوع المدرسة أو المعهد' : 'نوع المدرسة أو المعهد'}
                  <select required value={curriculum} onChange={(e) => { setCurriculum(e.target.value); setEducationStage(''); }} className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:border-slate-600 dark:bg-slate-900 dark:text-white sm:mt-1.5 sm:min-h-12 sm:py-3 sm:text-sm">
                    <option value="">اختر نوع التعليم</option>
                    {curricula.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                </label>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-200 sm:text-sm">
                  {isTeacher ? 'الصف الذي يدرّسه' : 'الصف الدراسي'}
                  <select required disabled={!curriculum} value={educationStage} onChange={(e) => setEducationStage(e.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900 dark:text-white sm:mt-1.5 sm:min-h-12 sm:py-3 sm:text-sm">
                    <option value="">{curriculum ? 'اختر الصف' : 'اختر نوع التعليم أولًا'}</option>
                    {stageOptions.map((stage) => <option key={stage.value} value={stage.value}>{stage.label}</option>)}
                  </select>
                </label>
              </div>
            )}

            <div>
              <label htmlFor="signup-phone" className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-200 sm:mb-1.5 sm:text-sm">رقم الهاتف</label>
              <div className="relative">
                <Phone className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 sm:h-5 sm:w-5" />
                <input
                  id="signup-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  dir="ltr"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-4 pr-10 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white sm:py-2.5 sm:pr-11 sm:text-sm"
                  placeholder="+20..."
                />
              </div>
            </div>

            {!isTeacher && !isGuardian && (
              <div>
                <label htmlFor="signup-guardian-phone" className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-200 sm:mb-1.5 sm:text-sm">رقم ولي الأمر</label>
                <div className="relative">
                  <Users className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 sm:h-5 sm:w-5" />
                  <input
                    id="signup-guardian-phone"
                    type="tel"
                    value={guardianPhone}
                    onChange={(e) => setGuardianPhone(e.target.value)}
                    required
                    dir="ltr"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-4 pr-10 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white sm:py-2.5 sm:pr-11 sm:text-sm"
                    placeholder="+20..."
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="signup-email" className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-200 sm:mb-1.5 sm:text-sm">البريد الإلكتروني</label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 sm:h-5 sm:w-5" />
                <input
                  id="signup-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-4 pr-10 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white sm:py-2.5 sm:pr-11 sm:text-sm"
                  placeholder="you@example.com"
                  dir="ltr"
                />
              </div>
            </div>

            <PasswordField id="signup-password" value={password} onChange={setPassword} />

            {isTeacher && (
              <p className="rounded-xl bg-amber-50 px-3 py-2.5 text-[10px] leading-4 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300 sm:px-4 sm:py-3 sm:text-xs sm:leading-6">حسابك كمدرس يحتاج موافقة الإدارة. بعد التسجيل، تواصل معنا عبر الواتساب للتأكيد السريع.</p>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-2 dark:text-slate-200 sm:text-sm">نوع الحساب</label>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => { setIsTeacher(false); setIsGuardian(false); }}
                  className={`px-3 py-2.5 rounded-xl border-2 text-xs font-medium transition-all sm:px-4 sm:py-3 sm:text-sm ${
                    !isTeacher && !isGuardian
                      ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-500'
                  }`}
                >
                  طالب
                </button>
                <button
                  type="button"
                  onClick={() => { setIsTeacher(true); setIsGuardian(false); }}
                  className={`px-3 py-2.5 rounded-xl border-2 text-xs font-medium transition-all sm:px-4 sm:py-3 sm:text-sm ${
                    isTeacher && !isGuardian
                      ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-500'
                  }`}
                >
                  مدرس
                </button>
                <button
                  type="button"
                  onClick={() => { setIsTeacher(false); setIsGuardian(true); }}
                  className={`px-3 py-2.5 rounded-xl border-2 text-xs font-medium transition-all sm:px-4 sm:py-3 sm:text-sm ${
                    isGuardian
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-500'
                  }`}
                >
                  ولي أمر
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold rounded-xl shadow-md shadow-blue-500/25 hover:shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-xs sm:py-3 sm:text-sm"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin sm:w-5 sm:h-5" />}
              إنشاء الحساب
            </button>
          </form>

          <p className="text-center text-xs text-slate-500 mt-4 sm:mt-6 sm:text-sm">
            لديك حساب بالفعل؟{' '}
            <Link to="/signin" className="text-blue-600 font-medium hover:underline">
              تسجيل الدخول
            </Link>
          </p>
        </div>
        )}
      </div>
    </div>
  );
}
