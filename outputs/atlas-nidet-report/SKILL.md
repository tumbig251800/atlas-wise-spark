---
name: atlas-nidet-report
description: >-
  ใช้ skill นี้เมื่อต้องการสร้างรายงานนิเทศติดตามการจัดการเรียนรู้ (.docx) จากข้อมูล ATLAS ใน Supabase สำหรับโรงเรียนวรนาถวิทยากำแพงเพชร วิเคราะห์ด้วยกรอบ K/P/A/A2-Gap/System-Gap แยก Special Care ตาม Compassion Protocol เชื่อมโยงสมรรถนะ A1-A6 (หลักสูตรฐานสมรรถนะ 2568) แทรกกราฟ Bar/Pie ลงใน .docx วิเคราะห์ unit_assessments เทียบบันทึกหลังสอน คำนวณ Teacher Accuracy Score, Blind Spot Index, Gap Consistency รายครู เชื่อม remedial_tracking (PASS/STAY), Action Board WF-6 (UnitBlindSpot) PLC และสมรรถนะ PBL 5 ด้าน (atlas_pbl_*) จาก Woranat_School_Atlas_MCP. Triggers: รายงานนิเทศ, nidet report, academic supervision report, วิเคราะห์ teaching log docx, แจ้งผลนิเทศ, หนังสือแจ้งเตือนครู, รายงานวิชาการ ATLAS, แทรกกราฟในรายงาน, บันทึกนิเทศ, ครูอ่านห้องแม่นไหม, blind spot รายครู, teacher accuracy, gap consistency, PASS STAY, remedial tracking, ติดตาม PLC, FLAG8, สมรรถนะ PBL, รายงาน PBL, นักเรียนไม่ผ่าน PBL.
metadata:
  version: "1.5.0"
  author: "ATLAS — โรงเรียนวรนาถวิทยากำแพงเพชร"
  language: th
compatibility: >-
  Node.js + docx npm, Woranat_School_Atlas_MCP (18 tools: analytics + PLC + PBL)
  หรือ Supabase MCP (execute_sql), Python + matplotlib, mcp__workspace__bash
---

# ATLAS Nidet Report — Skill Instruction (v1.5.0)

## เมื่อใดควรใช้ Skill นี้

ใช้ skill นี้เมื่อต้องการ:
- สร้างรายงานนิเทศติดตามการจัดการเรียนรู้ฉบับวิชาการ (.docx)
- สร้างบันทึกแจ้งผลนิเทศรายครู (บันทึกข้อความราชการ)
- วิเคราะห์ teaching logs รายครู/รายห้อง/รายวิชา
- แทรกกราฟ (Bar Chart + Pie Chart) ลงใน .docx เดียวกัน
- เชื่อมโยงผลการวิเคราะห์กับสมรรถนะหลักสูตร A1-A6 (2568)
- วิเคราะห์ Teacher Accuracy Score — ครูอ่านห้องแม่นแค่ไหน
- คำนวณ Blind Spot Index — นักเรียนที่ตกหล่นจากการดูแล
- ตรวจ Gap Consistency — นักเรียนที่ flag ซ้ำนานโดยไม่ขยับ
- **[NEW v1.4.0]** ติดตามสถานะ PASS/STAY จากตาราง remedial_tracking
- **[NEW v1.4.0]** อ้างอิง Action Items จาก WF-6 (UnitBlindSpot Detector)
- **[NEW v1.4.0]** สรุปผลการติดตามผ่าน PLC ในรายงานนิเทศ
- **[NEW v1.4.0]** บันทึกแจ้งเตือนการกรอกที่อ้างอิง FLAG8 (ส่งช้าเกิน 3 วัน)
- **[NEW v1.5.0]** วิเคราะห์สมรรถนะ PBL 5 ด้าน (สื่อสาร/คิด/แก้ปัญหา/ทักษะชีวิต/เทคโนโลยี) รายห้อง + นักเรียนไม่ผ่าน ในรายงานนิเทศ (ผ่าน atlas_pbl_*)

อ่าน references/report-structure.md ก่อนสร้างเอกสารทุกครั้ง

---

## ประเภทเอกสารที่สร้างได้

| ประเภท | ทริกเกอร์ | ชื่อไฟล์ |
|--------|-----------|---------|
| รายงานนิเทศติดตามรายห้อง | "รายงานนิเทศ", "nidet report" | รายงานนิเทศติดตาม_[วิชา]_[ชั้น]_[ภาคเรียน].docx |
| บันทึกแจ้งผลนิเทศรายครู | "แจ้งผลนิเทศ", "บันทึกแจ้ง" | บันทึกแจ้งผลนิเทศ_[ครู]_[ชั้น]_ครั้งที่[N].docx |
| บันทึกแจ้งเตือนการกรอก | "หนังสือแจ้งเตือน" | บันทึกแจ้งเตือน_การกรอกบันทึกหลังสอน_[ภาคเรียน]_[วันที่].docx |

---

## แหล่งข้อมูล (v1.4.0)

