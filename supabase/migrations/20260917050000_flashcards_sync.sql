-- Flashcard sets and cards synced to Supabase
-- Replaces localStorage-only storage so flashcards persist across devices

-- 1. flashcard_sets table
CREATE TABLE IF NOT EXISTS flashcard_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  subject TEXT DEFAULT 'عام',
  course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE flashcard_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students manage own flashcard sets"
  ON flashcard_sets FOR ALL
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Teachers view flashcard sets for their courses"
  ON flashcard_sets FOR SELECT
  USING (
    course_id IN (
      SELECT id FROM courses WHERE teacher_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_flashcard_sets_student ON flashcard_sets(student_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_sets_course ON flashcard_sets(course_id);

-- 2. flashcards table (individual cards within a set)
CREATE TABLE IF NOT EXISTS flashcards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id UUID NOT NULL REFERENCES flashcard_sets(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  mastered BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students manage own flashcards"
  ON flashcards FOR ALL
  USING (
    set_id IN (
      SELECT id FROM flashcard_sets WHERE student_id = auth.uid()
    )
  )
  WITH CHECK (
    set_id IN (
      SELECT id FROM flashcard_sets WHERE student_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_flashcards_set ON flashcards(set_id);

-- 3. RPC: get all flashcard sets with cards for a student
CREATE OR REPLACE FUNCTION get_student_flashcards(p_student_id UUID)
RETURNS TABLE (
  set_id UUID,
  set_title TEXT,
  set_description TEXT,
  set_subject TEXT,
  set_course_id UUID,
  set_created_at TIMESTAMPTZ,
  card_id UUID,
  card_question TEXT,
  card_answer TEXT,
  card_mastered BOOLEAN,
  card_sort_order INT
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    s.id, s.title, s.description, s.subject, s.course_id, s.created_at,
    c.id, c.question, c.answer, c.mastered, c.sort_order
  FROM flashcard_sets s
  LEFT JOIN flashcards c ON c.set_id = s.id
  WHERE s.student_id = p_student_id
  ORDER BY s.created_at DESC, c.sort_order;
$$;

-- 4. RPC: create a flashcard set with cards in one call
CREATE OR REPLACE FUNCTION create_flashcard_set_rpc(
  p_title TEXT,
  p_description TEXT,
  p_subject TEXT,
  p_course_id UUID,
  p_cards JSONB
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_set_id UUID;
  v_card JSONB;
  v_idx INT := 0;
BEGIN
  INSERT INTO flashcard_sets (student_id, title, description, subject, course_id)
  VALUES (auth.uid(), p_title, p_description, p_subject, p_course_id)
  RETURNING id INTO v_set_id;

  FOR v_card IN SELECT * FROM jsonb_array_elements(p_cards)
  LOOP
    INSERT INTO flashcards (set_id, question, answer, mastered, sort_order)
    VALUES (v_set_id, v_card->>'question', v_card->>'answer', false, v_idx);
    v_idx := v_idx + 1;
  END LOOP;

  RETURN v_set_id;
END;
$$;

-- 5. RPC: toggle card mastered status
CREATE OR REPLACE FUNCTION toggle_flashcard_mastered(p_card_id UUID)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER
AS $$
  UPDATE flashcards
  SET mastered = NOT mastered
  WHERE id = p_card_id
    AND set_id IN (SELECT id FROM flashcard_sets WHERE student_id = auth.uid())
  RETURNING mastered;
$$;

-- 6. RPC: delete a flashcard set
CREATE OR REPLACE FUNCTION delete_flashcard_set_rpc(p_set_id UUID)
RETURNS VOID
LANGUAGE sql SECURITY DEFINER
AS $$
  DELETE FROM flashcard_sets
  WHERE id = p_set_id AND student_id = auth.uid();
$$;
