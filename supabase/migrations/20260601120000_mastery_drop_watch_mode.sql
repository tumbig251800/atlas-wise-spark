-- MasteryDrop Watch Mode: add 'watching' status + rolling-average tracking columns.
-- status is a TEXT column guarded by a CHECK constraint (not an enum), so we widen
-- the constraint to allow 'watching' before escalation to 'open' (Action).

ALTER TABLE public.action_plan_items
  DROP CONSTRAINT IF EXISTS action_plan_items_status_check;

ALTER TABLE public.action_plan_items
  ADD CONSTRAINT action_plan_items_status_check
  CHECK (status IN ('open', 'resolved', 'verified', 'dismissed', 'watching'));

-- Rolling-average + watch bookkeeping columns (idempotent).
ALTER TABLE public.action_plan_items
  ADD COLUMN IF NOT EXISTS mastery_avg_recent   numeric(4,2),
  ADD COLUMN IF NOT EXISTS mastery_avg_previous numeric(4,2),
  ADD COLUMN IF NOT EXISTS watch_started_at     timestamptz,
  ADD COLUMN IF NOT EXISTS watch_checked_at     timestamptz;
