-- อนุญาต issue_type ใหม่ 2 ค่าใน action_plan_items
--
-- ที่มา: 21 ส.ค. 2569 WF-4 เพิ่มสาขา UnitAssessmentOverdue (ครูไม่ประเมินหลังหน่วยเกิน 45 วัน)
--   และ UnitLowScore (คะแนนหลังหน่วยเฉลี่ยต่ำ) แต่ CHECK เดิมอนุญาตแค่ 6 ค่า
--   ทำให้ INSERT ล้มเหลวทั้ง workflow
--
-- ⚠️ migration นี้ apply เข้า production แล้วเมื่อ 2026-08-21 ผ่าน Supabase MCP
--    (version 20260821012120 อยู่ใน schema_migrations แล้ว)
--    ไฟล์นี้เขียนย้อนหลังเพื่อให้ git ตรงกับสภาพจริงของฐานข้อมูล
--    ชื่อไฟล์ต้องเป็น 20260821012120 เป๊ะ ๆ

ALTER TABLE public.action_plan_items
  DROP CONSTRAINT IF EXISTS action_plan_items_issue_type_check;

ALTER TABLE public.action_plan_items
  ADD CONSTRAINT action_plan_items_issue_type_check
  CHECK (issue_type = ANY (ARRAY[
    'RedZone',
    'MasteryDrop',
    'IntegrityFlag',
    'UnitBlindSpot',
    'FlatScore',
    'TeacherProposed',
    'UnitAssessmentOverdue',
    'UnitLowScore'
  ]::text[]));
