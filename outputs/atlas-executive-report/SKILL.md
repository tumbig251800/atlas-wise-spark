---
name: atlas-executive-report
description: >
  ATLAS executive reports (Excel+HTML): Gap K/P/A/A2/System, Compassion
  Protocol, Integrity Audit, Teacher Compliance. Modes: Daily compliance;
  Action Board (UnitBlindSpot by teacher/class/severity); Unit Assessment
  (Teacher Accuracy, Blind Spot Index, Gap Consistency); Remedial (PASS/STAY,
  FLAG8, PLC Coverage); Full Weekly Report (19 sheets); PBL Competency
  (สมรรถนะ PBL 5 ด้าน รายโปรเจกต์/ห้อง/นักเรียน + นักเรียนไม่ผ่าน via atlas_pbl_*).
  Triggers: รายงานผู้บริหาร ATLAS, สรุปบันทึกหลังสอน, Gap distribution,
  Special Care, สรุปรายวัน, action board, blind spot, คิวนิเทศ,
  unit assessment, Teacher Accuracy, PASS STAY, FLAG8, PLC,
  รายงานฉบับสมบูรณ์, สรุปทุกด้าน, สมรรถนะ PBL, รายงาน PBL,
  PBL competency, นักเรียนไม่ผ่าน PBL.
metadata:
  version: "1.7.0"
  author: "ATLAS — โรงเรียนวรนาถวิทยากำแพงเพชร"
  language: th
compatibility: >
  Requires: references/atlas_logic.md, references/report_layout.md,
  references/data_schema.md, references/example_output.md,
  references/daily_compliance_layout.md,
  references/action_board_layout.md,
  references/remedial_tracking_layout.md,
  scripts/build_atlas_report_template.md,
  scripts/build_daily_compliance_dashboard.md,
  scripts/build_action_board_report.md,
  scripts/build_full_weekly_report.md
---

# ATLAS Executive Report — Skill Instruction (v1.7.0)

## เมื่อใดควรใช้ Skill นี้

ใช้ skill นี้เมื่อต้องการ:
- วิเคราะห์ข้อมูล teaching logs จากระบบ ATLAS
- สร้างรายงานสรุปสำหรับผู้บริหารโรงเรียน (Excel .xlsx)
- สร้าง Interactive HTML Dashboard คู่กับ Excel เสมอ
- แยกนักเรียนกลุ่ม Special Care / Health Care ออกจากกลุ่มปัญหาการเรียน
- คำนวณ Gap Distribution (K / P / A / A2 / System / Success)
- ตรวจ Integrity Audit ของข้อมูลบันทึก
- สรุปการส่งบันทึกหลังสอนของครู (Teacher Compliance)
- ติดตามนักเรียนที่ยังไม่ระบุเลขรหัส (remedial_ids)
- **[NEW v1.4.0]** วิเคราะห์คะแนนหลังหน่วย (unit_assessments) เทียบกับ teaching_logs
- **[NEW v1.4.0]** คำนวณ Teacher Accuracy Score, Blind Spot Index, Gap Consistency
- **[NEW v1.5.0]** ติดตามสถานะ PASS/STAY จากตาราง remedial_tracking (แท็บ 11)
- **[NEW v1.5.0]** นับ FLAG8 — บันทึกส่งช้าเกิน 3 วัน รายครู (ระดับสรุป)
- **[NEW v1.5.0]** ระบุ PLC Coverage (✅/⏳/❌) ในทุกข้อเสนอแนะ
- **[NEW v1.7.0]** วิเคราะห์สมรรถนะ PBL 5 ด้าน (สื่อสาร/คิด/แก้ปัญหา/ทักษะชีวิต/เทคโนโลยี) รายโปรเจกต์/ห้อง/นักเรียน + นักเรียนไม่ผ่านเกณฑ์

---

## Input ที่ต้องการ

| Input | รูปแบบที่รองรับ | หมายเหตุ |
|-------|----------------|---------|
| Teaching logs | CSV, JSON, Excel (.xlsx), Supabase MCP | ต้องมี field หลักครบ |
| Unit assessments | Supabase MCP | ถ้ามีให้ดึงพร้อมกัน |
| ช่วงเวลารายงาน | วันที่เริ่มต้น–สิ้นสุด | เช่น "ภาคเรียนที่ 1/2569" |

ถ้าไม่มี unit_assessments ให้ระบุใน Method Notes — ห้ามสร้างหรือประมาณค่าขึ้นมาเอง

---

## แหล่งข้อมูล (v1.5.0)

| งาน | เครื่องมือที่แนะนำ |
|-----|------------------|
| Query หลายครู / ข้ามตาราง / unit_assessments / remedial_tracking | Supabase MCP `execute_sql` (วิธีหลักที่เชื่อถือได้) |
| Lookup รายครู / สถิติเร็ว | `Woranat_School_Atlas_MCP` (18 tools) |
| Action Board / UnitBlindSpot | `atlas_action_items` (ใส่ filter เสมอ) |
| PLC Coverage | `atlas_plc_coverage_gap`, `atlas_plc_sessions`, `atlas_plc_timeline` |
| **[NEW v1.7.0] สมรรถนะ PBL** | `atlas_pbl_summary`, `atlas_pbl_class_profile`, `atlas_pbl_failing`, `atlas_pbl_student` (ใส่ term เสมอ) |

**หมายเหตุ:** ชื่อ MCP ปัจจุบันคือ `Woranat_School_Atlas_MCP` (18 tools: analytics + PLC + PBL)
— ชุดเก่า `mcp__atlas__*` / "ATLAS MCP Server" (8 tools) เลิกอ้างอิงแล้ว
**ก่อน query `remedial_tracking` ต้องตรวจ schema จริงเสมอ ห้ามเดาชื่อคอลัมน์:**
`SELECT column_name, data_type FROM information_schema.columns WHERE table_name='remedial_tracking';`

---

## Core Workflow (v1.5.0)

