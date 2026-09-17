-- แก้: unit_assessment_setups.total_score เป็นคอลัมน์ GENERATED ALWAYS (= k_total+p_total+a_total)
-- จึงห้ามระบุค่าใน INSERT  ฐานคำนวณให้เอง
create or replace function public.fn_exam_sync_to_atlas(p_paper_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
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

  delete from public.remedial_tracking
   where academic_term = v_paper.academic_term and unit_name = v_unit_name
     and subject = v_paper.subject and grade_level = v_paper.grade_level
     and classroom = v_paper.classroom;

  -- total_score ถูกตัดออกโดยตั้งใจ เพราะเป็นคอลัมน์ generated
  insert into public.unit_assessment_setups
        (teacher_id, subject, grade_level, classroom, academic_term,
         unit_name, unit_display_name, assessed_date,
         k_total, p_total, a_total)
  values (v_paper.teacher_id, v_paper.subject, v_paper.grade_level, v_paper.classroom,
          v_paper.academic_term, v_unit_name, v_unit_name, v_paper.exam_date,
          v_paper.k_total, v_paper.p_total, v_paper.a_total);

  insert into public.unit_assessments
        (teacher_id, student_id, student_name, subject, grade_level, classroom,
         academic_term, unit_name, assessed_date,
         k_score, k_total, p_score, p_total, a_score, a_total, score, total_score)
  select v_paper.teacher_id, r.student_id, r.student_name,
         v_paper.subject, v_paper.grade_level, v_paper.classroom,
         v_paper.academic_term, v_unit_name, v_paper.exam_date,
         r.k_score, v_paper.k_total, r.p_score, v_paper.p_total,
         r.a_score, v_paper.a_total, r.total, v_paper.total_score
  from public.exam_student_results r
  where r.paper_id = p_paper_id and not r.is_absent;

  get diagnostics v_count = row_count;

  insert into public.remedial_tracking
        (student_id, status, teacher_id, grade_level, classroom, subject,
         academic_term, term, unit_name, recorded_at)
  select r.student_id, 'stay', v_paper.teacher_id, v_paper.grade_level,
         v_paper.classroom, v_paper.subject, v_paper.academic_term,
         v_paper.academic_term, v_unit_name, now()
  from public.exam_student_results r
  where r.paper_id = p_paper_id and r.result = 'stay' and not r.is_absent;

  update public.exam_student_results set synced_at = now() where paper_id = p_paper_id;
  update public.exam_papers set status = 'synced', updated_at = now() where id = p_paper_id;

  return v_count;
end;
$$;

revoke execute on function public.fn_exam_sync_to_atlas(uuid) from public, anon;
grant  execute on function public.fn_exam_sync_to_atlas(uuid) to authenticated, service_role;
