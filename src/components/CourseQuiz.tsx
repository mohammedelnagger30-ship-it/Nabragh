import { useEffect, useState } from 'react';
import { Award, CheckCircle2, Loader2, Trophy } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/context/ToastContext';
import type { Quiz, QuizQuestion } from '@/types';

export default function CourseQuiz({ courseId }: { courseId: string }) {
  const { toast } = useToast();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; passed: boolean; certificateNumber?: string } | null>(null);

  useEffect(() => {
    (async () => {
      const { data: quizData } = await supabase.from('quizzes').select('*').eq('course_id', courseId).limit(1).maybeSingle();
      if (quizData) {
        setQuiz(quizData as Quiz);
        const { data: questionData } = await supabase.rpc('get_quiz_questions', { target_quiz_id: quizData.id });
        setQuestions(questionData as QuizQuestion[] ?? []);
      }
      setLoading(false);
    })();
  }, [courseId]);

  const submit = async () => {
    if (!quiz || questions.length === 0 || Object.keys(answers).length !== questions.length) {
      toast('أجب عن كل الأسئلة أولًا', 'info');
      return;
    }
    setSubmitting(true);
    const { data: attempt, error } = await supabase.rpc('submit_quiz_attempt', {
      target_quiz_id: quiz.id,
      submitted_answers: answers,
    });
    setSubmitting(false);
    if (error) {
      toast('تعذر حفظ نتيجة الاختبار', 'error');
      return;
    }
    const result = Array.isArray(attempt) ? attempt[0] : attempt;
    if (!result) {
      toast('تعذر قراءة نتيجة الاختبار', 'error');
      return;
    }
    setResult({ score: result.score, passed: result.passed, certificateNumber: result.certificate_number ?? undefined });
    toast(result.passed ? 'أحسنت! اجتزت الاختبار' : 'حاول مرة أخرى لتحسين نتيجتك', result.passed ? 'success' : 'info');
  };

  if (loading || !quiz) return null;
  if (result) return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800">
      {result.passed ? <Trophy className="mx-auto mb-3 h-10 w-10 text-amber-500" /> : <Award className="mx-auto mb-3 h-10 w-10 text-slate-400 dark:text-slate-500" />}
      <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">نتيجة الاختبار: {result.score}%</h2>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{result.passed ? 'تم اجتياز الاختبار بنجاح.' : `تحتاج إلى ${quiz.passing_score}% للنجاح.`}</p>
      {result.certificateNumber && <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">رقم الشهادة: {result.certificateNumber}</p>}
      <button type="button" onClick={() => { setResult(null); setAnswers({}); }} className="mt-5 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700">إعادة الاختبار</button>
    </section>
  );

  return (
    <section className="rounded-2xl border border-blue-100 bg-blue-50/50 p-5 dark:border-blue-900/30 dark:bg-blue-900/20 sm:p-6">
      <div className="mb-5 flex items-center gap-3"><CheckCircle2 className="h-6 w-6 text-blue-600 dark:text-blue-400" /><div><h2 className="font-extrabold text-slate-900 dark:text-white">{quiz.title}</h2><p className="text-xs text-slate-500 dark:text-slate-400">درجة النجاح {quiz.passing_score}%</p></div></div>
      <div className="space-y-5">
        {questions.map((question, index) => (
          <fieldset key={question.id} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
            <legend className="px-1 text-sm font-bold text-slate-800 dark:text-slate-100">{index + 1}. {question.question}</legend>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {question.options.map((option, optionIndex) => (
                <label key={optionIndex} className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm transition ${answers[question.id] === optionIndex ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200' : 'border-slate-200 text-slate-600 hover:border-blue-200 dark:border-slate-700 dark:text-slate-300 dark:hover:border-blue-500/50'}`}>
                  <input type="radio" name={question.id} checked={answers[question.id] === optionIndex} onChange={() => setAnswers((current) => ({ ...current, [question.id]: optionIndex }))} />
                  {option}
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </div>
      <button type="button" onClick={submit} disabled={submitting} className="mt-5 flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60">
        {submitting && <Loader2 className="h-4 w-4 animate-spin" />} تسليم الاختبار
      </button>
    </section>
  );
}
