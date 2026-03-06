-- Director UPDATE policies — conditional (handles production schema drift)

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'teaching_logs') THEN
    DROP POLICY IF EXISTS "Directors can update all logs" ON public.teaching_logs;
    CREATE POLICY "Directors can update all logs" ON public.teaching_logs FOR UPDATE
      USING (has_role(auth.uid(), 'director'::app_role));
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'diagnostic_events') THEN
    DROP POLICY IF EXISTS "Directors can update all diagnostic events" ON public.diagnostic_events;
    CREATE POLICY "Directors can update all diagnostic events" ON public.diagnostic_events FOR UPDATE
      USING (has_role(auth.uid(), 'director'::app_role));
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'remedial_tracking') THEN
    DROP POLICY IF EXISTS "Directors can update all remedial tracking" ON public.remedial_tracking;
    CREATE POLICY "Directors can update all remedial tracking" ON public.remedial_tracking FOR UPDATE
      USING (has_role(auth.uid(), 'director'::app_role));
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'pivot_events') THEN
    DROP POLICY IF EXISTS "Directors can update all pivot events" ON public.pivot_events;
    CREATE POLICY "Directors can update all pivot events" ON public.pivot_events FOR UPDATE
      USING (has_role(auth.uid(), 'director'::app_role));
  END IF;
END $$;
