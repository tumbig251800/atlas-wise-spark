-- Composite index: teacher_id + teaching_date
-- ช่วย: Dashboard, History, Admin (RLS filter + date sort)
CREATE INDEX IF NOT EXISTS idx_logs_teacher_date
ON public.teaching_logs (teacher_id, teaching_date);

-- Composite index: grade_level + classroom + subject + teaching_date DESC
-- ช่วย: Lesson Plan (filter 3 cols + sort date DESC LIMIT 5)
CREATE INDEX IF NOT EXISTS idx_logs_grade_class_subj_date
ON public.teaching_logs (grade_level, classroom, subject, teaching_date DESC);