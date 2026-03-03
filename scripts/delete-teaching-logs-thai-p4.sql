-- ลบ teaching_logs ภาษาไทย ป.4 ห้อง 2 (และห้อง2)
-- รันใน Supabase Dashboard → SQL Editor → New query → Paste แล้ว Run

-- 1. ยกเลิกการอ้างอิงใน unit_assessments (ถ้ามี)
UPDATE unit_assessments
SET teaching_log_ref = NULL
WHERE teaching_log_ref IN (
  SELECT id FROM teaching_logs
  WHERE subject = 'ภาษาไทย'
    AND grade_level = 'ป.4'
    AND classroom IN ('2', 'ห้อง2')
);

-- 2. ลบ diagnostic_events ที่อ้างถึง teaching_logs ที่จะลบ
DELETE FROM diagnostic_events
WHERE teaching_log_id IN (
  SELECT id FROM teaching_logs
  WHERE subject = 'ภาษาไทย'
    AND grade_level = 'ป.4'
    AND classroom IN ('2', 'ห้อง2')
);

-- ลบ remedial_tracking ที่อ้างถึง teaching_logs ที่จะลบ
DELETE FROM remedial_tracking
WHERE teaching_log_id IN (
  SELECT id FROM teaching_logs
  WHERE subject = 'ภาษาไทย'
    AND grade_level = 'ป.4'
    AND classroom IN ('2', 'ห้อง2')
);

-- ลบ teaching_logs ภาษาไทย ป.4 ห้อง 2
DELETE FROM teaching_logs
WHERE subject = 'ภาษาไทย'
  AND grade_level = 'ป.4'
  AND classroom IN ('2', 'ห้อง2');