```
1. รับข้อมูล → validate format
   └─ Supabase MCP: ดึง teaching_logs ตาม date range และ term
   └─ Supabase MCP: ดึง unit_assessments ตาม term (ถ้ามี)
2. ตรวจ Schema → flag missing/anomaly
   └─ Parse remedial_ids: re.findall(r'\b\d{4}\b', str(raw))
3. แยก Special Care (Compassion Protocol)
   └─ ตรวจ health_care_status → แยกก่อนคำนวณ Gap ทุกครั้ง
4. คำนวณ KPI (teaching_logs)
   └─ total_logs, mastery avg, red_zone, success_rate
   └─ gap_distribution, compliance_per_teacher, missing_remedial_ids count
5. [NEW] คำนวณ Unit Assessment KPI (ถ้ามีข้อมูล)
   └─ avg K/P/A per classroom per subject
   └─ Teacher Accuracy Score
   └─ Blind Spot Index
   └─ Gap Consistency
5b. [NEW v1.5.0] คำนวณ Remedial / FLAG8 / PLC Coverage
   └─ remedial_tracking: PASS/STAY รายห้อง/วิชา + STAY ค้างนาน + สัญญาณซ้ำสองชั้น
   └─ FLAG8: นับ teaching_logs.days_late > 3 รายครู (ดิบ จนกว่าข้อมูลสะสมพอ)
   └─ PLC Coverage: ทุกข้อเสนอแนะระบุ ✅/⏳/❌ จาก atlas_plc_*
6. ตรวจ Integrity → บันทึก flags
7. สร้าง Excel Report (15 tabs)
   └─ แทรก HYPERLINK cell ไปยัง HTML Dashboard
8. สร้าง HTML Dashboard (ทำพร้อมกับ Excel เสมอ)
   └─ self-contained .html ไฟล์เดียว, 8 tabs
9. QA → checklist
10. Export → บันทึก Excel + HTML โฟลเดอร์เดียวกัน
```

---

## แท็บ Excel มาตรฐาน (15 tabs)

| ลำดับ | ชื่อแท็บ | เนื้อหาหลัก |
|------|---------|------------|
| 1 | ภาพรวม | KPI cards, charts, HYPERLINK ไปยัง Dashboard |
| 2 | สรุปการกรอกรายครู | Compliance + alert coloring |
| 3 | Subject Detail | รายละเอียดรายวิชา |
| 4 | Trend | แนวโน้มรายสัปดาห์/เดือน |
| 5 | Gap Analysis | Gap distribution รายวิชา/ชั้น |
| 6 | Special Care | ตัวเลขเท่านั้น ไม่ระบุชื่อ |
| 7 | ติดตามนักเรียน | Red Zone ซ้ำ >= 2 ครั้ง (ไม่ใช่ SC) |
| 8 | ยังไม่ระบุเลข | gap logs ที่ remedial_ids = null/blank |
| 9 | รายนักเรียน | ID ทุกคนที่ parse ได้จาก remedial_ids |
| 10 | **[NEW] Unit Assessment** | คะแนน K/P/A หลังหน่วย + Teacher Accuracy |
| 11 | **[NEW] Remedial Tracking** | PASS/STAY รายห้อง/วิชา + STAY ค้างนาน + สัญญาณซ้ำสองชั้น |
| 12 | Recommendations | Action plan รายวิชา/ครู + PLC Coverage |
| 13 | Integrity Audit | Flags ความขัดแย้ง |
| 14 | Raw Sample | ตัวอย่างข้อมูลดิบ 20-50 rows |
| 15 | Method Notes | ช่วงข้อมูล, limitation |

ถ้าไม่มีข้อมูล unit_assessments ให้ข้ามแท็บ 10 และระบุใน Method Notes
ถ้าไม่มีข้อมูล remedial_tracking ให้ข้ามแท็บ 11 และระบุใน Method Notes

---

## [NEW v1.4.0] Unit Assessment Analysis

### กฎสำคัญ: เปรียบเทียบในวิชาเดียวกันเท่านั้น

```
teaching_logs (grade_level X, classroom Y, subject Z)
      ↕ เปรียบเทียบ
unit_assessments (grade_level X, classroom Y, subject Z)

ห้ามข้ามวิชา ข้ามห้อง หรือข้ามชั้น
```

### Supabase Query สำหรับ unit_assessments

```sql
SELECT 
  student_id, student_name,
  grade_level, classroom, subject, unit_name,
  score, total_score,
  ROUND(score::numeric/total_score::numeric*100,1) as total_pct,
  k_score, k_total, p_score, p_total, a_score, a_total,
  assessed_date, teacher_id
FROM unit_assessments
WHERE academic_term = '[TERM]'
ORDER BY grade_level, classroom, subject, score;
```

### ตรวจก่อนว่ามีข้อมูล K/P/A หรือไม่

```sql
SELECT grade_level, classroom, subject,
  COUNT(*) as total,
  SUM(CASE WHEN k_score IS NOT NULL AND p_score IS NOT NULL 
           AND a_score IS NOT NULL THEN 1 ELSE 0 END) as kpa_complete
FROM unit_assessments
WHERE academic_term = '[TERM]'
GROUP BY grade_level, classroom, subject;
```

- ถ้า kpa_complete > 0 → วิเคราะห์แยก K/P/A ได้
- ถ้า kpa_complete = 0 → วิเคราะห์เฉพาะ score รวม (total_pct)

---

## [NEW] Teacher Accuracy Score

**นิยาม:** วัดว่าครูอ่านห้องได้แม่นยำแค่ไหน โดยเปรียบเทียบ Gap ที่บันทึกใน teaching_logs กับคะแนน K/P/A ที่ต่ำจริงใน unit_assessments

**เงื่อนไขคำนวณ:** ต้องมีข้อมูล K/P/A ครบ (kpa_complete > 0)

