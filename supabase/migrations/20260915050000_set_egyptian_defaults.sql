-- Set the platform's persisted defaults for the Egyptian market.

ALTER TABLE payments ALTER COLUMN currency SET DEFAULT 'EGP';

INSERT INTO site_settings (key, value) VALUES
  ('currency', '"EGP"'::jsonb),
  ('currency_symbol', '"جنيه"'::jsonb),
  ('country', '"مصر"'::jsonb),
  ('locale', '"ar-EG"'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

INSERT INTO site_settings (key, value) VALUES
  ('contact', '{"email":"info@manhatalilm.com","phone_display":"+20 10 0000 0000","phone_tel":"+201000000000","whatsapp":"201000000000","city":"القاهرة، جمهورية مصر العربية","facebook":"https://www.facebook.com","youtube":"https://www.youtube.com","instagram":"https://www.instagram.com","tiktok":"","telegram":"","x":"https://x.com"}'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

UPDATE payments
SET currency = 'EGP'
WHERE currency = 'SAR';
