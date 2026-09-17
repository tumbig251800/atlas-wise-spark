-- แปลผลระดับคุณภาพทั้งรอบ
create or replace function public.fn_reading_rollup(p_round_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare v_n integer;
begin
  update public.reading_results r
  set level = case
        when r.is_absent then null
        when (r.total / nullif(d.aloud_total + d.comprehend_total,0)) >= d.t_excellent then 'ดีมาก'
        when (r.total / nullif(d.aloud_total + d.comprehend_total,0)) >= d.t_good      then 'ดี'
        when (r.total / nullif(d.aloud_total + d.comprehend_total,0)) >= d.t_fair      then 'พอใช้'
        else 'ปรับปรุง'
      end,
      is_nonreader = case
        when r.is_absent then null
        else coalesce(r.aloud_score,0) / nullif(d.aloud_total,0) < d.t_nonreader
      end,
      updated_at = now()
  from public.reading_rounds d
  where d.id = r.round_id and r.round_id = p_round_id;

  get diagnostics v_n = row_count;
  update public.reading_rounds set status='completed', updated_at=now() where id=p_round_id;
  return v_n;
end;
$$;

comment on function public.fn_reading_rollup(uuid) is
  'แปลผล 4 ระดับ + ธงอ่านไม่ออก จากคะแนนดิบ 2 ด้าน — เรียกซ้ำได้ ผลเหมือนเดิมเสมอ';

-- พัฒนาการต้นภาค -> ปลายภาค รายคน
create or replace view public.v_reading_progress as
select
  coalesce(pre.academic_term, post.academic_term)  as academic_term,
  coalesce(pre.grade_level, post.grade_level)      as grade_level,
  coalesce(pre.classroom, post.classroom)          as classroom,
  coalesce(pre.student_id, post.student_id)        as student_id,
  coalesce(pre.student_name, post.student_name)    as student_name,
  pre.total as pre_total,   pre.pct  as pre_pct,   pre.level  as pre_level,  pre.is_nonreader as pre_nonreader,
  post.total as post_total, post.pct as post_pct,  post.level as post_level, post.is_nonreader as post_nonreader,
  round(post.pct - pre.pct, 3) as pct_change,
  case
    when pre.pct is null or post.pct is null then 'ข้อมูลไม่ครบ'
    when pre.is_nonreader and not post.is_nonreader then 'อ่านออกแล้ว'
    when not pre.is_nonreader and post.is_nonreader then 'ถดถอยจนอ่านไม่ออก'
    when post.pct - pre.pct >=  0.10 then 'ก้าวหน้าชัดเจน'
    when post.pct - pre.pct <= -0.10 then 'ถดถอย'
    else 'ทรงตัว'
  end as progress_flag
from
  (select r.student_id, r.student_name, r.classroom, r.total, r.level, r.is_nonreader,
          round(r.total / nullif(d.aloud_total + d.comprehend_total,0), 3) as pct,
          d.academic_term, d.grade_level
   from public.reading_results r join public.reading_rounds d on d.id=r.round_id
   where d.round_code='pre' and not r.is_absent) pre
full outer join
  (select r.student_id, r.student_name, r.classroom, r.total, r.level, r.is_nonreader,
          round(r.total / nullif(d.aloud_total + d.comprehend_total,0), 3) as pct,
          d.academic_term, d.grade_level
   from public.reading_results r join public.reading_rounds d on d.id=r.round_id
   where d.round_code='post' and not r.is_absent) post
  on post.student_id = pre.student_id and post.academic_term = pre.academic_term;

-- กลุ่มที่ต้องเร่งช่วย
create or replace view public.v_reading_at_risk as
select d.academic_term, d.round_code, d.grade_level, r.classroom,
       r.student_id, r.student_name,
       r.aloud_score, d.aloud_total,
       round(coalesce(r.aloud_score,0)/nullif(d.aloud_total,0),3) as aloud_pct,
       r.comprehend_score, d.comprehend_total,
       round(coalesce(r.comprehend_score,0)/nullif(d.comprehend_total,0),3) as comprehend_pct,
       r.total, r.level, r.is_nonreader,
       case
         when r.is_nonreader then 'ยังอ่านไม่ออก — เร่งด่วนที่สุด'
         when r.level = 'ปรับปรุง' then 'ต้องซ่อมเสริม'
         when coalesce(r.comprehend_score,0)/nullif(d.comprehend_total,0) < d.t_fair
              then 'อ่านออกแต่ไม่เข้าใจความหมาย'
         else 'เฝ้าระวัง'
       end as priority
from public.reading_results r
join public.reading_rounds d on d.id = r.round_id
where not r.is_absent
  and (r.is_nonreader
       or r.level in ('ปรับปรุง','พอใช้')
       or coalesce(r.comprehend_score,0)/nullif(d.comprehend_total,0) < d.t_fair);

-- สรุปรายห้อง
create or replace view public.v_reading_class_summary as
select d.academic_term, d.round_code, d.round_name, d.grade_level, r.classroom,
       count(*) filter (where not r.is_absent) as n_tested,
       count(*) filter (where r.is_absent)     as n_absent,
       round(avg(r.total) filter (where not r.is_absent), 2) as avg_total,
       d.aloud_total + d.comprehend_total as full_score,
       round(avg(r.total / nullif(d.aloud_total+d.comprehend_total,0))
             filter (where not r.is_absent), 3) as avg_pct,
       round(avg(r.aloud_score / nullif(d.aloud_total,0))
             filter (where not r.is_absent), 3) as avg_aloud_pct,
       round(avg(r.comprehend_score / nullif(d.comprehend_total,0))
             filter (where not r.is_absent), 3) as avg_comprehend_pct,
       count(*) filter (where r.level='ดีมาก')   as n_excellent,
       count(*) filter (where r.level='ดี')      as n_good,
       count(*) filter (where r.level='พอใช้')   as n_fair,
       count(*) filter (where r.level='ปรับปรุง') as n_poor,
       count(*) filter (where r.is_nonreader)    as n_nonreader
from public.reading_results r
join public.reading_rounds d on d.id = r.round_id
group by d.academic_term, d.round_code, d.round_name, d.grade_level, r.classroom,
         d.aloud_total, d.comprehend_total;

-- ล็อกสิทธิ์แบบเดียวกับโมดูลข้อสอบ
revoke execute on function public.fn_reading_rollup(uuid) from public, anon;
grant  execute on function public.fn_reading_rollup(uuid) to authenticated, service_role;

alter table public.reading_rounds  enable row level security;
alter table public.reading_results enable row level security;

drop policy if exists reading_rounds_rw  on public.reading_rounds;
drop policy if exists reading_results_rw on public.reading_results;
create policy reading_rounds_rw  on public.reading_rounds  for all to authenticated using (true) with check (true);
create policy reading_results_rw on public.reading_results for all to authenticated using (true) with check (true);
