-- ผู้ดูแล/ฝ่ายวิชาการ: เห็นและแก้ได้ทุกห้อง
create or replace function public.fn_reading_is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.is_admin(), false)
      or coalesce(public.has_role(auth.uid(), 'director'::app_role), false)
      or coalesce(public.has_role(auth.uid(), 'lead'::app_role), false)
      or exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role in ('admin','lead'));
$$;

-- ครูประจำชั้น = students.teacher_id ของนักเรียนที่ยังเรียนอยู่ในชั้น/ห้องนั้น
create or replace function public.fn_reading_is_homeroom(p_round_id uuid, p_classroom text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.reading_rounds r
    join public.students s on s.grade_level = r.grade_level and s.classroom = p_classroom and s.is_active
    where r.id = p_round_id and s.teacher_id = auth.uid()
  );
$$;

create or replace function public.fn_reading_round_open(p_round_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.reading_rounds r where r.id = p_round_id and r.status <> 'completed');
$$;

revoke all on function public.fn_reading_is_staff(), public.fn_reading_is_homeroom(uuid,text), public.fn_reading_round_open(uuid) from public, anon;
grant execute on function public.fn_reading_is_staff(), public.fn_reading_is_homeroom(uuid,text), public.fn_reading_round_open(uuid) to authenticated;

-- reading_rounds: ครูอ่านได้ · staff สร้าง/แก้/ลบ
drop policy if exists reading_rounds_rw on public.reading_rounds;
create policy reading_rounds_select on public.reading_rounds
  for select to authenticated using (true);
create policy reading_rounds_staff_write on public.reading_rounds
  for all to authenticated using (public.fn_reading_is_staff()) with check (public.fn_reading_is_staff());

-- reading_results: staff ทุกห้อง · ครูประจำชั้นเห็นห้องตัวเอง · กรอก/แก้ได้เฉพาะรอบที่ยังไม่ completed · ลบได้เฉพาะ staff
drop policy if exists reading_results_rw on public.reading_results;
create policy reading_results_select on public.reading_results
  for select to authenticated
  using (public.fn_reading_is_staff() or public.fn_reading_is_homeroom(round_id, classroom));
create policy reading_results_insert on public.reading_results
  for insert to authenticated
  with check (public.fn_reading_is_staff()
              or (public.fn_reading_is_homeroom(round_id, classroom) and public.fn_reading_round_open(round_id)));
create policy reading_results_update on public.reading_results
  for update to authenticated
  using (public.fn_reading_is_staff()
         or (public.fn_reading_is_homeroom(round_id, classroom) and public.fn_reading_round_open(round_id)))
  with check (public.fn_reading_is_staff()
              or (public.fn_reading_is_homeroom(round_id, classroom) and public.fn_reading_round_open(round_id)));
create policy reading_results_delete on public.reading_results
  for delete to authenticated using (public.fn_reading_is_staff());

-- views ต้องเคารพ RLS ของผู้เรียกดู
alter view public.v_reading_progress      set (security_invoker = on);
alter view public.v_reading_at_risk       set (security_invoker = on);
alter view public.v_reading_class_summary set (security_invoker = on);
