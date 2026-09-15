-- Split the brand name from its tagline.
-- site_name  = المنصة الرسمية
-- site_tagline = العبارة التوضيحية تحت الاسم

INSERT INTO site_settings (key, value) VALUES
  ('site_name',   '"نونه"'::jsonb),
  ('site_tagline','"منصتك التعليمية الشاملة"'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();