| งาน | เครื่องมือที่แนะนำ |
|-----|------------------|
| ดึงข้อมูลรายครูคนเดียว / lookup เร็ว | Woranat_School_Atlas_MCP (เช่น `atlas_teaching_logs_by_teacher`, `atlas_classroom_kpi`) |
| Query หลายครู / ข้ามตาราง / unit_assessments / remedial_tracking | Supabase MCP `execute_sql` (วิธีหลักที่เชื่อถือได้) |
| ข้อมูล PLC (sessions, effectiveness, coverage gap) | Woranat_School_Atlas_MCP กลุ่ม PLC 6 tools |
| Action Board / UnitBlindSpot | `atlas_action_items` หรือ SQL ตาราง `action_plan_items` |
| **[NEW v1.5.0] สมรรถนะ PBL** | `atlas_pbl_summary`, `atlas_pbl_class_profile`, `atlas_pbl_failing`, `atlas_pbl_student` (ใส่ term เสมอ) |

**หมายเหตุ:** ชื่อ MCP ปัจจุบันคือ `Woranat_School_Atlas_MCP` (18 tools: analytics + PLC + PBL)
— ชุดเก่า `mcp__atlas__*` (8 tools) เลิกอ้างอิงแล้ว

---

## Core Workflow (v1.4.0)

```
1. รับคำสั่ง → ระบุประเภทเอกสารและขอบเขต (ครู/ห้อง/วิชา/ช่วงเวลา)
2. ดึงข้อมูล
   └─ teaching_logs ตาม teacher_name / grade_level / classroom / term
   └─ unit_assessments ตาม grade_level / classroom / subject / term (ถ้ามี)
   └─ [NEW] remedial_tracking สถานะ PASS/STAY ของนักเรียนในขอบเขต
   └─ [NEW] action_plan_items ที่มาจาก WF-6 (UnitBlindSpot) ในขอบเขตเดียวกัน
   └─ [NEW] PLC sessions ที่เกี่ยวข้อง (atlas_plc_sessions / atlas_plc_coverage_gap)
   └─ แยก SC ออกก่อนทุกครั้ง (health_care_status = true)
3. วิเคราะห์ Gap และ Mastery (teaching_logs)
   └─ Gap distribution, Mastery trend, เปรียบเทียบสัปดาห์
   └─ เชื่อมโยงกับสมรรถนะ A1-A6 ตาม CLAUDE.md ข้อ 2
4. วิเคราะห์ Unit Assessment (ถ้ามีข้อมูล)
   └─ เปรียบเทียบเฉพาะวิชาเดียวกัน ชั้นเดียวกัน ห้องเดียวกัน
   └─ Teacher Accuracy Score (K/P/A)
   └─ Blind Spot Index + จำนวนนักเรียน (ห้ามระบุชื่อในรายงานหลัก)
   └─ Gap Consistency (flag ซ้ำ ≥ 3 ครั้ง)
5. [NEW] วิเคราะห์การติดตามแก้ไข (remedial_tracking)
   └─ จำนวน PASS / STAY ในขอบเขตรายงาน
   └─ นักเรียน STAY ค้างนาน (≥ 2 รอบติดตาม) = สัญญาณ intervention ไม่ได้ผล
   └─ เทียบกับ Gap Consistency เพื่อยืนยันสัญญาณซ้ำสองชั้น
6. [NEW] เชื่อม Action Board + PLC
   └─ ระบุจำนวน action items ค้าง (open/watching) จาก WF-6 ของห้อง/ครูนี้
   └─ ระบุว่าประเด็นสำคัญผ่าน PLC แล้วหรือยัง (PLC coverage)
   └─ ถ้าผ่าน PLC แล้ว → สรุป outcome ล่าสุดสั้นๆ
7. สร้างกราฟ (matplotlib → PNG → embed ใน docx)
   └─ Bar Chart: Gap distribution
   └─ Pie Chart: สัดส่วน success vs gap
   └─ Bar Chart: Teacher Accuracy K/P/A (ถ้ามีข้อมูล unit_assessments)
   └─ [NEW] Bar Chart: PASS vs STAY (ถ้ามีข้อมูล remedial_tracking)
8. สร้าง .docx ด้วย Node.js (docx library)
   └─ หัวบันทึกข้อความราชการ (ดูรูปแบบบังคับด้านล่าง)
   └─ เนื้อหาวิเคราะห์ + กราฟ + ข้อเสนอแนะ
   └─ หัวข้อ "ผลการวิเคราะห์เชิงลึก" (ถ้ามี unit_assessments)
   └─ [NEW] หัวข้อ "การติดตามแก้ไขและ PLC" (ถ้ามีข้อมูล)
9. บันทึกไฟล์ใน nidet/ป.X/ ตามโครงสร้าง CLAUDE.md
```

---

## SQL Queries มาตรฐาน

### ดึง log รายครู
```sql
SELECT id, teacher_name, grade_level, classroom, subject,
       mastery_score, major_gap, key_issue,
       health_care_status, health_care_ids, remedial_ids,
       teaching_date, academic_term
FROM teaching_logs
WHERE teacher_name = '[TEACHER]'
  AND academic_term = '[TERM]'
  AND health_care_status = false
ORDER BY teaching_date, classroom;
```

