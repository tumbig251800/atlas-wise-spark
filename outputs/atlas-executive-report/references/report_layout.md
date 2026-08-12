# Report Layout — มาตรฐานการจัดหน้ารายงาน ATLAS Executive Report

> ไฟล์นี้กำหนด layout ของทุกแท็บ ตำแหน่ง chart และหลักการออกแบบ
> Agent ต้องอ่านไฟล์นี้ก่อนสร้าง workbook ทุกครั้ง

---

## หลักการออกแบบหลัก (Executive-First Design)

1. **อ่านจบใน 1 นาที** — ผู้บริหารเปิดหน้า Overview แล้วต้องเข้าใจสถานการณ์ได้ทันที
2. **สรุปก่อน รายละเอียดหลัง** — KPI cards อยู่บนสุด ตารางอยู่ด้านล่าง
3. **ไม่ตาราง raw อย่างเดียว** — ทุกหน้าต้องมีบริบทหรือ visualization ประกอบ
4. **ภาษาไทยชัดเจน** — ป้ายกำกับทุกอย่างเป็นภาษาไทย (ยกเว้น field name ทางเทคนิค)
5. **สีมีความหมาย** — ใช้สีสถานะสม่ำเสมอทั้งเล่ม
6. **Freeze + Filter ทุกแท็บ** — freeze แถวหัว filter ทุกตาราง

### ระบบสีมาตรฐาน

| สี | Hex | ความหมาย |
|----|-----|---------|
| แดง | `#dc2626` | Red Zone / เร่งด่วน / ต้องดำเนินการ |
| เหลือง | `#f59e0b` | Yellow Zone / ติดตาม / ระวัง |
| เขียว | `#22c55e` | Green Zone / ดี / สำเร็จ |
| น้ำเงินเข้ม | `#1e3a5f` | Header หลัก |
| น้ำเงินอ่อน | `#dbeafe` | แถวสลับ / KPI card background |
| เทา | `#f8fafc` | background ทั่วไป |
| ขาว | `#ffffff` | background แถวข้อมูล |

### Typography

| ส่วน | Font Size | Bold | สี |
|------|----------|------|-----|
| ชื่อรายงาน | 18pt | ✅ | #1e3a5f |
| KPI card label | 10pt | ✅ | #374151 |
| KPI card value | 20pt | ✅ | ขึ้นกับสถานะ |
| Header ตาราง | 10pt | ✅ | #ffffff บน #1e3a5f |
| เนื้อหาตาราง | 10pt | ❌ | #374151 |
| หัวแท็บ | 10pt | ✅ | ขึ้นกับ theme แท็บ |

### Column Width มาตรฐาน

| ประเภท | ความกว้าง |
|--------|---------|
| วันที่ | 14 |
| ชื่อวิชา | 20 |
| ชื่อครู | 18 |
| ตัวเลข (score/count) | 12 |
| ร้อยละ | 10 |
| ข้อความยาว (reflection) | 40 |
| Gap / Status | 14 |

---

## แท็บที่ 1 — Overview

### Layout (บนลงล่าง)

```
[แถว 1–3]   Title Block
  - ชื่อรายงาน: "รายงานสรุปการจัดการเรียนการสอน — ATLAS Executive Report"
  - ชื่อโรงเรียน
  - ช่วงข้อมูล: "ภาคเรียนที่ X/XXXX | [วันที่เริ่ม] ถึง [วันที่สิ้นสุด]"
  - วันที่สร้างรายงาน

[แถว 5–9]   KPI Cards (8 cards ใน 2 แถว × 4 คอลัมน์)
  แถว A: บันทึกทั้งหมด | ครูทั้งหมด | วิชาทั้งหมด | ช่วงชั้น
  แถว B: Mastery เฉลี่ย | Red Zone | Success Rate | Special Care

[แถว 11–22]  ตาราง Mastery รายวิชา
  คอลัมน์: วิชา | ช่วงชั้น | จำนวน log | Mastery เฉลี่ย | Red Zone | Success Rate | Gap หลัก
  เรียง: ตาม Mastery เฉลี่ย จากน้อยไปมาก (วิชาที่ต้องการความสนใจก่อน)

[แถว 24–34]  ตาราง Gap Distribution
  คอลัมน์: Gap Type | จำนวน | ร้อยละ | แนวโน้ม
  แถว: K-Gap | P-Gap | A-Gap | A2-Gap | System-Gap | Success

[แถว 36–47]  ตาราง Monthly Trend (3–6 เดือนล่าสุด)
  คอลัมน์: เดือน | บันทึก | Mastery เฉลี่ย | Red Zone | Success Rate

[แถว 49–54]  Action Plan Highlights (3–5 ข้อ)
  ข้อเสนอแนะเร่งด่วนที่สุดสำหรับผู้บริหาร

[แถว 56–100] Visual Dashboard (Charts)
  - Chart 1: Mastery Trend Line Chart (รายเดือน)
  - Chart 2: Gap Distribution Donut Chart
  - Chart 3: Subject Mastery Bar Chart
```

