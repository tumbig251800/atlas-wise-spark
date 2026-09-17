-- ================= 1) องค์ประกอบคะแนน + น้ำหนักรายวิชา =================
create table public.subject_grade_components (
  id uuid primary key default gen_random_uuid(),
  academic_term text not null,
  grade_level text not null,
  classroom text,                        -- null = ใช้ทุกห้องของชั้นนั้น (ถ้าห้องใดตั้งเฉพาะไว้ จะใช้ของห้องนั้นแทนทั้งชุด)
  subject text not null,
  component_code text not null,          -- รหัสสั้น เช่น U, U1, MID, FIN, HW1
  component_name text not null,          -- ชื่อที่แสดง เช่น "คะแนนหน่วย", "หน่วยที่ 1", "สอบปลายภาค", "ชิ้นงาน"
  source_kind text not null check (source_kind in ('unit','midterm','final','other')),
  unit_name text,                        -- เฉพาะ source_kind='unit': ระบุหน่วยเดียว · null = รวมทุกหน่วยที่ไม่ได้ตั้งแยก
  unit_aggregation text not null default 'pooled' check (unit_aggregation in ('pooled','mean_pct')),
  weight numeric(6,2) check (weight is null or (weight >= 0 and weight <= 100)),  -- null = ยังไม่ใส่ตัวเลข
  sort_order int not null default 0,
  notes text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sgc_unit_name_only_for_unit check (unit_name is null or source_kind = 'unit')
);
create unique index uq_subject_grade_components
  on public.subject_grade_components (academic_term, grade_level, coalesce(classroom, ''), subject, component_code);
comment on table public.subject_grade_components is
  'องค์ประกอบคะแนนและน้ำหนักเกรดรายวิชา/เทอม — น้ำหนักรวมต่อวิชาควรเท่ากับ 100 (ตรวจใน v_grade_setup_status)';
comment on column public.subject_grade_components.unit_aggregation is
  'pooled = รวมคะแนนดิบทุกหน่วยแล้วหารคะแนนเต็มรวม (หน่วยคะแนนเต็มมากมีผลมาก) · mean_pct = เฉลี่ยร้อยละของแต่ละหน่วย (ทุกหน่วยมีผลเท่ากัน)';

-- ================= 2) คะแนนงานอื่น (ชิ้นงาน/การบ้าน/จิตพิสัย ฯลฯ) =================
create table public.student_other_scores (
  id uuid primary key default gen_random_uuid(),
  academic_term text not null,
  grade_level text not null,
  classroom text not null,
  subject text not null,
  component_code text not null,
  student_id text not null,
  student_name text,
  score numeric,
  total_score numeric not null check (total_score > 0),
  is_absent boolean not null default false,
  assessed_date date,
  teacher_id uuid default auth.uid(),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sos_score_range check (score is null or (score >= 0 and score <= total_score)),
  constraint uq_student_other_scores unique (academic_term, grade_level, subject, component_code, student_id)
);
comment on table public.student_other_scores is
  'คะแนนองค์ประกอบ source_kind=other ของ subject_grade_components (จับคู่ด้วย component_code)';

-- ================= 3) เกณฑ์ตัดเกรด =================
create table public.grade_cutoffs (
  id uuid primary key default gen_random_uuid(),
  academic_term text not null,
  grade_level text,                      -- null = ใช้ทุกชั้น
  min_pct numeric(5,2) not null check (min_pct >= 0 and min_pct <= 100),
  grade_value text not null,             -- เช่น '4', '3.5', '0'
  grade_label text,                      -- เช่น 'ดีเยี่ยม'
  created_at timestamptz not null default now()
);
create unique index uq_grade_cutoffs on public.grade_cutoffs (academic_term, coalesce(grade_level, ''), min_pct);

-- updated_at
create or replace function public.fn_touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
create trigger trg_sgc_touch before update on public.subject_grade_components for each row execute function public.fn_touch_updated_at();
create trigger trg_sos_touch before update on public.student_other_scores for each row execute function public.fn_touch_updated_at();

-- ================= RLS =================
create or replace function public.fn_teaches_subject(p_term text, p_grade text, p_classroom text, p_subject text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.exam_papers where academic_term=p_term and grade_level=p_grade and classroom=p_classroom and subject=p_subject and teacher_id=auth.uid())
      or exists (select 1 from public.unit_assessment_setups where academic_term=p_term and grade_level=p_grade and classroom=p_classroom and subject=p_subject and teacher_id=auth.uid())
      or exists (select 1 from public.teaching_logs where academic_term=p_term and grade_level=p_grade and classroom=p_classroom and subject=p_subject and teacher_id=auth.uid());
$$;
revoke all on function public.fn_teaches_subject(text,text,text,text) from public, anon;
grant execute on function public.fn_teaches_subject(text,text,text,text) to authenticated;

alter table public.subject_grade_components enable row level security;
alter table public.student_other_scores enable row level security;
alter table public.grade_cutoffs enable row level security;
revoke all on public.subject_grade_components, public.student_other_scores, public.grade_cutoffs from anon;

create policy sgc_select on public.subject_grade_components for select to authenticated using (true);
create policy sgc_admin_write on public.subject_grade_components for all to authenticated
  using (public.fn_reading_is_admin()) with check (public.fn_reading_is_admin());

create policy grade_cutoffs_select on public.grade_cutoffs for select to authenticated using (true);
create policy grade_cutoffs_admin_write on public.grade_cutoffs for all to authenticated
  using (public.fn_reading_is_admin()) with check (public.fn_reading_is_admin());

-- งานอื่น: เห็น = admin/lead/ครูประจำชั้น/ครูผู้สอนวิชา · กรอก/แก้ = admin/ครูประจำชั้น/ครูผู้สอนวิชา · ลบ = admin
create policy sos_select on public.student_other_scores for select to authenticated
  using (public.fn_reading_can_view_all() or teacher_id = auth.uid()
         or public.fn_is_homeroom(academic_term, grade_level, classroom)
         or public.fn_teaches_subject(academic_term, grade_level, classroom, subject));
create policy sos_insert on public.student_other_scores for insert to authenticated
  with check (public.fn_reading_is_admin()
              or public.fn_is_homeroom(academic_term, grade_level, classroom)
              or public.fn_teaches_subject(academic_term, grade_level, classroom, subject));
create policy sos_update on public.student_other_scores for update to authenticated
  using (public.fn_reading_is_admin()
         or public.fn_is_homeroom(academic_term, grade_level, classroom)
         or public.fn_teaches_subject(academic_term, grade_level, classroom, subject))
  with check (public.fn_reading_is_admin()
              or public.fn_is_homeroom(academic_term, grade_level, classroom)
              or public.fn_teaches_subject(academic_term, grade_level, classroom, subject));
create policy sos_delete on public.student_other_scores for delete to authenticated
  using (public.fn_reading_is_admin());