### ดึง log รายห้อง
```sql
SELECT id, teacher_name, grade_level, classroom, subject,
       mastery_score, major_gap, key_issue,
       health_care_status, teaching_date
FROM teaching_logs
WHERE grade_level = '[GRADE]'
  AND classroom = '[ROOM]'
  AND academic_term = '[TERM]'
ORDER BY teaching_date, subject;
```

### ดึง unit_assessments รายห้อง/วิชา
```sql
SELECT
  student_id, student_name,
  grade_level, classroom, subject, unit_name,
  score, total_score,
  ROUND(score::numeric/total_score::numeric*100,1) as total_pct,
  k_score, k_total,
  p_score, p_total,
  a_score, a_total,
  assessed_date
FROM unit_assessments
WHERE grade_level = '[GRADE]'
  AND classroom = '[ROOM]'
  AND subject = '[SUBJECT]'
  AND academic_term = '[TERM]'
ORDER BY score;
```

### ตรวจว่ามีข้อมูล K/P/A หรือไม่
```sql
SELECT
  COUNT(*) as total,
  SUM(CASE WHEN k_score IS NOT NULL AND p_score IS NOT NULL
           AND a_score IS NOT NULL THEN 1 ELSE 0 END) as kpa_complete
FROM unit_assessments
WHERE grade_level = '[GRADE]'
  AND classroom = '[ROOM]'
  AND subject = '[SUBJECT]'
  AND academic_term = '[TERM]';
```

### [NEW v1.4.0] ดึงสถานะ remedial_tracking (PASS/STAY)
```sql
SELECT student_id, grade_level, classroom, subject,
       status,               -- 'PASS' | 'STAY'
       tracking_round,       -- รอบติดตามที่
       gap_type, note, updated_at
FROM remedial_tracking
WHERE grade_level = '[GRADE]'
  AND classroom = '[ROOM]'
  AND academic_term = '[TERM]'
ORDER BY student_id, tracking_round;
```
> ถ้าโครงสร้างคอลัมน์จริงต่างจากนี้ ให้ตรวจ schema ด้วย
> `SELECT column_name FROM information_schema.columns WHERE table_name='remedial_tracking';`
> ก่อนเสมอ — ห้ามเดาชื่อคอลัมน์

### [NEW v1.4.0] ดึง Action Items จาก WF-6 (UnitBlindSpot)
```sql
SELECT id, issue_type, severity, status,
       teacher_name, grade_level, classroom, subject,
       created_at, due_date
FROM action_plan_items
WHERE issue_type = 'UnitBlindSpot'
  AND grade_level = '[GRADE]'
  AND classroom = '[ROOM]'
  AND status IN ('open','watching')
ORDER BY severity DESC, created_at;
```

### [NEW v1.4.0] ดึงข้อมูล FLAG8 สำหรับบันทึกแจ้งเตือนการกรอก
```sql
-- นับการส่งช้าเกิน 3 วัน (FLAG8) รายครูในช่วงเวลา
SELECT teacher_name,
       COUNT(*) as flag8_count,
       MAX(teaching_date) as latest_late
FROM teaching_logs
WHERE academic_term = '[TERM]'
  AND (created_at::date - teaching_date) > 3
GROUP BY teacher_name
HAVING COUNT(*) >= [THRESHOLD]
ORDER BY flag8_count DESC;
```
> **เงื่อนไขการใช้:** ใช้ประกอบบันทึกแจ้งเตือนเมื่อข้อมูลสะสมเพียงพอ
> (อย่างน้อย 2–4 สัปดาห์นับจาก 8 มิ.ย. 2569) — ถ้าข้อมูลยังน้อย
> ให้ระบุใน Method Notes ว่า "ข้อมูล FLAG8 อยู่ระหว่างสะสม ยังไม่ใช้สรุปแนวโน้ม"

---

## กฎสำคัญ: เปรียบเทียบในวิชาเดียวกันเท่านั้น

```
teaching_logs (grade_level X, classroom Y, subject Z)
      ↕ เปรียบเทียบ
unit_assessments (grade_level X, classroom Y, subject Z)

ห้ามข้ามวิชา ข้ามห้อง หรือข้ามชั้น เด็ดขาด
```

---

## Teacher Accuracy Score

**นิยาม:** วัดว่าครูอ่านห้องได้แม่นยำแค่ไหน โดยเปรียบว่า Gap ที่บันทึกใน teaching_logs ตรงกับ K/P/A ที่ต่ำจริงใน unit_assessments หรือไม่

**เงื่อนไข:** คำนวณได้เฉพาะเมื่อ kpa_complete > 0

