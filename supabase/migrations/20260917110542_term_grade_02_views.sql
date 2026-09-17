-- ห้อง×วิชาที่มีอยู่จริงในเทอม
create or replace view public.v_class_subjects with (security_invoker = on) as
select academic_term, grade_level, classroom, subject from public.unit_assessments where assessment_kind = 'unit'
union
select academic_term, grade_level, classroom, subject from public.exam_papers
union
select academic_term, grade_level, classroom, subject from public.student_other_scores
union
select academic_term, grade_level, classroom, subject from public.subject_grade_components where classroom is not null
union
select c.academic_term, c.grade_level, s.classroom, c.subject
from public.subject_grade_components c
join (select distinct grade_level, classroom from public.students where is_active) s on s.grade_level = c.grade_level
where c.classroom is null;

-- องค์ประกอบที่ใช้จริงต่อห้อง×วิชา (ตั้งเฉพาะห้อง > ตั้งทั้งชั้น)
create or replace view public.v_grade_components_resolved with (security_invoker = on) as
select cs.academic_term, cs.grade_level, cs.classroom, cs.subject,
       c.id as component_id, c.component_code, c.component_name, c.source_kind, c.unit_name,
       c.unit_aggregation, c.weight, c.sort_order
from public.v_class_subjects cs
join public.subject_grade_components c
  on c.academic_term = cs.academic_term and c.grade_level = cs.grade_level and c.subject = cs.subject
 and (c.classroom = cs.classroom
      or (c.classroom is null and not exists (
            select 1 from public.subject_grade_components c2
            where c2.academic_term = cs.academic_term and c2.grade_level = cs.grade_level
              and c2.subject = cs.subject and c2.classroom = cs.classroom)));

-- เช็กลิสต์การตั้งค่า: ห้อง×วิชาไหนยังไม่ตั้ง / น้ำหนักไม่ครบ / อ้างข้อมูลที่ไม่มี
create or replace view public.v_grade_setup_status with (security_invoker = on) as
with comp as (
  select academic_term, grade_level, classroom, subject,
         count(*) n_components,
         count(*) filter (where weight is null) n_weight_blank,
         coalesce(sum(weight), 0) weight_sum,
         bool_or(source_kind = 'midterm' and coalesce(weight,0) > 0) uses_midterm,
         bool_or(source_kind = 'final'   and coalesce(weight,0) > 0) uses_final,
         string_agg(component_code || '=' || coalesce(weight::text, '?'), ', ' order by sort_order, component_code) components
  from public.v_grade_components_resolved group by 1,2,3,4),
src as (
  select cs.academic_term, cs.grade_level, cs.classroom, cs.subject,
    (select count(distinct ua.unit_name) from public.unit_assessments ua
      where ua.assessment_kind='unit' and ua.academic_term=cs.academic_term and ua.grade_level=cs.grade_level
        and ua.classroom=cs.classroom and ua.subject=cs.subject) n_units_assessed,
    exists (select 1 from public.exam_papers ep where ep.exam_type='midterm' and ep.academic_term=cs.academic_term
            and ep.grade_level=cs.grade_level and ep.classroom=cs.classroom and ep.subject=cs.subject) has_midterm_paper,
    exists (select 1 from public.exam_papers ep where ep.exam_type='final' and ep.academic_term=cs.academic_term
            and ep.grade_level=cs.grade_level and ep.classroom=cs.classroom and ep.subject=cs.subject) has_final_paper
  from public.v_class_subjects cs),
bad_units as (
  select r.academic_term, r.grade_level, r.classroom, r.subject, string_agg(r.unit_name, ', ') missing_units
  from public.v_grade_components_resolved r
  where r.source_kind='unit' and r.unit_name is not null
    and not exists (select 1 from public.unit_assessments ua where ua.assessment_kind='unit'
                    and ua.academic_term=r.academic_term and ua.grade_level=r.grade_level and ua.classroom=r.classroom
                    and ua.subject=r.subject and ua.unit_name=r.unit_name)
  group by 1,2,3,4)
select s.academic_term, s.grade_level, s.classroom, s.subject,
       s.n_units_assessed, s.has_midterm_paper, s.has_final_paper,
       coalesce(c.n_components, 0) n_components, c.components, coalesce(c.weight_sum, 0) weight_sum,
       case
         when c.n_components is null then 'ยังไม่ตั้งองค์ประกอบ'
         when c.n_weight_blank > 0 then 'ยังไม่ใส่น้ำหนัก'
         when c.weight_sum <> 100 then 'น้ำหนักรวมไม่เท่ากับ 100'
         else 'พร้อม'
       end as setup_status,
       concat_ws(' · ',
         case when c.uses_midterm and not s.has_midterm_paper then 'ให้น้ำหนักกลางภาคแต่ไม่มีข้อสอบกลางภาค' end,
         case when c.uses_final and not s.has_final_paper then 'ยังไม่มีข้อสอบปลายภาค' end,
         case when b.missing_units is not null then 'หน่วยที่ไม่พบคะแนน: ' || b.missing_units end
       ) as warnings
from src s
left join comp c using (academic_term, grade_level, classroom, subject)
left join bad_units b using (academic_term, grade_level, classroom, subject);