```python
def teacher_accuracy(teaching_logs, unit_assessments, grade, classroom, subject):
    # นักเรียนที่ K/P/A ต่ำ (< 60%) ตาม unit_assessments
    k_weak = {r["student_id"] for r in ua if r["k_pct"] < 60}
    p_weak = {r["student_id"] for r in ua if r["p_pct"] < 60}
    a_weak = {r["student_id"] for r in ua if r["a_pct"] < 60}

    # นักเรียนที่ครู flag ใน teaching_logs
    k_flagged = parse_ids_from_logs(tl, "k-gap")
    p_flagged = parse_ids_from_logs(tl, "p-gap")
    a_flagged = parse_ids_from_logs(tl, "a-gap")

    # accuracy = intersection / union (Jaccard-like)
    k_acc = len(k_weak & k_flagged) / len(k_weak | k_flagged) if (k_weak | k_flagged) else None
    p_acc = len(p_weak & p_flagged) / len(p_weak | p_flagged) if (p_weak | p_flagged) else None
    a_acc = len(a_weak & a_flagged) / len(a_weak | a_flagged) if (a_weak | a_flagged) else None
    return {"K": k_acc, "P": p_acc, "A": a_acc}
```

**การแสดงผลใน Report:**

| มิติ | ครูบันทึก Gap | คะแนนต่ำจริง | ตรงกัน | Accuracy |
|------|-------------|-------------|--------|---------|
| K | 3 คน | 2 คน | 1 คน | 50% 🟡 |
| P | 4 คน | 5 คน | 4 คน | 80% ✅ |
| A | 0 คน | 8 คน | 0 คน | 0% ⚠️ |

**ระดับ Accuracy:**
- ≥ 70% = ✅ แม่นยำ
- 40–69% = 🟡 พอใช้
- < 40% = ⚠️ ควรพัฒนา
- ไม่มีข้อมูลฝั่งใดฝั่งหนึ่ง = N/A

---

## [NEW] Blind Spot Index

**นิยาม:** สัดส่วนนักเรียนที่ไม่ผ่านคะแนนหลังหน่วย (< 50%) แต่ไม่เคยถูก flag ใน remedial_ids เลย

```python
def blind_spot_index(unit_assessments, teaching_logs, grade, classroom, subject):
    failed = [r for r in ua if r["total_pct"] < 50]
    blind = []
    for student in failed:
        times_flagged = sum(
            1 for log in tl
            if student["student_id"] in parse_remedial_ids(log["remedial_ids"])
        )
        if times_flagged == 0:
            blind.append(student)
    bsi = len(blind) / len(failed) * 100 if failed else 0
    return bsi, blind  # คืนค่า % และรายชื่อ
```

**ระดับ Blind Spot Index:**
- 0% = ✅ ครูติดตามครบ
- 1–25% = 🟡 มีบ้าง ควรตรวจสอบ
- > 25% = ⚠️ สูง ต้องแก้ไขเร่งด่วน

**แสดงใน Tab 10 พร้อมรายชื่อนักเรียน Blind Spot ทุกคน**
(ระบุชื่อได้ใน Tab 10 เพราะเป็นรายงานผู้บริหาร ไม่ใช่รายงานหลักสาธารณะ)

---

## [NEW] Gap Consistency

**นิยาม:** ตรวจว่า Gap ที่ครูบันทึกซ้ำในวิชาเดียวกันนานแค่ไหนแล้ว และนักเรียนขยับขึ้นหรือยัง

```python
def gap_consistency(teaching_logs, student_id, subject):
    """หานักเรียนที่ถูก flag Gap ชนิดเดิมซ้ำ >= 3 ครั้งโดยไม่มีการปรับปรุง"""
    student_logs = sorted(
        [l for l in teaching_logs
         if student_id in parse_remedial_ids(l["remedial_ids"])
         and l["subject"] == subject],
        key=lambda x: x["teaching_date"]
    )
    consecutive = 1
    for i in range(1, len(student_logs)):
        if student_logs[i]["major_gap"] == student_logs[i-1]["major_gap"]:
            consecutive += 1
        else:
            consecutive = 1
    return {
        "student_id": student_id,
        "gap_type": student_logs[-1]["major_gap"] if student_logs else None,
        "consecutive_weeks": consecutive,
        "flag": consecutive >= 3  # alert ถ้าซ้ำ >= 3 ครั้ง
    }
```

**แสดงใน Tab 10:** รายนักเรียนที่ถูก flag Gap ชนิดเดิม ≥ 3 ครั้ง โดยไม่ปรับปรุง = สัญญาณว่า intervention ไม่ได้ผล

---

## แท็บ 10 Unit Assessment (รายละเอียด)

**ส่วนที่ 1 — ภาพรวม K/P/A รายวิชา**

| วิชา | ชั้น/ห้อง | นักเรียน | K เฉลี่ย | P เฉลี่ย | A เฉลี่ย | รวม | ไม่ผ่าน |
|------|---------|---------|---------|---------|---------|-----|--------|

**ส่วนที่ 2 — Teacher Accuracy Score**

| ครู | วิชา | K Accuracy | P Accuracy | A Accuracy | ข้อสังเกต |
|-----|------|-----------|-----------|-----------|---------|

**ส่วนที่ 3 — Blind Spot Index**

| วิชา | ชั้น/ห้อง | ไม่ผ่านทั้งหมด | Blind Spot | BSI % | ระดับ |
|------|---------|------------|----------|-------|------|

**ส่วนที่ 4 — นักเรียน Blind Spot รายคน**

| ชื่อ | ID | ชั้น/ห้อง | วิชา | คะแนน | K% | P% | A% | ถูก flag ใน log |
|-----|-----|---------|------|------|----|----|-----|----------------|

**ส่วนที่ 5 — Gap Consistency (flag ซ้ำ ≥ 3 ครั้ง)**

| นักเรียน ID | วิชา | Gap ชนิด | ซ้ำกี่ครั้ง | ครั้งล่าสุด | ข้อเสนอแนะ |
|-----------|------|---------|----------|----------|----------|

