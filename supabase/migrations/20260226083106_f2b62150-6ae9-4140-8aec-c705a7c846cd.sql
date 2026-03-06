-- Director INSERT/UPDATE/DELETE policies — conditional (handles production schema drift)

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'teaching_logs') THEN
    DROP POLICY IF EXISTS "Directors can insert logs for any teacher" ON public.teaching_logs;
    CREATE POLICY "Directors can insert logs for any teacher" ON public.teaching_logs FOR INSERT TO authenticated
      WITH CHECK (has_role(auth.uid(), 'director'::app_role));
    DROP POLICY IF EXISTS "Directors can delete all logs" ON public.teaching_logs;
    CREATE POLICY "Directors can delete all logs" ON public.teaching_logs FOR DELETE TO authenticated
      USING (has_role(auth.uid(), 'director'::app_role));
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'diagnostic_events') THEN
    DROP POLICY IF EXISTS "Directors can insert diagnostic events for any teacher" ON public.diagnostic_events;
    CREATE POLICY "Directors can insert diagnostic events for any teacher" ON public.diagnostic_events FOR INSERT TO authenticated
      WITH CHECK (has_role(auth.uid(), 'director'::app_role));
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'remedial_tracking') THEN
    DROP POLICY IF EXISTS "Directors can insert remedial tracking for any teacher" ON public.remedial_tracking;
    CREATE POLICY "Directors can insert remedial tracking for any teacher" ON public.remedial_tracking FOR INSERT TO authenticated
      WITH CHECK (has_role(auth.uid(), 'director'::app_role));
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'strike_counter') THEN
    DROP POLICY IF EXISTS "Directors can insert strikes for any teacher" ON public.strike_counter;
    CREATE POLICY "Directors can insert strikes for any teacher" ON public.strike_counter FOR INSERT TO authenticated
      WITH CHECK (has_role(auth.uid(), 'director'::app_role));
    DROP POLICY IF EXISTS "Directors can update strikes for any teacher" ON public.strike_counter;
    CREATE POLICY "Directors can update strikes for any teacher" ON public.strike_counter FOR UPDATE TO authenticated
      USING (has_role(auth.uid(), 'director'::app_role));
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'pivot_events') THEN
    DROP POLICY IF EXISTS "Directors can insert pivot events for any teacher" ON public.pivot_events;
    CREATE POLICY "Directors can insert pivot events for any teacher" ON public.pivot_events FOR INSERT TO authenticated
      WITH CHECK (has_role(auth.uid(), 'director'::app_role));
  END IF;
END $$;
