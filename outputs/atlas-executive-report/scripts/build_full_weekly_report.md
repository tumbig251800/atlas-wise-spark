# build_full_weekly_report.md — สคริปต์สร้างรายงานฉบับสมบูรณ์ประจำสัปดาห์ (v1.6.0)

> อ่านไฟล์นี้ทุกครั้งก่อนสร้าง Mode 12 (Full Weekly Report)
> ต้องใช้ร่วมกับ `references/report_layout.md` และ `references/remedial_tracking_layout.md`

---

## ลำดับการดึงข้อมูล (ทำตามลำดับ — ห้ามข้าม)

```
Step 1 — ดึงข้อมูลหลัก
  ├─ atlas_teacher_list(term)              → ครูที่ active (กรองลาออกออก)
  ├─ atlas_classroom_kpi(term)             → KPI รายห้อง
  ├─ atlas_gap_distribution(term)          → Gap breakdown
  ├─ atlas_red_zone(term, threshold=0.25)  → ห้องเสี่ยง
  └─ atlas_teaching_logs_by_teacher(term)  → log รายครู (2 สัปดาห์ล่าสุด)

Step 2 — ดึง Action Board
  └─ atlas_action_items(term, issueType="UnitBlindSpot")
     ⚠️ ใส่ filter เสมอ ห้ามดึงทั้งหมด

Step 3 — ดึง PLC (ถ้ามีข้อมูล)
  ├─ atlas_plc_sessions(term)
  ├─ atlas_plc_effectiveness(term)
  └─ atlas_plc_coverage_gap(term)

Step 4 — ดึง Remedial Tracking (ตรวจ schema ก่อนเสมอ)
  SQL: SELECT column_name FROM information_schema.columns WHERE table_name='remedial_tracking';
  └─ ถ้ามีข้อมูล → ดึง PASS/STAY + FLAG8 (days_late > 8)
  └─ ถ้าไม่มี → บันทึกใน Sheet 19 และข้าม Sheet 11–12

Step 5 — ดึง Integrity
  └─ atlas_integrity_flags(term)

Step 6 — WF1 Compliance (วิชาขาดหาย)
  SQL: SELECT * FROM ... WHERE subject NOT ILIKE '%KBW%'
       AND teacher_id NOT IN ([หทัยรัตน์_id], [วิลาวัลย์_id])
```

---

## การสร้าง Workbook (19 sheets ตามลำดับ)

```python
# โครงสร้าง sheets ที่ต้องสร้าง
SHEETS = [
    ("ภาพรวม",                  build_overview),        # Sheet 1
    ("สรุปการกรอกรายครู",        build_teacher_summary), # Sheet 2
    ("Gap Analysis",             build_gap_analysis),    # Sheet 3
    ("รายละเอียดรายวิชา",        build_subject_detail),  # Sheet 4
    ("แนวโน้มรายสัปดาห์",        build_weekly_trend),    # Sheet 5
    ("Special Care",             build_special_care),    # Sheet 6
    ("ห้องเรียนเสี่ยง",           build_red_zone),        # Sheet 7
    ("วิชาขาดหาย",               build_missing_subject), # Sheet 8
    ("Action Board",             build_action_board),    # Sheet 9
    ("PLC Summary",              build_plc_summary),     # Sheet 10
    ("PASS/STAY Summary",        build_pass_stay),       # Sheet 11
    ("FLAG8 Alert",              build_flag8),           # Sheet 12
    ("ติดตามนักเรียน Red Zone",   build_redzone_student), # Sheet 13
    ("ยังไม่ระบุเลขนักเรียน",    build_missing_id),      # Sheet 14
    ("รายนักเรียน Red Zone",     build_redzone_list),    # Sheet 15
    ("ข้อเสนอแนะ",               build_recommendations), # Sheet 16
    ("Integrity Audit",          build_integrity),       # Sheet 17
    ("Raw Sample",               build_raw_sample),      # Sheet 18
    ("Method Notes",             build_method_notes),    # Sheet 19
]
```

---

## Tab Colors มาตรฐาน (Mode 12)

| Sheet | สี | Hex |
|-------|----|-----|
| ภาพรวม | น้ำเงินเข้ม | `#1e3a5f` |
| สรุปการกรอกรายครู | น้ำเงิน | `#3b82f6` |
| Gap Analysis | ส้ม | `#d97706` |
| รายละเอียดรายวิชา | น้ำเงิน | `#2563eb` |
| แนวโน้มรายสัปดาห์ | เขียว | `#059669` |
| Special Care | ม่วง | `#7c3aed` |
| ห้องเรียนเสี่ยง | แดง | `#dc2626` |
| วิชาขาดหาย | แดงอมส้ม | `#ea580c` |
| Action Board | คราม | `#4f46e5` |
| PLC Summary | เขียวอมฟ้า | `#0891b2` |
| PASS/STAY Summary | ส้ม | `#ea580c` |
| FLAG8 Alert | น้ำตาลเข้ม | `#b45309` |
| ติดตามนักเรียน Red Zone | แดง | `#b91c1c` |
| ยังไม่ระบุเลขนักเรียน | เทาอมแดง | `#9f1239` |
| รายนักเรียน Red Zone | แดงอ่อน | `#e11d48` |
| ข้อเสนอแนะ | เขียว | `#16a34a` |
| Integrity Audit | แดง | `#dc2626` |
| Raw Sample | เทา | `#64748b` |
| Method Notes | เทาอ่อน | `#94a3b8` |

---

## Method Notes (Sheet 19) — ต้องระบุเสมอ

```
- แหล่งข้อมูล: Supabase + Woranat_School_Atlas_MCP
- ช่วงข้อมูล: [วันที่เริ่ม] ถึง [วันที่สิ้นสุด]
- ครูที่ตัดออก: หทัยรัตน์ เทียนอำไพ (ลาออก), น.ส.วิลาวัลย์ แสงสว่าง (ลาออก)
- SQL Exception: AND subject NOT ILIKE '%KBW%' (Sheet 8 — วิชาขาดหาย)
- SQL Exception: AND teacher_id NOT IN ([id1], [id2]) (ทุก Sheet)
- PLC Data: [มี/ไม่มี] — ถ้าไม่มีระบุเหตุผล
- Remedial Tracking: [มี/ไม่มี schema] — ถ้าไม่มีระบุเหตุผล
- FLAG8 นิยาม: created_at::date - teaching_date > 8 วัน
- Compassion Protocol: SC (health_care_status=true) แยกออกจากการวิเคราะห์ทุก sheet
- วันที่สร้างรายงาน: [วันที่ปัจจุบัน]
```

---

## Cross-Sheet Alerts (ตรวจก่อน build Sheet 16)

| เงื่อนไข | ต้องแสดงใน Sheet 16 |
|----------|-------------------|
| Sheet 10: PLC = 0 AND Action Board high severity > 0 | "⚠️ ยังไม่มี PLC แต่มี [N] blind spot ระดับ high — ควรจัด PLC ด่วน" |
| Sheet 11: STAY double-signal > 0 | "🚨 พบสัญญาณซ้ำ [N] ราย — ควรนิเทศเร่งด่วนและออกแบบ intervention ใหม่" + เสนอสร้าง .docx |
| Sheet 14: missing ID > 5 | "⚠️ พบบันทึก [N] รายการที่ยังไม่ระบุเลขนักเรียน — ครูควรแก้ไขโดยด่วน" |
| Action Board severity=high ≥ 3 รายห้องเดียวกัน | "ควรสร้างบันทึกนิเทศ (.docx) สำหรับครู [ชื่อ]" + เสนอผู้ใช้ทันที |
