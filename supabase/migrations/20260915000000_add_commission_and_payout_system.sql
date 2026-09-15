-- Professional commission and payout system for the education marketplace.
-- This adds a proper payout ledger so the platform can separate gross revenue,
-- platform fees, teacher payouts, refunds, and approved monthly settlements.

CREATE TABLE IF NOT EXISTS teacher_commission_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_type text NOT NULL DEFAULT 'course' CHECK (product_type IN ('course', 'subscription', 'bundle', 'custom')),
  product_id uuid,
  commission_rate numeric(5,2) NOT NULL DEFAULT 20 CHECK (commission_rate >= 0 AND commission_rate <= 100),
  payout_cycle text NOT NULL DEFAULT 'monthly' CHECK (payout_cycle IN ('daily', 'weekly', 'monthly', 'custom')),
  min_payout_amount numeric(10,2) NOT NULL DEFAULT 0 CHECK (min_payout_amount >= 0),
  is_active boolean NOT NULL DEFAULT true,
  effective_from timestamptz NOT NULL DEFAULT now(),
  effective_to timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE teacher_commission_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS teacher_commission_rules_select_own ON teacher_commission_rules;
CREATE POLICY teacher_commission_rules_select_own ON teacher_commission_rules
  FOR SELECT TO authenticated
  USING (teacher_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS teacher_commission_rules_manage_admin ON teacher_commission_rules;
CREATE POLICY teacher_commission_rules_manage_admin ON teacher_commission_rules
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE TABLE IF NOT EXISTS teacher_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  total_gross numeric(10,2) NOT NULL DEFAULT 0 CHECK (total_gross >= 0),
  total_discounts numeric(10,2) NOT NULL DEFAULT 0 CHECK (total_discounts >= 0),
  total_refunds numeric(10,2) NOT NULL DEFAULT 0 CHECK (total_refunds >= 0),
  total_platform_fee numeric(10,2) NOT NULL DEFAULT 0 CHECK (total_platform_fee >= 0),
  total_teacher_payout numeric(10,2) NOT NULL DEFAULT 0 CHECK (total_teacher_payout >= 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'processing', 'paid', 'failed')),
  payment_method text NOT NULL DEFAULT 'bank',
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE teacher_payouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS teacher_payouts_select_own ON teacher_payouts;
CREATE POLICY teacher_payouts_select_own ON teacher_payouts
  FOR SELECT TO authenticated
  USING (teacher_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS teacher_payouts_manage_admin ON teacher_payouts;
CREATE POLICY teacher_payouts_manage_admin ON teacher_payouts
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE TABLE IF NOT EXISTS teacher_payout_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_id uuid NOT NULL REFERENCES teacher_payouts(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  payment_id uuid REFERENCES payments(id) ON DELETE SET NULL,
  amount numeric(10,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  method text NOT NULL DEFAULT 'bank',
  reference text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE teacher_payout_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS teacher_payout_transactions_select_own ON teacher_payout_transactions;
CREATE POLICY teacher_payout_transactions_select_own ON teacher_payout_transactions
  FOR SELECT TO authenticated
  USING (teacher_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS teacher_payout_transactions_manage_admin ON teacher_payout_transactions;
CREATE POLICY teacher_payout_transactions_manage_admin ON teacher_payout_transactions
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS gross_amount numeric(10,2) NOT NULL DEFAULT 0 CHECK (gross_amount >= 0),
  ADD COLUMN IF NOT EXISTS discount_amount numeric(10,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  ADD COLUMN IF NOT EXISTS platform_fee numeric(10,2) NOT NULL DEFAULT 0 CHECK (platform_fee >= 0),
  ADD COLUMN IF NOT EXISTS teacher_payout numeric(10,2) NOT NULL DEFAULT 0 CHECK (teacher_payout >= 0),
  ADD COLUMN IF NOT EXISTS commission_rate numeric(5,2) NOT NULL DEFAULT 20 CHECK (commission_rate >= 0 AND commission_rate <= 100),
  ADD COLUMN IF NOT EXISTS payout_status text NOT NULL DEFAULT 'pending' CHECK (payout_status IN ('pending', 'approved', 'processing', 'paid', 'failed')),
  ADD COLUMN IF NOT EXISTS refund_amount numeric(10,2) NOT NULL DEFAULT 0 CHECK (refund_amount >= 0);

CREATE OR REPLACE FUNCTION apply_commission_to_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  selected_rate numeric(5,2);
BEGIN
  IF NEW.gross_amount IS NULL OR NEW.gross_amount = 0 THEN
    NEW.gross_amount := COALESCE(NEW.amount, 0);
  END IF;

  IF NEW.discount_amount IS NULL THEN
    NEW.discount_amount := 0;
  END IF;

  IF NEW.refund_amount IS NULL THEN
    NEW.refund_amount := 0;
  END IF;

  IF NEW.commission_rate IS NULL OR NEW.commission_rate = 0 THEN
    SELECT COALESCE(cr.commission_rate, 20)
      INTO selected_rate
    FROM teacher_commission_rules cr
    WHERE cr.teacher_id = NEW.teacher_id AND cr.is_active = true
    ORDER BY cr.created_at DESC
    LIMIT 1;

    NEW.commission_rate := COALESCE(selected_rate, 20);
  END IF;

  IF NEW.platform_fee IS NULL OR NEW.platform_fee = 0 THEN
    NEW.platform_fee := ROUND((NEW.gross_amount - NEW.discount_amount - NEW.refund_amount) * (NEW.commission_rate / 100), 2);
  END IF;

  IF NEW.teacher_payout IS NULL OR NEW.teacher_payout = 0 THEN
    NEW.teacher_payout := ROUND((NEW.gross_amount - NEW.discount_amount - NEW.refund_amount - NEW.platform_fee), 2);
  END IF;

  IF NEW.payout_status IS NULL THEN
    NEW.payout_status := CASE WHEN NEW.status = 'paid' THEN 'approved' ELSE 'pending' END;
  END IF;

  IF NEW.amount IS NULL OR NEW.amount = 0 THEN
    NEW.amount := NEW.gross_amount;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_payments_commission ON payments;
CREATE TRIGGER trg_payments_commission
BEFORE INSERT OR UPDATE OF amount, gross_amount, discount_amount, refund_amount, teacher_id, commission_rate, platform_fee, teacher_payout, status, payout_status
ON payments
FOR EACH ROW
EXECUTE FUNCTION apply_commission_to_payment();

CREATE OR REPLACE FUNCTION generate_teacher_payout_for_month(
  p_teacher_id uuid,
  p_period_start timestamptz,
  p_period_end timestamptz,
  p_payment_method text DEFAULT 'bank'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  payout_id uuid;
BEGIN
  INSERT INTO teacher_payouts (
    teacher_id,
    period_start,
    period_end,
    total_gross,
    total_discounts,
    total_refunds,
    total_platform_fee,
    total_teacher_payout,
    status,
    payment_method
  )
  SELECT
    p.teacher_id,
    p_period_start,
    p_period_end,
    COALESCE(SUM(p.gross_amount), 0),
    COALESCE(SUM(p.discount_amount), 0),
    COALESCE(SUM(p.refund_amount), 0),
    COALESCE(SUM(p.platform_fee), 0),
    COALESCE(SUM(p.teacher_payout), 0),
    'pending',
    p_payment_method
  FROM payments p
  WHERE p.teacher_id = p_teacher_id
    AND p.status = 'paid'
    AND p.created_at >= p_period_start
    AND p.created_at < p_period_end
  RETURNING id INTO payout_id;

  RETURN payout_id;
END;
$$;

CREATE OR REPLACE FUNCTION admin_teacher_payouts_list()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'permission denied: not an admin';
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', tp.id,
      'teacher_id', tp.teacher_id,
      'teacher_name', pr.full_name,
      'email', pr.email,
      'period_start', tp.period_start,
      'period_end', tp.period_end,
      'total_gross', tp.total_gross,
      'total_discounts', tp.total_discounts,
      'total_refunds', tp.total_refunds,
      'total_platform_fee', tp.total_platform_fee,
      'total_teacher_payout', tp.total_teacher_payout,
      'status', tp.status,
      'payment_method', tp.payment_method,
      'paid_at', tp.paid_at,
      'created_at', tp.created_at
    ) ORDER BY tp.period_end DESC), '[]'::jsonb)
  INTO result
  FROM teacher_payouts tp
  LEFT JOIN profiles pr ON pr.id = tp.teacher_id;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION admin_teacher_payouts_list() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_teacher_payouts_list() TO authenticated;

CREATE OR REPLACE FUNCTION admin_payments_list()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'permission denied: not an admin';
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', pay.id,
      'student_name', s.full_name,
      'teacher_name', t.full_name,
      'subscription_id', pay.subscription_id,
      'amount', pay.amount,
      'gross_amount', pay.gross_amount,
      'discount_amount', pay.discount_amount,
      'platform_fee', pay.platform_fee,
      'teacher_payout', pay.teacher_payout,
      'commission_rate', pay.commission_rate,
      'currency', pay.currency,
      'method', pay.method,
      'status', pay.status,
      'payout_status', pay.payout_status,
      'created_at', pay.created_at,
      'paid_at', pay.paid_at
    ) ORDER BY COALESCE(pay.paid_at, pay.created_at) DESC), '[]'::jsonb)
  INTO result
  FROM payments pay
  LEFT JOIN profiles s ON s.id = pay.student_id
  LEFT JOIN profiles t ON t.id = pay.teacher_id;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION admin_payments_list() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_payments_list() TO authenticated;

