-- 2026 Curriculum: Add 8 capability columns (Basic + Functional Literacy)
-- Keep a1-a6 for backward compatibility during transition

ALTER TABLE public.unit_assessments
  ADD COLUMN IF NOT EXISTS reading_score SMALLINT CHECK (reading_score BETWEEN 1 AND 4),
  ADD COLUMN IF NOT EXISTS writing_score SMALLINT CHECK (writing_score BETWEEN 1 AND 4),
  ADD COLUMN IF NOT EXISTS calculating_score SMALLINT CHECK (calculating_score BETWEEN 1 AND 4),
  ADD COLUMN IF NOT EXISTS sci_tech_score SMALLINT CHECK (sci_tech_score BETWEEN 1 AND 4),
  ADD COLUMN IF NOT EXISTS social_civic_score SMALLINT CHECK (social_civic_score BETWEEN 1 AND 4),
  ADD COLUMN IF NOT EXISTS economy_finance_score SMALLINT CHECK (economy_finance_score BETWEEN 1 AND 4),
  ADD COLUMN IF NOT EXISTS health_score SMALLINT CHECK (health_score BETWEEN 1 AND 4),
  ADD COLUMN IF NOT EXISTS art_culture_score SMALLINT CHECK (art_culture_score BETWEEN 1 AND 4);

CREATE INDEX IF NOT EXISTS idx_unit_assessments_capability_2026
  ON public.unit_assessments(grade_level, classroom, subject, academic_term)
  WHERE reading_score IS NOT NULL;

COMMENT ON COLUMN public.unit_assessments.reading_score IS 'สมรรถนะ 2026: การอ่าน (1-4)';
COMMENT ON COLUMN public.unit_assessments.writing_score IS 'สมรรถนะ 2026: การเขียน (1-4)';
COMMENT ON COLUMN public.unit_assessments.calculating_score IS 'สมรรถนะ 2026: การคิดคำนวณ (1-4)';
COMMENT ON COLUMN public.unit_assessments.sci_tech_score IS 'สมรรถนะ 2026: วิทย์/เทคโนโลยี (1-4)';
COMMENT ON COLUMN public.unit_assessments.social_civic_score IS 'สมรรถนะ 2026: สังคม/พลเมือง (1-4)';
COMMENT ON COLUMN public.unit_assessments.economy_finance_score IS 'สมรรถนะ 2026: เศรษฐกิจ/การเงิน (1-4)';
COMMENT ON COLUMN public.unit_assessments.health_score IS 'สมรรถนะ 2026: สุขภาพ (1-4)';
COMMENT ON COLUMN public.unit_assessments.art_culture_score IS 'สมรรถนะ 2026: ศิลปะ/วัฒนธรรม (1-4)';
