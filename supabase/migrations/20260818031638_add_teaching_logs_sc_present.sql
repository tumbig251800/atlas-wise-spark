-- แยกความหมาย Special Care ออกจาก health_care_status
--
-- เดิม teaching_logs.health_care_status ถูกใช้ปนกันสองความหมาย
--   (1) "มีนักเรียนไม่สบาย"  (2) "มีนักเรียน Special Care อยู่ในคาบ"
-- migration นี้เพิ่มคอลัมน์ sc_present แยกความหมาย (2) ออกมาชัดเจน
-- และเลิกใช้คำว่า "ไม่สบาย" ในหน้าจอบันทึกหลังสอน
--
-- ⚠️ migration นี้ apply เข้า production แล้วเมื่อ 2026-08-18
--    (version 20260818031638 อยู่ใน schema_migrations แล้ว)
--    แต่ไม่เคยมีไฟล์ใน git — ไฟล์นี้เขียนย้อนหลังเพื่อปิดช่องว่าง
--
--    ความเสี่ยงถ้าไม่มีไฟล์นี้: โค้ดบน main (src/pages/TeachingLog.tsx)
--    insert ค่า sc_present ทุกครั้งที่ครูบันทึกหลังสอน ถ้าสร้าง environment
--    ใหม่หรือ db reset โดยไม่มี migration นี้ คอลัมน์จะไม่ถูกสร้าง
--    → ครูบันทึกหลังสอนไม่ได้เลย
--
-- หมายเหตุเรื่องข้อมูลเดิม: ตอน apply ไม่ได้ backfill
--   ณ 2026-08-20 มี 305 แถวที่ health_care_status = true แต่ sc_present = false
--   (แถวก่อน 18 ส.ค. ทั้งหมด) จงใจไม่ backfill ในไฟล์นี้เพื่อให้ตรงกับ prod
--   ถ้าภายหลังตัดสินใจว่าควร backfill ให้ทำเป็น migration ตัวใหม่แยกต่างหาก

ALTER TABLE public.teaching_logs
  ADD COLUMN IF NOT EXISTS sc_present boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.teaching_logs.sc_present IS
  'มีนักเรียน Special Care อยู่ในคาบนี้หรือไม่ — แยกจาก health_care_status ที่เดิมใช้ปนกับความหมาย "ไม่สบาย"';
