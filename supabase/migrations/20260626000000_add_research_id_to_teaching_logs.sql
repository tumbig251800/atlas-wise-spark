-- ผูกบันทึกหลังสอนกับงานวิจัยชั้นเรียน (nullable, ปลอดภัย/ย้อนกลับได้)
-- ครูตั้งค่าตอนกรอกบันทึกหลังสอน เมื่อคาบนั้นเป็นส่วนหนึ่งของงานวิจัยชั้นเรียน
ALTER TABLE teaching_logs
  ADD COLUMN IF NOT EXISTS research_id uuid
  REFERENCES classroom_research_suggestions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_teaching_logs_research_id
  ON teaching_logs(research_id)
  WHERE research_id IS NOT NULL;

COMMENT ON COLUMN teaching_logs.research_id IS
  'ผูกคาบสอนนี้กับงานวิจัยชั้นเรียน (classroom_research_suggestions) — ตั้งโดยครูตอนกรอกบันทึกหลังสอน';
