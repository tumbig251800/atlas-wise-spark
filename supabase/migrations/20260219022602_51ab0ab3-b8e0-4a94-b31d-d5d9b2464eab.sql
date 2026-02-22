ALTER TABLE public.diagnostic_events
  ADD COLUMN IF NOT EXISTS decision_object jsonb NULL;

CREATE INDEX IF NOT EXISTS idx_diagnostic_teaching_log_id
  ON public.diagnostic_events (teaching_log_id);

NOTIFY pgrst, 'reload schema';