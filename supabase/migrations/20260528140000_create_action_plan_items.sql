CREATE TABLE public.action_plan_items (
  id                 BIGSERIAL PRIMARY KEY,
  issue_key          TEXT NOT NULL UNIQUE,
  issue_type         TEXT NOT NULL CHECK (issue_type IN ('RedZone', 'MasteryDrop', 'IntegrityFlag')),
  severity           TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium')),
  grade_level        TEXT,
  classroom          TEXT,
  subject            TEXT,
  teacher_name       TEXT,
  teacher_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metric_label       TEXT,
  metric_value       NUMERIC,
  detail             TEXT,
  ai_summary         TEXT,
  ai_owner           TEXT,
  ai_priority        TEXT,
  due_date           DATE,
  due_in_days        INTEGER,
  run_date           DATE,
  wf4_logged_at      TIMESTAMPTZ,
  status             TEXT NOT NULL DEFAULT 'open'
                     CHECK (status IN ('open', 'resolved', 'verified', 'dismissed')),
  auto_resolved      BOOLEAN NOT NULL DEFAULT false,
  resolution_note    TEXT,
  resolved_at        TIMESTAMPTZ,
  verified_by        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at        TIMESTAMPTZ,
  calendar_event_id  TEXT,
  calendar_html_link TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ON public.action_plan_items (status);
CREATE INDEX ON public.action_plan_items (issue_type);
CREATE INDEX ON public.action_plan_items (teacher_id);
CREATE INDEX ON public.action_plan_items (due_date);

ALTER TABLE public.action_plan_items ENABLE ROW LEVEL SECURITY;

-- Directors can view and update all action items
CREATE POLICY "Directors can view all action plan items"
  ON public.action_plan_items FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'director'));

CREATE POLICY "Directors can update all action plan items"
  ON public.action_plan_items FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'director'));

-- Teachers can view their own action items (matched via teacher_id FK)
CREATE POLICY "Teachers can view own action plan items"
  ON public.action_plan_items FOR SELECT
  TO authenticated
  USING (teacher_id = auth.uid());

-- No INSERT policy on purpose: n8n inserts via service role only.
