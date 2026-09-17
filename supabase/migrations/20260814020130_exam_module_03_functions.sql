create or replace function public.fn_exam_rollup(p_paper_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_paper  public.exam_papers%rowtype;
  v_count  integer;
begin
  select * into v_paper from public.exam_papers where id = p_paper_id;
  if not found then
    raise exception 'ไม่พบชุดข้อสอบ id=%', p_paper_id;
  end if;

  insert into public.exam_student_results
        (paper_id, student_id, student_name, k_score, p_score, a_score, gap_flag, result, updated_at)
  select
      p_paper_id,
      s.student_id,
      trim(coalesce(st.first_name,'') || ' ' || coalesce(st.last_name,'')),
      s.k, s.p, s.a,
      case
        when least(
               case when v_paper.k_total > 0 then s.k / v_paper.k_total else 1 end,
               case when v_paper.p_total > 0 then s.p / v_paper.p_total else 1 end,
               case when v_paper.a_total > 0 then s.a / v_paper.a_total else 1 end
             ) >= v_paper.gap_threshold then 'success'
        when case when v_paper.k_total > 0 then s.k / v_paper.k_total else 1 end
             = least(
               case when v_paper.k_total > 0 then s.k / v_paper.k_total else 1 end,
               case when v_paper.p_total > 0 then s.p / v_paper.p_total else 1 end,
               case when v_paper.a_total > 0 then s.a / v_paper.a_total else 1 end
             ) then 'k-gap'
        when case when v_paper.p_total > 0 then s.p / v_paper.p_total else 1 end
             = least(
               case when v_paper.p_total > 0 then s.p / v_paper.p_total else 1 end,
               case when v_paper.a_total > 0 then s.a / v_paper.a_total else 1 end
             ) then 'p-gap'
        else 'a-gap'
      end,
      case when (s.k + s.p + s.a) >= v_paper.total_score * v_paper.pass_threshold
           then 'pass' else 'stay' end,
      now()
  from (
      select
        sc.student_id,
        coalesce(sum(sc.score) filter (where it.domain = 'K'), 0) as k,
        coalesce(sum(sc.score) filter (where it.domain = 'P'), 0) as p,
        coalesce(sum(sc.score) filter (where it.domain = 'A'), 0) as a
      from public.exam_item_scores sc
      join public.exam_items it
        on it.paper_id = sc.paper_id and it.item_no = sc.item_no
      where sc.paper_id = p_paper_id
      group by sc.student_id
  ) s
  left join public.students st
         on st.student_id = s.student_id and st.is_active
  on conflict (paper_id, student_id) do update set
      k_score      = excluded.k_score,
      p_score      = excluded.p_score,
      a_score      = excluded.a_score,
      student_name = coalesce(excluded.student_name, public.exam_student_results.student_name),
      gap_flag     = excluded.gap_flag,
      result       = excluded.result,
      updated_at   = now();

  get diagnostics v_count = row_count;

  update public.exam_papers set status = 'completed', updated_at = now() where id = p_paper_id;
  return v_count;
end;
$$;

comment on function public.fn_exam_rollup(uuid) is
  'รวมคะแนนรายข้อเป็นผลรายคน ตัดสิน gap (เกณฑ์ 70%) และ pass/stay (เกณฑ์ 50%) รันซ้ำได้';

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

  insert into public.unit_assessment_setups
        (teacher_id, subject, grade_level, classroom, academic_term,
         unit_name, unit_display_name, assessed_date,
         k_total, p_total, a_total, total_score)
  values (v_paper.teacher_id, v_paper.subject, v_paper.grade_level, v_paper.classroom,
          v_paper.academic_term, v_unit_name, v_unit_name, v_paper.exam_date,
          v_paper.k_total, v_paper.p_total, v_paper.a_total, v_paper.total_score);

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

comment on function public.fn_exam_sync_to_atlas(uuid) is
  'ดันผลสอบเข้า unit_assessments/setups/remedial_tracking ใช้ unit_name = สอบกลางภาค <เทอม> รันซ้ำได้ไม่เกิดข้อมูลซ้ำ';
