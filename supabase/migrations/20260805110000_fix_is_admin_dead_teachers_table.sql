-- is_admin() checked public.teachers.role = 'admin', but public.teachers has
-- zero rows for every current profile (confirmed by comparing profiles/
-- user_roles/teachers side by side — teachers_role is null for all 19
-- accounts, including the actual admin account). is_admin() has therefore
-- always returned false for everyone, silently breaking every policy that
-- relies on it alone (e.g. students_write_admin_only). teachers looks like a
-- leftover from before the app moved identity/roles to profiles + user_roles;
-- it was never updated to match.
--
-- Point it at the table that's actually populated and matches how the admin
-- account is configured today (profiles.role = 'admin' for the current
-- admin/director account). Same signature, so every existing policy that
-- calls is_admin() picks up the fix automatically — no policy edits needed.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $function$
  select exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.role = 'admin'
  );
$function$;
