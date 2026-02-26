

# แผนแก้ไข: Admin อัปโหลด CSV แทนครู — แสดงชื่อผู้สอนจริงแทนชื่อ Admin

## สาเหตุของปัญหา

ปัจจุบัน `UploadCSV.tsx` บรรทัด 45 ใช้ `teacher_id: user.id` (คือ ID ของคนที่ Login อยู่) ทุกแถว ดังนั้นเมื่อ Admin อัปโหลดไฟล์ของครูวรกานต์ ข้อมูลทั้งหมดจะผูกกับ Admin → แสดงชื่อ Admin ทุกที่

## แนวทางแก้ไข

เพิ่มคอลัมน์ `teacher_name` ในตาราง `teaching_logs` เพื่อเก็บชื่อครูผู้สอนจริงจากไฟล์ CSV โดยไม่ต้องเปลี่ยน `teacher_id` (ยังคงเป็น ID ของผู้อัปโหลด เพื่อให้ RLS ทำงานได้ถูกต้อง)

เหตุผลที่ไม่ใช้วิธี match teacher_id กับ profiles:
- ครูบางคนอาจยังไม่ได้สมัครบัญชีในระบบ
- ต้องมีระบบจับคู่รหัสครูกับ user_id ซึ่งซับซ้อนเกินไปในตอนนี้
- วิธีเพิ่มคอลัมน์ `teacher_name` เรียบง่าย ปลอดภัย และแก้ปัญหาได้ทันที

## ไฟล์ที่ต้องแก้ (4 ส่วน)

| ส่วน | สิ่งที่ทำ |
|------|-----------|
| Database Migration | เพิ่มคอลัมน์ `teacher_name TEXT` ใน `teaching_logs` |
| `src/lib/csvImport.ts` | เพิ่ม parsing คอลัมน์ "รหัสครูผู้สอน / ชื่อ-สกุล" → `teacher_name` |
| `src/pages/UploadCSV.tsx` | ส่ง `teacher_name` ไปกับ insert |
| `src/pages/History.tsx` | แสดง `teacher_name` ในรายการและ modal |

---

### 1. Database Migration

```sql
ALTER TABLE public.teaching_logs
ADD COLUMN teacher_name TEXT DEFAULT NULL;
```

- ค่าเริ่มต้นเป็น `NULL` → ข้อมูลเก่าไม่กระทบ
- เมื่อครูบันทึกผ่านหน้า Log เอง จะดึงชื่อจาก profiles เหมือนเดิม
- เมื่อ Admin อัปโหลด CSV จะเก็บชื่อครูจากไฟล์ CSV

### 2. csvImport.ts — เพิ่ม parsing ชื่อครู

เพิ่ม key ใน `HEADER_MAP`:
```typescript
teacherName: ["รหัสครู", "ชื่อครู", "ชื่อ-สกุล", "teacher_name", "ผู้สอน"],
```

เพิ่ม field ใน `ParsedCSVRow`:
```typescript
teacher_name: string | null;
```

ใน parsing loop:
```typescript
teacher_name: get("teacherName") || null,
```

### 3. UploadCSV.tsx — ส่ง teacher_name ไปกับ insert

```typescript
teacher_name: row.teacher_name,
```

### 4. History.tsx — แสดงชื่อครูผู้สอน

- ในรายการ card: แสดง `log.teacher_name` ถ้ามี
- ใน modal รายละเอียด: เพิ่มแถว "ผู้สอน" แสดง `teacher_name`

### 5. หน้า Teaching Log (บันทึกเอง) — ส่งชื่อครูจาก profile

เมื่อครูบันทึกผ่าน UI เอง ระบบจะดึง `full_name` จาก profiles มาเก็บใน `teacher_name` ด้วย เพื่อให้ข้อมูลสอดคล้องกันทั้ง 2 ช่องทาง

---

## ผลลัพธ์ที่คาดหวัง

- Admin อัปโหลด CSV ของครูวรกานต์ → หน้า History แสดง "T006 ครูวรกานต์ ศรีไชยวาล" เป็นผู้สอน
- ครูบันทึกเอง → แสดงชื่อจาก profile
- ข้อมูลเก่าที่ไม่มี `teacher_name` → แสดง "—" หรือดึงจาก profile ตามเดิม
- RLS ยังทำงานปกติ (teacher_id ยังเป็น ID ของผู้อัปโหลด)

