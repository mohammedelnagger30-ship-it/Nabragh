-- Link competitions to their subject category, then ensure the subject leaderboard view exists.
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES categories(id) ON DELETE SET NULL;

UPDATE competitions SET category_id = 'aebd2409-5529-4611-ba6d-25c57b5837de' WHERE id = '38f6c97e-605e-40d0-b9c4-73d0b54281f4' AND category_id IS NULL;
UPDATE competitions SET category_id = 'd17645f3-140f-402c-bd96-37b63a5158c2' WHERE id = 'ca7fc0f2-75a7-47a5-8538-e3daaca5d9ef' AND category_id IS NULL;

CREATE OR REPLACE VIEW student_subject_leaderboard AS
SELECT
  p.id AS student_id,
  p.full_name,
  p.avatar_url,
  p.education_stage,
  c.id AS category_id,
  c.name_ar AS subject_name,
  COALESCE(SUM(a.points), 0)::integer AS points,
  COUNT(a.id)::integer AS competitions_played,
  RANK() OVER (PARTITION BY c.id ORDER BY COALESCE(SUM(a.points), 0) DESC)::integer AS subject_rank
FROM profiles p
JOIN competition_attempts a ON a.student_id = p.id
JOIN competitions cp ON cp.id = a.competition_id
JOIN categories c ON c.id = cp.category_id
WHERE p.is_teacher = false
GROUP BY p.id, p.full_name, p.avatar_url, p.education_stage, c.id, c.name_ar;

GRANT SELECT ON student_subject_leaderboard TO anon, authenticated;