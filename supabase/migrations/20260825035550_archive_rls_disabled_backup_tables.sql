-- ย้ายตาราง backup ที่ปิด RLS ออกจาก public เข้า schema เก็บถาวรที่ API เข้าไม่ถึง
create schema if not exists zz_archive;
revoke all on schema zz_archive from anon, authenticated;
comment on schema zz_archive is 'ห้องเก็บตาราง backup เก่า — ไม่ expose ผ่าน API, เข้าได้เฉพาะ service_role/dashboard (สร้าง 2026-08-25 แทนการลบ)';

alter table public.teaching_logs_hc_backup_v3 set schema zz_archive;
alter table public.teacher_compliance_snapshot_before set schema zz_archive;
alter table public.classroom_compliance_snapshot_before set schema zz_archive;
alter table public.zz_fix_9276_backup_20260823 set schema zz_archive;

-- กันเหนียว: ตัดสิทธิ์ anon/authenticated ที่ตารางโดยตรงด้วย
revoke all on all tables in schema zz_archive from anon, authenticated;
