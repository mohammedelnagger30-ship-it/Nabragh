import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GraduationCap, Mail, User, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { curricula, getStagesForCurriculum } from '@/lib/education';
import PasswordField from '@/components/PasswordField';
import MetaTags from '@/components/MetaTags';

export default function SignUpPage() {
  const { signUp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isTeacher, setIsTeacher] = useState(false);
  const [educationStage, setEducationStage] = useState('');
  const [curriculum, setCurriculum] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const stageOptions = getStagesForCurriculum(curriculum);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await signUp(email, password, fullName, isTeacher, educationStage, curriculum);
    setLoading(false);
    if (error) {
      setError(error);
      toast(error, 'error');
    } else {
      toast(isTeacher ? 'تم إنشاء حساب المدرس. سيتم تفعيله بعد مراجعة الإدارة والسيرة الذاتية.' : 'تم إنشاء حسابك بنجاح! مرحباً بك في منصة العلم', 'success');
      navigate('/dashboard');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-cyan-50/30 px-4 pb-10 pt-20 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950">
      <MetaTags title="إنشاء حساب | منصة العلم" description="انضم إلى منصة العلم كطالب أو مدرس" />
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-slate-200/60 bg-white p-8 shadow-xl shadow-slate-200/60 dark:border-slate-700 dark:bg-slate-800 dark:shadow-none">
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/30 mb-4">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">إنشاء حساب جديد</h1>
            <p className="text-sm text-slate-500 mt-1">انضم إلى منصة العلم اليوم</p>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 text-red-600 text-sm rounded-lg px-4 py-3 mb-6">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="signup-name" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">الاسم الكامل</label>
              <div className="relative">
                <User className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  id="signup-name"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-4 pr-11 text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                  placeholder="محمد أحمد"
                />
              </div>
            </div>

            {(
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700">
                  {isTeacher ? 'نوع المدرسة أو المعهد' : 'نوع المدرسة أو المعهد'}
                  <select required value={curriculum} onChange={(e) => { setCurriculum(e.target.value); setEducationStage(''); }} className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10">
                    <option value="">اختر نوع التعليم</option>
                    {curricula.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  {isTeacher ? 'الصف الذي يدرّسه' : 'الصف الدراسي'}
                  <select required disabled={!curriculum} value={educationStage} onChange={(e) => setEducationStage(e.target.value)} className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-60">
                    <option value="">{curriculum ? 'اختر الصف' : 'اختر نوع التعليم أولًا'}</option>
                    {stageOptions.map((stage) => <option key={stage.value} value={stage.value}>{stage.label}</option>)}
                  </select>
                </label>
              </div>
            )}

            <div>
              <label htmlFor="signup-email" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">البريد الإلكتروني</label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  id="signup-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-4 pr-11 text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                  placeholder="you@example.com"
                  dir="ltr"
                />
              </div>
            </div>

            <PasswordField id="signup-password" value={password} onChange={setPassword} />

            {isTeacher && (
              <p className="rounded-xl bg-amber-50 px-4 py-3 text-xs leading-6 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">حساب المدرس يحتاج موافقة الإدارة. ارفع سيرتك الذاتية من لوحة التحكم بعد الدخول.</p>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">نوع الحساب</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setIsTeacher(false)}
                  className={`px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                    !isTeacher
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  طالب
                </button>
                <button
                  type="button"
                  onClick={() => setIsTeacher(true)}
                  className={`px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                    isTeacher
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  مدرس
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold rounded-xl shadow-md shadow-blue-500/25 hover:shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-5 h-5 animate-spin" />}
              إنشاء الحساب
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            لديك حساب بالفعل؟{' '}
            <Link to="/signin" className="text-blue-600 font-medium hover:underline">
              تسجيل الدخول
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
