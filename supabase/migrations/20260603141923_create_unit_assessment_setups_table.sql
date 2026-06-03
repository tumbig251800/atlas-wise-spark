-- Unit assessment setup table (source of truth for K/P/A blueprint per unit)
-- One row per unit per classroom

CREATE TABLE IF NOT EXISTS public.unit_assessment_setups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  grade_level TEXT NOT NULL,
  classroom TEXT NOT NULL,
  academic_term TEXT NOT NULL,
  unit_name TEXT NOT NULL,              -- e.g., "หน่วย 1", "หน่วย 2"
  unit_display_name TEXT,               -- e.g., "การบวกเลขสองหลัก"
  assessed_date DATE,
  k_total NUMERIC NOT NULL DEFAULT 0 CHECK (k_total >= 0),
  p_total NUMERIC NOT NULL DEFAULT 0 CHECK (p_total >= 0),
  a_total NUMERIC NOT NULL DEFAULT 0 CHECK (a_total >= 0),
  total_score NUMERIC GENERATED ALWAYS AS (
    COALESCE(k_total, 0) + COALESCE(p_total, 0) + COALESCE(a_total, 0)
  ) STORED,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Unique constraint: one setup per unit per classroom
  CONSTRAINT unit_assessment_setups_unique
    UNIQUE (teacher_id, subject, grade_level, classroom, academic_term, unit_name)
);

-- RLS
ALTER TABLE public.unit_assessment_setups ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (idempotent)
DROP POLICY IF EXISTS unit_assessment_setups_select ON public.unit_assessment_setups;
DROP POLICY IF EXISTS unit_assessment_setups_insert ON public.unit_assessment_setups;
DROP POLICY IF EXISTS unit_assessment_setups_update ON public.unit_assessment_setups;
DROP POLICY IF EXISTS unit_assessment_setups_delete ON public.unit_assessment_setups;

CREATE POLICY unit_assessment_setups_select ON public.unit_assessment_setups
  FOR SELECT USING (teacher_id = auth.uid());

CREATE POLICY unit_assessment_setups_insert ON public.unit_assessment_setups
  FOR INSERT WITH CHECK (teacher_id = auth.uid());

CREATE POLICY unit_assessment_setups_update ON public.unit_assessment_setups
  FOR UPDATE USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

CREATE POLICY unit_assessment_setups_delete ON public.unit_assessment_setups
  FOR DELETE USING (teacher_id = auth.uid());

-- Index for fast lookup (covers grade_level for roster filtering)
CREATE INDEX IF NOT EXISTS idx_unit_assessment_setups_lookup
  ON public.unit_assessment_setups(teacher_id, subject, grade_level, classroom, academic_term);

-- Trigger for updated_at (reuse existing function, idempotent)
DROP TRIGGER IF EXISTS update_unit_assessment_setups_updated_at
  ON public.unit_assessment_setups;

CREATE TRIGGER update_unit_assessment_setups_updated_at
  BEFORE UPDATE ON public.unit_assessment_setups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Comments
COMMENT ON TABLE public.unit_assessment_setups IS 'Unit assessment blueprints (K/P/A totals, test date) - source of truth per unit';
COMMENT ON COLUMN public.unit_assessment_setups.unit_name IS 'e.g., "หน่วย 1", "หน่วย 2"';
COMMENT ON COLUMN public.unit_assessment_setups.unit_display_name IS 'e.g., "การบวกเลขสองหลัก"';
COMMENT ON COLUMN public.unit_assessment_setups.total_score IS 'Auto-calculated: k_total + p_total + a_total (generated column)';
