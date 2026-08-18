-- Same gap as action_item_students (20260805080000): intervention_plans has
-- SELECT/UPDATE for lead ('lead'::app_role OR is_admin()) and SELECT for
-- director, but no INSERT for either — only the owning teacher can create
-- one (intervention_plans_owner_insert). useImpactLoop.ts's startMonitoring()
-- get-or-creates this row, so an admin/lead/director starting monitoring on
-- a case that isn't their own classroom hits "new row violates row-level
-- security policy for table intervention_plans".
--
-- Includes all three oversight checks (lead, director, is_admin()) rather
-- than picking one, since this project currently has three independent role
-- stores (profiles.role, user_roles via has_role(), teachers.role via
-- is_admin()) that aren't guaranteed to agree for a given account — see
-- pending task to reconcile them. Matching this file's existing mixed
-- convention (intervention_plans_lead_select/_update already OR has_role()
-- with is_admin()) rather than introducing a fourth pattern.
CREATE POLICY intervention_plans_lead_director_insert
  ON public.intervention_plans FOR INSERT TO authenticated
  WITH CHECK (
    created_by = (select auth.uid())
    AND (
      has_role((select auth.uid()), 'lead'::app_role)
      OR has_role((select auth.uid()), 'director'::app_role)
      OR is_admin()
    )
  );
