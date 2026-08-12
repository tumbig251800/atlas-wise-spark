# Data Schema — โครงสร้างข้อมูล Teaching Logs สำหรับ ATLAS

> ไฟล์นี้กำหนด schema ที่คาดหวังสำหรับ teaching logs
> Agent ต้องตรวจสอบข้อมูลที่ได้รับให้ตรงกับ schema นี้ก่อนวิเคราะห์

---

## ส่วนที่ 1 — Teaching Logs Schema หลัก

### ตาราง / Collection: `teaching_logs`

| Field | ชื่อไทย | ประเภท | Required | ค่าที่รับได้ | หมายเหตุ |
|-------|--------|--------|----------|-------------|---------|
| `id` | รหัส log | string / uuid | ✅ | unique | primary key |
| `teacher_id` | รหัสครู | string | ✅ | unique per teacher | ใช้ unique identifier |
| `teacher_name` | ชื่อครู | string | ✅ | ชื่อ-นามสกุล | ตรวจ duplicate รูปแบบ |
| `teaching_date` | วันที่สอน | date | ✅ | ISO 8601 (YYYY-MM-DD) | ใช้ทำ monthly trend |
| `grade_level` | ช่วงชั้น | string | ✅ | เช่น "ม.1", "ป.4", "ม.4" | |
| `classroom` | ห้องเรียน | string | ⭕ | เช่น "ม.1/3" | ถ้าไม่มีใช้ grade_level แทน |
| `subject` | วิชา | string | ✅ | ชื่อวิชา | normalize ให้ consistent |
| `learning_unit` | หน่วยการเรียนรู้ | string | ⭕ | ชื่อหน่วย | |
| `topic` | หัวข้อ/เรื่อง | string | ⭕ | หัวข้อย่อย | |
| `mastery_score` | คะแนน mastery | integer | ✅ | 1–5 | ดูตาราง mapping ด้านล่าง |
| `major_gap` | Gap หลัก | string | ✅ | ดูค่าที่รับได้ด้านล่าง | Gap หลักที่ครูระบุ |
| `health_care_status` | สถานะ Health Care | boolean / string | ⭕ | true/false หรือ yes/no | ถ้าไม่มีให้ถือว่า false |
| `health_care_ids` | รหัสนักเรียน Health Care | string / array | ⭕ | รหัสนักเรียน | comma-separated หรือ array |
| `remedial_ids` | รหัสนักเรียนที่ต้องซ่อมเสริม | string / array | ⭕ | รหัสนักเรียน | |
| `next_strategy` | กลยุทธ์ครั้งถัดไป | string | ⭕ | ข้อความอิสระ | |
| `reflection` | การสะท้อนคิดของครู | string | ⭕ | ข้อความอิสระ | ตรวจว่าไม่มีข้อมูลดิบปน |
| `created_at` | วันที่บันทึก | datetime | ⭕ | ISO 8601 | |
| `updated_at` | วันที่แก้ไขล่าสุด | datetime | ⭕ | ISO 8601 | |

**หมายเหตุ:** ✅ = บังคับ, ⭕ = เสริม (แต่มีประโยชน์มาก)

---

## ส่วนที่ 2 — Mapping Rules

### mastery_score (1–5)

| ค่า | ความหมาย | Zone | สี |
|-----|---------|------|-----|
| 1 | ต้องการความช่วยเหลือมาก | Red Zone | #dc2626 |
| 2 | ต้องการความช่วยเหลือ | Red Zone | #dc2626 |
| 3 | กำลังพัฒนา | Yellow Zone | #f59e0b |
| 4 | บรรลุเป้าหมาย | Green Zone | #22c55e |
| 5 | เกินคาดหวัง | Green Zone | #22c55e |