```python
# นักเรียนที่ K/P/A ต่ำ (< 60%) ตาม unit_assessments
k_weak = {r["student_id"] for r in ua if r["k_pct"] and r["k_pct"] < 60}
p_weak = {r["student_id"] for r in ua if r["p_pct"] and r["p_pct"] < 60}
a_weak = {r["student_id"] for r in ua if r["a_pct"] and r["a_pct"] < 60}

# นักเรียนที่ครู flag ใน teaching_logs
k_flagged = parse_ids_from_logs(tl, "k-gap")
p_flagged = parse_ids_from_logs(tl, "p-gap")
a_flagged = parse_ids_from_logs(tl, "a-gap")

# Accuracy = intersection / union
k_acc = len(k_weak & k_flagged) / len(k_weak | k_flagged) if (k_weak | k_flagged) else None
p_acc = len(p_weak & p_flagged) / len(p_weak | p_flagged) if (p_weak | p_flagged) else None
a_acc = len(a_weak & a_flagged) / len(a_weak | a_flagged) if (a_weak | a_flagged) else None
```

**ระดับ Accuracy สำหรับ docx:**
- ≥ 70% = "แม่นยำ" (สีเขียว)
- 40–69% = "พอใช้" (สีเหลือง)
- < 40% = "ควรพัฒนา" (สีส้ม)
- ไม่มีข้อมูลฝั่งใดฝั่งหนึ่ง = "ไม่มีข้อมูลเพียงพอ"

---

## Blind Spot Index

**นิยาม:** สัดส่วนนักเรียนที่ไม่ผ่านคะแนนหลังหน่วย (< 50%) แต่ไม่เคยถูก flag ใน remedial_ids

```python
def blind_spot_index(unit_assessments, teaching_logs):
    failed = [r for r in unit_assessments if r["total_pct"] < 50]
    blind = []
    for student in failed:
        times_flagged = sum(
            1 for log in teaching_logs
            if student["student_id"] in parse_remedial_ids(log["remedial_ids"])
        )
        if times_flagged == 0:
            blind.append(student)
    bsi = round(len(blind) / len(failed) * 100, 1) if failed else 0
    return bsi, blind
```

**ระดับสำหรับ docx:**
- 0% = "ครูติดตามนักเรียนครบถ้วน"
- 1–25% = "พบนักเรียนที่อาจตกหล่นบางส่วน ควรตรวจสอบ"
- > 25% = "พบนักเรียนตกหล่นจากการดูแลในสัดส่วนสูง ควรปรับแผนการสอน"

**ในเอกสาร docx:** ระบุ BSI % และจำนวนนักเรียน — **ห้ามระบุชื่อนักเรียนในรายงานหลัก** แต่ผู้บริหารสามารถขอรายชื่อแยกต่างหากได้

---

## Gap Consistency

**นิยาม:** นักเรียนที่ถูก flag Gap ชนิดเดิมในวิชาเดียวกัน ≥ 3 ครั้งติดต่อกันโดยคะแนนไม่ขยับ = สัญญาณว่า intervention ไม่ได้ผล

```python
def gap_consistency_alerts(teaching_logs):
    """หานักเรียนที่ถูก flag Gap ชนิดเดิมซ้ำ >= 3 ครั้ง"""
    from collections import defaultdict
    student_gaps = defaultdict(list)
    for log in sorted(teaching_logs, key=lambda x: x["teaching_date"]):
        for sid in parse_remedial_ids(log["remedial_ids"]):
            student_gaps[(sid, log["subject"])].append(log["major_gap"])

    alerts = []
    for (sid, subj), gaps in student_gaps.items():
        streak = 1
        for i in range(1, len(gaps)):
            if gaps[i] == gaps[i-1]:
                streak += 1
                if streak >= 3:
                    alerts.append({
                        "student_id": sid,
                        "subject": subj,
                        "gap_type": gaps[i],
                        "consecutive": streak
                    })
                    break
            else:
                streak = 1
    return alerts
```

**ในเอกสาร docx:** แสดงจำนวนนักเรียนที่มี Gap Consistency ≥ 3 ครั้ง พร้อมประเภท Gap และข้อเสนอแนะว่าควรปรับ intervention อย่างไร

---

## [NEW v1.4.0] การติดตามแก้ไข (remedial_tracking) — PASS/STAY

**นิยาม:** ตาราง `remedial_tracking` บันทึกผลการติดตามนักเรียนที่ถูกส่งซ่อมเสริม
- `PASS` = ผ่านการติดตามรอบนั้นแล้ว
- `STAY` = ยังไม่ผ่าน ต้องติดตามต่อ

**การวิเคราะห์ในรายงานนิเทศ:**
1. สรุปจำนวน PASS / STAY ในขอบเขตรายงาน + อัตราผ่าน (%)
2. **STAY ค้างนาน:** นักเรียนที่ STAY ติดต่อกัน ≥ 2 รอบติดตาม
   → สัญญาณว่า intervention ปัจจุบันอาจไม่เหมาะ ควรปรับวิธี
3. **Cross-check กับ Gap Consistency:** นักเรียนที่ทั้ง STAY ค้างนาน
   และ Gap Consistency ≥ 3 ครั้ง = สัญญาณซ้ำสองชั้น
   → ระบุในรายงานว่า "ควรนำเข้าวง PLC เพื่อออกแบบ intervention ใหม่"

