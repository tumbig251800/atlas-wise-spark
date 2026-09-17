-- ===== helper: ครูประจำชั้น (ทะเบียน + classroom_homerooms) ใช้ร่วมทุกโมดูล =====
create or replace function public.fn_is_homeroom(p_term text, p_grade text, p_classroom text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.students s
                 where s.grade_level = p_grade and s.classroom = p_classroom and s.is_active
                   and s.teacher_id = auth.uid())
      or exists (select 1 from public.classroom_homerooms h
                 where h.academic_term = p_term and h.grade_level = p_grade and h.classroom = p_classroom
                   and h.teacher_id = auth.uid());
$$;

create or replace function public.fn_reading_is_homeroom(p_round_id uuid, p_classroom text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.reading_rounds r
                 where r.id = p_round_id
                   and public.fn_is_homeroom(r.academic_term, r.grade_level, p_classroom));
$$;

-- ===== helper: exam =====
-- เห็น: admin/director/lead ทุกชุด · ครูเจ้าของวิชา · ครูประจำชั้นของห้องนั้น
create or replace function public.fn_exam_can_view_row(p_term text, p_grade text, p_classroom text, p_teacher uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.fn_reading_can_view_all()
      or p_teacher = auth.uid()
      or public.fn_is_homeroom(p_term, p_grade, p_classroom);
$$;

-- แก้: admin/director ทุกชุด · ครูเจ้าของวิชาหรือครูประจำชั้น เฉพาะชุดที่ยังไม่ synced (lead ไม่ได้ ยกเว้นเป็นเจ้าของ/ครูประจำชั้นเอง)
create or replace function public.fn_exam_can_edit_row(p_term text, p_grade text, p_classroom text, p_teacher uuid, p_status text)
returns boolean language sql stable security definer set search_path = public as $$
  select public.fn_reading_is_admin()
      or (p_status <> 'synced'
          and (p_teacher = auth.uid() or public.fn_is_homeroom(p_term, p_grade, p_classroom)));
$$;

create or replace function public.fn_exam_can_view(p_paper_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.exam_papers ep where ep.id = p_paper_id
                 and public.fn_exam_can_view_row(ep.academic_term, ep.grade_level, ep.classroom, ep.teacher_id));
$$;

create or replace function public.fn_exam_can_edit(p_paper_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.exam_papers ep where ep.id = p_paper_id
                 and public.fn_exam_can_edit_row(ep.academic_term, ep.grade_level, ep.classroom, ep.teacher_id, ep.status));
$$;

revoke all on function public.fn_is_homeroom(text,text,text), public.fn_exam_can_view_row(text,text,text,uuid),
  public.fn_exam_can_edit_row(text,text,text,uuid,text), public.fn_exam_can_view(uuid), public.fn_exam_can_edit(uuid) from public, anon;
grant execute on function public.fn_is_homeroom(text,text,text), public.fn_exam_can_view_row(text,text,text,uuid),
  public.fn_exam_can_edit_row(text,text,text,uuid,text), public.fn_exam_can_view(uuid), public.fn_exam_can_edit(uuid) to authenticated;

-- ===== exam_papers =====
drop policy if exists exam_papers_read on public.exam_papers;
drop policy if exists exam_papers_write on public.exam_papers;
create policy exam_papers_select on public.exam_papers for select to authenticated
  using (public.fn_exam_can_view_row(academic_term, grade_level, classroom, teacher_id));
create policy exam_papers_insert on public.exam_papers for insert to authenticated
  with check (public.fn_reading_is_admin());
create policy exam_papers_update on public.exam_papers for update to authenticated
  using (public.fn_exam_can_edit_row(academic_term, grade_level, classroom, teacher_id, status))
  with check (public.fn_exam_can_edit_row(academic_term, grade_level, classroom, teacher_id, status));
create policy exam_papers_delete on public.exam_papers for delete to authenticated
  using (public.fn_reading_is_admin());

-- ครูแก้ข้อมูลได้ แต่ห้ามย้ายเจ้าของ/ห้อง/ชั้น/เทอม/ชนิดสอบ
create or replace function public.fn_exam_papers_guard_keys()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.fn_reading_is_admin()
     and (new.teacher_id is distinct from old.teacher_id
          or new.classroom is distinct from old.classroom
          or new.grade_level is distinct from old.grade_level
          or new.academic_term is distinct from old.academic_term
          or new.subject is distinct from old.subject
          or new.exam_type is distinct from old.exam_type) then
    raise exception 'เปลี่ยนเจ้าของ ห้อง ชั้น เทอม วิชา หรือชนิดสอบ ได้เฉพาะผู้ดูแลระบบ';
  end if;
  return new;
end $$;
drop trigger if exists trg_exam_papers_guard_keys on public.exam_papers;
create trigger trg_exam_papers_guard_keys before update on public.exam_papers
  for each row execute function public.fn_exam_papers_guard_keys();

-- ===== ตารางลูก (ผูกด้วย paper_id) =====
do $$
declare t text;
begin
  foreach t in array array['exam_student_results','exam_items','exam_item_scores'] loop
    execute format('drop policy if exists %I on public.%I', t||'_read', t);
    execute format('drop policy if exists %I on public.%I', t||'_write', t);
    execute format('create policy %I on public.%I for select to authenticated using (public.fn_exam_can_view(paper_id))', t||'_select', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.fn_exam_can_edit(paper_id))', t||'_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using (public.fn_exam_can_edit(paper_id)) with check (public.fn_exam_can_edit(paper_id))', t||'_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using (public.fn_reading_is_admin())', t||'_delete', t);
  end loop;
end $$;

-- ===== exam_subject_map: อ่านได้ทุกคน แก้เฉพาะ admin =====
drop policy if exists exam_subject_map_read on public.exam_subject_map;
drop policy if exists exam_subject_map_write on public.exam_subject_map;
create policy exam_subject_map_select on public.exam_subject_map for select to authenticated using (true);
create policy exam_subject_map_admin_write on public.exam_subject_map for all to authenticated
  using (public.fn_reading_is_admin()) with check (public.fn_reading_is_admin());

-- ===== ฟังก์ชัน SECURITY DEFINER: ตรวจสิทธิ์ก่อน (auth.uid() null = service_role/หลังบ้าน) =====
CREATE OR REPLACE FUNCTION public.fn_exam_rollup(p_paper_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_paper  public.exam_papers%rowtype;
  v_count  integer;
begin
  select * into v_paper from public.exam_papers where id = p_paper_id;
  if not found then
    raise exception 'ไม่พบชุดข้อสอบ id=%', p_paper_id;
  end if;
  if auth.uid() is not null and not public.fn_exam_can_edit(p_paper_id) then
    raise exception 'ไม่มีสิทธิ์ประมวลผลชุดข้อสอบนี้ (id=%)', p_paper_id using errcode = '42501';
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
$function$;

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
  if auth.uid() is not null and not public.fn_exam_can_edit(p_paper_id) then
    raise exception 'ไม่มีสิทธิ์ส่งคะแนนชุดข้อสอบนี้เข้า ATLAS (id=%)', p_paper_id using errcode = '42501';
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