### KPI Card Design

แต่ละ KPI card ประกอบด้วย:
- บรรทัดบน: ป้ายกำกับ (เช่น "บันทึกทั้งหมด")
- บรรทัดกลาง: ค่าตัวเลขขนาดใหญ่ (font 20pt)
- บรรทัดล่าง: บริบทเพิ่มเติม (เช่น "เพิ่มขึ้น 12% จากเดือนที่แล้ว")
- สีพื้นหลัง: ขึ้นกับสถานะ (แดง = Red Zone สูง, เขียว = Success สูง, น้ำเงินอ่อน = ปกติ)

---

## แท็บที่ 2 — Subject Detail

### Layout

```
[แถว 1]     Header: "รายละเอียดรายวิชา"
[แถว 3]     Dropdown / Filter: เลือกวิชา, ช่วงชั้น

[แถว 5–15]  ตารางสรุปรายวิชา
  คอลัมน์: วิชา | ช่วงชั้น | ห้อง | ครู | log | Mastery เฉลี่ย | K | P | A | A2 | Sys | Success | Red Zone%

[แถว 17–30] ตาราง Top 5 วิชาที่ต้องการ attention
  (เรียงตาม Red Zone% จากมากไปน้อย)

[แถว 32–45] ตาราง Top 5 วิชาที่ Success Rate สูง
  (เรียงตาม Success Rate จากมากไปน้อย)
```

---

## แท็บที่ 3 — Trend

### Layout

```
[แถว 1]     Header: "แนวโน้มรายเดือน"

[แถว 3–15]  ตาราง Monthly Summary
  คอลัมน์: เดือน | บันทึก | ครู | Mastery เฉลี่ย | Red Zone | Yellow | Green | Success%

[แถว 17–18] สรุป: "เดือนที่ดีที่สุด / เดือนที่ต้องการความสนใจ"

[แถว 20–50] Chart: Line Chart แนวโน้ม Mastery เฉลี่ย + Red Zone % รายเดือน
  - แกน X: เดือน
  - แกน Y ซ้าย: Mastery เฉลี่ย (0–5)
  - แกน Y ขวา: Red Zone % (0–100%)
  - Series 1: Mastery (สีน้ำเงิน)
  - Series 2: Red Zone % (สีแดง เส้นประ)
```

---

## แท็บที่ 4 — Gap Analysis

### Layout

```
[แถว 1]     Header: "การวิเคราะห์ช่องว่างการเรียนรู้"

[แถว 3–12]  ตาราง Gap Distribution รวม
[แถว 14–25] ตาราง Gap รายวิชา (cross-tab: วิชา × Gap Type)
[แถว 27–38] ตาราง Gap รายช่วงชั้น
[แถว 40–52] ตาราง Gap รายครู (ไม่ระบุว่าครูผิด เป็น reference เท่านั้น)

[แถว 54–80] Chart: Stacked Bar แสดง Gap Distribution รายวิชา
```

---

## แท็บที่ 5 — Special Care

### Layout

```
[แถว 1]     Header: "สรุปนักเรียนกลุ่ม Special Care"
[แถว 2]     คำเตือน: "ข้อมูลในแท็บนี้เป็นความลับ ใช้สำหรับผู้บริหารและครูที่เกี่ยวข้องเท่านั้น"

[แถว 4–8]   KPI Summary
  - จำนวนนักเรียน Special Care (รวม)
  - จำนวน log ที่เกี่ยวข้อง
  - Mastery เฉลี่ยกลุ่ม Special Care
  - จำนวนที่ต้องการ accommodation พิเศษ

[แถว 10–20] ตาราง Accommodation Summary (ไม่ระบุชื่อ)
  คอลัมน์: ประเภท accommodation | จำนวนนักเรียน | วิชาที่เกี่ยวข้อง | สถานะล่าสุด

[แถว 22–30] ตาราง Mastery Trend กลุ่ม Special Care รายเดือน

[แถว 32–38] บันทึกสำคัญ / สัญญาณที่ต้องติดตาม
  (ไม่ระบุชื่อ — ระบุเป็น "นักเรียน X คน ในวิชา Y")
```