**ภาษาในเอกสาร:** ระบุเฉพาะจำนวนและรหัส ไม่วิจารณ์ครู
ใช้ "ควรทบทวนแนวทางการซ่อมเสริม" ไม่ใช่ "การซ่อมเสริมล้มเหลว"

---

## [NEW v1.4.0] การเชื่อม Action Board (WF-6) และ PLC

### Action Board (UnitBlindSpot)
ถ้าห้อง/ครูในขอบเขตรายงานมี action items จาก WF-6 ค้างอยู่:
- ระบุจำนวน open / watching แยกตาม severity
- รายการ overdue (เลย due_date) ให้ยกขึ้นเป็นประเด็นนิเทศลำดับแรก

### PLC Coverage
ใช้ `atlas_plc_sessions` และ `atlas_plc_coverage_gap` (หรือ SQL เทียบเท่า):
- ประเด็นสำคัญของห้องนี้**ผ่านวง PLC แล้วหรือยัง**
- ถ้าผ่านแล้ว → สรุป outcome ล่าสุด 1–2 ประโยค + สถานะ (resolved/continue)
- ถ้ายังไม่ผ่าน → เสนอแนะในหัวข้อข้อเสนอแนะว่า
  "ประเด็นนี้ยังไม่มี PLC ครอบคลุม ควรจัดวง PLC ภายใน [กรอบเวลา]"

### ตำแหน่งในรายงาน
เนื้อหาส่วนนี้อยู่ในหัวข้อ "การติดตามแก้ไขและ PLC" (หัวข้อ 5 ของโครงสร้างรายงาน)
ถ้าไม่มีข้อมูลทั้ง action items และ PLC → ข้ามหัวข้อนี้ และระบุว่า
"ยังไม่มีรายการติดตามจาก Action Board หรือบันทึก PLC ในขอบเขตรายงานนี้"

---

## [NEW v1.5.0] การวิเคราะห์สมรรถนะ PBL (Project-Based Learning)

PBL ประเมินสมรรถนะ **5 ด้าน** (ให้คะแนนด้านละ 1–3): การสื่อสาร, การคิด, การแก้ปัญหา, ทักษะชีวิต, เทคโนโลยี
เก็บในตาราง `pbl_projects` + `pbl_assessments` — **คนละชุดกับ K/P/A (unit_assessments) ห้ามปน/เทียบข้ามกัน**
เกณฑ์ผล (ระบบคำนวณให้แล้ว ห้ามคำนวณเอง): `excellent` = ไม่มีด้านใดได้ 1 และมีด้านที่ได้ 3 ตั้งแต่ 3 ด้าน; `fail` = มีด้านใดได้ 1; `pass` = ที่เหลือ

### ดึงข้อมูล (MCP — ใส่ term เสมอ)
- `atlas_pbl_class_profile(term, grade_level, classroom)` → เฉลี่ย 5 ด้าน + จุดแข็ง/จุดที่ควรพัฒนา + การกระจายผล (excellent/pass/fail)
- `atlas_pbl_failing(term, grade_level?, classroom?, teacher_name?)` → นักเรียนไม่ผ่าน + ด้านที่อ่อน (weak_dimensions) + หมายเหตุ
- `atlas_pbl_summary(term, ...)` → ภาพรวมรายโปรเจกต์
- หรือ SQL บน `pbl_projects`/`pbl_assessments` (ตรวจ schema ก่อน — ห้ามเดาคอลัมน์)

### การวิเคราะห์ในรายงานนิเทศ
1. **โปรไฟล์ห้อง:** คะแนนเฉลี่ย 5 ด้าน + จุดแข็ง/จุดที่ควรพัฒนา (จาก class_profile)
2. **นักเรียนไม่ผ่าน:** ระบุ **จำนวน + ด้านที่อ่อนที่พบบ่อย** — **ในรายงานหลักระบุจำนวน/รหัสเท่านั้น ห้ามระบุชื่อ** (Compassion Protocol) ผู้บริหารขอรายชื่อแยกได้
3. **เชื่อมโยงสมรรถนะ (โดยประมาณ):** การสื่อสาร↔A3, การคิด/การแก้ปัญหา↔A2, ทักษะชีวิต↔A1/A5, เทคโนโลยี↔A6, การทำงานร่วม↔A4
4. ถ้านักเรียนไม่ผ่าน PBL ซ้ำกับ Gap/STAY จาก teaching_logs/remedial_tracking → โยงเป็นข้อเสนอแนะ Buddy/PLC

### กราฟ (optional)
Bar/Radar เฉลี่ย 5 ด้านของห้อง (ปรับ `make_bar_chart` ให้ label เป็น 5 ด้าน PBL, แกน Y 0–3)

### ภาษาและเงื่อนไข
- ใช้เชิงพัฒนา "ควรเสริมด้าน[X]" ไม่ใช่ "เด็กอ่อน/เด็กมีปัญหา"
- **เทียบเฉพาะในเทอมเดียวกัน** — ใส่ `term` ทุก tool เสมอ
- ถ้าไม่มีข้อมูล PBL ในขอบเขต → ข้ามหัวข้อนี้ และระบุว่า "ยังไม่มีข้อมูลสมรรถนะ PBL ในภาคเรียนนี้"

