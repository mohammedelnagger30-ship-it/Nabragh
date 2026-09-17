import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Camera, Save, Loader2, ShieldCheck, Moon, Sun, LogOut,
  Trash2, Eye, EyeOff, Check, Smartphone, MapPin, Globe, Phone, Mail, ExternalLink, LayoutDashboard, BookOpen, GraduationCap
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { uploadFile } from '@/lib/storage';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useTheme } from '@/context/ThemeContext';
import { curricula, educationStages } from '@/lib/education';
import MetaTags from '@/components/MetaTags';

type Section = 'account' | 'profile' | 'security' | 'appearance';

const NAV_ITEMS: { id: Section; label: string; icon: typeof User }[] = [
  { id: 'account', label: 'الحساب', icon: User },
  { id: 'profile', label: 'الملف الشخصي', icon: Camera },
  { id: 'security', label: 'الأمان', icon: ShieldCheck },
  { id: 'appearance', label: 'المظهر', icon: Sun },
];

const inputCls =
  'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors';
const labelCls = 'mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200';
const cardCls = 'rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm';

export default function SettingsPage() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const { toast } = useToast();
  const { actualTheme, setTheme } = useTheme();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  const [section, setSection] = useState<Section>('account');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // account
  const [email, setEmail] = useState('');
  // profile
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [guardianEmail, setGuardianEmail] = useState('');
  const [locationVal, setLocationVal] = useState('');
  const [website, setWebsite] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [bio, setBio] = useState('');
  const [stage, setStage] = useState('');
  const [curriculum, setCurriculum] = useState('');
  // security
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name ?? '');
    setPhone(profile.phone ?? '');
    setGuardianPhone(profile.guardian_phone ?? '');
    setGuardianEmail((profile as Record<string, unknown>).guardian_email as string ?? '');
    setLocationVal(profile.location ?? '');
    setWebsite(profile.website ?? '');
    setSpecialization(profile.specialization ?? '');
    setBio(profile.bio ?? '');
    setStage((profile.is_teacher ? profile.teaching_stages?.[0] : profile.education_stage) ?? '');
    setCurriculum((profile.is_teacher ? profile.teaching_curricula?.[0] : profile.curriculum) ?? '');
  }, [profile]);

  useEffect(() => {
    if (user) setEmail(user.email ?? '');
  }, [user]);

  const handleAvatarChange = async (file: File) => {
    if (!user) return;
    if (!file.type.startsWith('image/')) { toast('الملف المختار ليس صورة', 'error'); return; }
    if (file.size > 5 * 1024 * 1024) { toast('حجم الصورة يجب أن يكون أقل من 5 ميجابايت', 'error'); return; }
    setUploading(true);
    const url = await uploadFile('avatars', file, user.id);
    if (url) {
      const { error } = await supabase.from('profiles').update({ avatar_url: url, updated_at: new Date().toISOString() }).eq('id', user.id);
      if (error) { toast('تعذر حفظ الصورة', 'error'); } else { await refreshProfile(); toast('تم تحديث الصورة الشخصية', 'success'); }
    } else {
      toast('فشل رفع الصورة. حاول مرة أخرى', 'error');
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleCoverChange = async (file: File) => {
    if (!user) return;
    if (!file.type.startsWith('image/')) { toast('الملف المختار ليس صورة', 'error'); return; }
    if (file.size > 5 * 1024 * 1024) { toast('حجم الصورة يجب أن يكون أقل من 5 ميجابايت', 'error'); return; }
    setUploading(true);
    const url = await uploadFile('avatars', file, user.id);
    if (url) {
      const { error } = await supabase.from('profiles').update({ cover_url: url, updated_at: new Date().toISOString() }).eq('id', user.id);
      if (error) { toast('تعذر حفظ الغلاف', 'error'); } else { await refreshProfile(); toast('تم تحديث صورة الغلاف', 'success'); }
    } else {
      toast('فشل رفع الغلاف. حاول مرة أخرى', 'error');
    }
    setUploading(false);
    if (coverRef.current) coverRef.current.value = '';
  };

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('profiles').update({
      full_name: fullName,
      phone, location: locationVal, website,
      guardian_phone: profile?.is_teacher ? null : guardianPhone || null,
      guardian_email: profile?.is_teacher ? null : guardianEmail || null,
      specialization: profile?.is_teacher ? specialization : null,
      bio,
      education_stage: profile?.is_teacher ? null : stage || null,
      curriculum: profile?.is_teacher ? null : curriculum || null,
      teaching_stages: profile?.is_teacher && stage ? [stage] : [],
      teaching_curricula: profile?.is_teacher && curriculum ? [curriculum] : [],
      updated_at: new Date().toISOString(),
    }).eq('id', user.id);
    setSaving(false);
    if (error) { toast('حدث خطأ أثناء الحفظ', 'error'); return; }
    await refreshProfile();
    toast('تم حفظ التغييرات بنجاح', 'success');
  };

  const updateEmail = async () => {
    if (!email || email === user?.email) return;
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ email });
    setSaving(false);
    toast(error ? 'تعذر تحديث البريد الإلكتروني' : 'تم إرسال رسالة تأكيد إلى بريدك الجديد', error ? 'error' : 'success');
  };

  const changePassword = async () => {
    if (newPassword.length < 6) { toast('كلمة السر يجب أن تكون 6 أحرف على الأقل', 'error'); return; }
    if (newPassword !== confirmPassword) { toast('كلمتا السر غير متطابقتين', 'error'); return; }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSaving(false);
    if (error) { toast('تعذر تغيير كلمة السر', 'error'); return; }
    setNewPassword(''); setConfirmPassword('');
    toast('تم تغيير كلمة السر بنجاح', 'success');
  };

  const signOutAll = async () => {
    await supabase.auth.signOut({ scope: 'global' });
    navigate('/');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }
  if (!user || !profile) { navigate('/signin'); return null; }

  const avatar = profile.avatar_url;
  const cover = profile.cover_url;
  const completionFields = profile.is_teacher
    ? [fullName, specialization, bio, avatar, locationVal, stage, curriculum, website, phone]
    : [fullName, phone, guardianPhone, avatar, locationVal, stage, curriculum, bio];
  const completion = Math.round((completionFields.filter(Boolean).length / completionFields.length) * 100);
  return (
    <div className="min-h-screen bg-slate-50 pb-16 dark:bg-slate-900">
      <MetaTags title="الإعدادات | منصة العلم" noIndex />
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {/* Header card with cover */}
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="relative h-32 bg-gradient-to-l from-blue-600 via-blue-500 to-cyan-400">
          {cover && <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${cover})` }} />}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 via-transparent to-transparent" />
          {uploading && <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/40"><Loader2 className="h-6 w-6 animate-spin text-white" /></div>}
          <button
            onClick={() => coverRef.current?.click()}
            disabled={uploading}
            className="absolute bottom-3 left-3 flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-white backdrop-blur-sm transition hover:bg-white/30 disabled:opacity-60"
            title="تغيير الغلاف"
          >
            <Camera className="h-4 w-4" />
          </button>
          {cover && (
            <button
              onClick={async () => {
                const { error } = await supabase.from('profiles').update({ cover_url: null }).eq('id', user.id);
                if (!error) { await refreshProfile(); toast('تم حذف الغلاف', 'info'); }
              }}
              className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/80 text-white backdrop-blur-sm transition hover:bg-rose-600"
              title="حذف الغلاف"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          <input ref={coverRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCoverChange(f); }} />
        </div>
          <div className="px-6 pb-6">
            <div className="-mt-12 flex flex-col items-center gap-4 sm:flex-row sm:items-end">
              {/* Avatar */}
              <div className="relative">
                <div className="h-24 w-24 overflow-hidden rounded-full border-4 border-white bg-gradient-to-br from-blue-500 to-cyan-400 shadow-lg dark:border-slate-800">
                  {avatar ? (
                    <img src={avatar} alt={profile.full_name} className="h-full w-full object-cover" loading="lazy" decoding="async" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-3xl font-bold text-white">
                      {profile.full_name.charAt(0)}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="absolute -bottom-1 -left-1 flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white shadow-md transition hover:bg-blue-700 disabled:opacity-60"
                  title="تغيير الصورة"
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                </button>
                {avatar && (
                  <button
                    onClick={async () => {
                      const { error } = await supabase.from('profiles').update({ avatar_url: null }).eq('id', user.id);
                      if (!error) { await refreshProfile(); toast('تم حذف الصورة', 'info'); }
                    }}
                    className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full bg-rose-500 text-white shadow-md transition hover:bg-rose-600"
                    title="حذف الصورة"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
                <input ref={fileRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAvatarChange(f); }} />
              </div>
              <div className="flex-1 pb-1 text-center sm:text-right">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{profile.full_name}</h1>
                <p className="flex items-center justify-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 sm:justify-start">
                  <Mail className="h-4 w-4" /> {profile.email}
                </p>
              </div>
              <div className="mb-1 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${profile.is_teacher ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300'}`}>
                {profile.is_teacher ? 'مدرّس' : 'طالب'}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">اكتمال الحساب {completion}%</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => navigate(profile.is_teacher ? '/admin/teacher' : '/dashboard')} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700"><LayoutDashboard className="h-4 w-4" /> لوحة التحكم</button>
              {profile.is_teacher && <button type="button" onClick={() => navigate(`/teacher/${profile.id}`)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-blue-300 hover:text-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"><ExternalLink className="h-4 w-4" /> الملف العام</button>}
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5 dark:border-blue-900/40 dark:bg-blue-900/20"><GraduationCap className="h-5 w-5 text-blue-600" /><p className="mt-3 text-sm font-bold text-blue-900 dark:text-blue-200">{profile.is_teacher ? 'ملف المدرس' : 'ملف الطالب'}</p><p className="mt-1 text-xs leading-6 text-blue-700 dark:text-blue-300">{profile.is_teacher ? 'أظهر تخصصك وخبرتك للطلاب لبناء الثقة.' : 'أكمل بياناتك ورقم ولي الأمر ليكتمل ملفك الدراسي.'}</p></div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 dark:border-emerald-900/40 dark:bg-emerald-900/20"><BookOpen className="h-5 w-5 text-emerald-600" /><p className="mt-3 text-sm font-bold text-emerald-900 dark:text-emerald-200">خطوتك التالية</p><p className="mt-1 text-xs leading-6 text-emerald-700 dark:text-emerald-300">{profile.is_teacher ? 'حدّث نبذتك وأضف رابط منصتك التعليمية.' : 'تصفح الدورات وابدأ أول درس يناسب مرحلتك.'}</p></div>
          <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5 dark:border-amber-900/40 dark:bg-amber-900/20"><Check className="h-5 w-5 text-amber-600" /><p className="mt-3 text-sm font-bold text-amber-900 dark:text-amber-200">حالة الحساب</p><p className="mt-1 text-xs leading-6 text-amber-700 dark:text-amber-300">{profile.is_teacher ? (profile.is_approved ? 'حسابك معتمد ويمكنك إدارة محتواك.' : 'حسابك قيد المراجعة من الإدارة.') : 'حسابك جاهز للتعلم ومتابعة تقدمك.'}</p></div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[220px_1fr]">
          {/* Section nav */}
          <aside>
            <nav className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-700 dark:bg-slate-800 lg:flex-col lg:overflow-visible">
              {NAV_ITEMS.map((item) => (
                <button key={item.id} onClick={() => setSection(item.id)}
                  className={`flex min-w-fit items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                    section === item.id ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}>
                  <item.icon className="h-4 w-4" /> {item.label}
                </button>
              ))}
            </nav>
          </aside>

          <main className="space-y-6">
            {section === 'account' && (
              <div className={cardCls}>
                <h2 className="mb-5 flex items-center gap-2 font-bold text-slate-800 dark:text-slate-100"><User className="h-5 w-5 text-blue-500" /> معلومات الحساب</h2>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className={labelCls}>البريد الإلكتروني</label>
                    <div className="flex gap-2">
                      <input value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" className={inputCls} />
                      <button onClick={updateEmail} disabled={saving || email === user.email}
                        className="shrink-0 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50">تحديث</button>
                    </div>
                    <p className="mt-1.5 text-xs text-slate-400">سيتم إرسال رسالة تأكيد للبريد الجديد قبل تفعيله.</p>
                  </div>
                  <div>
                    <label className={labelCls}>تاريخ الانضمام</label>
                    <div className={`${inputCls} flex items-center gap-2 text-slate-500 dark:text-slate-400`}>
                      <Smartphone className="h-4 w-4" /> {new Date(profile.created_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                  </div>
                </div>
                <div className="mt-6 border-t border-slate-100 pt-5 dark:border-slate-700">
                  <button onClick={signOutAll}
                    className="flex items-center gap-2 rounded-xl bg-rose-50 px-5 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-100 dark:bg-rose-900/30 dark:text-rose-300">
                    <LogOut className="h-4 w-4" /> تسجيل الخروج من جميع الأجهزة
                  </button>
                </div>
              </div>
            )}

            {section === 'profile' && (
              <div className={cardCls}>
                <h2 className="mb-5 flex items-center gap-2 font-bold text-slate-800 dark:text-slate-100"><Camera className="h-5 w-5 text-blue-500" /> الملف الشخصي</h2>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className={labelCls}>الاسم الكامل</label>
                    <input value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputCls} />
                  </div>
                  {profile.is_teacher && (
                    <div>
                      <label className={labelCls}>التخصص</label>
                      <input value={specialization} onChange={(e) => setSpecialization(e.target.value)} placeholder="مثال: مدرس رياضيات" className={inputCls} />
                    </div>
                  )}
                  <div>
                    <label className={labelCls}><Phone className="mr-1 inline h-3.5 w-3.5" /> رقم الهاتف</label>
                    <input value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" placeholder="+20..." className={inputCls} />
                  </div>
                  {!profile.is_teacher && (
                    <div>
                      <label className={labelCls}>رقم ولي الأمر</label>
                      <input value={guardianPhone} onChange={(e) => setGuardianPhone(e.target.value)} dir="ltr" placeholder="+20..." className={inputCls} />
                    </div>
                  )}
                  {!profile.is_teacher && (
                    <div>
                      <label className={labelCls}>إيميل ولي الأمر</label>
                      <input value={guardianEmail} onChange={(e) => setGuardianEmail(e.target.value)} dir="ltr" placeholder="guardian@email.com" className={inputCls} />
                    </div>
                  )}
                  <div>
                    <label className={labelCls}><MapPin className="mr-1 inline h-3.5 w-3.5" /> الموقع</label>
                    <input value={locationVal} onChange={(e) => setLocationVal(e.target.value)} placeholder="القاهرة، مصر" className={inputCls} />
                  </div>
                  {profile.is_teacher && (
                    <div>
                      <label className={labelCls}><Globe className="mr-1 inline h-3.5 w-3.5" /> الموقع الإلكتروني</label>
                      <input value={website} onChange={(e) => setWebsite(e.target.value)} dir="ltr" placeholder="https://..." className={inputCls} />
                    </div>
                  )}
                  <div>
                    <label className={labelCls}>{profile.is_teacher ? 'المرحلة التي تدرّسها' : 'المرحلة الدراسية'}</label>
                    <select value={stage} onChange={(e) => setStage(e.target.value)} className={inputCls}>
                      <option value="">كل المراحل</option>
                      {educationStages.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>{profile.is_teacher ? 'المنهج الذي تدرّسه' : 'نوع المنهج'}</label>
                    <select value={curriculum} onChange={(e) => setCurriculum(e.target.value)} className={inputCls}>
                      <option value="">كل المناهج</option>
                      {curricula.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="mt-5">
                  <label className={labelCls}>نبذة تعريفية</label>
                  <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} placeholder="اكتب نبذة عنك..."
                    className={`${inputCls} resize-none`} />
                  <p className="mt-1 text-xs text-slate-400">{bio.length} حرف</p>
                </div>
                <button onClick={saveProfile} disabled={saving}
                  className="mt-6 flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-2.5 font-semibold text-white shadow-md shadow-blue-500/25 transition hover:shadow-lg disabled:opacity-60">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} حفظ التغييرات
                </button>
              </div>
            )}

            {section === 'security' && (
              <div className={cardCls}>
                <h2 className="mb-5 flex items-center gap-2 font-bold text-slate-800 dark:text-slate-100"><ShieldCheck className="h-5 w-5 text-blue-500" /> الأمان</h2>
                <div className="max-w-md space-y-5">
                  <div>
                    <label className={labelCls}>كلمة السر الجديدة</label>
                    <div className="relative">
                      <input type={showPass ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="6 أحرف على الأقل" className={`${inputCls} pl-11`} />
                      <button onClick={() => setShowPass(!showPass)} type="button"
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>تأكيد كلمة السر</label>
                    <div className="relative">
                      <input type={showPass ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                        className={`${inputCls} pl-11`} />
                      {confirmPassword && (
                        <span className="absolute left-3 top-1/2 -translate-y-1/2">
                          {newPassword === confirmPassword
                            ? <Check className="h-4 w-4 text-emerald-500" />
                            : <span className="h-4 w-4 text-rose-500">✕</span>}
                        </span>
                      )}
                    </div>
                  </div>
                  <button onClick={changePassword} disabled={saving || !newPassword}
                    className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} تغيير كلمة السر
                  </button>
                </div>
              </div>
            )}

            {section === 'appearance' && (
              <div className={cardCls}>
                <h2 className="mb-5 flex items-center gap-2 font-bold text-slate-800 dark:text-slate-100"><Sun className="h-5 w-5 text-blue-500" /> المظهر</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <button onClick={() => setTheme('light')}
                    className={`flex flex-col items-center gap-3 rounded-2xl border-2 p-6 transition ${actualTheme === 'light' ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20' : 'border-slate-200 hover:border-blue-200 dark:border-slate-700'}`}>
                    <div className="flex h-16 w-24 overflow-hidden rounded-lg border border-slate-200">
                      <div className="h-full w-1/3 bg-white" /><div className="h-full w-1/3 bg-slate-200" /><div className="h-full w-1/3 bg-blue-500" />
                    </div>
                    <span className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                      <Sun className="h-4 w-4" /> الوضع الفاتح {actualTheme === 'light' && <Check className="h-4 w-4 text-blue-600" />}
                    </span>
                  </button>
                  <button onClick={() => setTheme('dark')}
                    className={`flex flex-col items-center gap-3 rounded-2xl border-2 p-6 transition ${actualTheme === 'dark' ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20' : 'border-slate-200 hover:border-blue-200 dark:border-slate-700'}`}>
                    <div className="flex h-16 w-24 overflow-hidden rounded-lg border border-slate-700">
                      <div className="h-full w-1/3 bg-slate-900" /><div className="h-full w-1/3 bg-slate-700" /><div className="h-full w-1/3 bg-blue-500" />
                    </div>
                    <span className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                      <Moon className="h-4 w-4" /> الوضع الليلي {actualTheme === 'dark' && <Check className="h-4 w-4 text-blue-600" />}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
