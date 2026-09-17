alter view public.v_teacher_accuracy_real set (security_invoker = on);
revoke all on public.v_teacher_accuracy_real from anon;
revoke insert, update, delete, truncate, references, trigger on public.v_teacher_accuracy_real from authenticated;
grant select on public.v_teacher_accuracy_real to authenticated;

-- view อื่นในชุดนี้: ไม่ให้ anon อ่าน/เขียน (ตารางต้นทาง anon ไม่มี policy อยู่แล้ว แต่ปิด grant ให้ชัด)
revoke all on public.v_student_scores_all, public.v_exam_remedial_candidates, public.v_exam_item_difficulty,
              public.v_reading_progress, public.v_reading_at_risk, public.v_reading_class_summary from anon;
revoke all on public.exam_papers, public.exam_student_results, public.exam_items, public.exam_item_scores,
              public.exam_subject_map, public.reading_rounds, public.reading_results, public.classroom_homerooms from anon;