---

## แท็บที่ 6 — Recommendations

### Layout

```
[แถว 1]     Header: "ข้อเสนอแนะและแผนปฏิบัติการ"

[แถว 3–20]  ตาราง Action Plan
  คอลัมน์: ลำดับความสำคัญ | วิชา/กลุ่ม | ปัญหา | Gap หลัก | แนวทาง | **PLC Coverage** | ผู้รับผิดชอบ | กรอบเวลา
  > PLC Coverage = ✅ ผ่าน PLC แล้ว (atlas_plc_sessions, สรุป outcome 1 ประโยค) / ⏳ PLC ต่อเนื่อง (atlas_plc_timeline) / ❌ ยังไม่มี PLC (atlas_plc_coverage_gap)
  > ❌ + severity high → ยกเป็นข้อเสนอแนะลำดับแรก "ควรจัดวง PLC ภายใน [กรอบเวลา]"

[แถว 22–30] วิชาที่แนะนำ Quick Win (ปรับนิดเดียวเห็นผลเร็ว)
[แถว 32–40] วิชาที่ต้องการ Deep Intervention
[แถว 42–48] สิ่งที่ทำได้ดีแล้ว (เพื่อ morale และ best practice)
```

---

## แท็บที่ 6.5 — Remedial Tracking (PASS/STAY) [v1.5.0]

> รายละเอียดเต็มอยู่ใน `references/remedial_tracking_layout.md` — อ่านก่อนสร้างแท็บนี้

```
[แถว 1]      Header: "การติดตามซ่อมเสริม (PASS/STAY)"
[ส่วนที่ 1]  ภาพรวมรายห้อง/วิชา: ชั้น | ห้อง | วิชา | ติดตามทั้งหมด | PASS | STAY | อัตราผ่าน %
[ส่วนที่ 2]  STAY ค้างนาน (≥ 2 รอบ): student_id | ชั้น/ห้อง | วิชา | gap | รอบ STAY | รอบล่าสุด
[ส่วนที่ 3]  สัญญาณซ้ำสองชั้น (STAY ≥ 2 รอบ AND Gap Consistency ≥ 3) + ข้อเสนอแนะ PLC
สี: อัตราผ่าน < 50% = แดง / STAY ≥ 2 รอบ = เหลือง / สัญญาณซ้ำสองชั้น = ส้ม
ข้ามแท็บถ้าไม่มีข้อมูล remedial_tracking
```

---

## แท็บที่ 7 — Integrity Audit

### Layout

```
[แถว 1]     Header: "Integrity Audit — การตรวจสอบคุณภาพข้อมูล"
[แถว 2]     คำอธิบาย: "แท็บนี้แสดงจุดในข้อมูลที่ควรตรวจสอบเพิ่มเติม ไม่ใช่การตำหนิ"

[แถว 4–8]   สรุป Flags
  คอลัมน์: Flag ID | ชื่อ | จำนวน | ความรุนแรง | สถานะ

[แถว 10–end] รายละเอียด Flags แต่ละตัว
  สำหรับแต่ละ flag:
    - Flag ID + ชื่อ + คำอธิบาย
    - ตารางตัวอย่าง records (ไม่ระบุชื่อนักเรียน)
    - คำแนะนำการแก้ไข
```

---

## แท็บที่ 8 — Raw Sample

### Layout

```
[แถว 1]     Header: "ตัวอย่างข้อมูลดิบ (20–50 records)"
[แถว 2]     คำอธิบาย: "ตัวอย่างเพื่อตรวจสอบความถูกต้อง ไม่ใช่ข้อมูลทั้งหมด"
[แถว 4–end] ตารางข้อมูลดิบ (anonymized — ไม่ระบุชื่อนักเรียน)
```

---

## แท็บที่ 9 — Method Notes

### Layout

