

## แผนแก้ไขเฟส 4: ชื่อครูผู้สอนใน CSV Upload

### ปัญหา

เมื่อแอดมิน (Director) อัปโหลด CSV แทนครู ระบบทำ 2 อย่างผิด:

1. **`teacher_id`** = ID ของแอดมินที่อัปโหลด (ไม่ใช่ครูจริง)
2. **`teacher_name`** = null เพราะ CSV ตัวอย่างไม่มีคอลัมน์ "รหัสครู"

ผลคือ Dashboard แสดงชื่อแอดมินแทนชื่อครูจริง

### สาเหตุทางเทคนิค

ไฟล์ `src/pages/UploadCSV.tsx` บรรทัด 45:
```text
teacher_id: user.id    ← ใช้ ID ของคนที่กำลังล็อกอิน (แอดมิน)
```

ไฟล์ `src/lib/csvImport.ts` บรรทัด 310:
```text
teacher_name: get("teacherName") || null   ← ถ้า CSV ไม่มีคอลัมน์ "รหัสครู" → null
```

### แผนแก้ไข

**ไฟล์**: `src/pages/UploadCSV.tsx`

**เพิ่ม**:
1. ดึงรายชื่อครูจากตาราง `profiles` (query เฉพาะ user ที่มี role = teacher)
2. เพิ่ม **Dropdown เลือกครูผู้สอน** ก่อนปุ่ม "นำเข้าข้อมูล"
   - แสดงเฉพาะเมื่อผู้ใช้ปัจจุบันเป็น Director
   - ถ้าเป็น Teacher อัปโหลดเอง ใช้ข้อมูลตัวเองอัตโนมัติ
3. เมื่อเลือกครูแล้ว ตอน insert ใช้:
   - `teacher_id` = ID ของครูที่เลือก (ไม่ใช่แอดมิน)
   - `teacher_name` = ชื่อครูจาก profile (fallback ถ้า CSV ไม่มีคอลัมน์ "รหัสครู")
4. ถ้า CSV มีคอลัมน์ "รหัสครู" อยู่แล้ว → ใช้ค่าจาก CSV เป็นหลัก (override dropdown)

**RLS ที่ต้องเพิ่ม** (Migration):
- ตอนนี้ `teaching_logs` INSERT policy ใช้ `teacher_id = auth.uid()` ซึ่งจะ block Director จาก insert ข้อมูลที่ `teacher_id` ไม่ใช่ตัวเอง
- ต้องเพิ่ม INSERT policy ให้ Director:
```sql
CREATE POLICY "Directors can insert logs for any teacher"
  ON teaching_logs FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'director'::app_role));
```
- เพิ่ม INSERT policy เดียวกันสำหรับ `diagnostic_events`, `remedial_tracking`, `strike_counter`, `pivot_events` (เพราะ edge function `atlas-diagnostic` ถูกเรียกด้วย auth ของแอดมิน)

**UI Flow**:
```text
Director เปิดหน้า Upload CSV
  → เลือกไฟล์ CSV
  → Dropdown "ครูผู้สอน:" แสดงรายชื่อครูทั้งหมด
  → เลือก "ครูวรกานต์"
  → กดนำเข้า
  → teacher_id = ID ของครูวรกานต์
  → teacher_name = "วรกานต์ ..." (จาก profile หรือ CSV)
```

### สรุปไฟล์ที่ต้องแก้ (เฟส 4)

| ไฟล์ | การเปลี่ยนแปลง |
|------|----------------|
| `src/pages/UploadCSV.tsx` | เพิ่ม teacher selector dropdown + ใช้ teacher_id ของครูจริง |
| Migration SQL | เพิ่ม INSERT policies ให้ Director บน teaching_logs และตารางที่เกี่ยวข้อง |

### แผนรวมทุกเฟส

| เฟส | สถานะ | รายละเอียด |
|-----|--------|------------|
| 1 | Done | แก้ Date Parser DD/MM |
| 2 | Done | เพิ่มปุ่มลบใน History + RLS |
| 3 | Done | Loading Guard สำหรับ Executive |
| 4 | **ลบตัวกรองวิชาซ้ำใน Strike** | ลบ subject filter ออกจาก StrikeEscalationView |
| 5 | **ชื่อครูใน CSV Upload** | เพิ่ม teacher selector + แก้ teacher_id + RLS |

### ขั้นตอนหลังแก้ไข
1. ลบข้อมูลเก่าผ่านปุ่มลบในหน้า History
2. Re-import CSV โดยเลือกครูวรกานต์จาก dropdown
3. ตรวจสอบว่าชื่อครูแสดงถูกต้องใน Dashboard และ Executive

