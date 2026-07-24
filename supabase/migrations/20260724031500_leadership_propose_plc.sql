-- =====================================================================
-- WP1A  leadership_propose_plc
-- Let leadership (director / lead / admin) OPEN a teacher-proposed PLC case
-- ON BEHALF OF a teacher — the admin picks the teacher, and teacher_id is set
-- to that teacher. Complements action_plan_items_teacher_propose_insert
-- (teachers open their own). Multiple INSERT policies are OR'd (permissive),
-- so either the teacher-self policy OR this leadership policy can grant.
-- Forward-only.
-- =====================================================================

DROP POLICY IF EXISTS action_plan_items_leadership_propose_insert ON public.action_plan_items;
CREATE POLICY action_plan_items_leadership_propose_insert
  ON public.action_plan_items
  FOR INSERT TO authenticated
  WITH CHECK (
    issue_type = 'TeacherProposed'
    AND (
      has_role((select auth.uid()), 'director'::app_role)
      OR has_role((select auth.uid()), 'lead'::app_role)
      OR is_admin()
    )
  );
