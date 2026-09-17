-- แยกสิทธิ์: lead (หัวหน้าฝ่ายวิชาการ) เห็นทุกห้องแต่แก้ไม่ได้ · admin/director แก้ได้ทุกห้อง
create or replace function public.fn_reading_is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.is_admin(), false)
      or coalesce(public.has_role(auth.uid(), 'director'::app_role), false);
$$;

create or replace function public.fn_reading_can_view_all()
returns boolean language sql stable security definer set search_path = public as $$
  select public.fn_reading_is_admin()
      or coalesce(public.has_role(auth.uid(), 'lead'::app_role), false)
      or exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'lead');
$$;

revoke all on function public.fn_reading_is_admin(), public.fn_reading_can_view_all() from public, anon;
grant execute on function public.fn_reading_is_admin(), public.fn_reading_can_view_all() to authenticated;

-- reading_rounds
drop policy if exists reading_rounds_staff_write on public.reading_rounds;
create policy reading_rounds_admin_write on public.reading_rounds
  for all to authenticated using (public.fn_reading_is_admin()) with check (public.fn_reading_is_admin());

-- classroom_homerooms
drop policy if exists classroom_homerooms_staff_write on public.classroom_homerooms;
create policy classroom_homerooms_admin_write on public.classroom_homerooms
  for all to authenticated using (public.fn_reading_is_admin()) with check (public.fn_reading_is_admin());

-- reading_results
drop policy if exists reading_results_select on public.reading_results;
drop policy if exists reading_results_insert on public.reading_results;
drop policy if exists reading_results_update on public.reading_results;
drop policy if exists reading_results_delete on public.reading_results;

create policy reading_results_select on public.reading_results
  for select to authenticated
  using (public.fn_reading_can_view_all() or public.fn_reading_is_homeroom(round_id, classroom));
create policy reading_results_insert on public.reading_results
  for insert to authenticated
  with check (public.fn_reading_is_admin()
              or (public.fn_reading_is_homeroom(round_id, classroom) and public.fn_reading_round_open(round_id)));
create policy reading_results_update on public.reading_results
  for update to authenticated
  using (public.fn_reading_is_admin()
         or (public.fn_reading_is_homeroom(round_id, classroom) and public.fn_reading_round_open(round_id)))
  with check (public.fn_reading_is_admin()
              or (public.fn_reading_is_homeroom(round_id, classroom) and public.fn_reading_round_open(round_id)));
create policy reading_results_delete on public.reading_results
  for delete to authenticated using (public.fn_reading_is_admin());

-- ไม่มี policy ใดอ้างถึงแล้ว
drop function if exists public.fn_reading_is_staff();
