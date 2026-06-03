-- Add columns to existing students table for unit score roster management
-- students table exists but is empty (verified), safe to alter

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS student_id TEXT;

-- Add comments
COMMENT ON COLUMN public.students.student_id IS 'รหัสนักเรียนจากไฟล์ Excel (ต่างจาก student_code ที่อาจมีอยู่แล้ว)';
COMMENT ON COLUMN public.students.teacher_id IS 'ครูเจ้าของบัญชีรายชื่อ (added for unit score grid)';

-- Create composite unique index (prevent duplicate students per teacher/classroom)
CREATE UNIQUE INDEX IF NOT EXISTS idx_students_unique_roster
  ON public.students(teacher_id, student_id, grade_level, classroom)
  WHERE teacher_id IS NOT NULL AND student_id IS NOT NULL;

-- RLS policies (idempotent - drop existing first)
-- Note: No OR teacher_id IS NULL - app layer must set teacher_id on all inserts
DROP POLICY IF EXISTS students_teacher_rls ON public.students;
DROP POLICY IF EXISTS students_select ON public.students;
DROP POLICY IF EXISTS students_insert ON public.students;
DROP POLICY IF EXISTS students_update ON public.students;
DROP POLICY IF EXISTS students_delete ON public.students;

CREATE POLICY students_select ON public.students
  FOR SELECT USING (teacher_id = auth.uid());

CREATE POLICY students_insert ON public.students
  FOR INSERT WITH CHECK (teacher_id = auth.uid());

CREATE POLICY students_update ON public.students
  FOR UPDATE USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

CREATE POLICY students_delete ON public.students
  FOR DELETE USING (teacher_id = auth.uid());

-- Index for fast roster lookup
CREATE INDEX IF NOT EXISTS idx_students_teacher_classroom
  ON public.students(teacher_id, grade_level, classroom)
  WHERE teacher_id IS NOT NULL;
