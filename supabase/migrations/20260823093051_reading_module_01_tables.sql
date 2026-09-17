-- ============================================================
-- โมดูลทดสอบการอ่าน ป.1-ป.3 (แบบ RT 2 ด้าน)
-- อ่านออกเสียง + อ่านรู้เรื่อง -> แปลผล 4 ระดับ
-- วัดต้นภาค/ปลายภาค เพื่อดูพัฒนาการรายคน
-- ============================================================

create table if not exists public.reading_rounds (
  id uuid primary key default gen_random_uuid(),
  academic_term text not null,
  round_code text not null check (round_code in ('pre','post')),
  round_name text not null,
  grade_level text not null,
  test_date date,
  -- คะแนนเต็มแต่ละด้าน แยกตามชั้นได้ เพราะข้อสอบคนละชุด
  aloud_total numeric not null default 50 check (aloud_total > 0),
  comprehend_total numeric not null default 50 check (comprehend_total > 0),
  -- เกณฑ์แปลผล 4 ระดับ (ร้อยละของคะแนนรวม) ปรับได้ต่อรอบ
  t_excellent numeric not null default 0.75,
  t_good      numeric not null default 0.50,
  t_fair      numeric not null default 0.25,
  -- เกณฑ์ "อ่านไม่ออก" ดูจากด้านอ่านออกเสียงอย่างเดียว
  t_nonreader numeric not null default 0.25,
  status text not null default 'draft' check (status in ('draft','scoring','completed')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reading_rounds_unique unique (academic_term, round_code, grade_level),
  constraint reading_rounds_thresholds check (t_excellent > t_good and t_good > t_fair and t_fair > 0)
);

create table if not exists public.reading_results (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.reading_rounds(id) on delete cascade,
  student_id text not null,
  student_name text,
  classroom text,
  aloud_score numeric check (aloud_score >= 0),
  comprehend_score numeric check (comprehend_score >= 0),
  total numeric generated always as (coalesce(aloud_score,0) + coalesce(comprehend_score,0)) stored,
  is_absent boolean not null default false,
  -- ผลแปล เติมโดย fn_reading_rollup
  level text check (level in ('ดีมาก','ดี','พอใช้','ปรับปรุง')),
  is_nonreader boolean,
  assessed_by uuid references auth.users(id),
  assessor_name text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reading_results_unique unique (round_id, student_id)
);

create index if not exists idx_reading_results_round on public.reading_results(round_id);
create index if not exists idx_reading_results_student on public.reading_results(student_id);
create index if not exists idx_reading_rounds_term on public.reading_rounds(academic_term, round_code);

comment on table public.reading_rounds is
  'รอบการทดสอบการอ่าน 1 แถว = 1 ชั้น x 1 รอบ (ต้นภาค/ปลายภาค) เพราะข้อสอบแต่ละชั้นคนละชุด คะแนนเต็มจึงต่างกันได้';
comment on table public.reading_results is
  'ผลรายคน — อ่านออกเสียง + อ่านรู้เรื่อง ระดับคุณภาพเติมอัตโนมัติโดย fn_reading_rollup ไม่ต้องกรอกเอง';
comment on column public.reading_results.is_nonreader is
  'true = อ่านออกเสียงต่ำกว่าเกณฑ์ t_nonreader ถือว่ายังอ่านไม่ออก ต้องเข้าซ่อมเสริมทันทีไม่ว่าคะแนนรวมจะเป็นเท่าใด';