```
[แถว 1]     Header: "บันทึกวิธีการและข้อจำกัด"

[แถว 3–10]  ช่วงข้อมูล
  - แหล่งข้อมูล
  - วันที่เริ่มต้น–สิ้นสุด
  - จำนวน records ทั้งหมด
  - จำนวน records ที่ใช้ในการวิเคราะห์

[แถว 12–20] วิธีคำนวณ
  - สูตร Mastery Average
  - สูตร Red Zone %
  - สูตร Success Rate
  - วิธีการแยก Special Care

[แถว 22–30] ข้อจำกัด (Limitations)
  - ข้อมูลที่ขาด (เช่น ไม่มี unit_assessments)
  - ข้อมูลที่ไม่ครบหรือมี flag
  - สิ่งที่รายงานนี้ไม่ครอบคลุม
```

---

## Chart Specifications

### Chart 1 — Mastery Trend (Line Chart)

```
ตำแหน่ง: Overview tab แถว 56–75
ชนิด: Line Chart (เส้น)
ข้อมูล:
  - แกน X: เดือน (format: "ม.ค. 68")
  - แกน Y: Mastery เฉลี่ย (min 1, max 5)
  - Series: Mastery เฉลี่ยรวม (น้ำเงิน #3b82f6, เส้นหนา)
  - Optional: เส้น Target (เขียว #22c55e, เส้นประ)
ป้ายกำกับ:
  - ชื่อ chart: "แนวโน้ม Mastery เฉลี่ยรายเดือน"
  - Legend: แสดง
  - Data labels: แสดงค่าที่จุดสำคัญ
```

### Chart 2 — Gap Distribution (Donut Chart)

```
ตำแหน่ง: Overview tab แถว 56–75 (วางข้างๆ Chart 1)
ชนิด: Donut Chart (วงกลมมีรู)
ข้อมูล:
  - Slice: K-Gap / P-Gap / A-Gap / A2-Gap / System-Gap / Success
  - สี: K=น้ำเงิน P=ม่วง A=เหลือง A2=แดง System=เทา Success=เขียว
ป้ายกำกับ:
  - ชื่อ chart: "สัดส่วนประเภท Gap"
  - แสดง % บน slice
  - Legend: แสดงด้านข้าง
```

### Chart 3 — Subject Mastery (Bar Chart)

```
ตำแหน่ง: Overview tab แถว 77–100
ชนิด: Horizontal Bar Chart (แท่งนอน เรียงจากน้อยไปมาก)
ข้อมูล:
  - แกน Y: ชื่อวิชา
  - แกน X: Mastery เฉลี่ย (0–5)
  - สีแท่ง: conditional — แดงถ้า <= 2.5, เหลืองถ้า 3, เขียวถ้า >= 4
ป้ายกำกับ:
  - ชื่อ chart: "Mastery เฉลี่ยรายวิชา"
  - แสดงค่าปลายแท่ง
  - เส้น reference: mastery = 3 (เหลืองเส้นประ)
```

---

## Excel Formatting Standards

### Freeze Panes
- ทุกแท็บที่มีตาราง: freeze แถวที่ 1 (header row)
- แท็บ Overview: freeze แถวที่ 4 (หลัง title block)

### AutoFilter
- เปิด autofilter ทุกตารางที่มีมากกว่า 10 แถว

### Wrap Text
- เปิด wrap text สำหรับ column ที่มีข้อความยาว (reflection, next_strategy, คำแนะนำ)

### Conditional Formatting
- mastery_score: แดง (<= 2.5), เหลือง (= 3), เขียว (>= 4)
- Red Zone %: แดง (> 30%), เหลือง (10–30%), เขียว (< 10%)
- Success Rate: เขียว (>= 70%), เหลือง (50–69%), แดง (< 50%)

### Tab Colors (แท็บสี)
| แท็บ | สี |
|------|----|
| Overview | น้ำเงิน #1e3a5f |
| Subject Detail | น้ำเงิน #3b82f6 |
| Trend | เขียว #059669 |
| Gap Analysis | ส้ม #d97706 |
| Special Care | ม่วง #7c3aed |
| Remedial Tracking | ส้ม #ea580c |
| Recommendations | เขียว #16a34a |
| Integrity Audit | แดง #dc2626 |
| Raw Sample | เทา #64748b |
| Method Notes | เทา #94a3b8 |

---

## [v1.6.0] Sheet 10 — PLC Summary