**Coloring:**
- Accuracy < 40% → ⚠️ เซลล์สีส้ม
- BSI > 25% → 🔴 เซลล์สีแดง
- Gap Consistency ≥ 3 → 🟡 เซลล์สีเหลือง
- ถ้าไม่มีข้อมูล K/P/A (kpa_complete = 0) → แสดง "ยังไม่มีข้อมูล K/P/A — ใช้ score รวมแทน"

---

## [NEW v1.5.0] แท็บ 11 — Remedial Tracking (PASS/STAY)

> รายละเอียด layout + SQL เต็มอยู่ใน `references/remedial_tracking_layout.md` — อ่านก่อนสร้างแท็บนี้
> **ตรวจ schema จริงก่อน query เสมอ** — สถานะจริงในฐานข้อมูลเป็นตัวพิมพ์เล็ก `pass` / `stay`
> ตาราง `remedial_tracking` ไม่มีคอลัมน์ round/gap_type → "จำนวนรอบ" นับจากจำนวนแถวต่อ student_id (เรียงตาม recorded_at) และชนิด gap ดึงจาก teaching_logs ผ่าน teaching_log_id

โครงสร้าง 3 ส่วน:
- **ส่วนที่ 1 — ภาพรวม PASS/STAY รายห้อง/วิชา**: ติดตามทั้งหมด | PASS | STAY | อัตราผ่าน %
- **ส่วนที่ 2 — STAY ค้างนาน**: นักเรียนที่ STAY ≥ 2 รอบติดตาม (นับแถว status='stay' ต่อ student)
- **ส่วนที่ 3 — สัญญาณซ้ำสองชั้น**: STAY ≥ 2 รอบ **และ** Gap Consistency ≥ 3 ครั้ง → ข้อเสนอแนะ: "ควรนำเข้าวง PLC เพื่อออกแบบ intervention ใหม่"

**Coloring:** อัตราผ่าน < 50% = แดง · STAY ≥ 2 รอบ = เหลือง · สัญญาณซ้ำสองชั้น = ส้ม
**ความเป็นส่วนตัว:** ใช้ student_id เท่านั้น ภาษาเป็นกลาง ห้ามตีตรา
**ถ้าไม่มีข้อมูล remedial_tracking → ข้ามแท็บ 11 และระบุใน Method Notes**

**SQL เต็ม (ตรง schema จริง สถานะตัวพิมพ์เล็ก `pass`/`stay`) + สูตรส่วนที่ 3 (intersect กับ Gap Consistency ≥ 3) อยู่ใน `references/remedial_tracking_layout.md`**

---

## [NEW v1.5.0] FLAG8 ในแท็บ "สรุปการกรอกรายครู"

เพิ่มคอลัมน์ **"FLAG8 (ส่งช้า)"** — นิยาม: `created_at::date - teaching_date > 3` วัน
(ฐานข้อมูลมีคอลัมน์ `teaching_logs.days_late` คำนวณไว้แล้ว → ใช้ `days_late > 3` ได้ตรงๆ)

```sql
SELECT teacher_name,
       COUNT(*) FILTER (WHERE days_late > 3) AS flag8_count,
       MAX(teaching_date) FILTER (WHERE days_late > 3) AS latest_late
FROM teaching_logs
WHERE academic_term = '[TERM]'
GROUP BY teacher_name
ORDER BY flag8_count DESC;
```

**เงื่อนไขบังคับ:** ใช้สรุปแนวโน้ม/จัดอันดับเฉพาะเมื่อข้อมูลสะสม ≥ 2–4 สัปดาห์ (นับจาก 8 มิ.ย. 2569)
ถ้ายังไม่ถึง → แสดงเฉพาะตัวเลขดิบ และระบุใน Method Notes ว่า "ข้อมูล FLAG8 อยู่ระหว่างสะสม ยังไม่ใช้สรุปแนวโน้ม"
**ภาษา:** ระบุข้อเท็จจริงเท่านั้น ไม่ตีความเจตนา ใช้ "ขอความร่วมมือส่งบันทึกตามกำหนด"
**หมายเหตุ:** รายงานเชิงลึก FLAG8 (ranking + monthly trend + role-based access) จะเป็น skill แยก (Teacher Compliance Report) — ที่นี่แสดงระดับสรุปเท่านั้น

---

## [NEW v1.5.0] PLC Coverage ในแท็บ Recommendations

ทุกประเด็นที่เสนอ ต้องมีคอลัมน์ **"PLC Coverage"** 3 ค่า:
- ✅ **ผ่าน PLC แล้ว** (จาก `atlas_plc_sessions`) — สรุป outcome ล่าสุด 1 ประโยค
- ⏳ **PLC ต่อเนื่อง** (จาก `atlas_plc_timeline` — chain continue_plc ค้าง)
- ❌ **ยังไม่มี PLC** (จาก `atlas_plc_coverage_gap`)

**❌ + severity high → ยกเป็นข้อเสนอแนะลำดับแรก** "ควรจัดวง PLC ภายใน [กรอบเวลา]"
ถ้า MCP กลุ่ม PLC ใช้ไม่ได้ → query SQL เทียบเท่า หรือระบุใน Method Notes — **ห้ามเดาสถานะ PLC**

---

## HTML Dashboard (v1.5.0 — 8 tabs)

**8 tabs**: ภาพรวม | เฝ้าระวังรายห้อง | วิเคราะห์รายวิชา | Unit Assessment | **[NEW] Remedial PASS/STAY** | การส่งบันทึกครู | คลังข้อมูลนักเรียน | ผลตรวจสอบข้อมูล

เพิ่ม JS const ใหม่:
```javascript
const UNIT_ASSESSMENT_DATA = [
  {
    grade, classroom, subject, unit_name,
    total_students, avg_total_pct,
    avg_k_pct, avg_p_pct, avg_a_pct,
    pass_count, fail_count,
    teacher_accuracy: { K, P, A },
    blind_spot_index,
    blind_spot_students: [{ id, name, total_pct, k_pct, p_pct, a_pct }],
    gap_consistency_alerts: [{ student_id, gap_type, consecutive_weeks }]
  }
];

const REMEDIAL_DATA = [
  {
    grade, classroom, subject,
    total_tracked, pass_count, stay_count, pass_rate_pct,
    stay_long: [{ student_id, gap_type, stay_rounds, latest_round }],
    double_signal: [{ student_id, gap_type, stay_rounds, gap_consecutive }]
  }
];
```

