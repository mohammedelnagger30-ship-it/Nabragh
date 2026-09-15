-- Rebrand the platform name to "Noona | منصتك التعليمية الشاملة".

INSERT INTO site_settings (key, value) VALUES
  ('site_name', '"Noona | منصتك التعليمية الشاملة"'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();