-- คะแนนรายองค์ประกอบรายคน
create or replace view public.v_student_grade_components with (security_invoker = on) as
select r.academic_term, r.grade_level, r.classroom, r.subject,
       st.student_id, trim(coalesce(st.first_name,'') || ' ' || coalesce(st.last_name,'')) as student_name,
       r.component_code, r.component_name, r.source_kind, r.unit_name, r.weight, r.sort_order,
       x.score, x.total_score, x.n_items, coalesce(x.is_absent, false) as is_absent,
       round(100 * x.pct, 2) as pct,
       round(x.pct * r.weight, 2) as weighted_points
from public.v_grade_components_resolved r
join public.students st on st.is_active and st.grade_level = r.grade_level and st.classroom = r.classroom
cross join lateral (
  -- หน่วยเฉพาะ
  select sum(ua.score) score, sum(ua.total_score) total_score, count(*) n_items, false is_absent,
         sum(ua.score) / nullif(sum(ua.total_score), 0) pct
  from public.unit_assessments ua
  where r.source_kind = 'unit' and r.unit_name is not null
    and ua.assessment_kind='unit' and ua.academic_term=r.academic_term and ua.subject=r.subject
    and ua.student_id=st.student_id and ua.unit_name=r.unit_name
  having count(*) > 0
  union all
  -- หน่วยรวม (ยกเว้นหน่วยที่ตั้งแยกไว้)
  select sum(ua.score), sum(ua.total_score), count(*), false,
         case when r.unit_aggregation = 'mean_pct' then avg(ua.score / nullif(ua.total_score, 0))
              else sum(ua.score) / nullif(sum(ua.total_score), 0) end
  from public.unit_assessments ua
  where r.source_kind = 'unit' and r.unit_name is null
    and ua.assessment_kind='unit' and ua.academic_term=r.academic_term and ua.subject=r.subject
    and ua.student_id=st.student_id
    and not exists (select 1 from public.v_grade_components_resolved r2
                    where r2.academic_term=r.academic_term and r2.grade_level=r.grade_level and r2.classroom=r.classroom
                      and r2.subject=r.subject and r2.source_kind='unit' and r2.unit_name = ua.unit_name)
  having count(*) > 0
  union all
  -- สอบกลางภาค/ปลายภาค
  select esr.total, ep.total_score, 1, esr.is_absent,
         case when esr.is_absent then null else esr.total / nullif(ep.total_score, 0) end
  from public.exam_student_results esr
  join public.exam_papers ep on ep.id = esr.paper_id
  where r.source_kind in ('midterm','final') and ep.exam_type = r.source_kind
    and ep.academic_term=r.academic_term and ep.grade_level=r.grade_level and ep.subject=r.subject
    and esr.student_id=st.student_id
  union all
  -- งานอื่น
  select so.score, so.total_score, 1, so.is_absent,
         case when so.is_absent then null else so.score / nullif(so.total_score, 0) end
  from public.student_other_scores so
  where r.source_kind = 'other' and so.academic_term=r.academic_term and so.grade_level=r.grade_level
    and so.subject=r.subject and so.component_code=r.component_code and so.student_id=st.student_id
  union all
  select null, null, 0, false, null   -- แถวว่างเมื่อยังไม่มีคะแนน
  limit 1
) x;

-- เกรดรวมรายวิชารายคน
create or replace view public.v_term_grade with (security_invoker = on) as
with agg as (
  select academic_term, grade_level, classroom, subject, student_id, student_name,
         count(*) n_components,
         count(*) filter (where weight is null) n_weight_blank,
         coalesce(sum(weight), 0) weight_sum,
         count(*) filter (where pct is null and not is_absent) n_missing,
         count(*) filter (where is_absent) n_absent,
         coalesce(sum(weighted_points), 0) points_so_far,
         coalesce(sum(weight) filter (where pct is not null), 0) weight_covered,
         string_agg(component_code || ':' || coalesce(pct::text, case when is_absent then 'ขาด' else '-' end),
                    ', ' order by sort_order, component_code) detail
  from public.v_student_grade_components
  group by 1,2,3,4,5,6)
select a.*,
       case
         when a.n_weight_blank > 0 then 'ยังไม่ใส่น้ำหนัก'
         when a.weight_sum <> 100 then 'น้ำหนักรวมไม่เท่ากับ 100'
         when a.n_absent > 0 then 'ขาดสอบ/ขาดส่ง'
         when a.n_missing > 0 then 'คะแนนยังไม่ครบ'
         else 'ครบ'
       end as grade_status,
       case when a.n_weight_blank = 0 and a.weight_sum = 100 and a.n_missing = 0 and a.n_absent = 0
            then round(a.points_so_far, 2) end as total_100,
       case when a.n_weight_blank = 0 and a.weight_sum = 100 and a.n_missing = 0 and a.n_absent = 0 then (
         select gc.grade_value from public.grade_cutoffs gc
         where gc.academic_term = a.academic_term
           and (gc.grade_level = a.grade_level
                or (gc.grade_level is null and not exists (select 1 from public.grade_cutoffs g2
                      where g2.academic_term = a.academic_term and g2.grade_level = a.grade_level)))
           and gc.min_pct <= round(a.points_so_far, 2)
         order by gc.min_pct desc limit 1) end as grade
from agg a;

revoke all on public.v_class_subjects, public.v_grade_components_resolved, public.v_grade_setup_status,
              public.v_student_grade_components, public.v_term_grade from anon;
grant select on public.v_class_subjects, public.v_grade_components_resolved, public.v_grade_setup_status,
              public.v_student_grade_components, public.v_term_grade to authenticated;