---

## แท็บ "สรุปการกรอกรายครู" — Compliance Tab

คอลัมน์: ชื่อครู | บันทึกที่ควรมี (สป.1) | บันทึกจริง (สป.1) | สถานะ สป.1 | บันทึกที่ควรมี (สป.2) | บันทึกจริง (สป.2) | สถานะ สป.2 | จำนวนห้องที่สอน | นักเรียนไม่มี ID | **FLAG8 (ส่งช้า)** | แจ้งเตือน

> คอลัมน์ FLAG8 = นับ `days_late > 3` รายครู — ดูนิยาม/SQL/เงื่อนไขสะสมข้อมูลที่หัวข้อ "FLAG8" ด้านบน

สีแถว Alert Coloring:
```python
ERR_FILL  = PatternFill("solid", fgColor="FCE4D6")  # แดงอ่อน: w1=0 หรือ w2=0
WARN_FILL = PatternFill("solid", fgColor="FFF2CC")  # เหลือง: actual <= 2
BLUE_FILL = PatternFill("solid", fgColor="DDEEFF")  # ฟ้า: ยังไม่มีข้อมูลสัปดาห์นั้น
```

---

## Thai Filename Convention

ชื่อไฟล์ต้องเป็นภาษาไทย ห้ามใช้ English ล้วน:
```
ถูกต้อง:
  ATLAS_ภาพรวม_สัปดาห์11-25พค_2569-1_2026-05-25.xlsx
  ATLAS_Dashboard_ภาพรวม_2569-1_2026-05-25.html
  ATLAS_สรุปรายวัน_2569-1_2026-05-25.xlsx
  ATLAS_ActionBoard_ภาพรวม_2569-1_2026-06-11.xlsx

ผิด: ATLAS_Executive_Report_2026-05-25.xlsx
```

---

## remedial_ids Parsing

```python
import re

def parse_remedial_ids(raw):
    """รองรับ comma, period, space, mixed separator"""
    if not raw or str(raw).strip() in ('', 'nan', 'None'):
        return []
    return re.findall(r'\b\d{4}\b', str(raw))
```

---

## Output Rules

- สร้าง 2 ไฟล์เสมอ: Excel + HTML ในโฟลเดอร์เดียวกัน
- Header แถวแรกทุก tab ต้อง freeze, เปิด filter
- HTML: self-contained ไม่ต้องการ server
- ห้ามใส่ credential / personal health data
- Archive ไฟล์เก่าก่อนบันทึกทับ

---

## Validation Checklist (v1.4.0)

```
☐ ตัวเลขทุกตัวมาจากข้อมูลที่ผู้ใช้ให้ (ไม่ได้สร้างเอง)
☐ Special Care แยกออกก่อนคำนวณ Gap แล้ว
☐ ไม่มีชื่อนักเรียน SC ในรายงาน
☐ Compliance Tab สีแดง/เหลืองถูกต้อง
☐ แท็บ "ยังไม่ระบุเลข" นับตรงกับ KPI Card ใน Dashboard
☐ HYPERLINK ใน Excel ชี้ไปยัง HTML ถูกต้อง (relative path)
☐ HTML Dashboard เปิดได้โดยไม่ต้องอินเตอร์เน็ต
☐ ชื่อไฟล์เป็นภาษาไทย
☐ Integrity Audit flag ครบ
☐ Method Notes ระบุ limitation ครบ
☐ [NEW] Unit Assessment เปรียบเทียบเฉพาะวิชาเดียวกัน ชั้นเดียวกัน ห้องเดียวกัน
☐ [NEW] ถ้า K/P/A เป็น null → แสดง N/A ไม่คำนวณ Accuracy
☐ [NEW] Blind Spot รายชื่อตรงกับ action_plan_items ใน Supabase
☐ [v1.5.0] ตรวจ schema ของ remedial_tracking ก่อน query
☐ [v1.5.0] แท็บ 11 แสดงเฉพาะเมื่อมีข้อมูลจริง
☐ [v1.5.0] FLAG8 ใช้สรุปแนวโน้มเฉพาะเมื่อข้อมูลสะสมเพียงพอ
☐ [v1.5.0] PLC Coverage ครบทุกประเด็นใน Recommendations
☐ [v1.5.0] อ้างอิง MCP ชื่อ Woranat_School_Atlas_MCP เท่านั้น
```

---

## กฎที่ห้ามทำ

- ❌ สร้าง/ประมาณ/interpolate ข้อมูลที่ไม่มีในต้นฉบับ
- ❌ Hard-code credential
- ❌ ระบุชื่อนักเรียน SC
- ❌ นับ SC เป็น A-Gap หรือความล้มเหลวของครู
- ❌ สรุปว่าครูผิดจาก flag เพียงอย่างเดียว → ใช้ "ควรตรวจสอบ"
- ❌ ตั้งชื่อไฟล์ English ล้วน
- ❌ แปล a2-gap ว่าทักษะคิดขั้นสูง (= พฤติกรรมก้าวร้าว/Referral เท่านั้น)
- ❌ [NEW] เปรียบเทียบ unit_assessments ข้ามวิชา ข้ามชั้น ข้ามห้อง
- ❌ [NEW] คำนวณ Teacher Accuracy ถ้าไม่มีข้อมูล K/P/A ครบ
- ❌ [v1.5.0] เดาชื่อคอลัมน์ remedial_tracking โดยไม่ตรวจ schema
- ❌ [v1.5.0] เดาสถานะ PLC Coverage เมื่อไม่มีข้อมูล
- ❌ [v1.5.0] จัดอันดับครูจาก FLAG8 ก่อนข้อมูลสะสมครบ

---