```
[แถว 1]   Header: "สรุป PLC ประจำสัปดาห์ — ภาคเรียน [TERM]"
[แถว 2]   ช่วงข้อมูล: "[สัปดาห์เริ่ม] ถึง [สัปดาห์สิ้นสุด]"

[ส่วนที่ 1 — KPI Cards (แถว 4–8)]
  บัตร 4 ใบ: PLC ทั้งหมดที่จัด | ครูที่เข้าร่วม | นักเรียน STAY ที่ครอบคลุม | อัตรา STAY→PASS หลัง PLC %

[ส่วนที่ 2 — ตาราง PLC Sessions (แถว 10–end)]
  คอลัมน์: วันที่จัด | หัวข้อ | ครูเข้าร่วม | วิชา/ชั้น | นักเรียน STAY ที่ครอบคลุม | ผลลัพธ์ (STAY→PASS) | ประสิทธิผล %
  สี: ประสิทธิผล ≥ 70% → เขียว / 40–69% → เหลือง / < 40% → แดง

[ส่วนที่ 3 — ช่องว่าง PLC (แถว ถัดจากตาราง)]
  ใช้ atlas_plc_coverage_gap — แสดงวิชา/ชั้นที่มี STAY แต่ยังไม่มี PLC
  คอลัมน์: วิชา | ชั้น/ห้อง | จำนวน STAY | PLC ล่าสุด | สถานะ ❌ ยังไม่มี PLC
  
ถ้า PLC = 0 ทั้งสัปดาห์ → แสดงข้อความเตือน:
"⚠️ ยังไม่มีการจัด PLC สัปดาห์นี้ — Action Board มี [N] รายการ high severity ที่รอการแก้ไข"
```
Tab color: เขียวอมฟ้า `#0891b2`

---

## [v1.6.0] Sheet 11 — PASS/STAY Summary

> ใช้ SQL และโครงสร้างจาก `references/remedial_tracking_layout.md`

```
[แถว 1]   Header: "ติดตามซ่อมเสริม PASS/STAY — สัปดาห์ [วันที่]"

[ส่วนที่ 1 — KPI Cards]
  ติดตามทั้งหมด | PASS | STAY | อัตราผ่าน % | STAY double-signal (แดง ถ้า > 0)

[ส่วนที่ 2 — ตาราง PASS/STAY รายห้อง/วิชา]
  คอลัมน์: ชั้น | ห้อง | วิชา | ทั้งหมด | PASS | STAY | อัตราผ่าน %
  สี: อัตราผ่าน < 50% → แดง / 50–69% → เหลือง / ≥ 70% → เขียว

[ส่วนที่ 3 — STAY double-signal]
  คอลัมน์: student_id | ชั้น/ห้อง | วิชา | gap | จำนวนรอบ STAY | ข้อเสนอแนะ
  ข้อเสนอแนะ: "ควรนิเทศเร่งด่วน + จัด PLC ออกแบบ intervention ใหม่"
  สีแถวทั้งหมด: ส้ม #f97316
  
ถ้าไม่มีข้อมูล remedial_tracking → ระบุ "ยังไม่มีข้อมูลซ่อมเสริมสัปดาห์นี้" + บันทึกใน Sheet 19
```
Tab color: ส้ม `#ea580c`

---

## [v1.6.0] Sheet 12 — FLAG8 Alert

```
[แถว 1]   Header: "FLAG8 — การส่งบันทึกล่าช้า (> 8 วัน)"
[แถว 2]   หมายเหตุ: "FLAG8 คือบันทึกที่ส่งช้ากว่า teaching_date เกิน 8 วัน — ใช้เพื่อติดตาม ไม่ใช่ตัดสิน"

[ส่วนที่ 1 — KPI Cards]
  FLAG8 ทั้งหมดสัปดาห์นี้ | ครูที่มี FLAG8 | วิชาที่มี FLAG8 บ่อยสุด | สะสมรายภาค

[ส่วนที่ 2 — ตาราง FLAG8 รายครู]
  คอลัมน์: ชื่อครู | FLAG8 สัปดาห์นี้ | FLAG8 สะสม | วิชาที่มีปัญหา | วันล่าช้าเฉลี่ย | หมายเหตุ
  สี: FLAG8 สะสม ≥ 5 → แดง / 2–4 → เหลือง / 1 → เขียว
  ภาษา: "พบการส่งล่าช้า" — ห้ามใช้ "ครูละเลย/ผิด"

[ส่วนที่ 3 — รายละเอียด FLAG8 รายบันทึก]
  คอลัมน์: วันที่สอน | วันที่ส่ง | วันล่าช้า | ครู | วิชา | ห้อง
  
ถ้าไม่มี FLAG8 → แสดง "✅ ไม่พบการส่งล่าช้าสัปดาห์นี้"
```
Tab color: แดงอมส้ม `#b45309`
