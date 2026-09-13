-- Allow the public landing page to order catalog content by admin-set featured flags.
GRANT SELECT (is_featured, featured_order) ON profiles TO anon, authenticated;
GRANT SELECT (is_featured, featured_order) ON videos TO anon, authenticated;
GRANT SELECT (is_featured, featured_order) ON courses TO anon, authenticated;