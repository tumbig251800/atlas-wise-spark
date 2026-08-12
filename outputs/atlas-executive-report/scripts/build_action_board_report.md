# Script: Build Action Board Report

> อ่านไฟล์นี้ก่อนสร้างรายงาน Action Board ทุกครั้ง
> ทำตามขั้นตอนตามลำดับ — ห้ามข้าม

---

## ขั้นตอนที่ 1 — ดึงข้อมูลจาก MCP

```
เรียก `atlas_action_items` (จาก `Woranat_School_Atlas_MCP`) โดยใส่ filter เสมอ:
- term: ภาคเรียนที่ต้องการ เช่น "1/2569"
- issueType: "UnitBlindSpot" (ถ้าต้องการเฉพาะ blind spot)
  หรือ ไม่ระบุ issueType เพื่อดึงทุกประเภท

ห้ามดึงข้อมูลทั้งหมดโดยไม่กรอง term
```

**fields ที่ต้องใช้:**
```
id, issue_type, severity, status, due_date,
teacher_name, grade_level, classroom, subject,
student_name, student_id, detail, created_at,
teacher_id, academic_term
```

---

## ขั้นตอนที่ 2 — ตรวจสอบและเตรียมข้อมูล

```python
# Pseudo-code สำหรับ agent ทำความเข้าใจ

# 1. แยก UnitBlindSpot ออกจาก issue_type อื่น
blind_spots = [i for i in items if i.issue_type == "UnitBlindSpot"]
other_items = [i for i in items if i.issue_type != "UnitBlindSpot"]

# 2. คำนวณ overdue
today = current_date
overdue = [i for i in items if i.due_date < today and i.status == "open"]

# 3. แยก SC (health_care_ids หรือ health_care_status)
# ถ้าไม่มี field นี้ใน action_items ให้ข้ามไป

# 4. Group by teacher → classroom → subject
groups = group_by(blind_spots, ["teacher_name", "grade_level", "classroom", "subject"])
```

---

## ขั้นตอนที่ 3 — คำนวณ KPI

| KPI | สูตร |
|-----|------|
| รวมทั้งหมด | COUNT(all items) |
| open | COUNT(status = 'open') |
| overdue | COUNT(due_date < today AND status = 'open') |
| verified | COUNT(status = 'verified') |
| dismissed | COUNT(status = 'dismissed') |
| อัตราจัดการ | (verified + resolved) / total × 100 |
| high severity | COUNT(severity = 'high') |
| medium severity | COUNT(severity = 'medium') |
| low severity | COUNT(severity = 'low') |

---

## ขั้นตอนที่ 4 — สร้าง Excel Workbook

### สร้างด้วย openpyxl (Python) หรือเทียบเท่า

```python
from openpyxl import Workbook
from openpyxl.styles import PatternFill, Font, Alignment, Border, Side
from openpyxl.chart import PieChart, BarChart, Reference

wb = Workbook()

# Tab 1: ภาพรวม
ws1 = wb.active
ws1.title = "ภาพรวม"

# Tab 2: BlindSpot รายครู
ws2 = wb.create_sheet("BlindSpot รายครู")

# Tab 3: รายวิชา
ws3 = wb.create_sheet("รายวิชา")

# Tab 4: Severity
ws4 = wb.create_sheet("Severity")

# Tab 5: Method Notes
ws5 = wb.create_sheet("Method Notes")
```

---

## ขั้นตอนที่ 5 — สร้างแต่ละแท็บ

### Tab 1: ภาพรวม

```
1. วาง KPI cards แถว 1-6 (5 cards แนวนอน)
   - A1:B6 = รายการทั้งหมด
   - C1:D6 = เปิดอยู่ (open)
   - E1:F6 = เกินกำหนด (overdue) — สีแดง
   - G1:H6 = จัดการแล้ว (verified) — สีเขียว
   - I1:J6 = ยกเลิก (dismissed) — สีเทา

2. ตาราง summary รายครู (แถว 8 เป็นต้นไป)
   header: ครู | open | high | medium | low | overdue | verified
   เรียง open DESC

3. Donut chart: สัดส่วน open/verified/dismissed
   วางตำแหน่ง K1:R20
```

