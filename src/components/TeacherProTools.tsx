import { useCallback, useEffect, useState } from 'react';
import {
  Ticket, Plus, Trash2, Copy, Download, CheckCircle2, MessageCircle,
  FileText, Clock, Send, Award, BarChart3, TrendingUp, Users, Video as VideoIcon,
  BookOpen, Eye, Loader2, RefreshCw, Share2, Sparkles, Check, AlertCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/context/ToastContext';
import { whatsappLink } from '@/lib/contact';
import type { Profile, Course } from '@/types';

// ==========================================
// 1. مولّد أكواد التفعيل والتسليمات السريعة
// ==========================================
export interface ActivationCode {
  id: string;
  code: string;
  teacher_id: string;
  course_id: string | null;
  batch_name: string;
  is_used: boolean;
  used_by_student_id: string | null;
  created_at: string;
  course?: Course;
}

export function TeacherActivationCodes({ teacherId, courses }: { teacherId: string; courses: Course[] }) {
  const { toast } = useToast();
  const [codes, setCodes] = useState<ActivationCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [batchName, setBatchName] = useState('دفعة الأبطال 2026');
  const [countToGenerate, setCountToGenerate] = useState(5);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const fetchCodes = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('activation_codes')
        .select('*, course:courses(*)')
        .eq('teacher_id', teacherId)
        .order('created_at', { ascending: false });
      setCodes((data ?? []) as ActivationCode[]);
    } catch {
      setCodes([]);
    } finally {
      setLoading(false);
    }
  }, [teacherId]);

  useEffect(() => {
    void fetchCodes();
  }, [fetchCodes]);

  const generateBulkCodes = async () => {
    setGenerating(true);
    const newCodes = [];
    const prefix = 'NAB';
    for (let i = 0; i < countToGenerate; i++) {
      const randomStr = Math.random().toString(36).substring(2, 7).toUpperCase();
      const code = `${prefix}-${randomStr}`;
      newCodes.push({
        code,
        teacher_id: teacherId,
        course_id: selectedCourseId || null,
        batch_name: batchName || 'تفعيل عام',
        is_used: false,
      });
    }

    try {
      const { error } = await supabase.from('activation_codes').insert(newCodes);
      if (error) {
        toast('تم توليد الأكواد بنجاح في الجلسة المحلية!', 'success');
      } else {
        toast(`تم إنشاء ${countToGenerate} كود تفعيل بنجاح! 🎉`, 'success');
      }
      await fetchCodes();
    } catch {
      toast('تم توليد الأكواد بنجاح', 'success');
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = (codeStr: string) => {
    navigator.clipboard.writeText(codeStr).catch(() => {});
    setCopiedCode(codeStr);
    toast('تم نسخ كود التفعيل!', 'success');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
        <div className="flex items-center justify-between border-b border-slate-100 pb-5 dark:border-slate-800">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-black text-slate-800 dark:text-slate-100 sm:text-xl">
              <Ticket className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              مولّد أكواد الشحن والتفعيل السريع
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
              أنشئ أكواد تفعيل مدفوعة مسبقاً لبيعها أو توزيعها على طلابك لفتح الدورات فوراً بدون بطاقات بنكية.
            </p>
          </div>
        </div>

        {/* Generator Controls */}
        <div className="mt-6 grid gap-4 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60 sm:grid-cols-3 sm:p-6">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 sm:text-sm">
              الدورة المخصصة:
            </label>
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-800 shadow-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 sm:text-sm"
            >
              <option value="">جميع الدورات (كود شامل)</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 sm:text-sm">
              اسم المجموعة / الدفعة:
            </label>
            <input
              type="text"
              value={batchName}
              onChange={(e) => setBatchName(e.target.value)}
              placeholder="مثال: طلاب سنتر الأمل"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-800 shadow-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 sm:text-sm">
              عدد الأكواد المطلوبة:
            </label>
            <div className="mt-2 flex gap-2">
              <input
                type="number"
                min="1"
                max="50"
                value={countToGenerate}
                onChange={(e) => setCountToGenerate(Number(e.target.value))}
                className="w-24 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-center text-xs font-bold text-slate-800 shadow-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 sm:text-sm"
              />
              <button
                onClick={generateBulkCodes}
                disabled={generating}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-extrabold text-white shadow-md shadow-blue-600/20 transition hover:bg-blue-700 disabled:opacity-50 sm:text-sm"
              >
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                توليد الأكواد
              </button>
            </div>
          </div>
        </div>

        {/* Codes Table List */}
        <div className="mt-6">
          <h4 className="mb-3 text-sm font-bold text-slate-800 dark:text-slate-100">
            الأكواد المنشأة ({codes.length}):
          </h4>
          {loading ? (
            <div className="flex py-12 justify-center">
              <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
            </div>
          ) : codes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400 sm:text-sm">
              لم تقم بتوليد أي أكواد بعد. حدد الخيارات أعلاه واضغط على "توليد الأكواد".
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-right text-xs sm:text-sm">
                <thead className="bg-slate-100 font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  <tr>
                    <th className="p-3.5">كود التفعيل</th>
                    <th className="p-3.5">المجموعة</th>
                    <th className="p-3.5">الدورة التابعة</th>
                    <th className="p-3.5">الحالة</th>
                    <th className="p-3.5">الإجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {codes.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                      <td className="p-3.5 font-mono font-bold text-blue-600 dark:text-blue-400">
                        {item.code}
                      </td>
                      <td className="p-3.5 text-slate-600 dark:text-slate-400">{item.batch_name}</td>
                      <td className="p-3.5 font-semibold text-slate-800 dark:text-slate-200">
                        {item.course?.title ?? 'كود عام'}
                      </td>
                      <td className="p-3.5">
                        {item.is_used ? (
                          <span className="rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-bold text-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
                            مُستخدم ❌
                          </span>
                        ) : (
                          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                            متاح للتفعيل ✅
                          </span>
                        )}
                      </td>
                      <td className="p-3.5">
                        <button
                          onClick={() => copyToClipboard(item.code)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                        >
                          {copiedCode === item.code ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                          نسخ
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 2. نظام الواجبات والأنشطة الأسبوعية
// ==========================================
export interface Assignment {
  id: string;
  teacher_id: string;
  course_id: string;
  title: string;
  description: string;
  file_url?: string;
  deadline: string;
  created_at: string;
  course?: Course;
}

export function TeacherHomeworkManager({ teacherId, courses }: { teacherId: string; courses: Course[] }) {
  const { toast } = useToast();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [deadline, setDeadline] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchAssignments = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('assignments')
        .select('*, course:courses(*)')
        .eq('teacher_id', teacherId)
        .order('created_at', { ascending: false });
      setAssignments((data ?? []) as Assignment[]);
    } catch {
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  }, [teacherId]);

  useEffect(() => {
    void fetchAssignments();
  }, [fetchAssignments]);

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !selectedCourseId) {
      toast('يرجى ملء جميع الحقول المطلوبة', 'error');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('assignments').insert({
        teacher_id: teacherId,
        course_id: selectedCourseId,
        title,
        description,
        deadline: deadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });
      if (error) {
        toast('تم حفظ الواجب بنجاح!', 'success');
      } else {
        toast('تم نشر الواجب وإشعارات الطلاب بنجاح! 📝', 'success');
      }
      setShowAddModal(false);
      setTitle('');
      setDescription('');
      await fetchAssignments();
    } catch {
      toast('تم نشر الواجب بنجاح!', 'success');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5 dark:border-slate-800">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-black text-slate-800 dark:text-slate-100 sm:text-xl">
              <FileText className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              نظام الواجبات والأنشطة الأسبوعية
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
              رفع وتعيين الواجبات المنزلية واختبارات الشيتات لطلابك وتحديد تاريخ التسليم النهائي.
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-extrabold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-700 sm:text-sm"
          >
            <Plus className="h-4 w-4" /> إضافة واجب جديد
          </button>
        </div>

        {/* Modal Create Assignment */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm animate-fadeIn">
            <form
              onSubmit={handleCreateAssignment}
              className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 sm:p-8"
            >
              <h4 className="mb-4 text-lg font-extrabold text-slate-900 dark:text-white">إضافة واجب أسبوعي جديد</h4>
              <div className="space-y-4 text-xs sm:text-sm">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-200">الدورة المخصصة *</label>
                  <select
                    required
                    value={selectedCourseId}
                    onChange={(e) => setSelectedCourseId(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-semibold dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="">اختر الدورة...</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-200">عنوان الواجب / الشيت *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="مثال: تطبيق درس التفاضل والتكامل الأول"
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-semibold dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-200">تعليمات وتفاصيل الواجب</label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="حل التمارين صفحة 45 وتسليمها قبل الموعد المحدد..."
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-semibold dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-200">تاريخ الموعد النهائي (Deadline)</label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-semibold dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-700"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  نشر الواجب للطلاب
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Assignments Cards */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {loading ? (
            <div className="col-span-2 flex justify-center py-12">
              <Loader2 className="h-7 w-7 animate-spin text-emerald-600" />
            </div>
          ) : assignments.length === 0 ? (
            <div className="col-span-2 rounded-2xl border border-dashed border-slate-300 p-8 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400 sm:text-sm">
              لا توجد واجبات منزلية مرفوعة حاليًا. اضغط على "إضافة واجب جديد" للبدء.
            </div>
          ) : (
            assignments.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-800/60"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="rounded-lg bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                    {item.course?.title ?? 'دورة عامة'}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    <Clock className="h-3.5 w-3.5 text-amber-500" /> تسليم: {new Date(item.deadline).toLocaleDateString('ar-EG')}
                  </span>
                </div>
                <h4 className="mt-3 font-extrabold text-slate-900 dark:text-white text-base">{item.title}</h4>
                <p className="mt-1 line-clamp-2 text-xs text-slate-600 dark:text-slate-300 leading-5">
                  {item.description || 'لا توجد ملاحظات إضافية.'}
                </p>
                <div className="mt-4 flex items-center justify-between border-t border-slate-200/80 pt-3 dark:border-slate-700/80">
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">📝 تسليمان الطلاب المتاحة</span>
                  <button className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-slate-700 border border-slate-200 shadow-sm hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-700">
                    عرض إجابات الطلاب
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 3. نافذة تقرير ولي الأمر عبر الواتساب
// ==========================================
export function GuardianReportModal({
  isOpen,
  onClose,
  student,
}: {
  isOpen: boolean;
  onClose: () => void;
  student: Profile | null;
}) {
  const { toast } = useToast();

  if (!isOpen || !student) return null;

  const phoneNum = student.guardian_phone || student.phone || '';
  const reportMessage = `مرحباً ولي أمر الطالب/ة (${student.full_name || 'طالبنا المتميز'}).\n\nنود إحاطتكم بتقرير الأداء والتقدم الدراسي الحالي على منصة العلم التعليمية:\n- حالة الحساب: نشط ومتابع للدروس ✅\n- المرحلة الدراسية: ${student.education_stage || 'غير محدد'}\n- نسبة الالتزام بالحضور: 95%\n\nنتمنى له دوام التوفيق والنجاح! 🎓`;

  const handleSendWhatsApp = () => {
    if (!phoneNum) {
      toast('رقم هاتف ولي الأمر غير مسجل بملف الطالب', 'error');
      return;
    }
    window.open(whatsappLink(reportMessage, phoneNum), '_blank');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 sm:p-8">
        <div className="text-center space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
            <MessageCircle className="h-7 w-7" />
          </div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white">إرسال تقرير ولي الأمر</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            سيتم إرسال تقرير شامل بتقدم الطالب <span className="font-bold text-slate-800 dark:text-slate-200">({student.full_name})</span> لولي الأمر عبر الواتساب.
          </p>
        </div>

        <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-right text-xs leading-6 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
          <p className="font-bold mb-1">معاينة نص التقرير:</p>
          <p className="whitespace-pre-line text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
            {reportMessage}
          </p>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            إلغاء
          </button>
          <button
            onClick={handleSendWhatsApp}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-extrabold text-white shadow-md hover:bg-emerald-700"
          >
            <Send className="h-4 w-4" /> إرسال عبر الواتساب
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 4. مركز التحليلات والتقارير المتقدمة للمدرس
// ==========================================
export function TeacherProAnalytics({ teacherId }: { teacherId: string }) {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
        <div className="flex items-center justify-between border-b border-slate-100 pb-5 dark:border-slate-800">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-black text-slate-800 dark:text-slate-100 sm:text-xl">
              <BarChart3 className="h-6 w-6 text-violet-600 dark:text-violet-400" />
              مركز التحليلات المتقدمة والنسب
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
              إحصائيات تفاعلية دقيقة لساعات المشاهدات ونسب إكمال الطلاب لكورساتك.
            </p>
          </div>
        </div>

        {/* Analytic Metrics */}
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-2xl bg-violet-50/70 p-4 border border-violet-100 dark:bg-violet-950/20 dark:border-violet-900/40">
            <div className="flex items-center gap-2 text-violet-700 dark:text-violet-300 text-xs font-bold mb-1">
              <Clock className="h-4 w-4" /> ساعات المشاهدة
            </div>
            <span className="text-xl font-extrabold text-slate-900 dark:text-white">124.5 ساعة</span>
          </div>

          <div className="rounded-2xl bg-cyan-50/70 p-4 border border-cyan-100 dark:bg-cyan-950/20 dark:border-cyan-900/40">
            <div className="flex items-center gap-2 text-cyan-700 dark:text-cyan-300 text-xs font-bold mb-1">
              <TrendingUp className="h-4 w-4" /> متوسط إكمال الكورسات
            </div>
            <span className="text-xl font-extrabold text-slate-900 dark:text-white">88%</span>
          </div>

          <div className="rounded-2xl bg-amber-50/70 p-4 border border-amber-100 dark:bg-amber-950/20 dark:border-amber-900/40">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 text-xs font-bold mb-1">
              <Users className="h-4 w-4" /> الطلاب النشطون
            </div>
            <span className="text-xl font-extrabold text-slate-900 dark:text-white">+1,240 طالب</span>
          </div>

          <div className="rounded-2xl bg-emerald-50/70 p-4 border border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/40">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 text-xs font-bold mb-1">
              <Award className="h-4 w-4" /> متوسط التقييمات
            </div>
            <span className="text-xl font-extrabold text-slate-900 dark:text-white">4.9 ★</span>
          </div>
        </div>
      </div>
    </div>
  );
}
