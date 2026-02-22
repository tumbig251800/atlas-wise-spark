ALTER TABLE public.diagnostic_events DROP CONSTRAINT diagnostic_events_intervention_size_check;

ALTER TABLE public.diagnostic_events ADD CONSTRAINT diagnostic_events_intervention_size_check
  CHECK (intervention_size = ANY (ARRAY['individual', 'small-group', 'pivot', 'plan-fail', 'force-pivot']));