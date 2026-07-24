-- =====================================================================
-- WP1A  teacher_proposed_plc
-- Teachers can OPEN their own PLC case (bottom-up), not only system-detected
-- ones. Leadership co-considers/analyses via the existing board (no hard gate).
-- Forward-only; existing rows keep their current issue_type.
-- =====================================================================

-- 1) allow the new issue_type value on action_plan_items
ALTER TABLE public.action_plan_items DROP CONSTRAINT IF EXISTS action_plan_items_issue_type_check;
ALTER TABLE public.action_plan_items ADD CONSTRAINT action_plan_items_issue_type_check
  CHECK (issue_type = ANY (ARRAY[
    'RedZone'::text, 'MasteryDrop'::text, 'IntegrityFlag'::text,
    'UnitBlindSpot'::text, 'FlatScore'::text, 'TeacherProposed'::text
  ]));

-- 2) teacher may INSERT ONLY their own teacher-proposed cases (RLS already enabled
--    on action_plan_items). Cannot spoof a system issue_type, cannot open a case
--    owned by someone else. (Reads/updates keep the existing policies.)
DROP POLICY IF EXISTS action_plan_items_teacher_propose_insert ON public.action_plan_items;
CREATE POLICY action_plan_items_teacher_propose_insert
  ON public.action_plan_items
  FOR INSERT TO authenticated
  WITH CHECK (
    teacher_id = (select auth.uid())
    AND issue_type = 'TeacherProposed'
  );

-- 3) ensure authenticated can use the id sequence when inserting (idempotent)
GRANT USAGE, SELECT ON SEQUENCE public.action_plan_items_id_seq TO authenticated;