---

## โครงสร้างรายงานนิเทศ (v1.4.0)

อ่าน references/report-structure.md สำหรับโครงสร้างละเอียด

โครงสร้างหลัก:
```
1. หัวบันทึกข้อความราชการ
2. บทนำ / วัตถุประสงค์การนิเทศ
3. ผลการวิเคราะห์ Teaching Logs
   3.1 ภาพรวม Mastery Score
   3.2 Gap Distribution (+ Bar Chart)
   3.3 สัดส่วน Success vs Gap (+ Pie Chart)
   3.4 ประเด็นสำคัญจาก key_issue
4. ผลการวิเคราะห์เชิงลึก (ถ้ามี unit_assessments)
   4.1 ภาพรวมคะแนนหลังหน่วย K/P/A (+ Bar Chart Accuracy)
   4.2 Teacher Accuracy Score — ครูอ่านห้องแม่นแค่ไหน
   4.3 Blind Spot Index — นักเรียนที่อาจตกหล่น
   4.4 Gap Consistency — นักเรียนที่ต้องการ intervention ใหม่
5. [NEW] การติดตามแก้ไขและ PLC (ถ้ามีข้อมูล)
   5.1 สถานะ PASS/STAY จาก remedial_tracking (+ Bar Chart)
   5.2 Action Items ค้างจาก Action Board (WF-6)
   5.3 ผลการติดตามผ่านวง PLC
   5.4 [NEW v1.5.0] สมรรถนะ PBL รายห้อง + นักเรียนไม่ผ่าน (ถ้ามีข้อมูล)
6. การเชื่อมโยงสมรรถนะ A1-A6
7. ข้อเสนอแนะการพัฒนา
8. ลงนาม
```

**ถ้าไม่มีข้อมูล unit_assessments:** ข้ามหัวข้อ 4 และระบุในเอกสารว่า
"ยังไม่มีข้อมูลคะแนนหลังหน่วยการเรียนรู้สำหรับวิชานี้ในภาคเรียนปัจจุบัน"

**ถ้าไม่มีข้อมูล remedial/PLC:** ข้ามหัวข้อ 5 ตามเงื่อนไขด้านบน

---

## การสร้างกราฟ (Python → PNG → docx)

```python
import os
import urllib.request
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.font_manager as fm

# [NEW v1.4.0] โหลดฟอนต์แบบ fallback chain — ใช้ได้ทั้ง Windows / Mac / Cloud
FONT_CANDIDATES = [
    "G:/Atlas-cowork  report/_system/fonts/THSarabunNew.ttf",          # Windows notebook
    "/Users/tum_macmini/Library/Fonts/THSarabunNew.ttf",               # Mac mini M4
    "/usr/share/fonts/truetype/thai/THSarabunNew.ttf",                 # Linux ทั่วไป
    "/tmp/Sarabun-Regular.ttf",                                        # ที่ดาวน์โหลดไว้
]

def load_thai_font():
    for path in FONT_CANDIDATES:
        if os.path.exists(path):
            return fm.FontProperties(fname=path)
    # ไม่เจอเลย → ดาวน์โหลด Sarabun จาก Google Fonts (raw GitHub)
    url = ("https://raw.githubusercontent.com/google/fonts/main/"
           "ofl/sarabun/Sarabun-Regular.ttf")
    dest = "/tmp/Sarabun-Regular.ttf"
    try:
        urllib.request.urlretrieve(url, dest)
        return fm.FontProperties(fname=dest)
    except Exception:
        # สุดท้ายจริงๆ ใช้ default + แจ้งใน Method Notes ว่าฟอนต์ไทยอาจแสดงไม่ครบ
        return fm.FontProperties()

prop = load_thai_font()

def make_bar_chart(gap_data, output_path):
    labels = list(gap_data.keys())
    values = list(gap_data.values())
    colors = {"k-gap":"#EF4444","p-gap":"#F97316","a-gap":"#EAB308",
              "a2-gap":"#8B5CF6","system-gap":"#6B7280","success":"#22C55E"}
    bar_colors = [colors.get(l,"#94A3B8") for l in labels]
    fig, ax = plt.subplots(figsize=(8, 4))
    ax.bar(labels, values, color=bar_colors)
    ax.set_xlabel("ประเภท Gap", fontproperties=prop, fontsize=14)
    ax.set_ylabel("จำนวน", fontproperties=prop, fontsize=14)
    ax.set_title("การกระจาย Gap", fontproperties=prop, fontsize=16)
    for tick in ax.get_xticklabels():
        tick.set_fontproperties(prop)
    plt.tight_layout()
    plt.savefig(output_path, dpi=150, bbox_inches="tight")
    plt.close()

def make_accuracy_chart(accuracy_data, output_path):
    """accuracy_data = {"K": 0.8, "P": 0.5, "A": 0.1}"""
    dims = [k for k,v in accuracy_data.items() if v is not None]
    vals = [accuracy_data[k]*100 for k in dims]
    colors = ["#22C55E" if v >= 70 else "#F59E0B" if v >= 40 else "#EF4444" for v in vals]
    fig, ax = plt.subplots(figsize=(6, 4))
    bars = ax.bar(dims, vals, color=colors)
    ax.set_ylim(0, 100)
    ax.axhline(y=70, color="#16A34A", linestyle="--", alpha=0.5)
    ax.axhline(y=40, color="#D97706", linestyle="--", alpha=0.5)
    ax.set_xlabel("มิติการประเมิน", fontproperties=prop, fontsize=14)
    ax.set_ylabel("Accuracy (%)", fontproperties=prop, fontsize=14)
    ax.set_title("Teacher Accuracy Score", fontproperties=prop, fontsize=16)
    for bar, val in zip(bars, vals):
        ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 1,
                f"{val:.0f}%", ha="center", fontproperties=prop, fontsize=12)
    plt.tight_layout()
    plt.savefig(output_path, dpi=150, bbox_inches="tight")
    plt.close()

# [NEW v1.4.0] กราฟ PASS vs STAY
def make_remedial_chart(remedial_summary, output_path):
    """remedial_summary = {"PASS": 12, "STAY": 5}"""
    labels = ["PASS", "STAY"]
    values = [remedial_summary.get("PASS", 0), remedial_summary.get("STAY", 0)]
    fig, ax = plt.subplots(figsize=(5, 4))
    ax.bar(labels, values, color=["#22C55E", "#F97316"])
    ax.set_ylabel("จำนวนนักเรียน", fontproperties=prop, fontsize=14)
    ax.set_title("ผลการติดตามซ่อมเสริม (PASS/STAY)", fontproperties=prop, fontsize=16)
    for i, v in enumerate(values):
        ax.text(i, v + 0.2, str(v), ha="center", fontproperties=prop, fontsize=12)
    plt.tight_layout()
    plt.savefig(output_path, dpi=150, bbox_inches="tight")
    plt.close()
```

