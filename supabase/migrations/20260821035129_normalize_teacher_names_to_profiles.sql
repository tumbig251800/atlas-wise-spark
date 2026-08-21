-- ล้างชื่อครูให้เป็นรูปแบบเดียวกันทั้งฐานข้อมูล โดยยึด profiles.full_name เป็นชื่อมาตรฐาน
--
-- ที่มา: 21 ส.ค. 2569 พบครู 9 คนที่ชื่อบันทึกไม่ตรงกันข้ามตาราง เช่น
--   "วรกานต์ ศรีไชยวาล" (teaching_logs) กับ "นางสาววรกานต์ ศรีไชยวาล" (pbl_projects)
--   "ปวีณา  แสงสว่าง" (เว้นวรรค 2 ครั้ง) กับ "ปวีณา แสงสว่าง"
-- ทำให้ logic ที่เทียบชื่อครูข้ามตารางพลาด (ดู migration 20260821033527)
-- แก้ไปทั้งหมด 130 แถวใน teaching_logs / action_plan_items / pbl_projects
--
-- กรณีพิเศษ: "พักตร์เพ็ญ อ้นเก้" ไม่มีระเบียนใน profiles และ action_plan_items
--   สะกดผิดเป็น "อนเก้" (ไม่มีไม้เอก) 34 แถว ผู้อำนวยการยืนยันว่า "อ้นเก้" ถูก
--   จึงใส่ mapping มือไว้ 2 บรรทัด
--
-- ปลอดภัย: ตรวจแล้วว่า action_plan_items.issue_key ใช้ teacher_id (uuid) ไม่ใช่ชื่อ
--   และไม่มี view / function ใดที่ hardcode ชื่อครูไว้ การเปลี่ยนชื่อจึงไม่ทำให้ key เพี้ยน
--   หรือ workflow สร้างรายการซ้ำ
-- ไม่แตะตาราง backup / snapshot (teaching_logs_hc_backup_*, teacher_compliance_snapshot_before)
--
-- idempotent: WHERE ตัดแถวที่ชื่อตรงอยู่แล้วออก รันซ้ำได้โดยไม่เปลี่ยนอะไร
--
-- ⚠️ migration นี้ apply เข้า production แล้วเมื่อ 2026-08-21 ผ่าน Supabase MCP
--    (version 20260821035129 อยู่ใน schema_migrations แล้ว)
--    ชื่อไฟล์ต้องเป็น 20260821035129 เป๊ะ ๆ

-- teaching_logs
WITH canon AS (
  SELECT public.norm_teacher_name(full_name) AS nkey, full_name AS canon_name
  FROM profiles WHERE COALESCE(full_name,'') <> ''
  UNION ALL
  SELECT * FROM (VALUES
    ('พักตร์เพ็ญอนเก้',  'นางสาวพักตร์เพ็ญ อ้นเก้'),
    ('พักตร์เพ็ญอ้นเก้', 'นางสาวพักตร์เพ็ญ อ้นเก้')
  ) v(nkey, canon_name)
)
UPDATE teaching_logs t SET teacher_name = c.canon_name
FROM canon c
WHERE public.norm_teacher_name(t.teacher_name) = c.nkey
  AND COALESCE(t.teacher_name,'') <> '' AND t.teacher_name <> c.canon_name;

-- action_plan_items
WITH canon AS (
  SELECT public.norm_teacher_name(full_name) AS nkey, full_name AS canon_name
  FROM profiles WHERE COALESCE(full_name,'') <> ''
  UNION ALL
  SELECT * FROM (VALUES
    ('พักตร์เพ็ญอนเก้',  'นางสาวพักตร์เพ็ญ อ้นเก้'),
    ('พักตร์เพ็ญอ้นเก้', 'นางสาวพักตร์เพ็ญ อ้นเก้')
  ) v(nkey, canon_name)
)
UPDATE action_plan_items t SET teacher_name = c.canon_name
FROM canon c
WHERE public.norm_teacher_name(t.teacher_name) = c.nkey
  AND COALESCE(t.teacher_name,'') <> '' AND t.teacher_name <> c.canon_name;

-- pbl_projects
WITH canon AS (
  SELECT public.norm_teacher_name(full_name) AS nkey, full_name AS canon_name
  FROM profiles WHERE COALESCE(full_name,'') <> ''
  UNION ALL
  SELECT * FROM (VALUES
    ('พักตร์เพ็ญอนเก้',  'นางสาวพักตร์เพ็ญ อ้นเก้'),
    ('พักตร์เพ็ญอ้นเก้', 'นางสาวพักตร์เพ็ญ อ้นเก้')
  ) v(nkey, canon_name)
)
UPDATE pbl_projects t SET teacher_name = c.canon_name
FROM canon c
WHERE public.norm_teacher_name(t.teacher_name) = c.nkey
  AND COALESCE(t.teacher_name,'') <> '' AND t.teacher_name <> c.canon_name;

-- classroom_research_suggestions
WITH canon AS (
  SELECT public.norm_teacher_name(full_name) AS nkey, full_name AS canon_name
  FROM profiles WHERE COALESCE(full_name,'') <> ''
  UNION ALL
  SELECT * FROM (VALUES
    ('พักตร์เพ็ญอนเก้',  'นางสาวพักตร์เพ็ญ อ้นเก้'),
    ('พักตร์เพ็ญอ้นเก้', 'นางสาวพักตร์เพ็ญ อ้นเก้')
  ) v(nkey, canon_name)
)
UPDATE classroom_research_suggestions t SET teacher_name = c.canon_name
FROM canon c
WHERE public.norm_teacher_name(t.teacher_name) = c.nkey
  AND COALESCE(t.teacher_name,'') <> '' AND t.teacher_name <> c.canon_name;

-- exam_papers
WITH canon AS (
  SELECT public.norm_teacher_name(full_name) AS nkey, full_name AS canon_name
  FROM profiles WHERE COALESCE(full_name,'') <> ''
  UNION ALL
  SELECT * FROM (VALUES
    ('พักตร์เพ็ญอนเก้',  'นางสาวพักตร์เพ็ญ อ้นเก้'),
    ('พักตร์เพ็ญอ้นเก้', 'นางสาวพักตร์เพ็ญ อ้นเก้')
  ) v(nkey, canon_name)
)
UPDATE exam_papers t SET teacher_name = c.canon_name
FROM canon c
WHERE public.norm_teacher_name(t.teacher_name) = c.nkey
  AND COALESCE(t.teacher_name,'') <> '' AND t.teacher_name <> c.canon_name;

-- integrity_audit_log
WITH canon AS (
  SELECT public.norm_teacher_name(full_name) AS nkey, full_name AS canon_name
  FROM profiles WHERE COALESCE(full_name,'') <> ''
  UNION ALL
  SELECT * FROM (VALUES
    ('พักตร์เพ็ญอนเก้',  'นางสาวพักตร์เพ็ญ อ้นเก้'),
    ('พักตร์เพ็ญอ้นเก้', 'นางสาวพักตร์เพ็ญ อ้นเก้')
  ) v(nkey, canon_name)
)
UPDATE integrity_audit_log t SET teacher_name = c.canon_name
FROM canon c
WHERE public.norm_teacher_name(t.teacher_name) = c.nkey
  AND COALESCE(t.teacher_name,'') <> '' AND t.teacher_name <> c.canon_name;