```
Red Zone   = mastery_score ≤ 2.5 (สเกล 1–5; ตาม Executive Dashboard / Trend Alerts ของ ATLAS)
             ถ้าในฐานข้อมูลเป็นจำนวนเต็ม 1–5 เท่านั้น ค่าที่ถือเป็น Red Zone คือ 1 และ 2
Yellow Zone = mastery_score = 3
Green Zone  = mastery_score IN (4, 5)
```

### major_gap — ค่าที่รับได้

| ค่าในข้อมูล (ตัวอย่าง) | Map เป็น | ความหมาย |
|----------------------|---------|---------|
| "K-Gap", "k_gap", "K", "ความเข้าใจ", "concept" | `K-Gap` | ช่องว่างด้านความเข้าใจ |
| "P-Gap", "p_gap", "P", "ทักษะ", "practice" | `P-Gap` | ช่องว่างด้านทักษะ |
| "A-Gap", "a_gap", "A", "engagement", "ความพร้อม" | `A-Gap` | ช่องว่างด้านความพร้อม |
| "A2-Gap", "a2_gap", "A2", "safety", "ความปลอดภัย" | `A2-Gap` | ช่องว่างด้านความปลอดภัย |
| "System-Gap", "system_gap", "System", "ระบบ" | `System-Gap` | ช่องว่างด้านระบบ |
| "Success", "success", "สำเร็จ", "ผ่าน", "บรรลุ" | `Success` | สำเร็จตามเป้าหมาย |

> ถ้าพบค่าที่ไม่อยู่ใน list นี้ ให้บันทึกเป็น `Unknown` และ flag ใน Integrity Audit

### health_care_status — การตีความ

| ค่าในข้อมูล | ตีความ |
|------------|--------|
| `true`, `TRUE`, `1`, `"yes"`, `"Y"`, `"มี"` | มี Special Care → แยกออก |
| `false`, `FALSE`, `0`, `"no"`, `"N"`, `"ไม่มี"`, `null`, ว่างเปล่า | ไม่มี Special Care |

### remedial — การตีความ

```
นับว่า "มี Remedial" เมื่อ:
  - remedial_ids ไม่ว่างเปล่า และไม่ใช่ null
  - หรือ next_strategy มีคำว่า "ซ่อมเสริม" / "remedial" / "ติวเพิ่ม"
```

### Success — การตีความ

```
นับว่า "Success" เมื่อ:
  - major_gap map เป็น "Success"
  - หรือ mastery_score >= 4 และ major_gap ไม่ใช่ A-Gap หรือ A2-Gap
```

---

## ส่วนที่ 3 — ตาราง unit_assessments (Optional)

> ถ้ามีข้อมูลนี้ ให้ใช้ทำ Student Portfolio หรือสรุปหลังหน่วย
> ถ้าไม่มี ให้ระบุใน Method Notes ว่า "ไม่มีข้อมูล unit_assessments" **ห้ามสร้างข้อมูลเอง**

| Field | ประเภท | Required | หมายเหตุ |
|-------|--------|----------|---------|
| `id` | string | ✅ | |
| `teacher_id` | string | ✅ | FK → teaching_logs |
| `teaching_date` | date | ✅ | วันที่ประเมินหลังหน่วย |
| `subject` | string | ✅ | |
| `grade_level` | string | ✅ | |
| `unit_name` | string | ✅ | ชื่อหน่วย |
| `pass_count` | integer | ✅ | จำนวนนักเรียนผ่าน |
| `total_count` | integer | ✅ | จำนวนนักเรียนทั้งหมด |
| `pass_rate` | float | ⭕ | คำนวณจาก pass/total ได้ |
| `notes` | string | ⭕ | |

---

## ส่วนที่ 4 — แหล่งข้อมูลที่รองรับ (Source Adaptors)

### CSV / TSV

