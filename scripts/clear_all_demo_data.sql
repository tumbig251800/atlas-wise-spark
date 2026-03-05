-- ลบข้อมูล Demo ทั้งหมด ให้แอปโล่งๆ พร้อมทดสอบ
-- รันใน Supabase SQL Editor: https://supabase.com/dashboard/project/ebyelctqcdhjmqujeskx/sql
-- ลำดับสำคัญเพราะ Foreign Key

-- ลบข้อมูลที่อ้างถึง teaching_logs ก่อน (ตาม FK)
DELETE FROM pivot_events;
DELETE FROM strike_counter;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='diagnostic_events') THEN
    DELETE FROM diagnostic_events;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='remedial_tracking') THEN
    DELETE FROM remedial_tracking;
  END IF;
END $$;

-- ลบข้อมูลสมรรถนะ (ก่อน teaching_logs เพราะ unit_assessments.teaching_log_ref อาจอ้างถึง)
DELETE FROM unit_assessments;

-- ลบประวัติการสอน
DELETE FROM teaching_logs;
