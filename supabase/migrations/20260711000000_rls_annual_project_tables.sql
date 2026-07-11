-- ปิดช่องโหว่ RLS: annual_projects / project_kpis / project_progress
-- เดิม 3 ตารางนี้ RLS ปิดอยู่ → anon key อ่าน/เขียนได้ทุกแถว (advisor เตือน ERROR)
-- แก้: เปิด RLS + policy (staff อ่านได้ / director+admin แก้-ลบ) + revoke anon grant
-- หมายเหตุ: CREATE TABLE ของ 3 ตารางนี้ถูกสร้างนอก migration นี้ (สมมติมีอยู่แล้วใน atlas_prod)
-- ใช้ has_role() (เช็ค user_roles) + is_admin() (เช็ค teachers.role='admin') ตาม pattern เดิมในโปรเจกต์

alter table public.annual_projects  enable row level security;
alter table public.project_kpis      enable row level security;
alter table public.project_progress  enable row level security;

-- annual_projects
drop policy if exists "staff_read" on public.annual_projects;
create policy "staff_read" on public.annual_projects
  for select to authenticated using (true);
drop policy if exists "director_admin_write" on public.annual_projects;
create policy "director_admin_write" on public.annual_projects
  for all to authenticated
  using  (has_role(auth.uid(),'director'::app_role) or is_admin())
  with check (has_role(auth.uid(),'director'::app_role) or is_admin());

-- project_kpis
drop policy if exists "staff_read" on public.project_kpis;
create policy "staff_read" on public.project_kpis
  for select to authenticated using (true);
drop policy if exists "director_admin_write" on public.project_kpis;
create policy "director_admin_write" on public.project_kpis
  for all to authenticated
  using  (has_role(auth.uid(),'director'::app_role) or is_admin())
  with check (has_role(auth.uid(),'director'::app_role) or is_admin());

-- project_progress
drop policy if exists "staff_read" on public.project_progress;
create policy "staff_read" on public.project_progress
  for select to authenticated using (true);
drop policy if exists "director_admin_write" on public.project_progress;
create policy "director_admin_write" on public.project_progress
  for all to authenticated
  using  (has_role(auth.uid(),'director'::app_role) or is_admin())
  with check (has_role(auth.uid(),'director'::app_role) or is_admin());

-- ถอน grant ของ anon ออก (ไม่ให้คนไม่ login เห็น/แตะ 3 ตารางนี้เลย)
revoke all on public.annual_projects  from anon;
revoke all on public.project_kpis      from anon;
revoke all on public.project_progress  from anon;
