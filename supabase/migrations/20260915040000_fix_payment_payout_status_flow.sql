-- Ensure paid payments become payout-eligible and remain traceable through settlement.

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

  NEW.discount_amount := COALESCE(NEW.discount_amount, 0);
  NEW.refund_amount := COALESCE(NEW.refund_amount, 0);

  IF NEW.commission_rate IS NULL OR NEW.commission_rate = 0 THEN
    SELECT cr.commission_rate
    INTO selected_rate
    FROM teacher_commission_rules cr
    WHERE cr.teacher_id = NEW.teacher_id
      AND cr.is_active = true
      AND cr.effective_from <= now()
      AND (cr.effective_to IS NULL OR cr.effective_to > now())
    ORDER BY cr.created_at DESC
    LIMIT 1;

    NEW.commission_rate := COALESCE(selected_rate, 20);
  END IF;

  IF NEW.platform_fee IS NULL OR NEW.platform_fee = 0 THEN
    NEW.platform_fee := ROUND(GREATEST(0, NEW.gross_amount - NEW.discount_amount - NEW.refund_amount) * (NEW.commission_rate / 100), 2);
  END IF;

  IF NEW.teacher_payout IS NULL OR NEW.teacher_payout = 0 THEN
    NEW.teacher_payout := ROUND(GREATEST(0, NEW.gross_amount - NEW.discount_amount - NEW.refund_amount - NEW.platform_fee), 2);
  END IF;

  IF NEW.status = 'paid' AND COALESCE(NEW.payout_status, 'pending') = 'pending' THEN
    NEW.payout_status := 'approved';
  ELSIF NEW.payout_status IS NULL THEN
    NEW.payout_status := 'pending';
  END IF;

  IF NEW.amount IS NULL OR NEW.amount = 0 THEN
    NEW.amount := NEW.gross_amount;
  END IF;

  RETURN NEW;
END;
$$;

UPDATE payments
SET payout_status = 'approved'
WHERE status = 'paid'
  AND payout_status = 'pending';