## โหมด Action Board Report (เพิ่มใน v1.2.0)

### เมื่อใดควรใช้โหมดนี้

ใช้เมื่อผู้ใช้ถามว่า:
- "รายงาน action board"
- "blind spot สะสมเดือนนี้"
- "นักเรียนตกหล่นมีกี่คน"
- "UnitBlindSpot รายครู"
- "คิวนิเทศค้างอยู่เท่าไหร่"
- "รายงาน blind spot รายวิชา"

> อ่าน `references/action_board_layout.md` และ `scripts/build_action_board_report.md`
> ก่อนเริ่มสร้างรายงานโหมดนี้ทุกครั้ง

---

### แหล่งข้อมูล

**MCP Tool**: ใช้ `atlas_action_items` จาก `Woranat_School_Atlas_MCP` (18 tools)  
**ต้องใส่ filter เสมอ** — ห้ามดึงข้อมูลทั้งหมดโดยไม่กรอง:

```
atlas_action_items(
  term: "1/2569",
  issueType: "UnitBlindSpot"
)
```

---

### แง่มุมการวิเคราะห์ 4 มิติ

**แง่มุม A — ภาพรวม Action Items**
- จำนวนรวม แยกตาม status: open / verified / dismissed (ค่าจริงในฐานข้อมูล — ตรวจก่อนใช้)
- อัตราการจัดการ = (verified + resolved) / ทั้งหมด × 100
- รายการ overdue (เกิน due_date แล้วยังไม่ปิด)

**แง่มุม B — UnitBlindSpot (นักเรียนตกหล่น)**
- จำนวน blind spot แยกตาม severity: high / medium / low
- แยกตามครู → ชั้น/ห้อง/วิชา
- วิชาและชั้นที่มี blind spot มากสุด top 5
- ⚠️ ห้ามระบุชื่อนักเรียน — รายงานเป็นจำนวนเท่านั้น

**แง่มุม C — รายครู**
- ครูแต่ละคนมี open items กี่รายการ
- ครูที่มี high severity blind spot → เสนอนิเทศ
- เปรียบเทียบ workload ระหว่างครู (bar chart)

**แง่มุม D — Trend & Pattern**
- issue_type ใดมีมากสุด
- วิชา/ชั้นที่มี action items สะสมต่อเนื่อง
- high severity กระจุกอยู่ที่ไหน

---

### Output ที่ต้องสร้าง

| ไฟล์ | ชื่อมาตรฐาน | เนื้อหา |
|------|------------|--------|
| Excel | `ATLAS_ActionBoard_[ประเภท]_[ปีการศึกษา]-[ภาคเรียน]_[วันที่].xlsx` | 5 tabs |

**5 แท็บมาตรฐาน:**

| ลำดับ | ชื่อแท็บ | เนื้อหา |
|------|---------|--------|
| 1 | ภาพรวม | KPI cards: รวม/open/verified/dismissed + overdue count |
| 2 | BlindSpot รายครู | ตารางแยกตามครู → ชั้น/ห้อง/วิชา + severity color |
| 3 | รายวิชา | top 5 วิชาที่มี blind spot มากสุด + bar chart |
| 4 | Severity | pie/bar chart แสดง high/medium/low breakdown |
| 5 | Method Notes | ช่วงข้อมูล, แหล่งข้อมูล, ข้อจำกัด |

---

### ระบบสีสำหรับ Action Board

| สถานะ/ระดับ | สี | Hex |
|------------|-----|-----|
| severity: high | แดง | `#dc2626` |
| severity: medium | ส้ม | `#f59e0b` |
| severity: low | เหลือง | `#fde047` |
| status: verified | เขียว | `#22c55e` |
| status: open | น้ำเงิน | `#3b82f6` |
| status: dismissed | เทา | `#9ca3af` |
| header UnitBlindSpot | คราม | `#4f46e5` |

---

### Compassion Protocol ใน Action Board Mode

- ห้ามระบุชื่อนักเรียนในรายงาน ใช้จำนวน/รหัสเท่านั้น
- นักเรียน SC ที่อยู่ใน blind spot → นับแยก ไม่รวมใน main count
- ถ้า SC > 40% ของ blind spot รายห้อง → แจ้ง "พบสัดส่วนกลุ่มพิเศษสูงผิดปกติ ควรตรวจสอบ"

---

### เชื่อมต่อกับบันทึกนิเทศ

เมื่อพบ severity = high ≥ 3 คนในห้องเดียวกัน:
→ **เสนอสร้างบันทึกนิเทศ (.docx) ให้ครูคนนั้นทันที**

---

## โหมด Daily Compliance Dashboard (เพิ่มใน v1.1.0)

### เมื่อใดควรใช้โหมดนี้

ใช้เมื่อผู้ใช้ถามว่า:
- "ครูกรอกบันทึกหลังสอนวันที่ [วันที่] บ้างมั๊ย?"
- "สรุปการกรอกบันทึกประจำวัน"
- "ใครยังไม่กรอกบันทึกหลังสอน?"
- "สรุปรายวัน [วันที่]"

> อ่าน `references/daily_compliance_layout.md` และ `scripts/build_daily_compliance_dashboard.md`
> ก่อนเริ่มสร้างรายงานโหมดนี้ทุกครั้ง

---

### Output ที่ต้องสร้าง (ทั้ง 2 ไฟล์เสมอ)

| ไฟล์ | ชื่อมาตรฐาน | เนื้อหา |
|------|------------|--------|
| Excel | `ATLAS_สรุปรายวัน_[ปีการศึกษา]-[ภาคเรียน]_[YYYY-MM-DD].xlsx` | 5 tabs |
| HTML | `ATLAS_Dashboard_สรุปรายวัน_[ปีการศึกษา]-[ภาคเรียน]_[YYYY-MM-DD].html` | Interactive |

---

### เกณฑ์ Compliance

