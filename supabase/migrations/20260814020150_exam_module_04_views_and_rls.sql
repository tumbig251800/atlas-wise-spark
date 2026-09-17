create or replace view public.v_exam_item_difficulty
with (security_invoker = on) as
select
  p.academic_term, p.exam_type, p.grade_level, p.classroom, p.subject,
  i.item_no, i.section_no, i.domain, i.topic, i.max_score,
  count(sc.*)                                             as n_students,
  round(avg(sc.score / nullif(i.max_score,0))::numeric, 3) as p_value,
  case
    when avg(sc.score / nullif(i.max_score,0)) < 0.20 then 'ยากผิดปกติ'
    when avg(sc.score / nullif(i.max_score,0)) > 0.95 then 'ง่ายเกินไป'
    else 'ปกติ'
  end                                                     as flag
from public.exam_items i
join public.exam_papers p on p.id = i.paper_id
left join public.exam_item_scores sc
       on sc.paper_id = i.paper_id and sc.item_no = i.item_no
group by p.academic_term, p.exam_type, p.grade_level, p.classroom, p.subject,
         i.item_no, i.section_no, i.domain, i.topic, i.max_score;

create or replace view public.v_teacher_accuracy_real
with (security_invoker = on) as
with logged as (
  select academic_term, grade_level, classroom, subject, teacher_name,
         count(*)                                                  as n_logs,
         round(avg((major_gap::text = 'success')::int)::numeric, 3) as logged_success_rate
  from public.teaching_logs
  where major_gap is not null
  group by 1,2,3,4,5
),
tested as (
  select p.academic_term, p.grade_level, p.classroom, p.subject,
         count(*)                                                 as n_students,
         round(avg((r.gap_flag = 'success')::int)::numeric, 3)     as exam_success_rate,
         round(avg(r.total / nullif(p.total_score,0))::numeric, 3) as avg_pct
  from public.exam_student_results r
  join public.exam_papers p on p.id = r.paper_id
  where not r.is_absent
  group by 1,2,3,4
)
select
  t.academic_term, t.grade_level, t.classroom, t.subject, l.teacher_name,
  l.n_logs, l.logged_success_rate,
  t.n_students, t.exam_success_rate, t.avg_pct,
  round(l.logged_success_rate - t.exam_success_rate, 3) as blind_spot_index,
  case
    when l.logged_success_rate - t.exam_success_rate >= 0.30 then 'มองโลกสวยมาก'
    when l.logged_success_rate - t.exam_success_rate >= 0.15 then 'มองโลกสวย'
    when l.logged_success_rate - t.exam_success_rate <= -0.15 then 'ประเมินต่ำกว่าจริง'
    else 'อ่านห้องแม่น'
  end as accuracy_band
from tested t
left join logged l
  on  l.academic_term = t.academic_term
  and l.grade_level   = t.grade_level
  and l.classroom     = t.classroom
  and l.subject       = t.subject;

alter table public.exam_papers          enable row level security;
alter table public.exam_items           enable row level security;
alter table public.exam_item_scores     enable row level security;
alter table public.exam_student_results enable row level security;
alter table public.exam_subject_map     enable row level security;

do $$
declare t text;
begin
  foreach t in array array['exam_papers','exam_items','exam_item_scores',
                           'exam_student_results','exam_subject_map']
  loop
    execute format('drop policy if exists %I on public.%I', t || '_read', t);
    execute format('drop policy if exists %I on public.%I', t || '_write', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (true)',
      t || '_read', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (true) with check (true)',
      t || '_write', t);
  end loop;
end $$;
