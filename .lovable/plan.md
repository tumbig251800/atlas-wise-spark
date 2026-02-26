

## แผนแก้ไข 3 เรื่องรวม — แบ่งเป็น 3 เฟส

---

### เฟส 1: แก้ Date Parser (DD/MM/YYYY Thai Format)

**ไฟล์**: `src/lib/csvImport.ts`

**ปัญหา**: ฟังก์ชัน `toISODate()` ใช้ heuristic ว่า ถ้าทั้ง a และ b <= 12 จะถือว่า a = month, b = day (แบบ MM/DD) แต่ CSV ไทยใช้ DD/MM/YYYY เสมอ ทำให้ "09/02/2569" กลายเป็น 2026-09-02 แทนที่จะเป็น 2026-02-09

**แก้ไข**: เปลี่ยน default fallback เมื่อทั้งสองค่า <= 12 ให้ใช้ DD/MM (Thai convention) แทน MM/DD

```text
ก่อนแก้:  when both <= 12 → month = a, day = b  (MM/DD)
หลังแก้:  when both <= 12 → day = a, month = b   (DD/MM)
```

แก้ 2 จุดในฟังก์ชัน `toISODate()`:
- บรรทัด 146-148: เปลี่ยน else block เป็น `day = a; month = b;`
- บรรทัด 168-170: เปลี่ยน else block เป็น `day = a; month = b;`

---

### เฟส 2: เพิ่มปุ่มลบในหน้า History

**ไฟล์**: `src/pages/History.tsx`

**เพิ่ม**:
1. ปุ่ม "ลบ" (ไอคอน Trash2) ในแต่ละการ์ดบันทึก ถัดจากปุ่ม "ดูรายละเอียด"
2. AlertDialog ยืนยันก่อนลบ เพื่อป้องกันการลบผิด
3. ลบแบบ cascade: ลบ `diagnostic_events`, `remedial_tracking`, `strike_counter`, `pivot_events` ที่เกี่ยวข้องก่อน แล้วค่อยลบ `teaching_logs`
4. อัปเดต state หลังลบสำเร็จ + invalidate queries

**ข้อจำกัด RLS ปัจจุบัน**: 
- `teaching_logs` — teacher สามารถ DELETE ได้ ✅
- `diagnostic_events`, `remedial_tracking`, `pivot_events` — ไม่มี DELETE policy ❌
- `strike_counter` — ไม่มี DELETE policy ❌

**ต้องเพิ่ม RLS policies** (migration):
```sql
-- ให้ teacher ลบ diagnostic_events ของตัวเอง
CREATE POLICY "Teachers can delete own diagnostic events"
  ON diagnostic_events FOR DELETE
  USING (teacher_id = auth.uid());

-- ให้ teacher ลบ remedial_tracking ของตัวเอง  
CREATE POLICY "Teachers can delete own remedial tracking"
  ON remedial_tracking FOR DELETE
  USING (teacher_id = auth.uid());

-- ให้ teacher ลบ strike_counter ของตัวเอง
CREATE POLICY "Teachers can delete own strikes"
  ON strike_counter FOR DELETE
  USING (teacher_id = auth.uid());

-- ให้ teacher ลบ pivot_events ของตัวเอง
CREATE POLICY "Teachers can delete own pivot events"
  ON pivot_events FOR DELETE
  USING (teacher_id = auth.uid());
```

**UI Flow**:
```text
[การ์ด] → คลิก 🗑️ → AlertDialog "ยืนยันลบบันทึก วันที่ XX วิชา YY?"
  → ยืนยัน → ลบ related records → ลบ teaching_log → toast "ลบสำเร็จ"
  → ยกเลิก → ปิด dialog
```

---

### เฟส 3: Loading Guard สำหรับ Phase 4 Panels

**ไฟล์**: `src/pages/Executive.tsx`

**ปัญหา**: Strike Escalation แสดง (0) ขณะที่ข้อมูลยังโหลดอยู่

**แก้ไข**: เพิ่ม `diagLoading` check ก่อน render Phase 4 panels (บรรทัด 178-183)

```text
ก่อน:  แสดง panels เลย แม้ diagLoading = true
หลัง:  ถ้า diagLoading → แสดง Skeleton, ถ้าไม่ → แสดง panels
```

---

### สรุปไฟล์ที่ต้องแก้

| เฟส | ไฟล์ | การเปลี่ยนแปลง |
|-----|------|----------------|
| 1 | `src/lib/csvImport.ts` | แก้ toISODate() default DD/MM |
| 2 | `src/pages/History.tsx` | เพิ่มปุ่มลบ + AlertDialog + cascade delete |
| 2 | Migration SQL | เพิ่ม DELETE RLS policies 4 ตาราง |
| 3 | `src/pages/Executive.tsx` | เพิ่ม diagLoading guard |

### ขั้นตอนหลังแก้ไข
1. ลบข้อมูลวันที่ผิดผ่านปุ่มลบใหม่ในหน้า History
2. Re-import CSV — วันที่จะถูกต้อง + ชื่อครูจะดึงจากคอลัมน์ "รหัสครู" (teacher_name mapping มีอยู่แล้วในระบบ)
3. ตรวจสอบ Executive Dashboard ว่า Strike Escalation แสดงข้อมูล