| สถานะ | เงื่อนไข |
|-------|---------|
| ✅ กรอกครบ | กรอกครบทุกห้องที่สอนในภาคเรียนนั้น |
| ◑ กรอกบางส่วน | กรอกบางห้อง แต่ยังขาดบางห้อง |
| ✗ ไม่ได้กรอกเลย | ไม่มี log ของวันนั้นเลย |

**Late Submission**: created_at (BKK +07:00) = วันที่ระบุ แต่ teaching_date ≠ วันที่ระบุ
→ นับเป็น Integrity flag, ไม่นับเป็น compliance

**[v1.5.0] หมายเหตุ:** Late Submission ที่เกิน 3 วัน (`days_late > 3`) = **FLAG8** — สอดคล้องกับคอลัมน์ FLAG8 ในแท็บสรุปการกรอกรายครู

### Compassion Protocol ใน Daily Mode

- ครูที่มี SC log → นับ SC แยก แสดงเป็น "[จำนวน X] SC logs" เท่านั้น
- ห้ามระบุชื่อนักเรียน SC ในรายงาน
- SC logs ไม่นับรวมใน Gap distribution หลัก

---

## โหมด Full Weekly Report — รายงานฉบับสมบูรณ์ประจำสัปดาห์ (เพิ่มใน v1.6.0)

### เมื่อใดควรใช้โหมดนี้

ใช้เมื่อผู้ใช้ถามว่า:
- "รายงานฉบับสมบูรณ์"
- "full report"
- "รายงานประจำสัปดาห์"
- "รายงานรวม"
- "สรุปทุกด้าน"

> อ่าน `scripts/build_full_weekly_report.md` ก่อนเริ่มสร้างรายงานโหมดนี้ทุกครั้ง

---

### Output

| ไฟล์ | ชื่อมาตรฐาน |
|------|------------|
| Excel | `ATLAS_รายงานฉบับสมบูรณ์_[ปีการศึกษา]-[ภาคเรียน]_[YYYY-MM-DD].xlsx` |

**บันทึกไปที่**: `reports/ภาพรวม/` — archive ไฟล์เก่าก่อนเสมอ

---

### โครงสร้าง 19 Sheets (สร้างครบทุก sheet ห้ามตัด)

| # | Sheet | แหล่งข้อมูล |
|---|-------|------------|
| 1 | ภาพรวม | `atlas_classroom_kpi` + `atlas_gap_distribution` |
| 2 | สรุปการกรอกรายครู | `atlas_teacher_list` + `atlas_teaching_logs_by_teacher` |
| 3 | Gap Analysis | `atlas_gap_distribution` |
| 4 | รายละเอียดรายวิชา | `atlas_classroom_kpi` |
| 5 | แนวโน้มรายสัปดาห์ | WF1 `avg_mastery` + `avg_mastery_prev` (2 สัปดาห์ล่าสุด) |
| 6 | Special Care | WF1 `sc_pct` + `sc_high_alert` |
| 7 | ห้องเรียนเสี่ยง | `atlas_red_zone` |
| 8 | วิชาขาดหาย | WF1 compliance (ยกเว้น ภาษาอังกฤษ KBW) |
| 9 | Action Board | `atlas_action_items` (filter term + issueType=UnitBlindSpot) |
| 10 | PLC Summary | `atlas_plc_sessions` + `atlas_plc_effectiveness` |
| 11 | PASS/STAY Summary | `remedial_tracking` (ตรวจ schema ก่อนเสมอ) |
| 12 | FLAG8 Alert | `remedial_tracking` days_late > 8 รายครู |
| 13 | ติดตามนักเรียน Red Zone | `atlas_red_zone` + WF2 |
| 14 | ยังไม่ระบุเลขนักเรียน | WF2 `remedial_ids = null` |
| 15 | รายนักเรียน Red Zone | WF2 `remedial_ids IS NOT NULL` |
| 16 | ข้อเสนอแนะ | วิเคราะห์จากทุก sheet |
| 17 | Integrity Audit | `atlas_integrity_flags` |
| 18 | Raw Sample | `atlas_teaching_logs_by_teacher` (50 records, anonymized) |
| 19 | Method Notes | — SQL exceptions + ข้อยกเว้นทั้งหมด |

---

### กฎบังคับสำหรับโหมดนี้

- **ตัดครูลาออกออกทุก sheet** (หทัยรัตน์ / วิลาวัลย์) — ระบุใน Sheet 2 และ 8
- **Sheet 8 ยกเว้น "ภาษาอังกฤษ KBW"** — ระบุใน Sheet 19
- **Compassion Protocol บังคับทุก sheet** — ห้ามระบุชื่อ/รหัสนักเรียน SC
- **Sheet 5** — ดึง 2 สัปดาห์ล่าสุดเสมอ
- **Sheet 10** — ถ้า PLC = 0 แต่ Action Board มี high severity → แจ้งเตือนใน Sheet 16
- **Sheet 11** — STAY double-signal → ระบุใน Sheet 16 ว่าต้องนิเทศเร่งด่วน พร้อมเสนอ .docx
- **Sheet 12** — ใช้ภาษากลาง: "พบการส่งล่าช้า" ไม่ใช่ "ครูละเลย"
- **Sheet 14** — ถ้ามี > 5 รายการ → แจ้งเตือนใน Sheet 16
- **Sheet 16** — ต้องมีอย่างน้อย 3 ข้อ เรียงตามความเร่งด่วน
- **Sheet 19** — ระบุ SQL exceptions / ข้อยกเว้นทุกอย่างที่ใช้ในรายงานนี้

---

## โหมด PBL Competency Report — สมรรถนะ PBL (เพิ่มใน v1.7.0)

### เมื่อใดควรใช้โหมดนี้

ใช้เมื่อผู้ใช้ถามว่า:
- "สรุปสมรรถนะ PBL [ชั้น/ห้อง/เทอม]"
- "รายงาน PBL"
- "นักเรียนไม่ผ่าน PBL มีใครบ้าง"
- "ห้องไหนเก่ง/อ่อนด้าน PBL"
- "PBL competency report"