---

## หัวบันทึกข้อความราชการ (รูปแบบบังคับ v1.4.0)

```
บันทึกข้อความ
โรงเรียนวรนาถวิทยากำแพงเพชร
ที่: วว.[ปีพ.ศ.]/[เลขที่]     วันที่: [วัน เดือน ปี พ.ศ.]
เรื่อง: [หัวเรื่อง]
เรียน: [ผู้รับ]
```

**⚠️ กฎเหล็ก: ห้ามใช้คำว่า "ส่วนราชการ" ในหัวเอกสารเด็ดขาด**
ใช้ชื่อ "โรงเรียนวรนาถวิทยากำแพงเพชร" ตรงๆ บรรทัดถัดจาก "บันทึกข้อความ"
(โรงเรียนเอกชนไม่ใช่ส่วนราชการ — กฎนี้ยืนยันโดยผู้อำนวยการแล้ว)

เลขที่อ้างอิง: `วว.[ปีพ.ศ.]/[ลำดับ]` เช่น วว.2569/001

---

## มาตรฐานเอกสาร (.docx)

- ฟอนต์: TH Sarabun New ทุกส่วน
- ขนาดหน้ากระดาษ: A4 (11906 × 16838 DXA)
- Margin: บน/ล่าง = 1440 DXA, ซ้าย/ขวา = 1701 DXA
- หัวเรื่อง: 20pt bold, เนื้อหา: 16pt, ตาราง: 14pt
- ใช้ภาษาราชการ — ห้ามใช้ภาษาพูด/ภาษาแชท
- ตัวเลข: เลขอาราบิก (1, 2, 3) ทุกที่
- ร้อยละ: ทศนิยม 2 ตำแหน่ง (79.71%)
- วันที่: ปี พ.ศ. เสมอ (21 พฤษภาคม 2569)

---

## Compassion Protocol (บังคับ)

- นักเรียน health_care_status=true = Special Care (SC)
- ห้ามระบุชื่อ/รหัสนักเรียน SC ในเอกสารทุกประเภท
- รายงานเฉพาะจำนวน เช่น "พบนักเรียนกลุ่มพิเศษ 3 คน"
- SC ต้องแยกออกก่อนคำนวณ Gap และ Mastery ทุกครั้ง
- SC > 40% ของห้อง → ระบุ "พบสัดส่วนกลุ่มพิเศษสูงผิดปกติ ควรตรวจสอบ"
- Blind Spot Index ห้ามระบุชื่อนักเรียนในรายงานหลัก — ระบุเฉพาะจำนวนและ %
- **[NEW]** สถานะ STAY ใน remedial_tracking ระบุเฉพาะรหัส/จำนวน
  ห้ามใช้ภาษาตีตรา เช่น "เด็กอ่อน" "เด็กมีปัญหา"

---

## Integrity Protocol (บังคับ)

