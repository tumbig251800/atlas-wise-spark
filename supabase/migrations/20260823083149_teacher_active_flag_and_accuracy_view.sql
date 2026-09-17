-- 1) profiles ยังไม่มีช่องบอกสถานะครู จึงไม่มีทางบันทึกว่าใครลาออก
alter table public.profiles
  add column if not exists is_active boolean not null default true,
  add column if not exists left_date date;

comment on column public.profiles.is_active is 'false = ลาออก/ย้าย/ไม่ได้ปฏิบัติหน้าที่แล้ว — ไม่ลบ profile เพื่อรักษาประวัติการสอนไว้';
comment on column public.profiles.left_date is 'วันที่พ้นหน้าที่ (ถ้าทราบ)';

-- 2) เพิ่มคอลัมน์ท้ายวิว ไม่กระทบ consumer เดิม
create or replace view public.v_teacher_accuracy_real as
with logged as (
  select tl.academic_term, tl.grade_level, tl.classroom, tl.subject, tl.teacher_name,
         count(*) as n_logs,
         round(avg((tl.major_gap::text = 'success')::integer), 3) as logged_success_rate,
         max(tl.created_at)::date as last_log_date
  from public.teaching_logs tl
  where tl.major_gap is not null
  group by 1,2,3,4,5
), tested as (
  select p.academic_term, p.grade_level, p.classroom, p.subject,
         count(*) as n_students,
         round(avg((r.gap_flag = 'success')::integer), 3) as exam_success_rate,
         round(avg(r.total / nullif(p.total_score, 0::numeric)), 3) as avg_pct
  from public.exam_student_results r
  join public.exam_papers p on p.id = r.paper_id
  where not r.is_absent
  group by 1,2,3,4
)
select t.academic_term, t.grade_level, t.classroom, t.subject,
       l.teacher_name, l.n_logs, l.logged_success_rate,
       t.n_students, t.exam_success_rate, t.avg_pct,
       round(l.logged_success_rate - t.exam_success_rate, 3) as blind_spot_index,
       case
         when (l.logged_success_rate - t.exam_success_rate) >= 0.30 then 'มองโลกสวยมาก'
         when (l.logged_success_rate - t.exam_success_rate) >= 0.15 then 'มองโลกสวย'
         when (l.logged_success_rate - t.exam_success_rate) <= -0.15 then 'ประเมินต่ำกว่าจริง'
         else 'อ่านห้องแม่น'
       end as accuracy_band,
       coalesce(pr.is_active, true) as teacher_active,
       l.last_log_date
from tested t
left join logged l
  on l.academic_term = t.academic_term and l.grade_level = t.grade_level
 and l.classroom = t.classroom and l.subject = t.subject
left join public.profiles pr on pr.full_name = l.teacher_name;
