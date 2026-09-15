import { useCallback, useEffect, useState } from 'react';
import { Check, Clock3, Copy, Loader2, UserRound, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/context/ToastContext';
import type { AcademyMembership, Profile } from '@/types';

interface MemberRow extends AcademyMembership {
  student: Profile | null;
}

export default function AcademyMembersPanel({ teacherId }: { teacherId: string }) {
  const { toast } = useToast();
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState('');
  const [generatingInvite, setGeneratingInvite] = useState(false);
  const [academySlug, setAcademySlug] = useState(teacherId);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    const { data: settings } = await supabase.from('teacher_page_settings').select('slug').eq('teacher_id', teacherId).maybeSingle();
    if (settings?.slug) setAcademySlug(settings.slug);
    const { data, error } = await supabase
      .from('academy_memberships')
      .select('id, teacher_id, student_id, status, joined_at, reviewed_at')
      .eq('teacher_id', teacherId)
      .order('joined_at', { ascending: false });

    if (error) {
      toast('تعذر تحميل أعضاء المنصة', 'error');
      setLoading(false);
      return;
    }

    const rows = (data ?? []) as AcademyMembership[];
    const studentIds = rows.map((row) => row.student_id);
    const profiles = studentIds.length
      ? await supabase.from('profiles').select('id, full_name, avatar_url, specialization, is_teacher, is_approved, is_manager, years_experience, bio, location, website, education_stage, curriculum, teaching_stages, teaching_curricula, created_at, updated_at').in('id', studentIds)
      : { data: [] };
    const profileMap = new Map(((profiles.data ?? []) as Profile[]).map((profile) => [profile.id, profile]));
    setMembers(rows.map((row) => ({ ...row, student: profileMap.get(row.student_id) ?? null })));
    setLoading(false);
  }, [teacherId, toast]);

  useEffect(() => { void loadMembers(); }, [loadMembers]);

  const updateStatus = async (membership: MemberRow, status: AcademyMembership['status']) => {
    setUpdating(membership.id);
    const { error } = await supabase.from('academy_memberships').update({ status, reviewed_at: new Date().toISOString() }).eq('id', membership.id);
    setUpdating(null);
    if (error) {
      toast('تعذر تحديث حالة الطلب', 'error');
      return;
    }
    toast(status === 'active' ? 'تم قبول الطالب' : 'تم تحديث حالة الطالب', 'success');
    await loadMembers();
  };

  const pending = members.filter((member) => member.status === 'pending');
  const active = members.filter((member) => member.status === 'active');

  const generateInvite = async () => {
    setGeneratingInvite(true);
    const code = `${teacherId.slice(0, 4).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const { error } = await supabase.from('academy_invites').insert({ teacher_id: teacherId, code, max_uses: 10 });
    setGeneratingInvite(false);
    if (error) {
      toast('تعذر إنشاء الدعوة', 'error');
      return;
    }
    setInviteCode(code);
    await navigator.clipboard?.writeText(`${window.location.origin}/academy/${settingsSlug(academySlug)}?invite=${code}`);
    toast('تم إنشاء كود الدعوة ونسخ الرابط', 'success');
  };

  if (loading) return <div className="flex min-h-[220px] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-blue-600" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="flex items-center gap-2 text-2xl font-extrabold text-slate-900 dark:text-white"><UserRound className="h-6 w-6 text-blue-600" /> طلاب منصتي</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">راجع طلبات الانضمام وتابع أعضاء منصتك الخاصة.</p></div>
        <div className="flex gap-2"><span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">{pending.length} طلبات</span><span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">{active.length} نشط</span></div>
      </div>
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 dark:border-blue-900/40 dark:bg-blue-900/20"><div className="flex-1"><p className="font-bold text-blue-800 dark:text-blue-200">دعوة طلاب جدد</p><p className="mt-1 text-xs text-blue-700 dark:text-blue-300">أنشئ رابطًا صالحًا لـ 10 طلاب وشاركه معهم.</p></div><button type="button" onClick={() => void generateInvite()} disabled={generatingInvite} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{generatingInvite ? <Loader2 className="h-4 w-4 animate-spin" /> : 'إنشاء دعوة'}</button>{inviteCode && <button type="button" onClick={() => void navigator.clipboard?.writeText(`${window.location.origin}/academy/${settingsSlug(academySlug)}?invite=${inviteCode}`)} className="inline-flex items-center gap-1 rounded-xl bg-white px-3 py-2 text-xs font-bold text-blue-700"><Copy className="h-3.5 w-3.5" /> {inviteCode}</button>}</div>

      {pending.length > 0 && <MemberSection title="طلبات الانضمام" members={pending} updating={updating} onAction={updateStatus} />}
      {active.length > 0 && <MemberSection title="الأعضاء النشطون" members={active} updating={updating} onAction={updateStatus} />}
      {members.length === 0 && <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-800"><UserRound className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-3 font-bold text-slate-700 dark:text-slate-200">لا يوجد طلاب في منصتك بعد</p><p className="mt-1 text-sm text-slate-500">شارك رابط المنصة مع طلابك ليبدأوا طلب الانضمام.</p></div>}
    </div>
  );
}

function settingsSlug(value: string) {
  return value || 'academy';
}

function MemberSection({ title, members, updating, onAction }: { title: string; members: MemberRow[]; updating: string | null; onAction: (membership: MemberRow, status: AcademyMembership['status']) => void }) {
  return <section className="space-y-3"><h3 className="font-bold text-slate-800 dark:text-slate-100">{title}</h3><div className="grid gap-3 md:grid-cols-2">{members.map((member) => <div key={member.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800"><div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-50 font-bold text-blue-600 dark:bg-blue-900/30">{member.student?.avatar_url ? <img src={member.student.avatar_url} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" /> : member.student?.full_name?.charAt(0) ?? '?'}</div><div className="min-w-0 flex-1"><p className="truncate font-bold text-slate-800 dark:text-white">{member.student?.full_name ?? 'طالب'}</p><p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><Clock3 className="h-3 w-3" /> {new Date(member.joined_at).toLocaleDateString('ar-EG')}</p></div>{member.status === 'pending' ? <div className="flex gap-1"><button type="button" onClick={() => onAction(member, 'active')} disabled={updating === member.id} aria-label="قبول الطالب" className="rounded-lg bg-emerald-50 p-2 text-emerald-600 hover:bg-emerald-100 disabled:opacity-50"><Check className="h-4 w-4" /></button><button type="button" onClick={() => onAction(member, 'rejected')} disabled={updating === member.id} aria-label="رفض الطالب" className="rounded-lg bg-rose-50 p-2 text-rose-600 hover:bg-rose-100 disabled:opacity-50"><X className="h-4 w-4" /></button></div> : <button type="button" onClick={() => onAction(member, 'blocked')} disabled={updating === member.id} className="rounded-lg px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-50">حظر</button>}</div>)}</div></section>;
}
