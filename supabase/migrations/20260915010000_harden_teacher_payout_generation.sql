-- Make payout generation idempotent and keep payment-to-settlement traceability.

CREATE UNIQUE INDEX IF NOT EXISTS idx_teacher_payouts_period_unique
  ON teacher_payouts(teacher_id, period_start, period_end);

CREATE UNIQUE INDEX IF NOT EXISTS idx_teacher_payout_transactions_payment_unique
  ON teacher_payout_transactions(payout_id, payment_id)
  WHERE payment_id IS NOT NULL;

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
  payout_exists boolean;
BEGIN
  IF p_period_start >= p_period_end THEN
    RAISE EXCEPTION 'period_start must be before period_end';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM teacher_payouts
    WHERE teacher_id = p_teacher_id
      AND period_start = p_period_start
      AND period_end = p_period_end
  ) INTO payout_exists;

  IF payout_exists THEN
    SELECT id INTO payout_id
    FROM teacher_payouts
    WHERE teacher_id = p_teacher_id
      AND period_start = p_period_start
      AND period_end = p_period_end;
    RETURN payout_id;
  END IF;

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
    AND p.payout_status = 'approved'
    AND p.created_at >= p_period_start
    AND p.created_at < p_period_end
  GROUP BY p.teacher_id
  RETURNING id INTO payout_id;

  IF payout_id IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO teacher_payout_transactions (payout_id, teacher_id, payment_id, amount, method, status)
  SELECT payout_id, p.teacher_id, p.id, p.teacher_payout, p_payment_method, 'pending'
  FROM payments p
  WHERE p.teacher_id = p_teacher_id
    AND p.status = 'paid'
    AND p.payout_status = 'approved'
    AND p.created_at >= p_period_start
    AND p.created_at < p_period_end;

  UPDATE payments
  SET payout_status = 'processing'
  WHERE teacher_id = p_teacher_id
    AND status = 'paid'
    AND payout_status = 'approved'
    AND created_at >= p_period_start
    AND created_at < p_period_end;

  RETURN payout_id;
END;
$$;

CREATE OR REPLACE FUNCTION admin_generate_teacher_payouts_for_period(
  p_period_start timestamptz,
  p_period_end timestamptz,
  p_payment_method text DEFAULT 'bank'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  teacher_id uuid;
  payout_id uuid;
  generated jsonb := '[]'::jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'permission denied: not an admin';
  END IF;

  FOR teacher_id IN
    SELECT id FROM profiles WHERE is_teacher = true
  LOOP
    payout_id := generate_teacher_payout_for_month(teacher_id, p_period_start, p_period_end, p_payment_method);
    IF payout_id IS NOT NULL THEN
      generated := generated || jsonb_build_object('teacher_id', teacher_id, 'payout_id', payout_id);
    END IF;
  END LOOP;

  RETURN generated;
END;
$$;

REVOKE ALL ON FUNCTION generate_teacher_payout_for_month(uuid, timestamptz, timestamptz, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION admin_generate_teacher_payouts_for_period(timestamptz, timestamptz, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_generate_teacher_payouts_for_period(timestamptz, timestamptz, text) TO authenticated;
