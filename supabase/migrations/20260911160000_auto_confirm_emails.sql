/*
# Auto-confirm new user emails

## Overview
The Supabase project had email confirmation eNABLED, but no SMTP provider was
configured, so new signups never received their confirmation email and could
never log in (GoTrue returns "Email not confirmed"). This trigger auto-confirms
every new auth.users row on insert so account creation works out of the box.

When real email confirmation is wanted later, drop this trigger and configure
an SMTP provider in the Supabase dashboard.

Already applied to the linked project via `supabase db query`.
*/

CREATE OR REPLACE FUNCTION public.auto_confirm_email()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email_confirmed_at IS NULL THEN
    UPDATE auth.users SET email_confirmed_at = now() WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.auto_confirm_email();