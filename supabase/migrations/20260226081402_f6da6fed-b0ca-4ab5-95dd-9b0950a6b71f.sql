-- Conditional: only create policy if table exists (handles production schema drift)

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'diagnostic_events') THEN
    DROP POLICY IF EXISTS "Teachers can delete own diagnostic events" ON public.diagnostic_events;
    CREATE POLICY "Teachers can delete own diagnostic events" ON public.diagnostic_events FOR DELETE
      USING (teacher_id = auth.uid());
    DROP POLICY IF EXISTS "Directors can delete all diagnostic events" ON public.diagnostic_events;
    CREATE POLICY "Directors can delete all diagnostic events" ON public.diagnostic_events FOR DELETE
      USING (has_role(auth.uid(), 'director'::app_role));
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'remedial_tracking') THEN
    DROP POLICY IF EXISTS "Teachers can delete own remedial tracking" ON public.remedial_tracking;
    CREATE POLICY "Teachers can delete own remedial tracking" ON public.remedial_tracking FOR DELETE
      USING (teacher_id = auth.uid());
    DROP POLICY IF EXISTS "Directors can delete all remedial tracking" ON public.remedial_tracking;
    CREATE POLICY "Directors can delete all remedial tracking" ON public.remedial_tracking FOR DELETE
      USING (has_role(auth.uid(), 'director'::app_role));
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'strike_counter') THEN
    DROP POLICY IF EXISTS "Teachers can delete own strikes" ON public.strike_counter;
    CREATE POLICY "Teachers can delete own strikes" ON public.strike_counter FOR DELETE
      USING (teacher_id = auth.uid());
    DROP POLICY IF EXISTS "Directors can delete all strikes" ON public.strike_counter;
    CREATE POLICY "Directors can delete all strikes" ON public.strike_counter FOR DELETE
      USING (has_role(auth.uid(), 'director'::app_role));
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'pivot_events') THEN
    DROP POLICY IF EXISTS "Teachers can delete own pivot events" ON public.pivot_events;
    CREATE POLICY "Teachers can delete own pivot events" ON public.pivot_events FOR DELETE
      USING (teacher_id = auth.uid());
    DROP POLICY IF EXISTS "Directors can delete all pivot events" ON public.pivot_events;
    CREATE POLICY "Directors can delete all pivot events" ON public.pivot_events FOR DELETE
      USING (has_role(auth.uid(), 'director'::app_role));
  END IF;
END $$;
