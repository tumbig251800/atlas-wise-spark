-- กันการพิมพ์ปี พ.ศ. ผิดเป็น ค.ศ. (เช่น 2569 -> 1969) ตั้งแต่ตอนบันทึก
--
-- ที่มา: 20 ส.ค. 2569 พบ unit_assessments 28 แถว + unit_assessment_setups 2 แถว
-- ที่มี assessed_date = 1969-06-19 ซึ่งที่ถูกคือ 2026-06-19
-- แถวเสียถูกแก้ด้วย + INTERVAL '57 years' ไปแล้ว
--
-- หมายเหตุ: CHECK ใช้ CURRENT_DATE ไม่ได้เพราะไม่ immutable จึงใช้ช่วงคงที่แทน
--           NULL ผ่านได้ตามปกติของ CHECK
--
-- migration นี้ apply เข้า production แล้วเมื่อ 2026-08-20 (version 20260820034109)
-- ไฟล์นี้เขียนย้อนหลังเพื่อให้ git ตรงกับสภาพจริงของฐานข้อมูล

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_unit_assessments_assessed_date_sane') THEN
    ALTER TABLE public.unit_assessments
      ADD CONSTRAINT chk_unit_assessments_assessed_date_sane
      CHECK (assessed_date BETWEEN DATE '2020-01-01' AND DATE '2100-01-01');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_unit_assessments_competency_date_sane') THEN
    ALTER TABLE public.unit_assessments
      ADD CONSTRAINT chk_unit_assessments_competency_date_sane
      CHECK (competency_assessed_date BETWEEN DATE '2020-01-01' AND DATE '2100-01-01');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_unit_assessment_setups_assessed_date_sane') THEN
    ALTER TABLE public.unit_assessment_setups
      ADD CONSTRAINT chk_unit_assessment_setups_assessed_date_sane
      CHECK (assessed_date BETWEEN DATE '2020-01-01' AND DATE '2100-01-01');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_teaching_logs_teaching_date_sane') THEN
    ALTER TABLE public.teaching_logs
      ADD CONSTRAINT chk_teaching_logs_teaching_date_sane
      CHECK (teaching_date BETWEEN DATE '2020-01-01' AND DATE '2100-01-01');
  END IF;
END $$;
