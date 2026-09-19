-- Create testimonials table for student reviews on the landing page
CREATE TABLE IF NOT EXISTS public.testimonials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_name TEXT NOT NULL,
  student_role TEXT NOT NULL DEFAULT 'طالب',
  review_text TEXT NOT NULL,
  rating INTEGER NOT NULL DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
  is_visible BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: only admins can manage, everyone can read visible ones
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view visible testimonials"
  ON public.testimonials FOR SELECT
  USING (is_visible = true);

CREATE POLICY "Admins can manage testimonials"
  ON public.testimonials FOR ALL
  USING (auth.uid() IN (SELECT id FROM profiles WHERE is_admin = true))
  WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE is_admin = true));

-- Index for sorting
CREATE INDEX IF NOT EXISTS idx_testimonials_sort ON public.testimonials (sort_order ASC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_testimonials_visible ON public.testimonials (is_visible);
