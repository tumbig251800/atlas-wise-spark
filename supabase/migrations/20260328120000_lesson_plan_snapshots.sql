-- Persisted Snapshot-mode context for lesson plan (per user). Phase 4.

CREATE TABLE public.lesson_plan_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  label text,
  grade_level text NOT NULL DEFAULT '',
  classroom text NOT NULL DEFAULT '',
  subject text NOT NULL DEFAULT '',
  snapshot_class_profile text NOT NULL DEFAULT '',
  snapshot_focus text NOT NULL DEFAULT '',
  snapshot_notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX lesson_plan_snapshots_user_updated_idx
  ON public.lesson_plan_snapshots (user_id, updated_at DESC);

ALTER TABLE public.lesson_plan_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lesson_plan_snapshots_select_own"
  ON public.lesson_plan_snapshots FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "lesson_plan_snapshots_insert_own"
  ON public.lesson_plan_snapshots FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "lesson_plan_snapshots_update_own"
  ON public.lesson_plan_snapshots FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "lesson_plan_snapshots_delete_own"
  ON public.lesson_plan_snapshots FOR DELETE
  USING (user_id = auth.uid());

CREATE POLICY "lesson_plan_snapshots_select_director"
  ON public.lesson_plan_snapshots FOR SELECT
  USING (public.has_role(auth.uid(), 'director'::app_role));

CREATE POLICY "lesson_plan_snapshots_insert_director"
  ON public.lesson_plan_snapshots FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'director'::app_role));

CREATE POLICY "lesson_plan_snapshots_update_director"
  ON public.lesson_plan_snapshots FOR UPDATE
  USING (public.has_role(auth.uid(), 'director'::app_role));

CREATE POLICY "lesson_plan_snapshots_delete_director"
  ON public.lesson_plan_snapshots FOR DELETE
  USING (public.has_role(auth.uid(), 'director'::app_role));

-- Idempotent: remote DBs may not have applied earlier migrations that defined this helper.
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_lesson_plan_snapshots_updated_at
  BEFORE UPDATE ON public.lesson_plan_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