```
คาดหวัง:
  - บรรทัดแรกเป็น header (ชื่อ field)
  - Encoding: UTF-8 (รองรับภาษาไทย)
  - ตัวคั่น: comma (,) หรือ tab (\t)
  - วันที่รูปแบบ: YYYY-MM-DD หรือ DD/MM/YYYY

ถ้า header ไม่ตรงกับ schema:
  - ให้ map ชื่อ column ก่อน
  - รายงานการ mapping ให้ผู้ใช้ทราบ
```

### JSON / JSON Lines

```
รูปแบบที่รองรับ:
  - Array of objects: [{ "teacher_id": "T001", ... }, ...]
  - JSON Lines: แต่ละบรรทัดเป็น object อิสระ
  - Nested: ถ้า field อยู่ใน nested object ให้ flatten ก่อน

ตัวอย่าง: { "teacher": { "id": "T001", "name": "ครูสมชาย" } }
  → flatten เป็น teacher_id: "T001", teacher_name: "ครูสมชาย"
```

### Excel (.xlsx)

```
คาดหวัง:
  - sheet แรก หรือ sheet ชื่อ "teaching_logs" / "data" / "บันทึก"
  - แถวแรกเป็น header
  - ไม่มี merged cells ในส่วนข้อมูล
```

### Google Sheets

```
รับเป็น:
  - URL ของ sheet (ต้องให้สิทธิ์ read ก่อน)
  - หรือ export เป็น CSV แล้วใช้ adaptor CSV

หมายเหตุ: ถ้าใช้ Google Sheets API ต้องให้ผู้ใช้จัดการ credential เอง
ห้าม hard-code Google credential ในไฟล์ใดๆ
```

### Supabase Export

```
วิธีที่แนะนำ:
  1. ให้ผู้ใช้ export เป็น CSV จาก Supabase Dashboard
  2. หรือใช้ query SQL แล้ว export
  
ห้าม:
  - Hard-code Supabase URL หรือ anon key
  - Hard-code service role key

ถ้าต้องการ query ตรง:
  - ให้ผู้ใช้ระบุ credential ที่ runtime
  - ใช้ environment variable เท่านั้น
```

---

## ส่วนที่ 5 — Data Validation Rules

### ก่อนวิเคราะห์ ต้องตรวจสอบ:

```
1. Required fields ครบหรือไม่
   Missing: teacher_id, teacher_name, teaching_date, subject, mastery_score, major_gap
   → ถ้าขาด: รายงานและถามผู้ใช้ว่าจะดำเนินการอย่างไร

2. mastery_score อยู่ในช่วง 1–5
   → ถ้าออกนอกช่วง: flag INT-06 ใน Integrity Audit

3. teaching_date parse ได้หรือไม่
   → ถ้าไม่ได้: flag INT-07

4. major_gap map ได้หรือไม่
   → ถ้าไม่ได้: map เป็น "Unknown" และ flag

5. ชื่อครู normalize
   → ตัดช่องว่างหน้า-หลัง
   → ตรวจหาชื่อที่คล้ายกัน (เช่น "ครูสมชาย" vs "นายสมชาย ใจดี")
   → flag INT-04 ถ้าพบ

6. Log ซ้ำ
   → ตรวจ (teacher_id + teaching_date + subject) ซ้ำหรือไม่
   → flag INT-08 ถ้าพบ
```

### กฎ Null / Empty handling

| Field | ถ้าว่าง/null | การจัดการ |
|-------|------------|---------|
| `health_care_status` | ถือว่า `false` | ไม่ flag |
| `health_care_ids` | ถือว่าไม่มี Special Care | ไม่ flag |
| `remedial_ids` | ถือว่าไม่มี remedial | ไม่ flag |
| `classroom` | ใช้ `grade_level` แทน | ไม่ flag |
| `reflection` | ถือว่าไม่มีข้อมูล | ไม่ flag |
| `major_gap` | **Flag INT-09** | flag และรายงาน |
| `mastery_score` | **ข้ามแถวนั้น** | flag และรายงาน |
| `teaching_date` | **ข้ามแถวนั้น** | flag และรายงาน |
