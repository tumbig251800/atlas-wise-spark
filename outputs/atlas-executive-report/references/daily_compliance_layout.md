# Daily Compliance Layout — มาตรฐาน Layout สำหรับ Daily Dashboard

> ไฟล์นี้กำหนด layout ของ Excel 5 tabs และ HTML dashboard
> สำหรับโหมด Daily Compliance ของ ATLAS Executive Report

---

## Excel — 5 Tabs

### Tab 1: Overview

```
[แถว 1–2]  Title: "ATLAS สรุปการกรอกบันทึกหลังสอน — วันที่ [DATE]"
           Subtitle: "โรงเรียนวรนาถวิทยากำแพงเพชร · ภาคเรียน [TERM]"

[แถว 4–6]  KPI Block (5 cards แนวนอน):
           บันทึกทั้งหมด | SC logs | กรอกครบ | กรอกบางส่วน | ไม่ได้กรอก

[แถว 8–20] ตาราง Gap Distribution (non-SC logs เท่านั้น):
           major_gap | จำนวน | ร้อยละ

[แถว 22–35] ตาราง Compliance Summary:
           ชื่อครู | สถานะ | ห้องที่กรอก | ห้องที่ขาด | หมายเหตุ

[แถว 37+]  Integrity Alerts (ถ้ามี late submissions)
```

### Tab 2: สรุปรายครู

ตารางสรุปต่อครู 1 แถว:

| คอลัมน์ | ความหมาย |
|---------|---------|
| ชื่อครู | teacher_name |
| สถานะ | กรอกครบ / บางส่วน / ไม่กรอก |
| จำนวนคาบที่กรอก | นับ log ทั้งหมดที่ไม่ใช่ late-sub |
| รายวิชาที่กรอก | เช่น "คณิตศาสตร์ (ป.3/2), ภาษาไทย (ป.4/2)" |
| จำนวน SC | นับ health_care_status = true |
| ห้องที่ยังไม่กรอก | ระบุเป็น "ป.3/KBW, ป.5/2" |
| หมายเหตุ Integrity | "ส่งบันทึกย้อนหลัง X วัน" ถ้ามี |

### Tab 3: รายละเอียดบันทึก

แสดง log แต่ละรายการที่ไม่ใช่ SC (ตาม Compassion Protocol):

| คอลัมน์ | ความหมาย |
|---------|---------|
| ชื่อครู | teacher_name |
| ชั้น/ห้อง | grade_level + "/" + classroom |
| วิชา | subject |
| Mastery | mastery_score (1–5) |
| สถานะ | Success / Yellow / Red Zone |
| Gap | major_gap |
| ประเด็นสำคัญ | key_issue (truncate 80 chars) |
| วันที่สอน | teaching_date |

SC logs: แสดงเฉพาะแถว "[SC] — [grade/classroom]" ไม่แสดงรายละเอียด

### Tab 4: Integrity

| คอลัมน์ | ความหมาย |
|---------|---------|
| ประเภท Flag | LATE-SUB / MISSING / **FLAG8** |
| ครู | teacher_name |
| รายละเอียด | เช่น "teaching_date = 2026-05-12, ส่งล่าช้า 9 วัน" |
| คำแนะนำ | "ขอความร่วมมือส่งบันทึกตามกำหนด" (ภาษากลางเสมอ) |

> **[v1.5.0] FLAG8** = บันทึกที่ `days_late > 3` (ส่งช้าเกิน 3 วัน) — แสดงระดับสรุป ไม่ตีความเจตนา
> ใช้สรุปแนวโน้ม/จัดอันดับเฉพาะเมื่อข้อมูลสะสม ≥ 2–4 สัปดาห์ (นับจาก 8 มิ.ย. 2569)

### Tab 5: Method Notes

```
ช่วงข้อมูล: วันที่ [DATE]
ภาคเรียน: [TERM]
จำนวน log ทั้งหมด: X
SC logs (แยกออก): X
Non-SC logs (ใช้ใน analysis): X
วิธีคำนวณ compliance: เปรียบเทียบกับห้องที่ active ในภาคเรียนเดียวกัน
หมายเหตุ: Late submission = log ที่ created_at (BKK+7) ตรงกับวันที่ระบุ
           แต่ teaching_date ≠ วันที่ระบุ
[v1.5.0] FLAG8 = days_late > 3 (ส่งช้าเกิน 3 วัน)
```

---

## HTML Dashboard

### โครงสร้าง

```
<header>  ชื่อรายงาน + วันที่ + โรงเรียน
<section> KPI Cards (5 การ์ด)
<section> Charts row: Gap Doughnut | Compliance Doughnut
<section> Compliance Table (สถานะ + class tags)
<section> Teacher Detail Cards (เฉพาะที่มี log)
<section> Integrity Table (ถ้ามี)
<footer>  วันที่สร้าง + เวอร์ชัน
```

### KPI Cards

| Card | สีหลัก | เงื่อนไขสีแดง |
|------|--------|-------------|
| บันทึกทั้งหมด | #1e3a5f | — |
| SC | #7c3aed | — |
| กรอกครบ | #16a34a | ถ้า = 0 |
| กรอกบางส่วน | #d97706 | ถ้า > 3 |
| ไม่ได้กรอก | #dc2626 | ถ้า > 0 (เสมอ) |

### Compliance Table

| คอลัมน์ | รูปแบบ |
|---------|-------|
| ชื่อครู | plain text |
| สถานะ | pill: ครบ (เขียว) / บางส่วน (เหลือง) / ไม่ได้กรอก (แดง) |
| ห้องที่กรอก | chip tags สีน้ำเงิน |
| ห้องที่ขาด | chip tags สีเทา/แดง |
| SC | "[X] SC" ถ้ามี |

### Library ที่ใช้

- Chart.js 4.4.1 จาก CDN
- Self-contained single HTML file — ไม่มี dependency อื่น

### Compassion Protocol (ต้องปฏิบัติในทุก output)

- SC logs: แสดงเฉพาะ "[X] SC logs" ใน KPI card
- ห้ามแสดงชื่อนักเรียน SC ในตารางหรือ chart ใดๆ
- Teacher Detail cards: แสดง SC count เท่านั้น
