/*
# Add guardian_phone to profiles

## Overview
Adds a `guardian_phone` column so student accounts can store a parent/guardian
contact number, required at signup and editable from the profile.

Already applied to the linked project via `supabase db query`.
*/

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS guardian_phone text;