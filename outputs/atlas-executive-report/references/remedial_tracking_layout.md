# Remedial Tracking Layout (PASS/STAY) — แท็บ 11 (v1.5.0)

> ไฟล์นี้กำหนด layout + SQL + HTML const ของแท็บ Excel ที่ 11 "Remedial Tracking (PASS/STAY)"
> อ่านไฟล์นี้ก่อนสร้างแท็บ 11 ทุกครั้ง
> **ตรวจ schema จริงก่อน query เสมอ ห้ามเดาชื่อคอลัมน์**

---

## Schema จริงของ `remedial_tracking` (โปรเจกต์ ebyelctqcdhjmqujeskx)

| คอลัมน์ | ชนิด | หมายเหตุ |
|---------|------|---------|
| id | uuid | |
| teaching_log_id | uuid | FK → teaching_logs.id (ใช้ดึงชนิด gap = major_gap) |
| student_id | text | ใช้รหัสเท่านั้น |
| status | text | **ค่าเป็นตัวพิมพ์เล็ก** `pass` / `stay` |
| teacher_id | uuid | |
| grade_level | text | |
| classroom | text | |
| subject | text | |
| academic_term | text | |
| recorded_at | timestamptz | ใช้เรียงลำดับ "รอบติดตาม" |
| created_at | timestamptz | |

**ข้อสำคัญ:** ตารางนี้ **ไม่มี** คอลัมน์ `tracking_round`, `gap_type`, `note`, `updated_at`
- "จำนวนรอบติดตาม" (stay_rounds) = นับจำนวนแถวต่อ student_id (เรียงตาม `recorded_at`)
- "ชนิด gap" (gap_type) = ดึงจาก `teaching_logs.major_gap` ผ่าน join `teaching_log_id`

ตรวจ schema ก่อนเสมอ:
```sql
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name='remedial_tracking';
```

---

## โครงสร้างแท็บ 3 ส่วน

```
[แถว 1]      Header: "การติดตามซ่อมเสริม (PASS/STAY) — ภาคเรียน [TERM]"
[แถว 2]      หมายเหตุ: "ใช้รหัสนักเรียนเท่านั้น ภาษาเป็นกลาง ไม่ตีตรา"

[ส่วนที่ 1]  ภาพรวม PASS/STAY รายห้อง/วิชา
  คอลัมน์: ชั้น | ห้อง | วิชา | ติดตามทั้งหมด | PASS | STAY | อัตราผ่าน %
  สี: อัตราผ่าน < 50% → แดง (#dc2626)

[ส่วนที่ 2]  STAY ค้างนาน (STAY ≥ 2 รอบติดตาม)
  คอลัมน์: student_id | ชั้น/ห้อง | วิชา | gap (จาก teaching_logs) | จำนวนรอบ STAY | รอบล่าสุด
  สี: STAY ≥ 2 รอบ → เหลือง (#f59e0b)

[ส่วนที่ 3]  สัญญาณซ้ำสองชั้น (STAY ≥ 2 รอบ AND Gap Consistency ≥ 3 ครั้ง)
  คอลัมน์: student_id | ชั้น/ห้อง | วิชา | gap | รอบ STAY | Gap ซ้ำ (ครั้ง) | ข้อเสนอแนะ
  ข้อเสนอแนะ: "ควรนำเข้าวง PLC เพื่อออกแบบ intervention ใหม่"
  สี: ทั้งแถว → ส้ม (#f97316)
```

ถ้าไม่มีข้อมูล `remedial_tracking` → **ข้ามแท็บ 11** และระบุใน Method Notes

Tab color: ส้ม `#ea580c`

---

## SQL มาตรฐาน (ตรง schema จริง)

### ส่วนที่ 1 — ภาพรวม PASS/STAY (ใช้สถานะล่าสุดต่อ student)
```sql
WITH latest AS (
  SELECT DISTINCT ON (student_id, grade_level, classroom, subject)
         student_id, grade_level, classroom, subject, lower(status) AS status
  FROM remedial_tracking
  WHERE academic_term = '[TERM]'
  ORDER BY student_id, grade_level, classroom, subject, recorded_at DESC
)
SELECT grade_level, classroom, subject,
       COUNT(*) AS total_tracked,
       COUNT(*) FILTER (WHERE status='pass') AS pass_count,
       COUNT(*) FILTER (WHERE status='stay') AS stay_count,
       ROUND(COUNT(*) FILTER (WHERE status='pass')::numeric/COUNT(*)*100,1) AS pass_rate_pct
FROM latest
GROUP BY grade_level, classroom, subject
ORDER BY pass_rate_pct;
```

### ส่วนที่ 2 — STAY ค้างนาน (≥ 2 รอบ) + ชนิด gap จาก teaching_logs
```sql
SELECT rt.student_id, rt.grade_level, rt.classroom, rt.subject,
       COUNT(*) FILTER (WHERE lower(rt.status)='stay') AS stay_rounds,
       MAX(rt.recorded_at) AS latest_round,
       MAX(tl.major_gap::text) AS gap_type
FROM remedial_tracking rt
LEFT JOIN teaching_logs tl ON tl.id = rt.teaching_log_id
WHERE rt.academic_term = '[TERM]'
GROUP BY rt.student_id, rt.grade_level, rt.classroom, rt.subject
HAVING COUNT(*) FILTER (WHERE lower(rt.status)='stay') >= 2
ORDER BY stay_rounds DESC;
```

### ส่วนที่ 3 — สัญญาณซ้ำสองชั้น
นำผลลัพธ์ส่วนที่ 2 (student ที่ STAY ≥ 2 รอบ) มา **intersect** กับชุด Gap Consistency ≥ 3 ครั้ง
(จาก `teaching_logs` ตามนิยาม Gap Consistency ใน SKILL.md — flag ชนิด gap เดิมซ้ำ ≥ 3 ครั้ง
ในวิชา/ห้องเดียวกัน) เฉพาะนักเรียนที่อยู่ในทั้งสองชุด = double signal

---

## HTML Dashboard — แท็บ "Remedial PASS/STAY"

JS const:
```javascript
const REMEDIAL_DATA = [
  {
    grade, classroom, subject,
    total_tracked, pass_count, stay_count, pass_rate_pct,
    stay_long: [{ student_id, gap_type, stay_rounds, latest_round }],
    double_signal: [{ student_id, gap_type, stay_rounds, gap_consecutive }]
  }
];
```

การแสดงผล:
- การ์ดสรุป: ติดตามทั้งหมด | PASS | STAY | อัตราผ่านเฉลี่ย %
- ตารางภาพรวมรายห้อง/วิชา (สีตามอัตราผ่าน)
- รายการ STAY ค้างนาน (chip เหลือง) และ double signal (chip ส้ม + ข้อเสนอแนะ PLC)
- Compassion Protocol: student_id เท่านั้น ห้ามชื่อ

---

## หลักความเป็นส่วนตัว (บังคับ)

- ใช้ `student_id` เท่านั้น — ห้ามแสดงชื่อนักเรียนในแท็บนี้
- ภาษาเป็นกลาง เน้น "ยังต้องติดตาม / ควรออกแบบ intervention ใหม่" ไม่ตีตรา
- นักเรียน Special Care (health_care_status = true) แยกพิจารณา ไม่ปะปนในสถิติหลัก
