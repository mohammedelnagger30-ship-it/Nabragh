-- App-compat secure RPCs.
-- The hardening migration revoked table-level SELECT on videos/profiles from
-- anon/authenticated and only granted specific columns. The app still relies on:
--   * own full profile row        -> get_my_profile()
--   * public teacher contact      -> get_teacher_contact()
--   * full student rows (teacher) -> get_profiles_full()
--   * admin student/teacher lists -> admin_list_profiles()
-- These are SECURITY DEFINER so the private columns stay hidden from raw REST.

-- 1) Own full profile (used for dashboard prefill + email display).
create or replace function get_my_profile()
returns setof profiles
language sql stable security definer set search_path = public
as $$
  select p.* from profiles p where p.id = auth.uid()
$$;
revoke all on function get_my_profile() from public, anon, service_role;
grant execute on function get_my_profile() to authenticated;

-- 2) Contact info for an approved public teacher page.
create or replace function get_teacher_contact(target_teacher_id uuid)
returns table(email text, phone text, cv_url text)
language sql stable security definer set search_path = public
as $$
  select p.email, p.phone, p.cv_url
  from profiles p
  where p.id = target_teacher_id and p.is_teacher = true and p.is_approved = true
$$;
revoke all on function get_teacher_contact(uuid) from public;
grant execute on function get_teacher_contact(uuid) to anon, authenticated;

-- 3) Full rows for a page manager's own students (and any admin).
create or replace function get_profiles_full(profile_ids uuid[])
returns setof profiles
language sql stable security definer set search_path = public
as $$
  select p.* from profiles p
  where p.id = any(profile_ids) and (is_admin() or is_manager())
$$;
revoke all on function get_profiles_full(uuid[]) from public, anon, service_role;
grant execute on function get_profiles_full(uuid[]) to authenticated;

-- 4) Admin listing (students is_teacher = false, teachers is_teacher = true).
create or replace function admin_list_profiles(teacher_flag boolean)
returns setof profiles
language sql stable security definer set search_path = public
as $$
  select p.* from profiles p
  where p.is_teacher = teacher_flag and is_admin()
  order by p.created_at desc
$$;
revoke all on function admin_list_profiles(boolean) from public, anon, service_role;
grant execute on function admin_list_profiles(boolean) to authenticated;