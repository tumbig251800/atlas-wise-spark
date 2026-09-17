-- ผู้ประเมินเก็บที่ระดับ "ผลรายคน" ไม่ใช่ระดับรอบ
-- เพราะรอบหนึ่งครอบคลุม 2 ห้อง และแต่ละห้องอาจมีครูผู้ประเมินคนละคน
alter table public.reading_results
  add column if not exists assessor_id uuid references public.profiles(id) on delete set null;

create index if not exists idx_reading_results_assessor
  on public.reading_results(assessor_id);

comment on column public.reading_results.assessor_id is
  'ครูผู้ให้คะแนนการทดสอบการอ่านของนักเรียนคนนี้ในรอบนี้ อ้างอิง profiles.id';
