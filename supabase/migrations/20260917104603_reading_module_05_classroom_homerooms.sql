create table if not exists public.classroom_homerooms (
  id uuid primary key default gen_random_uuid(),
  academic_term text not null,
  grade_level text not null,
  classroom text not null,
  teacher_id uuid not null,            -- auth user id (= profiles.user_id)
  notes text,
  created_at timestamptz not null default now(),
  unique (academic_term, grade_level, classroom, teacher_id)
);
comment on table public.classroom_homerooms is
  'ครูประจำชั้นเพิ่มเติม (ห้องละหลายคนได้) รายภาคเรียน — ใช้ร่วมกับ students.teacher_id ในสิทธิ์โมดูลการอ่าน';

alter table public.classroom_homerooms enable row level security;
create policy classroom_homerooms_select on public.classroom_homerooms
  for select to authenticated using (true);
create policy classroom_homerooms_staff_write on public.classroom_homerooms
  for all to authenticated using (public.fn_reading_is_staff()) with check (public.fn_reading_is_staff());

insert into public.classroom_homerooms (academic_term, grade_level, classroom, teacher_id, notes)
select '2569-1', 'ป.3', c.classroom, p.user_id, 'ครูรับผิดชอบ ป.3 ทั้ง 2 ห้อง (พี่ตั้มกำหนด 17 ก.ย. 2569)'
from (values ('2'), ('KBW')) c(classroom)
cross join public.profiles p
where p.full_name in ('วรกานต์ ศรีไชยวาล', 'นางสาวสิรินภา จองกลาง')
on conflict do nothing;

create or replace function public.fn_reading_is_homeroom(p_round_id uuid, p_classroom text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.reading_rounds r
    join public.students s on s.grade_level = r.grade_level and s.classroom = p_classroom and s.is_active
    where r.id = p_round_id and s.teacher_id = auth.uid()
  ) or exists (
    select 1
    from public.reading_rounds r
    join public.classroom_homerooms h
      on h.academic_term = r.academic_term and h.grade_level = r.grade_level and h.classroom = p_classroom
    where r.id = p_round_id and h.teacher_id = auth.uid()
  );
$$;