DROP POLICY IF EXISTS teacher_payouts_select_self ON teacher_payouts;
DROP POLICY IF EXISTS teacher_payout_transactions_select_self ON teacher_payout_transactions;
DROP POLICY IF EXISTS teacher_commission_rules_select_self ON teacher_commission_rules;

CREATE POLICY teacher_commission_rules_select_self ON teacher_commission_rules
  FOR SELECT TO authenticated
  USING (teacher_id = auth.uid() OR is_admin());

CREATE POLICY teacher_payouts_select_self ON teacher_payouts
  FOR SELECT TO authenticated
  USING (teacher_id = auth.uid() OR is_admin());

CREATE POLICY teacher_payout_transactions_select_self ON teacher_payout_transactions
  FOR SELECT TO authenticated
  USING (teacher_id = auth.uid() OR is_admin());

CREATE INDEX IF NOT EXISTS idx_teacher_commission_rules_teacher_id ON teacher_commission_rules(teacher_id, is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_teacher_payouts_teacher_id ON teacher_payouts(teacher_id, period_end DESC);
CREATE INDEX IF NOT EXISTS idx_teacher_payout_transactions_payout_id ON teacher_payout_transactions(payout_id);
CREATE INDEX IF NOT EXISTS idx_payments_teacher_payout_status ON payments(teacher_id, payout_status, created_at DESC);
