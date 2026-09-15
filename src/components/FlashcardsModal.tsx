import { useState } from 'react';
import { X, RotateCw, CheckCircle2, ChevronRight, ChevronLeft, Brain, Sparkles, Plus } from 'lucide-react';
import { loadFlashcardSets, toggleCardMastered, createFlashcardSet, type FlashcardSet } from '@/lib/flashcards';

interface FlashcardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId?: string;
}

export default function FlashcardsModal({ isOpen, onClose, courseId }: FlashcardsModalProps) {
  const [sets, setSets] = useState<FlashcardSet[]>(() => loadFlashcardSets());
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // New set form
  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCards, setNewCards] = useState<{ question: string; answer: string }[]>([
    { question: '', answer: '' },
  ]);

  if (!isOpen) return null;

  const currentSet = sets.find((s) => s.id === selectedSetId) ?? (courseId ? sets.find((s) => s.courseId === courseId) : null);
  const filteredSets = courseId ? sets.filter((s) => s.courseId === courseId || !s.courseId) : sets;

  const activeCard = currentSet?.cards[currentIndex];
  const masteredCount = currentSet?.cards.filter((c) => c.mastered).length ?? 0;
  const totalCards = currentSet?.cards.length ?? 0;

  const handleToggleMastered = () => {
    if (!currentSet || !activeCard) return;
    const updatedSets = toggleCardMastered(currentSet.id, activeCard.id);
    setSets(updatedSets);
  };

  const handleNext = () => {
    setIsFlipped(false);
    if (currentSet && currentIndex < currentSet.cards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    setIsFlipped(false);
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleCreateSet = (e: React.FormEvent) => {
    e.preventDefault();
    const validCards = newCards.filter((c) => c.question.trim() && c.answer.trim());
    if (!newTitle.trim() || validCards.length === 0) return;

    createFlashcardSet(newTitle, newDesc, newSubject || 'عام', validCards, courseId);
    setSets(loadFlashcardSets());
    setShowCreateForm(false);
    setNewTitle('');
    setNewDesc('');
    setNewSubject('');
    setNewCards([{ question: '', answer: '' }]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl rounded-3xl border border-slate-200/80 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 sm:p-8">
        <button
          onClick={onClose}
          className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 shadow-md shadow-blue-500/20 text-white">
            <Brain className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
              بطاقات المذاكرة السريعة
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              راجع المفاهيم والقوانين الهامة بأسلوب الكروت التفاعلية الذكية
            </p>
          </div>
        </div>

        {/* View Mode: Select Set or Review */}
        {!currentSet && !showCreateForm ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 dark:text-slate-200">اختر مجموعة بطاقات:</h3>
              <button
                onClick={() => setShowCreateForm(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" /> إنشاء مجموعة كروت
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {filteredSets.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setSelectedSetId(s.id);
                    setCurrentIndex(0);
                    setIsFlipped(false);
                  }}
                  className="group rounded-2xl border border-slate-200/90 bg-slate-50/70 p-4 text-right shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:bg-white hover:shadow-md dark:border-slate-800 dark:bg-slate-800/60 dark:hover:bg-slate-800"
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-bold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                      {s.subject ?? 'عام'}
                    </span>
                    <span className="text-xs font-bold text-slate-400">{s.cards.length} بطاقة</span>
                  </div>
                  <h4 className="mt-2 font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                    {s.title}
                  </h4>
                  {s.description && (
                    <p className="mt-1 text-xs text-slate-500 line-clamp-2 dark:text-slate-400">
                      {s.description}
                    </p>
                  )}
                </button>
              ))}
            </div>
          </div>
        ) : showCreateForm ? (
          <form onSubmit={handleCreateSet} className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white">إنشاء مجموعة كروت جديدة</h3>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400"
              >
                إلغاء
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">عنوان المجموعة</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="مثال: قوانين الفيزياء الكلاسيكية"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">اسم المادة / التخصص</label>
                <input
                  type="text"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  placeholder="مثال: فيزياء"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            {newCards.map((card, idx) => (
              <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-850">
                <div className="mb-2 text-xs font-bold text-blue-600">بطاقة #{idx + 1}</div>
                <input
                  type="text"
                  placeholder="السؤال / المصطلح"
                  value={card.question}
                  onChange={(e) => {
                    const updated = [...newCards];
                    updated[idx].question = e.target.value;
                    setNewCards(updated);
                  }}
                  className="mb-2 w-full rounded-lg border border-slate-200 bg-white p-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                <input
                  type="text"
                  placeholder="الإجابة / الشرح المختصر"
                  value={card.answer}
                  onChange={(e) => {
                    const updated = [...newCards];
                    updated[idx].answer = e.target.value;
                    setNewCards(updated);
                  }}
                  className="w-full rounded-lg border border-slate-200 bg-white p-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            ))}

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setNewCards([...newCards, { question: '', answer: '' }])}
                className="text-xs font-bold text-blue-600 hover:underline"
              >
                + إضافة بطاقة أخرى
              </button>

              <button
                type="submit"
                className="rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:shadow-lg"
              >
                حفظ المجموعة
              </button>
            </div>
          </form>
        ) : (
          <div>
            {/* Header with back button */}
            <div className="mb-4 flex items-center justify-between">
              <button
                onClick={() => setSelectedSetId(null)}
                className="text-xs font-bold text-blue-600 hover:underline"
              >
                ← تغيير المجموعة
              </button>
              <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
                متقَن: {masteredCount} من {totalCards}
              </div>
            </div>

            {/* Flashcard Box */}
            {activeCard && (
              <div className="space-y-4">
                <div
                  onClick={() => setIsFlipped(!isFlipped)}
                  className="perspective cursor-pointer min-h-[220px] rounded-3xl border border-blue-200/80 bg-gradient-to-br from-blue-50/50 via-white to-blue-50/40 p-8 shadow-xl text-center flex flex-col items-center justify-center transition-all hover:scale-[1.01] dark:border-slate-800 dark:from-slate-850 dark:via-slate-900 dark:to-slate-900"
                >
                  <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-blue-100/80 px-3 py-1 text-xs font-bold text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                    <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                    {isFlipped ? 'الإجابة' : 'السؤال (اضغط للقلب)'}
                  </div>

                  <p className="text-xl font-extrabold leading-relaxed text-slate-900 dark:text-white">
                    {isFlipped ? activeCard.answer : activeCard.question}
                  </p>

                  <div className="mt-6 flex items-center gap-2 text-xs font-semibold text-slate-400">
                    <RotateCw className="h-4 w-4" /> انقر لقلب البطاقة
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={handlePrev}
                    disabled={currentIndex === 0}
                    className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 disabled:opacity-40 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300"
                  >
                    <ChevronRight className="h-5 w-5" /> السابق
                  </button>

                  <button
                    onClick={handleToggleMastered}
                    className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors ${
                      activeCard.mastered
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    <CheckCircle2 className="h-5 w-5" /> {activeCard.mastered ? 'تم إتقان البطاقة' : 'تعليم كمتقَن'}
                  </button>

                  <button
                    onClick={handleNext}
                    disabled={currentIndex === totalCards - 1}
                    className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 disabled:opacity-40 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300"
                  >
                    التالي <ChevronLeft className="h-5 w-5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
