-- กันซ้ำ: นักเรียน 1 คน × วิชา 1 × หน่วย 1 × ภาคเรียน 1 = 1 แถวเสมอ
-- ที่มา: 16 ก.ย. 2569 พบการนำเข้าซ้ำ/สลับห้องของ ป.3 (แก้แล้ว, สำรองไว้ใน zz_fix_p3kbw_backup_20260916
-- และ zz_fix_p3_calc_u1_backup_20260916) — index นี้ทำให้การนำเข้าซ้ำรอบหน้า error ทันทีแทนที่จะเงียบ
create unique index if not exists uq_unit_assessments_student_subject_unit_term
  on public.unit_assessments (student_id, subject, unit_name, academic_term);

comment on index public.uq_unit_assessments_student_subject_unit_term is
  'กันบันทึกซ้ำ: student_id+subject+unit_name+academic_term ต้องไม่ซ้ำ (เพิ่ม 16 ก.ย. 2569 หลังล้างข้อมูล ป.3)';
