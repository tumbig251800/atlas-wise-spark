-- =====================================================================
-- WP1A corrective — nidet_visits top-down RLS
-- =====================================================================
-- The Impact Loop reuses the existing `nidet_visits` table as the supervision
-- record (product decision: supervision is TOP-DOWN — leadership arranges/records
-- it, teachers do not). But nidet_visits was created (20260601091026) with a
-- wide-open policy `USING(true) WITH CHECK(true)` for authenticated, plus an
-- anon-read policy and full anon grants — so today ANY authenticated user (and
-- even anon) can insert/update/delete supervision records. This forward migration
-- replaces that with a top-down model. The original migration is NOT edited (it is
-- already applied in Production); this is a corrective forward migration.
--
-- UI compatibility (verified): teachers only READ their own action items' nidet
-- visits (TeacherActionView / NidetVisitCard); creating/editing visits happens in
-- the director/lead board (ActionTable → NidetVisitModal). So restricting writes to
-- leadership matches existing behaviour and does not break teachers.
--
-- Role model (matches WP1A design):
--   teacher    : SELECT only, and only visits on their OWN action items
--   director/lead/admin : full manage (leadership arranges + records supervision)
--   anon/PUBLIC: no access
-- =====================================================================

-- 1. remove the insecure legacy policies (names from Production metadata)
DROP POLICY IF EXISTS "authenticated users can manage nidet_visits" ON public.nidet_visits;
DROP POLICY IF EXISTS "atlas_mcp_anon_read" ON public.nidet_visits;

-- 2. lock down grants; RLS is already enabled on the table
REVOKE ALL ON public.nidet_visits FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nidet_visits TO authenticated;
ALTER TABLE public.nidet_visits ENABLE ROW LEVEL SECURITY;  -- idempotent safety

-- 3. teacher: read supervision visits on their OWN action items only
DROP POLICY IF EXISTS nidet_visits_teacher_select ON public.nidet_visits;
CREATE POLICY nidet_visits_teacher_select
  ON public.nidet_visits
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.action_plan_items a
      WHERE a.id = nidet_visits.action_item_id
        AND a.teacher_id = (select auth.uid())
    )
  );

-- 4. leadership (director / lead / admin): full manage
DROP POLICY IF EXISTS nidet_visits_leadership_all ON public.nidet_visits;
CREATE POLICY nidet_visits_leadership_all
  ON public.nidet_visits
  FOR ALL TO authenticated
  USING (
    has_role((select auth.uid()), 'director'::app_role)
    OR has_role((select auth.uid()), 'lead'::app_role)
    OR is_admin()
  )
  WITH CHECK (
    has_role((select auth.uid()), 'director'::app_role)
    OR has_role((select auth.uid()), 'lead'::app_role)
    OR is_admin()
  );
