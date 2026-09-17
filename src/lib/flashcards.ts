import { supabase } from './supabase';

export interface Flashcard {
  id: string;
  question: string;
  answer: string;
  mastered?: boolean;
}

export interface FlashcardSet {
  id: string;
  title: string;
  description?: string;
  courseId?: string;
  subject?: string;
  createdAt: string;
  cards: Flashcard[];
}

const DEFAULT_SETS: FlashcardSet[] = [
  {
    id: 'demo_math_1',
    title: 'بطاقات مفاهيم الرياضيات الذهنية',
    description: 'قوانين وقواعد سريعة في الحساب الجبري والهندسة',
    subject: 'الرياضيات',
    createdAt: new Date().toISOString(),
    cards: [
      { id: 'c1', question: 'ما هو قانون مساحة الدائرة؟', answer: 'مساحة الدائرة = ط × نق² (πr²)' },
      { id: 'c2', question: 'ما هو تعريف النظرية الفيثاغورية؟', answer: 'في المثلث القائم: مربع أطول ضلع (الوتر) يساوي مجموع مربعي الضلعين الآخرين (أ² + ب² = ج²)' },
      { id: 'c3', question: 'ما حاصل ضرب عدد سالب في عدد سالب؟', answer: 'نتيجة ضرب عدد سالب في عدد سالب تكون دائماً عدداً موجباً (+)' },
    ],
  },
  {
    id: 'demo_science_1',
    title: 'مصطلحات العلوم والفيزياء الأساسية',
    description: 'ملخص المفاهيم والقوانين العلمية الأكثر تكراراً',
    subject: 'الفيزياء والعلوم',
    createdAt: new Date().toISOString(),
    cards: [
      { id: 'c4', question: 'ما هو قانون السرعة؟', answer: 'السرعة = المسافة ÷ الزمن (v = d / t)' },
      { id: 'c5', question: 'ما هي وحدة قياس القوة في النظام الدولي؟', answer: 'النيوتن (Newton) ويرمز لها بالحرف N' },
      { id: 'c6', question: 'ما هو قانون نيوتن الثاني للحركة؟', answer: 'القوة = الكتلة × التسارع (F = m × a)' },
    ],
  },
];

export async function loadFlashcardSets(): Promise<FlashcardSet[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return DEFAULT_SETS;

  const { data, error } = await supabase.rpc('get_student_flashcards', { p_student_id: user.id });
  if (error || !data || data.length === 0) return DEFAULT_SETS;

  const setsMap = new Map<string, FlashcardSet>();
  for (const row of data) {
    if (!setsMap.has(row.set_id)) {
      setsMap.set(row.set_id, {
        id: row.set_id,
        title: row.set_title,
        description: row.set_description ?? undefined,
        subject: row.set_subject ?? 'عام',
        courseId: row.set_course_id ?? undefined,
        createdAt: row.set_created_at,
        cards: [],
      });
    }
    if (row.card_id) {
      setsMap.get(row.set_id)!.cards.push({
        id: row.card_id,
        question: row.card_question,
        answer: row.card_answer,
        mastered: row.card_mastered,
      });
    }
  }

  return Array.from(setsMap.values());
}

export async function createFlashcardSet(
  title: string,
  description: string,
  subject: string,
  cards: { question: string; answer: string }[],
  courseId?: string
): Promise<FlashcardSet | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: setId, error } = await supabase.rpc('create_flashcard_set_rpc', {
    p_title: title,
    p_description: description || null,
    p_subject: subject || 'عام',
    p_course_id: courseId || null,
    p_cards: cards.map((c, i) => ({ question: c.question, answer: c.answer, sort_order: i })),
  });

  if (error || !setId) return null;

  return {
    id: setId,
    title,
    description: description || undefined,
    subject: subject || 'عام',
    courseId,
    createdAt: new Date().toISOString(),
    cards: cards.map((c, i) => ({ id: `temp_${i}`, question: c.question, answer: c.answer, mastered: false })),
  };
}

export async function toggleCardMastered(setId: string, cardId: string): Promise<boolean | null> {
  const { data, error } = await supabase.rpc('toggle_flashcard_mastered', { p_card_id: cardId });
  if (error) return null;
  return data as boolean;
}

export async function deleteFlashcardSet(setId: string): Promise<boolean> {
  const { error } = await supabase.rpc('delete_flashcard_set_rpc', { p_set_id: setId });
  return !error;
}
