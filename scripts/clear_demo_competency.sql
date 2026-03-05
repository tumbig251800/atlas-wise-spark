-- ลบข้อมูลสมรรถนะ (unit_assessments)
-- รันใน Supabase SQL Editor ถ้าต้องการลบผ่าน SQL
-- หรือใช้ปุ่ม "ล้างข้อมูลสมรรถนะทั้งหมด" ในแอป (อัปโหลด CSV → แท็บ คะแนนประเมิน)

-- แบบที่ 1: ลบทั้งหมดของครูคนนี้ (ใส่ teacher_id = user id ของคุณ)
-- DELETE FROM unit_assessments WHERE teacher_id = 'YOUR_USER_ID';

-- แบบที่ 2: ลบเฉพาะ demo ป.4/1 เทอม 1/2568
-- DELETE FROM unit_assessments
-- WHERE grade_level = 'ป.4' AND classroom = '1' AND academic_term = '1/2568'
--   AND student_id IN ('ST001', 'ST002', 'ST003', 'ST004', 'ST005')
--   AND teacher_id = 'YOUR_USER_ID';
