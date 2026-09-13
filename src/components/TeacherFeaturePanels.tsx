import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  MessageSquare, Plus, Loader2, Trash2, RefreshCw, Send, CheckCircle2,
  CalendarDays, Video as VideoIcon, Star, Package as PackageIcon, Award,
  MessagesSquare, Radio, BookOpen, User as UserIcon, X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/context/ToastContext';

interface QuestionRow {
  id: string;
  question: string;
  answer: string | null;
  created_at: string;
  student: { full_name: string | null } | null;
}

interface SessionRow {
  id: string;
  title: string | null;
  scheduled_at: string | null;
  duration_minutes: number;
  status: string;
  is_live: boolean;
}

interface BookingRow {
  id: string;
  session_id: string;
  student_id: string;
  created_at: string;
  student: { full_name: string | null } | null;
}

interface MessageRow {
  id: string;
  sender_id: string;
  receiver_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
}

interface PackageRow {
  id: string;
  title: string;
  description: string | null;
  price: number;
  duration_days: number;
  is_active: boolean;
  created_at: string;
}

interface CertRow {
  id: string;
  certificate_number: string;
  issued_at: string;
  student: { full_name: string | null } | null;
  course: { title: string | null } | null;
}

const inputCls = 'w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white';
const btnPrimary = 'inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-50';
const btnGhost = 'inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300';
const btnDanger = 'inline-flex items-center gap-1.5 rounded-xl bg-rose-50 px-3 py-2 text-sm font-bold text-rose-600 transition hover:bg-rose-100 disabled:opacity-50 dark:bg-rose-900/20 dark:text-rose-300';
const errCls = 'my-2 rounded-xl bg-rose-50 px-4 py-2 text-sm font-bold text-rose-700 dark:bg-rose-900/30 dark:text-rose-300';