### Tab 2: BlindSpot รายครู

```
1. Header สีครามเข้ม (#4f46e5) text ขาว
2. columns: ครู | ชั้น/ห้อง | วิชา | จำนวน | High | Medium | Low | สถานะ
3. จัดกลุ่มตามครู — merge cell ชื่อครูในแนวตั้ง
4. Conditional formatting severity:
   - High → fill #fecaca
   - Medium → fill #fef3c7
   - Low → fill #fef9c3
5. freeze row 1, column A
```

### Tab 3: รายวิชา

```
1. ตาราง top 5 วิชา: วิชา | จำนวน | high | medium | low
2. Bar chart แนวนอน ใช้ข้อมูลตาราง top 5
3. ตาราง heat map รายชั้น per วิชา (ถ้าข้อมูลมี)
```

### Tab 4: Severity

```
1. KPI row: High / Medium / Low พร้อม % 
2. Pie chart: High=#dc2626, Medium=#f59e0b, Low=#fde047
3. ตารางละเอียด: Severity | จำนวน | % | วิชาพบมากสุด | ชั้นพบมากสุด
```

### Tab 5: Method Notes

```
แสดงข้อมูล metadata:
- แหล่งข้อมูล: action_plan_items + atlas_action_items (Woranat_School_Atlas_MCP)
- ภาคเรียน: [term]
- วันที่สร้าง: [today]
- จำนวน items ที่ดึงมา: [count]
- ข้อจำกัด: status จริง = open/verified/dismissed; นับเฉพาะ open, ไม่นับ verified/dismissed
- Compassion Protocol: SC แยกออก
- คำนิยาม: UnitBlindSpot = คะแนน ≤60% และไม่เคยอยู่ใน remedial_ids
```

---

## ขั้นตอนที่ 6 — ตั้งค่า Styling ทั่วไป

```python
# Font มาตรฐาน
header_font = Font(name="TH Sarabun New", size=14, bold=True, color="FFFFFF")
body_font = Font(name="TH Sarabun New", size=13)
kpi_font = Font(name="TH Sarabun New", size=22, bold=True)

# Header fill
indigo_fill = PatternFill("solid", fgColor="4f46e5")
blue_fill = PatternFill("solid", fgColor="1e3a5f")

# กฎทุกแท็บ
- freeze_panes แถวแรก
- เปิด auto_filter ทุกตาราง
- column width auto-fit
- row height ≥ 20
```

---

## ขั้นตอนที่ 7 — บันทึกไฟล์

```python
# ชื่อไฟล์มาตรฐาน
filename = f"ATLAS_ActionBoard_ภาพรวม_{term.replace('/','-')}_{today:%Y-%m-%d}.xlsx"

# บันทึกใน workspace folder ของผู้ใช้
# (Desktop/Atlas-cowork report/reports/action-board/)
wb.save(filename)
```

---

## ขั้นตอนที่ 8 — ตรวจ QA ก่อนส่ง

```
☐ KPI cards ครบ 5 ตัว ตัวเลขตรงกับข้อมูลจริง
☐ ไม่มีชื่อนักเรียนใดๆ ในรายงาน
☐ severity color ถูกต้อง (high=แดง, medium=ส้ม, low=เหลือง)
☐ ตาราง BlindSpot รายครู จัดกลุ่มถูกต้อง
☐ Chart แสดงได้ (ไม่ error)
☐ Method Notes ระบุภาคเรียนและวันที่ถูกต้อง
☐ ชื่อไฟล์ถูกรูปแบบ
☐ freeze + filter ทุกแท็บ
```

---

## ขั้นตอนที่ 9 — เสนอบันทึกนิเทศ

หลังสร้าง Excel เสร็จ ให้ตรวจ:
```
ถ้าพบ: ครูคนใดมี severity=high ≥ 3 คนในห้องเดียวกัน
→ เสนอ: "พบ [ชื่อครู] มีนักเรียน high severity [X] คน ใน [ชั้น/ห้อง/วิชา]
         สร้างบันทึกแจ้งผลนิเทศด้วยมั๊ยครับ?"
```

---

*Script v1.0 · Action Board Report · atlas-executive-report skill v1.2.0*
