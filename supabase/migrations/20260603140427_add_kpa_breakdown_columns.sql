-- Add K/P/A breakdown columns to unit_assessments (nullable for backward compatibility)
-- Uses select-then-update/insert pattern (no UNIQUE INDEX needed)

ALTER TABLE public.unit_assessments
  ADD COLUMN IF NOT EXISTS k_score NUMERIC,
  ADD COLUMN IF NOT EXISTS k_total NUMERIC,
  ADD COLUMN IF NOT EXISTS p_score NUMERIC,
  ADD COLUMN IF NOT EXISTS p_total NUMERIC,
  ADD COLUMN IF NOT EXISTS a_score NUMERIC,
  ADD COLUMN IF NOT EXISTS a_total NUMERIC;

-- Add CHECK constraints (only if not exists - use DO block for idempotency)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'k_score_valid' AND conrelid = 'public.unit_assessments'::regclass
  ) THEN
    ALTER TABLE public.unit_assessments
      ADD CONSTRAINT k_score_valid
      CHECK (k_score IS NULL OR (k_score >= 0 AND k_score <= COALESCE(k_total, k_score)));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'p_score_valid' AND conrelid = 'public.unit_assessments'::regclass
  ) THEN
    ALTER TABLE public.unit_assessments
      ADD CONSTRAINT p_score_valid
      CHECK (p_score IS NULL OR (p_score >= 0 AND p_score <= COALESCE(p_total, p_score)));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'a_score_valid' AND conrelid = 'public.unit_assessments'::regclass
  ) THEN
    ALTER TABLE public.unit_assessments
      ADD CONSTRAINT a_score_valid
      CHECK (a_score IS NULL OR (a_score >= 0 AND a_score <= COALESCE(a_total, a_score)));
  END IF;
END $$;

-- Index for KPA queries (partial index for performance)
CREATE INDEX IF NOT EXISTS idx_unit_assessments_kpa
  ON public.unit_assessments(teacher_id, subject, academic_term)
  WHERE k_score IS NOT NULL;

-- Comments
COMMENT ON COLUMN public.unit_assessments.k_score IS 'คะแนนความรู้ (Knowledge)';
COMMENT ON COLUMN public.unit_assessments.k_total IS 'คะแนนเต็มความรู้';
COMMENT ON COLUMN public.unit_assessments.p_score IS 'คะแนนปฏิบัติ (Practice)';
COMMENT ON COLUMN public.unit_assessments.p_total IS 'คะแนนเต็มปฏิบัติ';
COMMENT ON COLUMN public.unit_assessments.a_score IS 'คะแนนนำไปใช้ (Application)';
COMMENT ON COLUMN public.unit_assessments.a_total IS 'คะแนนเต็มนำไปใช้';
