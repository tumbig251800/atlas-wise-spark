-- Repair: Add teacher_id to diagnostic_events if missing (production schema drift)
-- Run before RLS policy migrations that reference teacher_id

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'diagnostic_events' AND column_name = 'teacher_id'
  ) THEN
    ALTER TABLE public.diagnostic_events ADD COLUMN teacher_id uuid;
    UPDATE public.diagnostic_events de
    SET teacher_id = tl.teacher_id
    FROM public.teaching_logs tl
    WHERE de.teaching_log_id = tl.id;
    -- Orphans: delete if no matching teaching_log (FK should prevent this)
    DELETE FROM public.diagnostic_events WHERE teacher_id IS NULL;
    ALTER TABLE public.diagnostic_events ALTER COLUMN teacher_id SET NOT NULL;
  END IF;
END $$;
