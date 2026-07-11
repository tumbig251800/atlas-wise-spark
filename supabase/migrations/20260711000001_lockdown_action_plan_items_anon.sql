-- ปิดช่อง anon เขียน action_plan_items
-- เดิมมี policy "Anon can insert action plan items" (with_check true) → คนไม่ login สแปม insert ได้
-- สืบแล้ว: insert จริงมีจุดเดียว = edge fn atlas-mastery-watch ใช้ service_role (ไม่ต้องพึ่ง anon)
--          frontend ไม่ insert เลย (มีแค่ select+update), atlas-plc-planner แค่ select
-- แก้: ลบ policy anon insert + revoke insert/update/delete ของ anon
--      คง SELECT ของ anon ไว้ (policy atlas_mcp_anon_read — Atlas MCP connector ใช้อ่าน)

drop policy if exists "Anon can insert action plan items" on public.action_plan_items;
revoke insert, update, delete on public.action_plan_items from anon;
-- anon เหลือแค่ SELECT (ผ่าน policy atlas_mcp_anon_read) — service_role/authenticated ไม่กระทบ
