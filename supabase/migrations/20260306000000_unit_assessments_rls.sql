-- Phase 5: RLS Policy for unit_assessments
-- Teacher: view/insert/update/delete only own rows (teacher_id = auth.uid())
-- Director: view all, insert/update for any teacher
-- Run after User Testing when ready

ALTER TABLE public.unit_assessments ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if any (e.g. USING(true) from older setup)
DROP POLICY IF EXISTS "unit_assessments_public" ON public.unit_assessments;
DROP POLICY IF EXISTS "unit_assessments_select_all" ON public.unit_assessments;

-- Teachers: view own assessments
CREATE POLICY "Teachers can view own unit_assessments"
  ON public.unit_assessments FOR SELECT
  USING (teacher_id = auth.uid());

-- Teachers: insert own assessments
CREATE POLICY "Teachers can insert own unit_assessments"
  ON public.unit_assessments FOR INSERT
  WITH CHECK (teacher_id = auth.uid());

-- Teachers: update own assessments
CREATE POLICY "Teachers can update own unit_assessments"
  ON public.unit_assessments FOR UPDATE
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

-- Teachers: delete own assessments
CREATE POLICY "Teachers can delete own unit_assessments"
  ON public.unit_assessments FOR DELETE
  USING (teacher_id = auth.uid());

-- Directors: view all
CREATE POLICY "Directors can view all unit_assessments"
  ON public.unit_assessments FOR SELECT
  USING (public.has_role(auth.uid(), 'director'::app_role));

-- Directors: insert/update for any teacher (for admin/reassign scenarios)
CREATE POLICY "Directors can insert unit_assessments"
  ON public.unit_assessments FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'director'::app_role));

CREATE POLICY "Directors can update unit_assessments"
  ON public.unit_assessments FOR UPDATE
  USING (public.has_role(auth.uid(), 'director'::app_role));

CREATE POLICY "Directors can delete unit_assessments"
  ON public.unit_assessments FOR DELETE
  USING (public.has_role(auth.uid(), 'director'::app_role));
