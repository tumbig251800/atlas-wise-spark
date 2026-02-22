
-- 1A. Add a2-gap to major_gap enum
ALTER TYPE public.major_gap ADD VALUE IF NOT EXISTS 'a2-gap';

-- 1B. Create diagnostic_events table
CREATE TABLE public.diagnostic_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teaching_log_id uuid NOT NULL REFERENCES public.teaching_logs(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL,
  student_id text,
  topic text,
  normalized_topic text,
  grade_level text,
  classroom text,
  subject text,
  status_color text NOT NULL CHECK (status_color IN ('red','orange','yellow','blue','green')),
  status_label text,
  gap_type text,
  priority_level int,
  intervention_size text CHECK (intervention_size IN ('individual','small-group','pivot')),
  threshold_pct numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.diagnostic_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can view own diagnostic events" ON public.diagnostic_events FOR SELECT USING (teacher_id = auth.uid());
CREATE POLICY "Teachers can insert own diagnostic events" ON public.diagnostic_events FOR INSERT WITH CHECK (teacher_id = auth.uid());
CREATE POLICY "Directors can view all diagnostic events" ON public.diagnostic_events FOR SELECT USING (has_role(auth.uid(), 'director'::app_role));

CREATE INDEX idx_diagnostic_teacher_log ON public.diagnostic_events(teacher_id, teaching_log_id);
CREATE INDEX idx_diagnostic_topic ON public.diagnostic_events(normalized_topic, subject, classroom);

-- 1C. Create strike_counter table
CREATE TABLE public.strike_counter (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL,
  scope text NOT NULL CHECK (scope IN ('student','class')),
  scope_id text NOT NULL,
  topic text,
  normalized_topic text,
  subject text,
  gap_type text CHECK (gap_type IN ('k-gap','p-gap','a-gap')),
  strike_count int NOT NULL DEFAULT 0,
  first_strike_at timestamptz,
  last_updated timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','resolved','referred'))
);

ALTER TABLE public.strike_counter ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can view own strikes" ON public.strike_counter FOR SELECT USING (teacher_id = auth.uid());
CREATE POLICY "Teachers can insert own strikes" ON public.strike_counter FOR INSERT WITH CHECK (teacher_id = auth.uid());
CREATE POLICY "Teachers can update own strikes" ON public.strike_counter FOR UPDATE USING (teacher_id = auth.uid());
CREATE POLICY "Directors can view all strikes" ON public.strike_counter FOR SELECT USING (has_role(auth.uid(), 'director'::app_role));

CREATE INDEX idx_strike_scope ON public.strike_counter(teacher_id, scope, scope_id, normalized_topic);

-- 1D. Create remedial_tracking table
CREATE TABLE public.remedial_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL,
  teaching_log_id uuid NOT NULL REFERENCES public.teaching_logs(id) ON DELETE CASCADE,
  student_id text NOT NULL,
  topic text,
  normalized_topic text,
  subject text,
  grade_level text,
  classroom text,
  remedial_status text NOT NULL CHECK (remedial_status IN ('pass','stay')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.remedial_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can view own remedial tracking" ON public.remedial_tracking FOR SELECT USING (teacher_id = auth.uid());
CREATE POLICY "Teachers can insert own remedial tracking" ON public.remedial_tracking FOR INSERT WITH CHECK (teacher_id = auth.uid());
CREATE POLICY "Directors can view all remedial tracking" ON public.remedial_tracking FOR SELECT USING (has_role(auth.uid(), 'director'::app_role));

CREATE INDEX idx_remedial_student ON public.remedial_tracking(teacher_id, student_id, normalized_topic);

-- 1E. Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.diagnostic_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.strike_counter;