// ====================================================================
// Q&A Panel
// ====================================================================
export function TeacherQA({ teacherId }: { teacherId: string }) {
  const { toast } = useToast();
  const [rows, setRows] = useState<QuestionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('teacher_questions')
      .select('*, student:profiles!teacher_questions_student_id_fkey(full_name)')
      .eq('teacher_id', teacherId)
      .order('created_at', { ascending: false })
      .limit(300);
    setRows((data ?? []) as unknown as QuestionRow[]);
    setLoading(false);
  }, [teacherId]);

  useEffect(() => { void load(); }, [load]);

  const pending = rows.filter((r) => !r.answer);
  const answered = rows.filter((r) => r.answer);

  const answer = async (q: QuestionRow) => {
    const text = (answers[q.id] ?? '').trim();
    if (!text) return;
    setBusyId(q.id);
    const { error } = await supabase.from('teacher_questions').update({ answer: text, answered_at: new Date().toISOString() }).eq('id', q.id);
    setBusyId(null);
    toast(error ? 'تعذر الإجابة' : 'تم نشر الإجابة', error ? 'error' : 'success');
    if (!error) await load();
  };

  const remove = async (q: QuestionRow) => {
    if (!confirm('حذف هذا السؤال نهائيًا؟')) return;
    setBusyId(q.id);
    await supabase.from('teacher_questions').delete().eq('id', q.id);
    setBusyId(null);
    await load();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300"><MessageSquare className="h-5 w-5" /></div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">أسئلة الطلاب</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">{pending.length} سؤال غير مُجاب • {answered.length} إجابة منشورة</p>
          </div>
        </div>
        <button type="button" onClick={() => void load()} className={btnGhost}><RefreshCw className="h-4 w-4" /> تحديث</button>
      </div>

      {loading ? <Loader2 className="mx-auto mt-16 h-8 w-8 animate-spin text-blue-600" /> : (
        <>
          <h3 className="pt-2 text-sm font-black text-amber-600 dark:text-amber-400">بانتظار الإجابة ({pending.length})</h3>
          {pending.length === 0 && <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-400 dark:border-slate-700">لا توجد أسئلة معلّقة.</p>}
          <div className="space-y-3">
            {pending.map((q) => (
              <div key={q.id} className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900/40 dark:bg-amber-900/10">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{q.question}</p>
                <p className="mt-1 text-xs text-slate-500">من: {q.student?.full_name ?? 'طالب'} • {new Date(q.created_at).toLocaleDateString('ar-EG')}</p>
                <div className="mt-3 flex gap-2">
                  <input value={answers[q.id] ?? ''} onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))} placeholder="اكتب الإجابة..." className={inputCls} />
                  <button type="button" onClick={() => void answer(q)} disabled={busyId === q.id || !(answers[q.id] ?? '').trim()} className={btnPrimary}><Send className="h-4 w-4" /> إجابة</button>
                  <button type="button" onClick={() => void remove(q)} disabled={busyId === q.id} className={btnDanger}><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
          </div>

          <h3 className="pt-4 text-sm font-black text-slate-700 dark:text-slate-200">السجل المنشور ({answered.length})</h3>
          {answered.length === 0 && <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-400 dark:border-slate-700">لم تنشر إجابات بعد.</p>}
          <div className="space-y-3">
            {answered.map((q) => (
              <div key={q.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{q.question}</p>
                  <button type="button" onClick={() => void remove(q)} disabled={busyId === q.id} className="shrink-0 rounded-lg p-1 text-rose-500 transition hover:bg-rose-50 dark:hover:bg-rose-900/20"><Trash2 className="h-4 w-4" /></button>
                </div>
                <div className="mt-2 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200">✓ {q.answer}</div>
                <p className="mt-2 text-xs text-slate-400">من: {q.student?.full_name ?? 'طالب'} • نُشرت {q.created_at ? new Date(q.created_at).toLocaleDateString('ar-EG') : ''}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ====================================================================
// Live sessions + bookings
// ====================================================================
export function TeacherLiveSessions({ teacherId }: { teacherId: string }) {
  const { toast } = useToast();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [duration, setDuration] = useState(60);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: s }, { data: b }] = await Promise.all([
      supabase.from('scheduled_sessions').select('*').eq('teacher_id', teacherId).order('scheduled_at', { ascending: false }),
      supabase.from('live_session_bookings').select('*, student:profiles!live_session_bookings_student_id_fkey(full_name)').order('created_at', { ascending: false }).limit(300),
    ]);
    setSessions((s ?? []) as unknown as SessionRow[]);
    setBookings((b ?? []) as unknown as BookingRow[]);
    setLoading(false);
  }, [teacherId]);

  useEffect(() => { void load(); }, [load]);

  const bookingsBySession = useMemo(() => {
    const m: Record<string, BookingRow[]> = {};
    for (const b of bookings) (m[b.session_id] ??= []).push(b);
    return m;
  }, [bookings]);

  const add = async () => {
    if (!title.trim() || !scheduledAt) { toast('أدخل العنوان والموعد', 'error'); return; }
    setBusyId('new');
    const { error } = await supabase.from('scheduled_sessions').insert({
      teacher_id: teacherId,
      title: title.trim(),
      scheduled_at: new Date(scheduledAt).toISOString(),
      duration_minutes: duration,
      status: 'scheduled',
    });
    setBusyId(null);
    toast(error ? 'تعذر إضافة الحصة' : 'تمت إضافة الحصة المباشرة', error ? 'error' : 'success');
    if (!error) { setTitle(''); setScheduledAt(''); setDuration(60); await load(); }
  };

  const setStatus = async (s: SessionRow, status: string) => {
    setBusyId(s.id);
    const { error } = await supabase.from('scheduled_sessions').update({ status }).eq('id', s.id);
    setBusyId(null);
    if (!error) await load();
  };

  const removeSession = async (s: SessionRow) => {
    if (!confirm('حذف هذه الحصة؟ سيتتم إلغاء كل الحجوزات المرتبطة بها.')) return;
    setBusyId(s.id);
    await supabase.from('scheduled_sessions').delete().eq('id', s.id);
    setBusyId(null);
    await load();
  };

  const cancelBooking = async (b: BookingRow) => {
    setBusyId(b.id);
    await supabase.from('live_session_bookings').delete().eq('id', b.id);
    setBusyId(null);
    await load();
  };

  const statusBadge = (s: string) => {
    const meta: Record<string, string> = {
      scheduled: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      live: 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-300',
      ended: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300',
      cancelled: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    };
    const label: Record<string, string> = { scheduled: 'مجدولة', live: 'مباشرة الآن', ended: 'انتهت', cancelled: 'ملغاة' };
    return <span className={`rounded-full px-3 py-1 text-xs font-bold ${meta[s] ?? meta.scheduled}`}>{label[s] ?? s}</span>;
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300"><Radio className="h-5 w-5" /></div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">الحصص المباشرة والحجوزات</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">جدولة حصص مباشرة واستقبال الحجوزات من الطلاب</p>
          </div>
        </div>
        <button type="button" onClick={() => void load()} className={btnGhost}><RefreshCw className="h-4 w-4" /> تحديث</button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h4 className="mb-3 text-sm font-black text-slate-700 dark:text-slate-200"><Plus className="ml-1 inline h-4 w-4" /> حصة جديدة</h4>
        <div className="grid gap-3 sm:grid-cols-4">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="عنوان الحصة (الدرس)" className={`${inputCls} sm:col-span-2`} />
          <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className={inputCls} />
          <div className="flex gap-2">
            <select value={duration} onChange={(e) => setDuration(Number(e.target.value))} className={inputCls + ' flex-1'}>
              {[30, 45, 60, 90, 120].map((d) => <option key={d} value={d}>{d} دقيقة</option>)}
            </select>
            <button type="button" onClick={() => void add()} disabled={busyId === 'new'} className={btnPrimary}><Plus className="h-4 w-4" /> إضافة</button>
          </div>
        </div>
        {busyId === 'new' && <p className={errCls}>...</p>}
      </div>

      {loading ? <Loader2 className="mx-auto mt-16 h-8 w-8 animate-spin text-blue-600" /> : sessions.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-400 dark:border-slate-700">لا توجد حصص مجدولة.</p>
      ) : (
        sessions.map((s) => (
          <div key={s.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300"><VideoIcon className="h-5 w-5" /></div>
                <div>
                  <p className="font-black text-slate-900 dark:text-white">{s.title ?? 'حصة بدون عنوان'}</p>
                  <p className="text-xs text-slate-500">
                    <CalendarDays className="ml-1 inline h-3.5 w-3.5" />
                    {s.scheduled_at ? new Date(s.scheduled_at).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' }) : 'بدون موعد'} • {s.duration_minutes} دقيقة {statusBadge(s.status)}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {s.status !== 'live' && <button type="button" onClick={() => void setStatus(s, 'live')} disabled={busyId === s.id} className="rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-100 disabled:opacity-50 dark:bg-rose-900/30 dark:text-rose-300">بدء البث</button>}
                {s.status === 'live' && <button type="button" onClick={() => void setStatus(s, 'ended')} disabled={busyId === s.id} className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200 disabled:opacity-50">إنهاء</button>}
                {s.status === 'scheduled' && <button type="button" onClick={() => void setStatus(s, 'cancelled')} disabled={busyId === s.id} className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-bold text-amber-700 hover:bg-amber-100 disabled:opacity-50">إلغاء</button>}
                <button type="button" onClick={() => void removeSession(s)} disabled={busyId === s.id} className={btnDanger}><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
            <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-700">
              <p className="mb-2 text-xs font-black text-slate-500 dark:text-slate-400">الحجوزات ({bookingsBySession[s.id]?.length ?? 0})</p>
              {!bookingsBySession[s.id]?.length ? <p className="text-xs text-slate-400">لا توجد حجوزات بعد.</p> : (
                <div className="flex flex-wrap gap-2">
                  {(bookingsBySession[s.id] ?? []).map((b) => (
                    <span key={b.id} className="inline-flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-200">
                      <UserIcon className="h-3.5 w-3.5" /> {b.student?.full_name ?? 'طالب'}
                      <button type="button" title="إلغاء الحجز" onClick={() => void cancelBooking(b)} disabled={busyId === b.id} className="text-rose-500 hover:text-rose-700"><X className="h-3.5 w-3.5" /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ====================================================================
// Messages inbox
// ====================================================================
interface Conversation {
  studentId: string;
  studentName: string;
  messages: MessageRow[];
  unread: number;
}

export function TeacherMessages({ teacherId }: { teacherId: string }) {
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [active, setActive] = useState<Conversation | null>(null);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('receiver_id', teacherId)
      .order('created_at', { ascending: false })
      .limit(300);
    const rows = (data ?? []) as unknown as MessageRow[];
    const { data: senders } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', Array.from(new Set(rows.map((r) => r.sender_id))));
    const nameMap: Record<string, string> = {};
    for (const p of (senders ?? []) as { id: string; full_name: string | null }[]) nameMap[p.id] = p.full_name ?? 'طالب';

    const bySender = new Map<string, MessageRow[]>();
    for (const r of rows) {
      const arr = bySender.get(r.sender_id) ?? [];
      arr.push(r);
      bySender.set(r.sender_id, arr);
    }
    const convs = Array.from(bySender.entries()).map(([sid, msgs]) => ({
      studentId: sid,
      studentName: nameMap[sid] ?? 'طالب',
      messages: msgs,
      unread: msgs.filter((m) => !m.read_at).length,
    }));
    setConversations(convs);
    setLoading(false);
    return convs;
  }, [teacherId]);

  useEffect(() => { void load(); }, [load]);

  const open = async (c: Conversation) => {
    setActive({ ...c, unread: 0 });
    const unreadIds = c.messages.filter((m) => !m.read_at).map((m) => m.id);
    if (unreadIds.length) {
      await supabase.from('messages').update({ read_at: new Date().toISOString() }).in('id', unreadIds);
      await load();
    }
  };

  const reply = async () => {
    const text = draft.trim();
    if (!text || !active) return;
    setSending(true);
    const { error } = await supabase.from('messages').insert({ sender_id: teacherId, receiver_id: active.studentId, body: text });
    setSending(false);
    toast(error ? 'تعذر الإرسال' : 'تم إرسال الرسالة', error ? 'error' : 'success');
    if (!error) {
      setDraft('');
      const convs = await load();
      await open(convs.find((c) => c.studentId === active.studentId) ?? active);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300"><MessagesSquare className="h-5 w-5" /></div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">رسائل الطلاب</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">رد على المحادثات مباشرة داخل المنصة</p>
          </div>
        </div>
        <button type="button" onClick={() => void load()} className={btnGhost}><RefreshCw className="h-4 w-4" /> تحديث</button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800 lg:col-span-1">
          {loading ? <Loader2 className="mx-auto mt-12 h-8 w-8 animate-spin text-blue-600" /> : conversations.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-400">لا توجد رسائل.</p>
          ) : conversations.map((c) => (
            <button key={c.studentId} type="button" onClick={() => void open(c)} className={`flex w-full items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 text-right transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700/50 ${active?.studentId === c.studentId ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{c.studentName}</span>
              {c.unread > 0 && <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-black text-white">{c.unread}</span>}
            </button>
          ))}
        </div>

        <div className="flex min-h-[28rem] flex-col rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800 lg:col-span-2">
          {!active ? (
            <div className="flex flex-1 items-center justify-center text-sm text-slate-400">اختر محادثة من القائمة للرد.</div>
          ) : (
            <>
              <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 dark:border-slate-700">
                <UserIcon className="h-4 w-4 text-slate-400" />
                <span className="text-sm font-black text-slate-800 dark:text-slate-200">{active.studentName}</span>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto p-4" style={{ maxHeight: 360 }}>
                {active.messages.map((m) => (
                  <div key={m.id} className={`flex ${m.sender_id === teacherId ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                      m.sender_id === teacherId
                        ? 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                        : 'bg-blue-600 text-white'
                    }`}>
                      <p>{m.body}</p>
                      <p className={`mt-1 text-[10px] ${m.sender_id === teacherId ? 'text-slate-400' : 'text-blue-100'}`}>{new Date(m.created_at).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 border-t border-slate-100 p-3 dark:border-slate-700">
                <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void reply(); }} placeholder="اكتب ردًا..." className={inputCls} />
                <button type="button" onClick={() => void reply()} disabled={sending || !draft.trim()} className={btnPrimary}><Send className="h-4 w-4" /> إرسال</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ====================================================================
// Packages / offers
// ====================================================================
export function TeacherPackages({ teacherId }: { teacherId: string }) {
  const { toast } = useToast();
  const [rows, setRows] = useState<PackageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState(0);
  const [duration, setDuration] = useState(30);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('teacher_packages').select('*').eq('teacher_id', teacherId).order('created_at', { ascending: false });
    setRows((data ?? []) as unknown as PackageRow[]);
    setLoading(false);
  }, [teacherId]);

  useEffect(() => { void load(); }, [load]);

  const add = async () => {
    if (!title.trim()) { toast('أدخل اسم الباقة', 'error'); return; }
    setBusyId('new');
    const { error } = await supabase.from('teacher_packages').insert({ teacher_id: teacherId, title: title.trim(), description: description.trim() || null, price, duration_days: duration });
    setBusyId(null);
    toast(error ? 'تعذر إضافة الباقة' : 'تمت إضافة الباقة', error ? 'error' : 'success');
    if (!error) { setTitle(''); setDescription(''); setPrice(0); setDuration(30); await load(); }
  };

  const toggle = async (p: PackageRow) => {
    setBusyId(p.id);
    await supabase.from('teacher_packages').update({ is_active: !p.is_active }).eq('id', p.id);
    setBusyId(null);
    await load();
  };

  const remove = async (p: PackageRow) => {
    if (!confirm('حذف هذه الباقة؟')) return;
    setBusyId(p.id);
    await supabase.from('teacher_packages').delete().eq('id', p.id);
    setBusyId(null);
    await load();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300"><PackageIcon className="h-5 w-5" /></div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">العروض والباقات</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">باقات تظهر للطلاب في صفحتك العامة</p>
          </div>
        </div>
        <button type="button" onClick={() => void load()} className={btnGhost}><RefreshCw className="h-4 w-4" /> تحديث</button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h4 className="mb-3 text-sm font-black text-slate-700 dark:text-slate-200"><Plus className="ml-1 inline h-4 w-4" /> باقة جديدة</h4>
        <div className="grid gap-3 sm:grid-cols-6">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="اسم الباقة" className={`${inputCls} sm:col-span-2`} />
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="وصف مختصر" className={`${inputCls} sm:col-span-2`} />
          <input type="number" min={0} value={price} onChange={(e) => setPrice(Number(e.target.value))} placeholder="السعر (ر.س)" className={inputCls} />
          <div className="flex gap-2">
            <select value={duration} onChange={(e) => setDuration(Number(e.target.value))} className={inputCls + ' flex-1'}>
              {[7, 14, 30, 60, 90, 180, 365].map((d) => <option key={d} value={d}>{d} يوم</option>)}
            </select>
            <button type="button" onClick={() => void add()} disabled={busyId === 'new'} className={btnPrimary}><Plus className="h-4 w-4" /></button>
          </div>
        </div>
      </div>

      {loading ? <Loader2 className="mx-auto mt-16 h-8 w-8 animate-spin text-blue-600" /> : rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-400 dark:border-slate-700">لا توجد باقات بعد.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((p) => (
            <div key={p.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-black text-slate-900 dark:text-white">{p.title}</h4>
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black ${p.is_active ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300'}`}>{p.is_active ? 'نشطة' : 'متوقفة'}</span>
              </div>
              {p.description && <p className="mt-1 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">{p.description}</p>}
              <p className="mt-3 text-lg font-black text-blue-600 dark:text-blue-400">{Number(p.price).toLocaleString('ar-EG')} ر.س <span className="text-xs font-bold text-slate-400">/ {p.duration_days} يوم</span></p>
              <div className="mt-4 flex gap-2">
                <button type="button" onClick={() => void toggle(p)} disabled={busyId === p.id} className="flex-1 rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-200 disabled:opacity-50 dark:bg-slate-700 dark:text-slate-300">{p.is_active ? 'إيقاف' : 'تفعيل'}</button>
                <button type="button" onClick={() => void remove(p)} disabled={busyId === p.id} className={btnDanger}><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ====================================================================
// Student certificates for teacher courses
// ====================================================================
export function TeacherCertificates({ teacherId }: { teacherId: string }) {
  const [rows, setRows] = useState<CertRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('certificates')
      .select('*, student:profiles!certificates_student_id_fkey(full_name), course:courses!certificates_course_id_fkey(title, teacher_id)')
      .order('issued_at', { ascending: false })
      .limit(300);
    const all = (data ?? []) as unknown as Array<CertRow & { course: { title: string | null; teacher_id: string } | null }>;
    setRows(all.filter((c) => c.course?.teacher_id === teacherId));
    setLoading(false);
  }, [teacherId]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-300"><Award className="h-5 w-5" /></div>
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">شهادات الطلاب</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">الشهادات الصادرة للطلاب في دوراتك</p>
        </div>
      </div>
      {loading ? <Loader2 className="mx-auto mt-16 h-8 w-8 animate-spin text-blue-600" /> : rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-400 dark:border-slate-700">لم تصدر شهادات بعد.</p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <table className="w-full text-right text-sm">
            <thead><tr className="border-b border-slate-200 text-xs font-bold text-slate-400 dark:border-slate-700 dark:text-slate-500">
              <th className="px-4 py-3">الطالب</th><th className="px-4 py-3">الدورة</th><th className="px-4 py-3">رقم الشهادة</th><th className="px-4 py-3">تاريخ الإصدار</th><th className="px-4 py-3">الشهادة</th>
            </tr></thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-b border-slate-100 text-slate-600 last:border-0 dark:border-slate-700 dark:text-slate-300">
                  <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">{c.student?.full_name ?? 'طالب'}</td>
                  <td className="px-4 py-3">{c.course?.title ?? '—'}</td>
                  <td className="px-4 py-3 text-xs">{c.certificate_number}</td>
                  <td className="px-4 py-3 text-xs">{new Date(c.issued_at).toLocaleDateString('ar-EG')}</td>
                  <td className="px-4 py-3"><Link to={`/certificate/${c.id}`} className="inline-flex items-center gap-1 rounded-xl bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300"><Award className="h-3.5 w-3.5" /> عرض</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}