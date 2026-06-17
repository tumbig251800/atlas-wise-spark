-- สร้าง unit_assessment_setups จากข้อมูลที่มีใน unit_assessments
-- เพื่อแก้ปัญหาที่ครูโหลดไฟล์แล้วแต่ไม่มี setup records

INSERT INTO unit_assessment_setups (
  teacher_id,
  subject,
  grade_level,
  classroom,
  academic_term,
  unit_name,
  unit_display_name,
  k_total,
  p_total,
  a_total,
  assessed_date
)
SELECT DISTINCT ON (teacher_id, subject, grade_level, classroom, academic_term, unit_name)
  teacher_id,
  subject,
  grade_level,
  classroom,
  academic_term,
  unit_name,
  'หน่วยที่ ' || unit_name as unit_display_name,
  COALESCE(k_total, 0),
  COALESCE(p_total, 0),
  COALESCE(a_total, 0),
  assessed_date
FROM unit_assessments
WHERE NOT EXISTS (
  SELECT 1 FROM unit_assessment_setups s
  WHERE s.teacher_id = unit_assessments.teacher_id
    AND s.subject = unit_assessments.subject
    AND s.grade_level = unit_assessments.grade_level
    AND s.classroom = unit_assessments.classroom
    AND s.academic_term = unit_assessments.academic_term
    AND s.unit_name = unit_assessments.unit_name
)
ORDER BY teacher_id, subject, grade_level, classroom, academic_term, unit_name, created_at;
