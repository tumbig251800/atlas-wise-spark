-- Fix: logs_read_own_or_admin used is_admin() (checks public.teachers) instead of
-- has_role(...,'director') (checks user_roles). Director could only see own 141 logs,
-- causing เทอม 1/2569 and ห้อง 2 to not appear in Executive page dropdowns.
DROP POLICY IF EXISTS "logs_read_own_or_admin" ON public.teaching_logs;

CREATE POLICY "logs_read_own_or_admin" ON public.teaching_logs
  FOR SELECT TO authenticated
  USING (
    (teacher_id = auth.uid())
    OR public.has_role(auth.uid(), 'director'::app_role)
  );
