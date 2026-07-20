-- Sync the issue_type CHECK constraint with what's already live in production.
--
-- Found 2026-07-20: production has open action_plan_items rows with
-- issue_type = 'FlatScore' (teacher scored an entire class identically —
-- "คะแนนนิ่ง"), and the frontend has had full UnitBlindSpot support for a
-- while (grouped queue view, badges, filters). Neither value exists in the
-- tracked constraint from 20260528140000_create_action_plan_items.sql
-- (RedZone/MasteryDrop/IntegrityFlag only) — the constraint on production was
-- widened outside of a committed migration at some point. This is the catch-up.
--
-- The constraint name is looked up dynamically rather than hardcoded, in case
-- whatever widened it in production also renamed it — this makes the
-- migration safe to run regardless of production's current actual state.

DO $$
DECLARE
  con_name text;
BEGIN
  SELECT conname INTO con_name
  FROM pg_constraint
  WHERE conrelid = 'public.action_plan_items'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%issue_type%';

  IF con_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.action_plan_items DROP CONSTRAINT %I', con_name);
  END IF;
END $$;

ALTER TABLE public.action_plan_items
  ADD CONSTRAINT action_plan_items_issue_type_check
  CHECK (issue_type IN ('RedZone', 'MasteryDrop', 'IntegrityFlag', 'UnitBlindSpot', 'FlatScore'));
