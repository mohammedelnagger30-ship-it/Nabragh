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

const STORAGE_KEY = 'nabragh_flashcard_sets';

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

export function loadFlashcardSets(): FlashcardSet[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      saveFlashcardSets(DEFAULT_SETS);
      return DEFAULT_SETS;
    }
    const parsed: FlashcardSet[] = JSON.parse(raw);
    return parsed.length ? parsed : DEFAULT_SETS;
  } catch {
    return DEFAULT_SETS;
  }
}

export function saveFlashcardSets(sets: FlashcardSet[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sets));
  } catch (err) {
    console.error('Error saving flashcards:', err);
  }
}

export function createFlashcardSet(title: string, description: string, subject: string, cards: { question: string; answer: string }[], courseId?: string): FlashcardSet {
  const sets = loadFlashcardSets();
  const newSet: FlashcardSet = {
    id: `set_${Date.now()}`,
    title,
    description,
    subject,
    courseId,
    createdAt: new Date().toISOString(),
    cards: cards.map((c, i) => ({
      id: `card_${Date.now()}_${i}`,
      question: c.question,
      answer: c.answer,
      mastered: false,
    })),
  };
  sets.unshift(newSet);
  saveFlashcardSets(sets);
  return newSet;
}

export function toggleCardMastered(setId: string, cardId: string): FlashcardSet[] {
  const sets = loadFlashcardSets();
  const targetSet = sets.find((s) => s.id === setId);
  if (targetSet) {
    const card = targetSet.cards.find((c) => c.id === cardId);
    if (card) {
      card.mastered = !card.mastered;
      saveFlashcardSets(sets);
    }
  }
  return sets;
}
