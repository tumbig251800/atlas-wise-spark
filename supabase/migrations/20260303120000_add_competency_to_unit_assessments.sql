-- Phase D Stage 1: Add competency columns (A1-A6) to unit_assessments
-- Run in Supabase SQL Editor (atlas_prod) or: supabase db push

ALTER TABLE public.unit_assessments
  ADD COLUMN IF NOT EXISTS a1_score SMALLINT CHECK (a1_score BETWEEN 1 AND 4),
  ADD COLUMN IF NOT EXISTS a2_score SMALLINT CHECK (a2_score BETWEEN 1 AND 4),
  ADD COLUMN IF NOT EXISTS a3_score SMALLINT CHECK (a3_score BETWEEN 1 AND 4),
  ADD COLUMN IF NOT EXISTS a4_score SMALLINT CHECK (a4_score BETWEEN 1 AND 4),
  ADD COLUMN IF NOT EXISTS a5_score SMALLINT CHECK (a5_score BETWEEN 1 AND 4),
  ADD COLUMN IF NOT EXISTS a6_score SMALLINT CHECK (a6_score BETWEEN 1 AND 4),
  ADD COLUMN IF NOT EXISTS competency_note TEXT,
  ADD COLUMN IF NOT EXISTS assessed_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS competency_assessed_date DATE;

CREATE INDEX IF NOT EXISTS idx_unit_assessments_competency
  ON public.unit_assessments(grade_level, classroom, subject, academic_term)
  WHERE a1_score IS NOT NULL;

COMMENT ON COLUMN public.unit_assessments.a1_score IS 'สมรรถนะ A1: การจัดการตนเอง (1-4)';
COMMENT ON COLUMN public.unit_assessments.a2_score IS 'สมรรถนะ A2: การคิดขั้นสูง (1-4)';
COMMENT ON COLUMN public.unit_assessments.a3_score IS 'สมรรถนะ A3: การสื่อสาร (1-4)';
COMMENT ON COLUMN public.unit_assessments.a4_score IS 'สมรรถนะ A4: การรวมพลังทำงานเป็นทีม (1-4)';
COMMENT ON COLUMN public.unit_assessments.a5_score IS 'สมรรถนะ A5: การเป็นพลเมืองที่เข้มแข็ง (1-4)';
COMMENT ON COLUMN public.unit_assessments.a6_score IS 'สมรรถนะ A6: การอยู่ร่วมกับธรรมชาติและวิทยาการ (1-4)';
