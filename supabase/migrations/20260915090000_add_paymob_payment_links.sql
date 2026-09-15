-- Paymob payment-link metadata and provider status tracking.

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'paymob',
  ADD COLUMN IF NOT EXISTS provider_order_id text,
  ADD COLUMN IF NOT EXISTS provider_transaction_id text,
  ADD COLUMN IF NOT EXISTS payment_url text,
  ADD COLUMN IF NOT EXISTS payment_error text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_provider_order_id
  ON payments(provider, provider_order_id)
  WHERE provider_order_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_provider_transaction_id
  ON payments(provider, provider_transaction_id)
  WHERE provider_transaction_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payments_payment_url ON payments(payment_url) WHERE payment_url IS NOT NULL;
