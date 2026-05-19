-- Repair schema drift on diagnostic_events + strike_counter so the
-- atlas-diagnostic edge function can persist rows. Live DB diverged
-- from the original create-table migration (likely manual edit via
-- Supabase dashboard), leaving the code's INSERT calls rejected on
-- unknown columns and type mismatches. Both tables were empty at the
-- time of this migration so no backfill was required.

-- ============================================================
-- 1. diagnostic_events: bring schema in line with original spec
-- ============================================================

-- 1A. Replace student_id (uuid → text) — code passes "ป.5/1-12" style ids
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='diagnostic_events'
      AND column_name='student_id' AND data_type='uuid'
  ) THEN
    ALTER TABLE public.diagnostic_events DROP COLUMN student_id;
    ALTER TABLE public.diagnostic_events ADD COLUMN student_id text;
  END IF;
END $$;

-- 1B. Replace intervention_size (integer → text with check)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='diagnostic_events'
      AND column_name='intervention_size' AND data_type='integer'
  ) THEN
    ALTER TABLE public.diagnostic_events DROP COLUMN intervention_size;
    ALTER TABLE public.diagnostic_events ADD COLUMN intervention_size text;
    ALTER TABLE public.diagnostic_events ADD CONSTRAINT diagnostic_events_intervention_size_check
      CHECK (intervention_size IS NULL OR intervention_size IN ('individual','small-group','pivot','plan-fail','force-pivot'));
  END IF;
END $$;

-- 1C. Add missing rich-metadata columns referenced by code
ALTER TABLE public.diagnostic_events
  ADD COLUMN IF NOT EXISTS topic text,
  ADD COLUMN IF NOT EXISTS normalized_topic text,
  ADD COLUMN IF NOT EXISTS grade_level text,
  ADD COLUMN IF NOT EXISTS classroom text,
  ADD COLUMN IF NOT EXISTS subject text,
  ADD COLUMN IF NOT EXISTS status_color text,
  ADD COLUMN IF NOT EXISTS status_label text,
  ADD COLUMN IF NOT EXISTS gap_type text,
  ADD COLUMN IF NOT EXISTS priority_level int,
  ADD COLUMN IF NOT EXISTS threshold_pct numeric;

-- 1D. status_color check (idempotent)
DO $$
BEGIN
  ALTER TABLE public.diagnostic_events
    ADD CONSTRAINT diagnostic_events_status_color_check
    CHECK (status_color IS NULL OR status_color IN ('red','orange','yellow','blue','green'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 1E. Indexes referenced by code's filtering pattern
CREATE INDEX IF NOT EXISTS idx_diagnostic_teacher_log
  ON public.diagnostic_events(teacher_id, teaching_log_id);
CREATE INDEX IF NOT EXISTS idx_diagnostic_topic
  ON public.diagnostic_events(normalized_topic, subject, classroom);

-- ============================================================
-- 2. strike_counter: add scope/scope_id pattern used by code
-- ============================================================

ALTER TABLE public.strike_counter
  ADD COLUMN IF NOT EXISTS scope text,
  ADD COLUMN IF NOT EXISTS scope_id text,
  ADD COLUMN IF NOT EXISTS normalized_topic text,
  ADD COLUMN IF NOT EXISTS gap_type text,
  ADD COLUMN IF NOT EXISTS first_strike_at timestamptz,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS last_session_id uuid;

-- Relax legacy NOT NULL constraints from an earlier schema variant — the
-- canonical identifier is now scope + scope_id, so student_id /
-- grade_level / classroom are no longer populated by the edge function.
ALTER TABLE public.strike_counter ALTER COLUMN student_id DROP NOT NULL;
ALTER TABLE public.strike_counter ALTER COLUMN grade_level DROP NOT NULL;
ALTER TABLE public.strike_counter ALTER COLUMN classroom DROP NOT NULL;

DO $$
BEGIN
  ALTER TABLE public.strike_counter
    ADD CONSTRAINT strike_counter_scope_check
    CHECK (scope IS NULL OR scope IN ('student','class'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.strike_counter
    ADD CONSTRAINT strike_counter_status_check
    CHECK (status IN ('active','resolved','referred'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.strike_counter
    ADD CONSTRAINT strike_counter_gap_type_check
    CHECK (gap_type IS NULL OR gap_type IN ('k-gap','p-gap','a-gap'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_strike_scope
  ON public.strike_counter(teacher_id, scope, scope_id, normalized_topic);
