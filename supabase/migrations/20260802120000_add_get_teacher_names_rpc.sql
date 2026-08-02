-- PLC .docx export (src/lib/downloadPlcDocx.ts) needs to resolve teacher_id ->
-- teacher name for plc_sessions.members. It cannot join public.profiles
-- directly from the client: RLS on profiles only allows a user to read their
-- own row ("Users can view own profile") or, if they hold the director role,
-- every row ("Directors can view all profiles") — a regular teacher
-- downloading their own PLC record cannot see their PLC teammates' profiles.
--
-- A SECURITY DEFINER RPC scoped to exactly (user_id, full_name) avoids both
-- alternatives that were rejected: broadening the profiles RLS policy (which
-- would leak every column, not just the name, to every authenticated user)
-- and a service_role edge function (an extra elevated credential + deploy
-- surface). This function exposes nothing beyond what any PLC participant
-- already knows by sitting in the meeting.
CREATE OR REPLACE FUNCTION public.get_teacher_names(teacher_ids UUID[])
RETURNS TABLE (user_id UUID, full_name TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.full_name
  FROM public.profiles p
  WHERE p.user_id = ANY (teacher_ids);
$$;

REVOKE ALL ON FUNCTION public.get_teacher_names(UUID[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_teacher_names(UUID[]) TO authenticated;
