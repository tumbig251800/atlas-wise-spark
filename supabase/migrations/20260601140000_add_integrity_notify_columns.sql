-- IntegrityFlag resolution (FLAG1-4, FLAG6): teacher-notification bookkeeping.
-- These flags are data-entry issues — the teacher just needs to fix their record,
-- so we track *how/when* they were told instead of running a supervision visit.
ALTER TABLE public.action_plan_items
  ADD COLUMN IF NOT EXISTS notify_channel text,
  ADD COLUMN IF NOT EXISTS notify_date    date,
  ADD COLUMN IF NOT EXISTS notify_note    text;
