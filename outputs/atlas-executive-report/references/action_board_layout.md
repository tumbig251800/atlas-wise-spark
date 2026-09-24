# Action Board Layout — มาตรฐานการจัดหน้ารายงาน ATLAS Action Board

> ไฟล์นี้กำหนด layout ของทุกแท็บสำหรับรายงาน Action Board โหมด 9
> Agent ต้องอ่านไฟล์นี้ก่อนสร้าง workbook ทุกครั้งที่ทำ Action Board report

---

## แท็บที่ 1 — ภาพรวม (Overview)

### KPI Cards (แถว 1–6)
วางแนวนอน 5 card:

| Card | ค่าที่แสดง | สี background |
|------|-----------|--------------|
| รายการทั้งหมด | COUNT(*) | น้ำเงินอ่อน `#dbeafe` |
| เปิดอยู่ (open) | COUNT status=open | น้ำเงิน `#3b82f6` text ขาว |
| เกินกำหนด (overdue) | due_date < today AND status=open | แดง `#dc2626` text ขาว |
| จัดการแล้ว (verified) | COUNT status=verified | เขียว `#22c55e` text ขาว |
| ยกเลิก (dismissed) | COUNT status=dismissed | เทา `#9ca3af` |

### ตาราง Summary (แถว 8 เป็นต้นไป)
แสดงสรุปรายครู:

| ครู | open | high | medium | low | overdue | verified |
|-----|------|------|--------|-----|---------|---------|

- เรียงตาม `open` DESC
- Conditional formatting: high > 0 → สีแดงอ่อน `#fecaca`
- freeze แถวหัว

### Chart
- Donut chart: สัดส่วน open / verified / dismissed
- วางขวามือ KPI cards

---

## แท็บที่ 2 — BlindSpot รายครู

### โครงสร้างตาราง

| ครู | ชั้น/ห้อง | วิชา | จำนวน | High | Medium | Low | สถานะ |
|-----|---------|------|------|------|--------|-----|-------|

**กฎการแสดงผล:**
- จัดกลุ่มตามครู — ผสาน cell ครูในแนวตั้ง (merge cells)
- สีแถว: high = `#fecaca`, medium = `#fef3c7`, low = `#fef9c3`
- เรียง: ครู A–Z (ไทย) → ชั้น → วิชา
- freeze แถวหัวและคอลัมน์ครู

### Sub-header สีครามสำหรับ UnitBlindSpot
- row header สีพื้น `#4f46e5` text ขาว ความสูง 24px

---

## แท็บที่ 3 — รายวิชา

### Top 5 วิชาที่มี BlindSpot มากสุด

| วิชา | จำนวน blind spot | high | medium | low |
|------|----------------|------|--------|-----|

- เรียง COUNT DESC
- Bar chart แนวนอน: แกน X = จำนวน, แกน Y = วิชา
- สีแท่ง: ใช้ gradient จาก high(แดง) ถึง low(เหลือง)

### ตารางรายชั้น per วิชา

| วิชา | ป.1 | ป.2 | ป.3 | ป.4 | ป.5 | ป.6 | รวม |
|------|-----|-----|-----|-----|-----|-----|-----|

- heat map: เซลล์ที่มีค่าสูง → สีแดงเข้ม, ต่ำ → สีขาว

---

## แท็บที่ 4 — Severity

### KPI Row
แสดง 3 card: High / Medium / Low พร้อมจำนวนและ %

### Pie Chart
- High: `#dc2626`
- Medium: `#f59e0b`
- Low: `#fde047`
- แสดง % label บน slice

### ตารางละเอียด

| Severity | จำนวน | % ของทั้งหมด | วิชาที่พบมากสุด | ชั้นที่พบมากสุด |
|---------|------|-------------|--------------|--------------|

---

## แท็บที่ 5 — Method Notes

เนื้อหาต้องมี:
1. **แหล่งข้อมูล**: `action_plan_items` table · ดึงผ่าน `atlas_action_items` (จาก `Woranat_School_Atlas_MCP`, ใส่ filter เสมอ)
2. **ช่วงข้อมูล**: ภาคเรียนที่ระบุ
3. **วันที่สร้างรายงาน**: [วันที่]
4. **ข้อจำกัด**: status จริงในฐานข้อมูลคือ `open` / `verified` / `dismissed` — นับเฉพาะ `open` (ค้างดำเนินการ) / ไม่นับ verified และ dismissed (ตรวจ schema ก่อนใช้)
5. **Compassion Protocol**: นักเรียน SC แยกออกจากการวิเคราะห์หลัก
6. **หมายเหตุ**: UnitBlindSpot = นักเรียนที่ได้คะแนนหลังหน่วย ≤60% และไม่เคยถูกระบุใน remedial_ids

---

## กฎ Naming ไฟล์

```
ATLAS_ActionBoard_ภาพรวม_2569-1_2026-06-11.xlsx
ATLAS_ActionBoard_รายครู_2569-1_2026-06-11.xlsx
ATLAS_ActionBoard_BlindSpot_ป4_2569-1_2026-06-11.xlsx
```

---

*อัปเดต: v1.2.0 · Action Board Mode เพิ่มใน atlas-executive-report skill*
