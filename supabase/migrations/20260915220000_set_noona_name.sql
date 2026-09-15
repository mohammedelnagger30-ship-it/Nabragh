-- Final brand name: Noona (Latin) + Arabic tagline below.

INSERT INTO site_settings (key, value) VALUES
  ('site_name',   '"Noona"'::jsonb),
  ('site_tagline','"منصتك التعليمية الشاملة"'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();