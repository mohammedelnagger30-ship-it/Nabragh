-- Ensure the primary admin account is registered as an admin
INSERT INTO admin_users (user_id)
SELECT id FROM profiles WHERE email = 'mohammedibrahim@gmail.com'
ON CONFLICT (user_id) DO NOTHING;