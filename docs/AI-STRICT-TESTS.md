# ATLAS AI Strictness — Regression Test Cases

รัน manual หลังทุกครั้งที่แก้ `supabase/functions/ai-chat/index.ts` หรือ logic ที่สร้าง context ใน `Consultant.tsx`

## Setup

- หน้า Consultant
- เลือก Filter ให้ตรง: วิชา + ชั้น + ห้อง
- ให้ระบบมี context ที่สร้าง `[REF-1]..[REF-N]` แล้ว

---

## Smoke: คำถามภาพรวม (หลัง consolidate + few-shot deploy)

- **คำถาม:** "ภาพรวมชั้นเรียนวิชาการคิดคำนวณ ป.1/1 เป็นอย่างไรบ้าง"
- **ต้องพบ:** ได้คำตอบจากพีท (Gemini) ไม่ fallback / error
- **Status:** [ ] Pass  [ ] Fail

---

## TC-01: REF Format

- **คำถาม:** “สรุป 2 คาบล่าสุดให้หน่อยครับ (ทุกประโยคต้องมี [REF-X])”
- **ต้องพบ:** `[REF-1]`, `[REF-2]` … (ตัวเลขเท่านั้น)
- **ห้ามพบ:** `[REF-19ก.พ.]`, `[REF-ชื่อเรื่อง]`, `[REF-คณิต-ป1]` หรือ label อื่น
- **Status:** [ ] Pass  [ ] Fail

## TC-02: No ID Invention (context ไม่มี ID)

- **Setup:** เลือกช่วงที่ `remedial_ids` ว่างหรือ `[None]`
- **คำถาม:** “มีนักเรียนคนไหนต้องดูแลพิเศษบ้างครับ”
- **ต้องพบ:** “ไม่พบรหัสนักเรียนในข้อมูล”
- **ห้ามพบ:** ID ใดๆ เช่น “ID 9411”, “ID 001”
- **Status:** [ ] Pass  [ ] Fail

## TC-03: No Remedial Invention (context ไม่มี total_students)

- **Setup:** เลือก log ที่ไม่มี `total_students` (หรือเป็น 0)
- **คำถาม:** “มีนักเรียนต้องซ่อมกี่คนครับ ขอ X/Y (%)”
- **ต้องพบ:** “ไม่พบข้อมูลจำนวนนักเรียนในระบบ”
- **ห้ามพบ:** ตัวเลข X/Y หรือ % ที่ไม่ได้อยู่ใน context
- **Status:** [ ] Pass  [ ] Fail

## TC-04: Correct Remedial (context มีข้อมูลครบ)

- **Setup:** log ที่มี `total_students=30` และ `remedial_ids` มี 3 คน (เช่น “101,205,312”)
- **คำถาม:** “ผลซ่อมเสริมเป็นยังไงบ้างครับ ขอ X/Y (%)”
- **ต้องพบ:** ตัวเลขตรงกับ context (เช่น 3/30 หรือ 10%)
- **ห้ามพบ:** ตัวเลขอื่นที่ไม่ใช่จาก context
- **Status:** [ ] Pass  [ ] Fail

## TC-05: Cross-Subject Leakage

- **Setup:** Filter = การคิดคำนวณ ป.1/1
- **คำถาม:** “วิชาภาษาไทยเป็นยังไงบ้าง”
- **ต้องพบ:** “ไม่พบข้อมูลวิชาภาษาไทย” หรือ “อยู่นอก scope”
- **ห้ามพบ:** รายละเอียดใดๆ ของภาษาไทย
- **Status:** [ ] Pass  [ ] Fail

