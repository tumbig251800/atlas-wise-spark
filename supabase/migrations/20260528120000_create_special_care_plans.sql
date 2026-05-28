CREATE TABLE public.student_support_plans (
  id              BIGSERIAL PRIMARY KEY,
  student_id      TEXT NOT NULL,
  teacher_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  source_log_id   UUID REFERENCES public.teaching_logs(id) ON DELETE SET NULL,
  gap_type        TEXT NOT NULL CHECK (gap_type IN ('a-gap', 'a2-gap')),
  concern         TEXT,
  care_plan       TEXT,
  follow_up_date  DATE,
  status          TEXT NOT NULL DEFAULT 'open'
                  CHECK (status IN ('open', 'in_progress', 'resolved', 'escalated')),
  resolved_note   TEXT,
  resolved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ON public.student_support_plans (student_id);
CREATE INDEX ON public.student_support_plans (teacher_id);
CREATE INDEX ON public.student_support_plans (status);
CREATE INDEX ON public.student_support_plans (source_log_id);

ALTER TABLE public.student_support_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can view own student support plans"
  ON public.student_support_plans FOR SELECT
  TO authenticated
  USING (teacher_id = auth.uid());

CREATE POLICY "Teachers can insert own student support plans"
  ON public.student_support_plans FOR INSERT
  TO authenticated
  WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "Teachers can update own student support plans"
  ON public.student_support_plans FOR UPDATE
  TO authenticated
  USING (teacher_id = auth.uid());

CREATE POLICY "Directors can view all student support plans"
  ON public.student_support_plans FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'director'));
