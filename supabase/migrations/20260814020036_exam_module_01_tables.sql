-- ATLAS Exam Score Module : ตารางหลัก
create table if not exists public.exam_papers (
  id                uuid primary key default gen_random_uuid(),
  academic_term     text not null,
  exam_type         text not null default 'midterm'
                    check (exam_type in ('midterm','final','pretest','posttest')),
  grade_level       text not null,
  classroom         text not null,
  subject           text not null,
  subject_display   text,
  teacher_id        uuid references auth.users(id),
  teacher_name      text,
  exam_date         date,
  k_total           numeric not null default 0,
  p_total           numeric not null default 0,
  a_total           numeric not null default 0,
  total_score       numeric not null,
  item_count        integer,
  pass_threshold    numeric not null default 0.50,
  gap_threshold     numeric not null default 0.70,
  source_file       text,
  alignment_score   numeric,
  status            text not null default 'draft'
                    check (status in ('draft','scoring','completed','synced')),
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint exam_papers_unique
    unique (academic_term, exam_type, grade_level, classroom, subject),
  constraint exam_papers_kpa_sums
    check (k_total + p_total + a_total = total_score)
);
comment on table public.exam_papers is 'ชุดข้อสอบ 1 แถว = 1 (ชั้น x ห้อง x วิชา x ครั้งสอบ) พร้อมพิมพ์เขียว K/P/A';

create index if not exists idx_exam_papers_term    on public.exam_papers (academic_term, exam_type);
create index if not exists idx_exam_papers_class   on public.exam_papers (grade_level, classroom);
create index if not exists idx_exam_papers_subject on public.exam_papers (subject);

create table if not exists public.exam_items (
  id                uuid primary key default gen_random_uuid(),
  paper_id          uuid not null references public.exam_papers(id) on delete cascade,
  item_no           integer not null,
  section_no        integer default 1,
  section_name      text,
  item_type         text not null default 'mc'
                    check (item_type in ('mc','written','fill','match','truefalse','performance')),
  max_score         numeric not null default 1,
  domain            text not null check (domain in ('K','P','A')),
  topic             text,
  indicator_code    text,
  competency_code   text check (competency_code in ('A1','A2','A3','A4','A5','A6')),
  answer_key        text,
  created_at        timestamptz not null default now(),
  constraint exam_items_unique unique (paper_id, item_no)
);
comment on table public.exam_items is 'พิมพ์เขียวรายข้อ ผูกข้อสอบเข้ากับด้าน K/P/A และสมรรถนะ A1-A6';

create index if not exists idx_exam_items_paper  on public.exam_items (paper_id);
create index if not exists idx_exam_items_domain on public.exam_items (paper_id, domain);

create table if not exists public.exam_item_scores (
  id          uuid primary key default gen_random_uuid(),
  paper_id    uuid not null references public.exam_papers(id) on delete cascade,
  item_no     integer not null,
  student_id  text not null,
  score       numeric not null default 0,
  created_at  timestamptz not null default now(),
  constraint exam_item_scores_unique unique (paper_id, item_no, student_id)
);
comment on table public.exam_item_scores is 'คะแนนรายข้อรายคน (ชั้นดิบ) - ใช้คำนวณค่าความยากรายข้อ';

create index if not exists idx_exam_item_scores_paper   on public.exam_item_scores (paper_id);
create index if not exists idx_exam_item_scores_student on public.exam_item_scores (student_id);

create table if not exists public.exam_student_results (
  id            uuid primary key default gen_random_uuid(),
  paper_id      uuid not null references public.exam_papers(id) on delete cascade,
  student_id    text not null,
  student_name  text,
  k_score       numeric not null default 0,
  p_score       numeric not null default 0,
  a_score       numeric not null default 0,
  total         numeric generated always as (k_score + p_score + a_score) stored,
  is_absent     boolean not null default false,
  gap_flag      text check (gap_flag in ('success','k-gap','p-gap','a-gap')),
  result        text check (result in ('pass','stay')),
  synced_at     timestamptz,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint exam_student_results_unique unique (paper_id, student_id)
);
comment on table public.exam_student_results is 'ผลสรุปรายคนต่อชุดข้อสอบ พร้อมธง gap และ pass/stay';

create index if not exists idx_exam_results_paper   on public.exam_student_results (paper_id);
create index if not exists idx_exam_results_student on public.exam_student_results (student_id);

create table if not exists public.exam_subject_map (
  id             uuid primary key default gen_random_uuid(),
  grade_level    text not null,
  exam_label     text not null,
  atlas_subject  text not null,
  constraint exam_subject_map_unique unique (grade_level, exam_label)
);
comment on table public.exam_subject_map is 'ตารางเทียบชื่อวิชาบนข้อสอบ -> ชื่อวิชาใน teaching_logs (ป.1-3 ใช้ชื่อฐานสมรรถนะ ป.4-6 ใช้ชื่อแกนกลาง)';
