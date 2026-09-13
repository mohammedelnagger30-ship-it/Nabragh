-- Public "verified teacher" flag for the trusted-teacher badge.
-- The CV file itself stays private (REVOKEd in harden_entitlements_assessments);
-- we only expose a boolean set by admins or seeded from strong public signals.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false;

-- Seed existing approved teachers that already look credible.
UPDATE profiles
SET is_verified = true
WHERE is_teacher
  AND is_approved
  AND (years_experience >= 5 OR cv_url IS NOT NULL);

-- Expose ONLY this column publicly (table-level SELECT stays revoked).
GRANT SELECT (is_verified) ON profiles TO anon, authenticated;

-- RPC for admins to flip the flag.
CREATE OR REPLACE FUNCTION admin_set_verified(target_id uuid, verified boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'permission denied: not an admin';
  END IF;
  UPDATE profiles SET is_verified = verified WHERE id = target_id;
END;
$$;
REVOKE ALL ON FUNCTION admin_set_verified(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_set_verified(uuid, boolean) TO authenticated;