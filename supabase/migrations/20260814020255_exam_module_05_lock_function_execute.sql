-- ฟังก์ชันทั้งสองเป็น SECURITY DEFINER จึงข้าม RLS ได้
-- ค่าเริ่มต้นของ Postgres ให้สิทธิ์ EXECUTE แก่ PUBLIC ซึ่งรวม anon (ผู้ไม่ได้ล็อกอิน)
-- ถ้าปล่อยไว้ ผู้ไม่ได้ล็อกอินจะเรียก fn_exam_sync_to_atlas เพื่อเขียนทับ unit_assessments ได้
revoke execute on function public.fn_exam_rollup(uuid)        from public, anon;
revoke execute on function public.fn_exam_sync_to_atlas(uuid) from public, anon;

grant execute on function public.fn_exam_rollup(uuid)        to authenticated, service_role;
grant execute on function public.fn_exam_sync_to_atlas(uuid) to authenticated, service_role;
