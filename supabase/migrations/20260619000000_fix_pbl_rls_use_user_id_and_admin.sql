-- BUG FIX: PBL RLS policies (20260617000001) checked profiles.id = auth.uid(),
-- but auth is linked via profiles.user_id (id is a separate random PK). For every
-- profile id <> user_id, so the EXISTS check never matched and NO ONE — teacher,
-- lead, or admin — could view PBL data, even though imports (service role) worked.
--
-- Recreate all PBL policies keyed on profiles.user_id, and add the 'admin' role to
-- view/insert/update (admins see everything elsewhere) and to delete (with director).
-- Applied to production 2026-06-19 via MCP; this file keeps the repo in sync.

-- ── pbl_projects ──────────────────────────────────────────────────────────────
drop policy if exists "Teachers can view PBL projects"   on pbl_projects;
drop policy if exists "Teachers can insert PBL projects" on pbl_projects;
drop policy if exists "Teachers can update PBL projects" on pbl_projects;
drop policy if exists "Directors can delete PBL projects" on pbl_projects;

create policy "PBL projects: view" on pbl_projects for select to authenticated
  using (exists (select 1 from profiles
    where profiles.user_id = auth.uid()
      and profiles.role = any (array['teacher','director','lead','admin'])));

create policy "PBL projects: insert" on pbl_projects for insert to authenticated
  with check (exists (select 1 from profiles
    where profiles.user_id = auth.uid()
      and profiles.role = any (array['teacher','director','lead','admin'])));

create policy "PBL projects: update" on pbl_projects for update to authenticated
  using (exists (select 1 from profiles
    where profiles.user_id = auth.uid()
      and profiles.role = any (array['teacher','director','lead','admin'])));

create policy "PBL projects: delete" on pbl_projects for delete to authenticated
  using (exists (select 1 from profiles
    where profiles.user_id = auth.uid()
      and profiles.role = any (array['director','admin'])));

-- ── pbl_assessments ───────────────────────────────────────────────────────────
drop policy if exists "Teachers can view PBL assessments"   on pbl_assessments;
drop policy if exists "Teachers can insert PBL assessments" on pbl_assessments;
drop policy if exists "Teachers can update PBL assessments" on pbl_assessments;
drop policy if exists "Directors can delete PBL assessments" on pbl_assessments;

create policy "PBL assessments: view" on pbl_assessments for select to authenticated
  using (exists (select 1 from profiles
    where profiles.user_id = auth.uid()
      and profiles.role = any (array['teacher','director','lead','admin'])));

create policy "PBL assessments: insert" on pbl_assessments for insert to authenticated
  with check (exists (select 1 from profiles
    where profiles.user_id = auth.uid()
      and profiles.role = any (array['teacher','director','lead','admin'])));

create policy "PBL assessments: update" on pbl_assessments for update to authenticated
  using (exists (select 1 from profiles
    where profiles.user_id = auth.uid()
      and profiles.role = any (array['teacher','director','lead','admin'])));

create policy "PBL assessments: delete" on pbl_assessments for delete to authenticated
  using (exists (select 1 from profiles
    where profiles.user_id = auth.uid()
      and profiles.role = any (array['director','admin'])));
