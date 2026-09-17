-- ============================================================
-- ปัญหา: WF-8 สร้าง suggestion_key โดยตัดชื่อวิชาเหลือ 8 ตัวอักษรแรก
--        ทำให้วิชาที่ขึ้นต้นเหมือนกันได้ key ชนกัน เช่น
--          "การอ่านและการเขียนเพื่อการสื่อสาร"
--          "การอ่านและการเขียนเพื่อการสื่อสารภาษาอังกฤษ"
--        ทั้งคู่ตัดเหลือ "การอ่านแ" -> key เดียวกัน
--        ผลคือ ON CONFLICT (suggestion_key) DO NOTHING ทำให้หัวข้อหนึ่งหายเงียบ
--        (ทดสอบแล้วว่าตัด 24 ตัวก็ยังชน เพราะต่างกันที่ท้ายคำ)
-- แก้: ใช้ชื่อวิชาเต็มไม่ตัด (ยาวสุด 86 ตัวอักษร) + backfill key เดิมให้เป็นรูปแบบใหม่
-- ต้องแก้คู่กับโหนด "Code: Rank & Build Keys" ใน n8n WF-8 (bvcqFkIOvFPEnsAR)
--
-- ตรวจก่อนแล้ว (dry run): 30 แถว -> 30 key ไม่ซ้ำ · candidate 19 -> 19 key ไม่ซ้ำ
--   · จำนวน candidate ที่ตรงกับ key เดิมยังเป็น 9 เท่าเดิม
--     = พฤติกรรมการกันเสนอซ้ำไม่เปลี่ยน ไม่มีครูถูกเสนอหัวข้อเดิมซ้ำ
-- ============================================================

UPDATE classroom_research_suggestions c
   SET suggestion_key = n.new_key,
       updated_at     = c.updated_at   -- คงค่าเดิม ไม่ให้ AbandonedRepropose นับวันใหม่
  FROM (
    SELECT id,
      CASE WHEN suggestion_key LIKE p_old || '%'
           THEN p_new || substring(suggestion_key from length(p_old) + 1)
           ELSE suggestion_key END AS new_key
    FROM (
      SELECT id, suggestion_key,
        'RSRCH-2569-1-' || replace(grade_level,'.','') || '-' || classroom || '-' ||
          upper(substring(regexp_replace(subject,'\s+','','g'),1,8))  AS p_old,
        'RSRCH-2569-1-' || replace(grade_level,'.','') || '-' || classroom || '-' ||
          upper(regexp_replace(subject,'\s+','','g'))                 AS p_new
      FROM classroom_research_suggestions
      WHERE academic_term = '2569-1'
    ) s
  ) n
 WHERE c.id = n.id
   AND c.suggestion_key <> n.new_key;
