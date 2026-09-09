-- Operational payment workflow and teacher enrollment visibility.

CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid REFERENCES subscriptions(id) ON DELETE SET NULL,
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  teacher_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  amount numeric(10,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  currency text NOT NULL DEFAULT 'SAR',
  method text NOT NULL DEFAULT 'manual',
  status text NOT NULL DEFAULT 'pending',
  external_reference text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (status IN ('pending', 'paid', 'failed', 'refunded'))
);

CREATE INDEX IF NOT EXISTS payments_status_idx ON payments(status, created_at DESC);
CREATE INDEX IF NOT EXISTS payments_student_idx ON payments(student_id, created_at DESC);
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payments_select_own ON payments;
CREATE POLICY payments_select_own ON payments
  FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR teacher_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS payments_insert_pending ON payments;
CREATE POLICY payments_insert_pending ON payments
  FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid() AND status = 'pending');

DROP POLICY IF EXISTS payments_update_admin ON payments;
CREATE POLICY payments_update_admin ON payments
  FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS subscriptions_admin_select ON subscriptions;
CREATE POLICY subscriptions_admin_select ON subscriptions
  FOR SELECT TO authenticated
  USING (auth.uid() = student_id OR auth.uid() = teacher_id OR is_admin());

DROP POLICY IF EXISTS subscriptions_admin_update ON subscriptions;
CREATE POLICY subscriptions_admin_update ON subscriptions
  FOR UPDATE TO authenticated
  USING (is_admin() OR auth.uid() = teacher_id)
  WITH CHECK (is_admin() OR auth.uid() = teacher_id);

DROP POLICY IF EXISTS enrollments_teacher_select ON course_enrollments;
CREATE POLICY enrollments_teacher_select ON course_enrollments
  FOR SELECT TO authenticated
  USING (
    student_id = auth.uid()
    OR is_admin()
    OR EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = course_enrollments.course_id AND c.teacher_id = auth.uid()
    )
  );