- ห้ามสรุปว่าครูทำผิดจาก flag เพียงอย่างเดียว
- ใช้ภาษากลาง: "พบความไม่สอดคล้องของข้อมูล" ไม่ใช่ "ปลอมแปลง"
- ต้องระบุ flag_detail และ action_taken ที่เหมาะสม
- Teacher Accuracy ต่ำ → ใช้ "ควรพัฒนาการสังเกตห้องเรียน" ไม่ใช่ "ครูไม่รู้จักนักเรียน"
- Gap Consistency สูง → ใช้ "ควรทบทวนวิธีการ intervention" ไม่ใช่ "ครูสอนไม่ได้เรื่อง"
- **[NEW]** FLAG8 (ส่งช้า) ในบันทึกแจ้งเตือน → ใช้ "ขอความร่วมมือส่งบันทึกตามกำหนด"
  ระบุข้อเท็จจริง (จำนวนครั้ง/วันที่) เท่านั้น ไม่ตีความเจตนา
- **[NEW]** STAY ค้างนาน → ใช้ "ควรนำเข้าวง PLC เพื่อปรับแนวทาง" ไม่ใช่การตำหนิ

---

## การเชื่อมโยงสมรรถนะ A1-A6 (หลักสูตร 2568)

| Gap Type | สมรรถนะ | แนวทางพัฒนา |
|----------|---------|------------|
| K-Gap | A2 การคิดวิเคราะห์ | เสริมกิจกรรมสร้างความเข้าใจเนื้อหา |
| P-Gap | A1 การสื่อสาร, A6 การทำงาน | ทบทวนขั้นตอนการสอน ใช้กระบวนการที่เหมาะสม |
| A-Gap | A3 คิดสร้างสรรค์, A4 พลเมือง, A5 EF | เสริมแรงจูงใจ สร้างบรรยากาศการเรียนรู้ |
| A2-Gap | Welfare Referral | ส่งต่อฝ่ายแนะแนว — ไม่ใช่ปัญหาการสอน |
| System-Gap | บริหาร/นโยบาย | ประสานงานฝ่ายบริหาร |

**เชื่อมโยง Teacher Accuracy กับสมรรถนะ:**

| Accuracy ต่ำมิติ | ข้อเสนอแนะ |
|----------------|----------|
| K Accuracy ต่ำ | ควรพัฒนาการตั้งคำถามเชิงวินิจฉัยเพื่อวัด A2 |
| P Accuracy ต่ำ | ควรสังเกตกระบวนการทำงานของนักเรียนระหว่างสอน (A1, A6) |
| A Accuracy ต่ำ | ควรบันทึกพฤติกรรมการมีส่วนร่วมอย่างสม่ำเสมอ (A3, A4, A5) |

---

## Validation Checklist (v1.4.0)

- ตัวเลขทุกตัวมาจากข้อมูลจริง ไม่ได้ประมาณ
- SC แยกออกก่อนคำนวณแล้ว ไม่มีชื่อ/รหัส SC ในเอกสาร
- กราฟ Bar Chart + Pie Chart แสดงถูกต้อง label ครบ
- **หัวบันทึกไม่มีคำว่า "ส่วนราชการ"** — ใช้ชื่อโรงเรียนตรงๆ
- ฟอนต์ TH Sarabun New ทุกส่วน (ผ่าน fallback chain ถ้าจำเป็น)
- ภาษาราชการตลอด ไม่มีภาษาพูด
- วันที่เป็น พ.ศ. ทุกที่
- ชื่อไฟล์ตาม CLAUDE.md (ภาษาไทย)
- บันทึกในโฟลเดอร์ nidet/ป.X/ ที่ถูกต้อง
- unit_assessments เปรียบกับ teaching_logs วิชาเดียวกัน ชั้นเดียวกัน ห้องเดียวกันเท่านั้น
- ถ้า K/P/A เป็น null → ข้าม Accuracy Chart ระบุ "ไม่มีข้อมูล K/P/A"
- Blind Spot Index ห้ามระบุชื่อนักเรียนในรายงานหลัก
- ใช้ภาษาสร้างสรรค์สำหรับ Accuracy ต่ำ — ไม่ตำหนิครู
- **[NEW]** ตรวจ schema ของ remedial_tracking ก่อน query — ห้ามเดาชื่อคอลัมน์
- **[NEW]** หัวข้อ "การติดตามแก้ไขและ PLC" แสดงเฉพาะเมื่อมีข้อมูลจริง
- **[NEW]** FLAG8 ใช้ในบันทึกแจ้งเตือนเฉพาะเมื่อข้อมูลสะสมเพียงพอ (≥ 2–4 สัปดาห์)
- **[NEW]** อ้างอิง MCP ชื่อ Woranat_School_Atlas_MCP (18 tools) เท่านั้น

---

## Scripts ที่ใช้

- `scripts/build_nidet_per_teacher.js` — สร้างบันทึกแจ้งผลนิเทศรายครู
- `scripts/create_report.js` — สร้างรายงานนิเทศฉบับเต็ม
- `scripts/verify_report.py` — ตรวจสอบคุณภาพเอกสาร

อ่าน script ที่เกี่ยวข้องก่อนเริ่มทำงานทุกครั้ง

> **หมายเหตุการอัปเกรด:** ถ้า script เดิมยังฝังหัวเอกสารแบบ "ส่วนราชการ"
> หรือ font path แบบ hardcode ให้แก้ script ให้ตรงกับ SKILL.md v1.4.0 นี้ด้วย