> PBL = Project-Based Learning ประเมินสมรรถนะ **5 ด้าน** แยกจาก teaching_logs/unit_assessments (คนละชุดข้อมูล)
> เก็บในตาราง `pbl_projects` + `pbl_assessments` — **ห้ามปนกับ K/P/A ของ unit_assessments**

---

### โครงสร้างข้อมูล PBL

**5 สมรรถนะ** (ให้คะแนนด้านละ 1–3): 1 = ปรับปรุง, 2 = ดี, 3 = ดีเยี่ยม

| field | ด้าน |
|-------|------|
| com_score | การสื่อสาร (communication) |
| think_score | การคิด (thinking) |
| problem_score | การแก้ปัญหา (problem_solving) |
| life_score | ทักษะชีวิต (life_skill) |
| tech_score | เทคโนโลยี (technology) |

**เกณฑ์สรุปผล (overall_result — ระบบคำนวณให้แล้ว ห้ามคำนวณซ้ำ/แก้):**
- `excellent` (ดีเยี่ยม) = ไม่มีด้านใดได้ 1 และมีด้านที่ได้ 3 ตั้งแต่ 3 ด้านขึ้นไป
- `fail` (ไม่ผ่าน) = มีด้านใดด้านหนึ่งได้ 1
- `pass` (ผ่าน) = ที่เหลือ

`pbl_projects`: project_name, grade_level, classroom, teacher_name, academic_term (เช่น 2569-1), month
`pbl_assessments`: student_id, student_name, 5 scores, total_score (GENERATED), overall_result, notes
เชื่อมนักเรียนข้ามโปรเจกต์ด้วย `student_id`

---

### แหล่งข้อมูล (MCP `Woranat_School_Atlas_MCP` — ใส่ term เสมอ)

| งาน | Tool |
|-----|------|
| สรุปต่อเทอม (รายโปรเจกต์ + ภาพรวม) | `atlas_pbl_summary(term, grade_level?, classroom?, teacher_name?)` |
| โปรไฟล์ห้อง (เฉลี่ย 5 ด้าน + จุดแข็ง/จุดอ่อน) | `atlas_pbl_class_profile(term, grade_level, classroom)` |
| นักเรียนไม่ผ่าน + ด้านที่อ่อน | `atlas_pbl_failing(term, grade_level?, classroom?, teacher_name?)` |
| รายบุคคลข้ามโปรเจกต์ | `atlas_pbl_student(term, student_id)` |

> drill-down เพิ่มได้ด้วย Supabase MCP `execute_sql` บน `pbl_projects` / `pbl_assessments`
> **ห้ามเดา** — ถ้า tool คืน `message: "ไม่พบ..."` ให้รายงานว่ายังไม่มีข้อมูล PBL ในเทอมนั้น

---

### Output — Excel (5 tabs) + HTML Dashboard

| ลำดับ | แท็บ | เนื้อหา | แหล่ง |
|------|------|--------|------|
| 1 | ภาพรวม PBL | KPI cards: โปรเจกต์/นักเรียน/ดีเยี่ยม%/ผ่าน%/ไม่ผ่าน% + bar chart เฉลี่ย 5 ด้านรายโปรเจกต์ | `atlas_pbl_summary` |
| 2 | รายห้อง | radar/ตาราง เฉลี่ย 5 ด้าน + จุดแข็ง/จุดที่ควรพัฒนา รายห้อง | `atlas_pbl_class_profile` |
| 3 | นักเรียนไม่ผ่าน | รายชื่อ + ด้านที่อ่อน (weak_dimensions) + หมายเหตุ/แผนพัฒนา | `atlas_pbl_failing` |
| 4 | รายบุคคล (ถ้าระบุ) | คะแนน 5 ด้านข้ามโปรเจกต์ของนักเรียน | `atlas_pbl_student` |
| 5 | Method Notes | เทอม/ขอบเขต/ข้อจำกัด + ระบุว่าข้อมูลมาจาก atlas_pbl_* |

ชื่อไฟล์ภาษาไทย เช่น `ATLAS_สมรรถนะPBL_ป.4-KBW_2569-1_2026-06-20.xlsx`
HTML: self-contained, const `PBL_DATA = [{ project_name, grade_level, classroom, teacher_name, month, students, excellent, pass, fail, avg_competency:{communication,thinking,problem_solving,life_skill,technology} }]` + `PBL_CLASS_PROFILE` + `PBL_FAILING`

---

### กฎบังคับสำหรับโหมด PBL

- **คะแนน PBL คนละชุดกับ unit_assessments (K/P/A)** — ห้ามปน/เทียบข้ามกัน
- **ห้ามคำนวณ overall_result เอง** — ใช้ค่าที่ระบบให้ (excellent/pass/fail)
- **นักเรียนไม่ผ่าน (Tab 3) ระบุชื่อได้** (เป็นรายงานผู้บริหารเพื่อช่วยเหลือ) แต่ใช้ภาษาเชิงพัฒนา ไม่ตีตรา — เช่น "ควรเสริมด้าน[X]" ไม่ใช่ "เด็กอ่อน"
- ถ้านักเรียนไม่ผ่านมีด้านที่อ่อนซ้ำกับ Special Care / Gap จาก teaching_logs → โยงเป็นข้อเสนอแนะ Buddy/PLC
- **เทียบเฉพาะในเทอมเดียวกัน** — ส่งผ่าน `term` ทุก tool เสมอ

---

### เชื่อมกับ Full Weekly Report

ในโหมด "รายงานฉบับสมบูรณ์" ถ้ามีข้อมูล PBL ในเทอมนั้น → **เพิ่ม Sheet 20 "สมรรถนะ PBL"**
(ภาพรวม + จุดแข็ง/จุดอ่อนรายห้อง + นักเรียนไม่ผ่าน จาก `atlas_pbl_summary`/`atlas_pbl_class_profile`/`atlas_pbl_failing`)
ถ้าไม่มีข้อมูล PBL → ข้าม Sheet 20 และระบุใน Method Notes
