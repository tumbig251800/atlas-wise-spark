-- เหตุผลที่ตัดการเขียน remedial_tracking ออกจาก fn_exam_sync_to_atlas
--   1) teaching_log_id เป็น NOT NULL + FK ไป teaching_logs (ON DELETE CASCADE)
--      ผลสอบไม่ได้เกิดจากคาบสอนคาบใดคาบหนึ่ง จึงไม่มี log ที่จะอ้างอิงได้จริง
--      ถ้าฝืนผูกกับ log สุ่ม ๆ  พอ log นั้นถูกลบ แถวซ่อมเสริมจะหายตามไปด้วย
--   2) มี UNIQUE (student_id, subject, grade_level, academic_term)
--      คือนักเรียน 1 คนมีแถวซ่อมเสริมได้แค่ 1 แถวต่อวิชาต่อเทอม
--      ถ้าผลสอบเขียนทับ จะไปชนกับคิวซ่อมเสริมที่มาจากบันทึกหลังสอน (258 แถวที่มีอยู่)
--      กลายเป็นสองระบบแย่งเขียนช่องเดียวกัน
-- จึงเก็บผลไว้ที่ exam_student_results.result แล้วเปิดเป็น view ให้ฝ่ายวิชาการดูแทน
-- ถ้าภายหลังต้องการให้รวมเข้าคิวเดียวกันจริง ๆ ค่อยตัดสินใจแก้ข้อจำกัดสองข้อข้างต้น

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

  insert into public.unit_assessment_setups
        (teacher_id, subject, grade_level, classroom, academic_term,
         unit_name, unit_display_name, assessed_date, k_total, p_total, a_total)
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

  update public.exam_student_results set synced_at = now() where paper_id = p_paper_id;
  update public.exam_papers set status = 'synced', updated_at = now() where id = p_paper_id;

  return v_count;
end;
$$;

revoke execute on function public.fn_exam_sync_to_atlas(uuid) from public, anon;
grant  execute on function public.fn_exam_sync_to_atlas(uuid) to authenticated, service_role;

-- คิวซ่อมเสริมที่มาจากผลสอบ พร้อมบอกว่าชนกับคิวเดิมจากบันทึกหลังสอนหรือไม่
create or replace view public.v_exam_remedial_candidates
with (security_invoker = on) as
select
  p.academic_term, p.exam_type, p.grade_level, p.classroom, p.subject,
  p.teacher_name, r.student_id, r.student_name,
  r.k_score, r.p_score, r.a_score, r.total, p.total_score,
  round(r.total / nullif(p.total_score,0), 3) as pct,
  r.gap_flag,
  rt.status as existing_remedial_status,
  case when rt.id is null then 'ยังไม่มีในคิวซ่อมเสริม' else 'มีอยู่แล้วจากบันทึกหลังสอน' end as queue_state
from public.exam_student_results r
join public.exam_papers p on p.id = r.paper_id
left join public.remedial_tracking rt
       on rt.student_id = r.student_id and rt.subject = p.subject
      and rt.grade_level = p.grade_level and rt.academic_term = p.academic_term
where r.result = 'stay' and not r.is_absent;
