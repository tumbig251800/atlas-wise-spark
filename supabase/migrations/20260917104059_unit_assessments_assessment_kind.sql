alter table public.unit_assessments
  add column if not exists assessment_kind text not null default 'unit';

alter table public.unit_assessments
  add constraint unit_assessments_assessment_kind_check
  check (assessment_kind in ('unit','midterm','final','pretest','posttest'));

comment on column public.unit_assessments.assessment_kind is
  'unit = คะแนนหลังหน่วย (กรอกโดยครู); midterm/final/pretest/posttest = สำเนาจาก exam_* ที่ fn_exam_sync_to_atlas สร้าง — ค่าเฉลี่ยรายหน่วยให้กรอง assessment_kind = ''unit''';

update public.unit_assessments set assessment_kind = 'midterm' where unit_name like 'สอบกลางภาค %';
update public.unit_assessments set assessment_kind = 'final'   where unit_name like 'สอบปลายภาค %';

create index if not exists idx_unit_assessments_kind_term
  on public.unit_assessments (academic_term, assessment_kind);

CREATE OR REPLACE FUNCTION public.fn_exam_sync_to_atlas(p_paper_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_paper     public.exam_papers%rowtype;
  v_unit_name text;
  v_count     integer;
begin
  select * into v_paper from public.exam_papers where id = p_paper_id;
  if not found then
    raise exception 'ไม่พบชุดข้อสอบ id=%', p_paper_id;
  end if;

  v_unit_name := case v_paper.exam_type
                   when 'midterm' then 'สอบกลางภาค ' || v_paper.academic_term
                   when 'final'   then 'สอบปลายภาค ' || v_paper.academic_term
                   else 'สอบ ' || v_paper.exam_type || ' ' || v_paper.academic_term
                 end;

  delete from public.unit_assessments
   where academic_term = v_paper.academic_term and unit_name = v_unit_name
     and subject = v_paper.subject and grade_level = v_paper.grade_level
     and classroom = v_paper.classroom;

  delete from public.unit_assessment_setups
   where academic_term = v_paper.academic_term and unit_name = v_unit_name
     and subject = v_paper.subject and grade_level = v_paper.grade_level
     and classroom = v_paper.classroom;

  insert into public.unit_assessment_setups
        (teacher_id, subject, grade_level, classroom, academic_term,
         unit_name, unit_display_name, assessed_date, k_total, p_total, a_total)
  values (v_paper.teacher_id, v_paper.subject, v_paper.grade_level, v_paper.classroom,
          v_paper.academic_term, v_unit_name, v_unit_name, v_paper.exam_date,
          v_paper.k_total, v_paper.p_total, v_paper.a_total);

  insert into public.unit_assessments
        (teacher_id, student_id, student_name, subject, grade_level, classroom,
         academic_term, unit_name, assessed_date, assessment_kind,
         k_score, k_total, p_score, p_total, a_score, a_total, score, total_score)
  select v_paper.teacher_id, r.student_id, r.student_name,
         v_paper.subject, v_paper.grade_level, v_paper.classroom,
         v_paper.academic_term, v_unit_name, v_paper.exam_date, v_paper.exam_type,
         r.k_score, v_paper.k_total, r.p_score, v_paper.p_total,
         r.a_score, v_paper.a_total, r.total, v_paper.total_score
  from public.exam_student_results r
  where r.paper_id = p_paper_id and not r.is_absent;

  get diagnostics v_count = row_count;

  update public.exam_student_results set synced_at = now() where paper_id = p_paper_id;
  update public.exam_papers set status = 'synced', updated_at = now() where id = p_paper_id;

  return v_count;
end;
$function$;

create or replace view public.v_student_scores_all
with (security_invoker = on) as
select
  'unit'::text              as source,
  ua.academic_term, ua.grade_level, ua.classroom, ua.subject,
  ua.student_id, ua.student_name,
  ua.unit_name              as item_name,
  ua.assessed_date,
  ua.teacher_id,
  ua.k_score, ua.k_total, ua.p_score, ua.p_total, ua.a_score, ua.a_total,
  ua.score, ua.total_score,
  round(100.0 * ua.score / nullif(ua.total_score, 0), 2) as pct,
  false                     as is_absent,
  ua.id                     as source_id
from public.unit_assessments ua
where ua.assessment_kind = 'unit'
union all
select
  ep.exam_type,
  ep.academic_term, ep.grade_level, ep.classroom, ep.subject,
  r.student_id, r.student_name,
  coalesce(ep.subject_display, ep.subject) || ' (' || ep.exam_type || ')',
  ep.exam_date,
  ep.teacher_id,
  r.k_score, ep.k_total, r.p_score, ep.p_total, r.a_score, ep.a_total,
  r.total, ep.total_score,
  case when r.is_absent then null
       else round(100.0 * r.total / nullif(ep.total_score, 0), 2) end,
  r.is_absent,
  r.id
from public.exam_student_results r
join public.exam_papers ep on ep.id = r.paper_id;

comment on view public.v_student_scores_all is
  'คะแนนทุกชนิดต่อคน: หน่วย (unit_assessments, kind=unit) + สอบ (exam_*) — ไม่อ่านสำเนาสอบใน unit_assessments จึงไม่นับซ้ำ';
