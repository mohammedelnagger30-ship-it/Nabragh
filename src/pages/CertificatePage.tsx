import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Award, Loader2, Download } from 'lucide-react';
import { supabase, PROFILE_PUBLIC_COLUMNS } from '@/lib/supabase';
import MetaTags from '@/components/MetaTags';
import type { Certificate, Course, Profile } from '@/types';

export default function CertificatePage() {
  const { id } = useParams<{ id: string }>();
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [student, setStudent] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const certRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase.from('certificates').select('*').eq('id', id).maybeSingle();
      const cert = data as Certificate | null;
      setCertificate(cert);
      if (cert) {
        const [{ data: courseData }, { data: studentData }] = await Promise.all([
          supabase.from('courses').select(`*, teacher:profiles!courses_teacher_id_fkey(${PROFILE_PUBLIC_COLUMNS})`).eq('id', cert.course_id).maybeSingle(),
          supabase.from('profiles').select(PROFILE_PUBLIC_COLUMNS).eq('id', cert.student_id).maybeSingle(),
        ]);
        setCourse(courseData as Course | null);
        setStudent(studentData as Profile | null);
      }
      setLoading(false);
    })();
  }, [id]);

  const downloadPdf = async () => {
    if (!certRef.current) return;
    setDownloading(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');
      const canvas = await html2canvas(certRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`certificate-${certificate?.certificate_number || 'download'}.pdf`);
    } catch {
      window.print();
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center pt-[4.5rem]"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>;
  }

  if (!certificate || !course || !student) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 pt-[4.5rem] dark:bg-slate-900">
        <p className="mb-4 text-slate-500">الشهادة غير موجودة</p>
        <Link to="/dashboard" className="font-semibold text-blue-600">العودة للوحة التحكم</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 pb-16 pt-28 dark:bg-slate-900">
      <MetaTags title={`شهادة ${course.title} | منصة العلم`} description="شهادة إتمام دورة على منصة العلم" />
      <div ref={certRef} className="mx-auto max-w-3xl rounded-[2rem] border-4 border-amber-200 bg-white p-8 text-center shadow-xl dark:border-amber-900/40 dark:bg-slate-800 sm:p-12">
        <Award className="mx-auto mb-4 h-14 w-14 text-amber-500" />
        <p className="text-sm font-bold text-blue-600">منصة العلم</p>
        <h1 className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-white">شهادة إتمام</h1>
        <p className="mt-6 text-slate-500">تشهد المنصة بأن</p>
        <p className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">{student.full_name}</p>
        <p className="mt-4 text-slate-500">قد أتم بنجاح دورة</p>
        <p className="mt-2 text-xl font-bold text-blue-700 dark:text-blue-300">{course.title}</p>
        <p className="mt-8 text-sm text-slate-400">رقم الشهادة: {certificate.certificate_number}</p>
        <p className="mt-1 text-sm text-slate-400">تاريخ الإصدار: {new Date(certificate.issued_at).toLocaleDateString('ar-EG')}</p>
      </div>
      <div className="mx-auto mt-6 flex max-w-3xl justify-center gap-3">
        <button type="button" onClick={() => window.print()} className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-bold text-white hover:bg-blue-700">
          <Award className="h-4 w-4" /> طباعة الشهادة
        </button>
        <button type="button" onClick={() => void downloadPdf()} disabled={downloading} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 font-bold text-white hover:bg-emerald-700 disabled:opacity-60">
          {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} تحميل PDF
        </button>
      </div>
    </div>
  );
}
