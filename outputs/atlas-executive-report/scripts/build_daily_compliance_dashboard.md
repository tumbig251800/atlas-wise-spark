# Build Daily Compliance Dashboard — Implementation Guide

> Implementation guide สำหรับสร้าง Excel + HTML dashboard รายวัน
> จาก Supabase teaching_logs ของระบบ ATLAS
> อ้างอิง: ATLAS Supabase project ID = ebyelctqcdhjmqujeskx

---

## ภาพรวม Pipeline

```
1. รับวันที่เป้าหมาย (TARGET_DATE) และ academic_term จากผู้ใช้
2. Query Supabase: logs ของ TARGET_DATE
3. Query Supabase: ห้องทั้งหมดที่ active ในภาคเรียนนั้น
4. Compassion Protocol: แยก SC logs ออก
5. คำนวณ Compliance (กรอกครบ / บางส่วน / ไม่กรอก)
6. ตรวจหา Late Submissions (Integrity flag)
7. สร้าง Excel 5 tabs ด้วย openpyxl
8. สร้าง HTML dashboard ด้วย Chart.js 4.4.1
9. บันทึกไฟล์ทั้งสองลง workspace folder
```

---

## STEP 1 — Query ข้อมูล

```python
import os
from supabase import create_client

url = os.environ["SUPABASE_URL"]   # หรือ hardcode ได้เฉพาะ URL (ไม่ใช่ key)
key = os.environ["SUPABASE_ANON_KEY"]
supabase = create_client(url, key)

TARGET_DATE = "2026-05-21"  # รับจากผู้ใช้
TERM = "2569-1"             # รับจากผู้ใช้

# logs ของวันที่ระบุ
response = supabase.table("teaching_logs").select(
    "id, teacher_name, grade_level, classroom, subject, "
    "mastery_score, major_gap, key_issue, health_care_status, "
    "health_care_ids, teaching_date, created_at, academic_term"
).eq("teaching_date", TARGET_DATE).execute()
all_logs = response.data  # list of dicts

# ห้องที่ active ในภาคเรียน
active_response = supabase.table("teaching_logs").select(
    "teacher_name, grade_level, classroom"
).eq("academic_term", TERM).execute()
active_rooms_raw = active_response.data
```

---

## STEP 2 — Compassion Protocol

```python
sc_logs = [r for r in all_logs if r.get("health_care_status") == True]
main_logs = [r for r in all_logs if r.get("health_care_status") != True]

sc_count = len(sc_logs)
# ห้ามระบุชื่อนักเรียน SC ในรายงาน
```

---

## STEP 3 — คำนวณ Compliance

```python
from collections import defaultdict

# ห้องที่ active
active_by_teacher = defaultdict(set)
for r in active_rooms_raw:
    key = f"{r['grade_level']}/{r['classroom']}"
    active_by_teacher[r['teacher_name']].add(key)

# ห้องที่กรอกแล้ว (TARGET_DATE, non-late)
# Late = created_at (BKK +07:00) เป็น TARGET_DATE แต่ teaching_date != TARGET_DATE
from datetime import datetime, timezone, timedelta

BKK = timezone(timedelta(hours=7))

def is_late(log):
    created = datetime.fromisoformat(log["created_at"].replace("Z", "+00:00"))
    created_bkk = created.astimezone(BKK).date().isoformat()
    return created_bkk == TARGET_DATE and log["teaching_date"] != TARGET_DATE

late_logs = [r for r in all_logs if is_late(r)]
valid_logs = [r for r in all_logs if not is_late(r) and r["teaching_date"] == TARGET_DATE]

logged_by_teacher = defaultdict(set)
for r in valid_logs:
    key = f"{r['grade_level']}/{r['classroom']}"
    logged_by_teacher[r['teacher_name']].add(key)

# คำนวณสถานะ
compliance = {}
all_teachers = set(active_by_teacher.keys())
for teacher in all_teachers:
    active = active_by_teacher[teacher]
    logged = logged_by_teacher.get(teacher, set())
    missing = active - logged
    if len(missing) == 0 and len(logged) > 0:
        status = "กรอกครบ"
    elif len(logged) > 0:
        status = "กรอกบางส่วน"
    else:
        status = "ไม่ได้กรอกเลย"
    compliance[teacher] = {
        "status": status,
        "logged": sorted(logged),
        "missing": sorted(missing),
        "active": sorted(active)
    }
```

---

## STEP 4 — Gap Distribution (non-SC only)

```python
from collections import Counter

gap_counts = Counter()
for r in main_logs:
    if r["teaching_date"] == TARGET_DATE and not is_late(r):
        gap = (r.get("major_gap") or "unknown").strip().lower()
        # normalize
        GAP_MAP = {
            "k-gap": "K-Gap", "k_gap": "K-Gap",
            "p-gap": "P-Gap", "p_gap": "P-Gap",
            "a-gap": "A-Gap", "a_gap": "A-Gap",
            "a1-gap": "A-Gap", "a1_gap": "A-Gap",
            "a2-gap": "A2-Gap", "a2_gap": "A2-Gap",
            "system-gap": "System-Gap", "system_gap": "System-Gap",
            "success": "Success",
        }
        gap_counts[GAP_MAP.get(gap, "อื่นๆ")] += 1
```

---

## STEP 5 — สร้าง Excel (openpyxl)

ดู layout ใน `references/daily_compliance_layout.md`

```python
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

wb = openpyxl.Workbook()

# ลบ default sheet
if "Sheet" in wb.sheetnames:
    del wb["Sheet"]

# สร้าง 5 tabs
ws_overview   = wb.create_sheet("Overview")
ws_teacher    = wb.create_sheet("สรุปรายครู")
ws_detail     = wb.create_sheet("รายละเอียดบันทึก")
ws_integrity  = wb.create_sheet("Integrity")
ws_notes      = wb.create_sheet("Method Notes")

# --- Overview tab ---
# Title block (rows 1-2)
ws_overview["B1"] = f"ATLAS สรุปการกรอกบันทึกหลังสอน — วันที่ {TARGET_DATE}"
ws_overview["B1"].font = Font(bold=True, size=14, color="1e3a5f")
ws_overview["B2"] = f"โรงเรียนวรนาถวิทยากำแพงเพชร · ภาคเรียน {TERM}"

# KPI block (rows 4-6)
kpi_data = [
    ("บันทึกทั้งหมด", len(all_logs), "1e3a5f"),
    ("SC logs", sc_count, "7c3aed"),
    ("กรอกครบ", sum(1 for v in compliance.values() if v["status"]=="กรอกครบ"), "16a34a"),
    ("กรอกบางส่วน", sum(1 for v in compliance.values() if v["status"]=="กรอกบางส่วน"), "d97706"),
    ("ไม่ได้กรอกเลย", sum(1 for v in compliance.values() if v["status"]=="ไม่ได้กรอกเลย"), "dc2626"),
]
for i, (label, value, color) in enumerate(kpi_data):
    col = 2 + i * 3
    cell_label = ws_overview.cell(row=4, column=col, value=label)
    cell_label.font = Font(bold=True, size=10, color="ffffff")
    cell_label.fill = PatternFill("solid", fgColor=color)
    cell_value = ws_overview.cell(row=5, column=col, value=value)
    cell_value.font = Font(bold=True, size=18)

# Gap Distribution table (rows 8+)
HEADER_FILL = PatternFill("solid", fgColor="1e3a5f")
HEADER_FONT = Font(bold=True, color="ffffff", size=10)

ws_overview.cell(row=8, column=2, value="ประเภท Gap").fill = HEADER_FILL
ws_overview.cell(row=8, column=2).font = HEADER_FONT
ws_overview.cell(row=8, column=3, value="จำนวน").fill = HEADER_FILL
ws_overview.cell(row=8, column=3).font = HEADER_FONT
ws_overview.cell(row=8, column=4, value="ร้อยละ").fill = HEADER_FILL
ws_overview.cell(row=8, column=4).font = HEADER_FONT

non_sc_total = len([r for r in main_logs
                    if r["teaching_date"] == TARGET_DATE and not is_late(r)])
GAP_ORDER = ["K-Gap", "P-Gap", "A-Gap", "A2-Gap", "System-Gap", "Success"]
row = 9
for gap in GAP_ORDER:
    cnt = gap_counts.get(gap, 0)
    pct = round(cnt / non_sc_total * 100, 1) if non_sc_total else 0
    ws_overview.cell(row=row, column=2, value=gap)
    ws_overview.cell(row=row, column=3, value=cnt)
    ws_overview.cell(row=row, column=4, value=f"{pct}%")
    row += 1

ws_overview.freeze_panes = "A3"

# --- สรุปรายครู tab ---
headers = ["ชื่อครู", "สถานะ", "จำนวนคาบ", "รายวิชาที่กรอก",
           "SC", "ห้องที่ยังไม่กรอก", "หมายเหตุ Integrity"]
for ci, h in enumerate(headers, 1):
    cell = ws_teacher.cell(row=1, column=ci, value=h)
    cell.fill = HEADER_FILL
    cell.font = HEADER_FONT

ri = 2
for teacher in sorted(compliance.keys()):
    c = compliance[teacher]
    # นับ logs ของครูในวันนี้ (valid, non-late)
    teacher_valid = [r for r in valid_logs if r["teacher_name"] == teacher]
    teacher_late = [r for r in late_logs if r["teacher_name"] == teacher]
    subjects_str = ", ".join(
        f"{r['subject']} ({r['grade_level']}/{r['classroom']})"
        for r in sorted(teacher_valid, key=lambda x: x.get('subject',''))
    )
    sc_cnt = sum(1 for r in teacher_valid if r.get("health_care_status") == True)
    integrity_note = ""
    if teacher_late:
        days_late = [
            (datetime.fromisoformat(r["created_at"].replace("Z","+00:00")).astimezone(BKK).date() -
             datetime.fromisoformat(r["teaching_date"]).date()).days
            for r in teacher_late
        ]
        integrity_note = f"ส่งล่าช้า {max(days_late)} วัน"

    ws_teacher.cell(row=ri, column=1, value=teacher)
    ws_teacher.cell(row=ri, column=2, value=c["status"])
    ws_teacher.cell(row=ri, column=3, value=len(teacher_valid))
    ws_teacher.cell(row=ri, column=4, value=subjects_str)
    ws_teacher.cell(row=ri, column=5, value=sc_cnt)
    ws_teacher.cell(row=ri, column=6, value=", ".join(c["missing"]))
    ws_teacher.cell(row=ri, column=7, value=integrity_note)
    ri += 1

ws_teacher.freeze_panes = "A2"

# บันทึก Excel
from datetime import date
output_xlsx = f"ATLAS_Daily_{TARGET_DATE}.xlsx"
wb.save(output_xlsx)
print(f"Saved: {output_xlsx}")
```

---

## STEP 6 — สร้าง HTML Dashboard

ดู layout ใน `references/daily_compliance_layout.md`

```python
# HTML template — self-contained, Chart.js 4.4.1
# ใช้ f-string หรือ Jinja2 ก็ได้

# Data preparation
gap_labels = [g for g in GAP_ORDER if gap_counts.get(g, 0) > 0]
gap_values = [gap_counts[g] for g in gap_labels]
gap_colors = {
    "K-Gap": "#3b82f6", "P-Gap": "#f59e0b", "A-Gap": "#8b5cf6",
    "A2-Gap": "#ef4444", "System-Gap": "#6b7280", "Success": "#22c55e"
}

comp_labels = ["กรอกครบ", "กรอกบางส่วน", "ไม่ได้กรอกเลย"]
comp_values = [
    sum(1 for v in compliance.values() if v["status"] == "กรอกครบ"),
    sum(1 for v in compliance.values() if v["status"] == "กรอกบางส่วน"),
    sum(1 for v in compliance.values() if v["status"] == "ไม่ได้กรอกเลย"),
]
comp_colors = ["#16a34a", "#d97706", "#dc2626"]

# สร้าง compliance rows HTML
def make_room_chips(rooms, color_class):
    return "".join(
        f'<span class="chip {color_class}">{r}</span>' for r in rooms
    )

compliance_rows_html = ""
for teacher in sorted(compliance.keys()):
    c = compliance[teacher]
    status_pill = {
        "กรอกครบ": '<span class="pill pill-green">✓ ครบ</span>',
        "กรอกบางส่วน": '<span class="pill pill-yellow">◑ บางส่วน</span>',
        "ไม่ได้กรอกเลย": '<span class="pill pill-red">✗ ไม่ได้กรอก</span>',
    }[c["status"]]
    sc_cnt = sum(1 for r in valid_logs
                 if r["teacher_name"] == teacher and r.get("health_care_status") == True)
    sc_badge = f'<span class="sc-badge">{sc_cnt} SC</span>' if sc_cnt else ""
    logged_chips = make_room_chips(c["logged"], "chip-blue")
    missing_chips = make_room_chips(c["missing"], "chip-gray")
    compliance_rows_html += f"""
        <tr>
            <td>{teacher} {sc_badge}</td>
            <td>{status_pill}</td>
            <td>{logged_chips}</td>
            <td>{missing_chips}</td>
        </tr>"""

# สร้างไฟล์ HTML
html = f"""<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<title>ATLAS Dashboard {TARGET_DATE}</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
<style>
  :root {{
    --primary: #1e3a5f; --success: #16a34a; --warning: #d97706;
    --danger: #dc2626;  --sc: #7c3aed;     --bg: #f8fafc;
    --card: #ffffff;    --border: #e2e8f0;
  }}
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{ font-family: system-ui, -apple-system, sans-serif;
          background: var(--bg); color: #1f2937; }}
  header {{ background: var(--primary); color: white;
            padding: 1.5rem 2rem; }}
  header h1 {{ font-size: 1.4rem; margin-bottom: 0.25rem; }}
  header p  {{ opacity: 0.8; font-size: 0.9rem; }}
  .container {{ max-width: 1100px; margin: 0 auto; padding: 1.5rem; }}
  /* KPI */
  .kpi-grid {{ display: grid; grid-template-columns: repeat(5,1fr);
               gap: 1rem; margin-bottom: 1.5rem; }}
  .kpi {{ background: white; border-radius: 10px; padding: 1rem;
          border-left: 4px solid var(--primary); box-shadow: 0 1px 3px rgba(0,0,0,.1); }}
  .kpi .val {{ font-size: 2rem; font-weight: bold; }}
  .kpi .lbl {{ font-size: 0.8rem; color: #6b7280; }}
  /* Charts */
  .chart-row {{ display: grid; grid-template-columns: 1fr 1fr;
                gap: 1.5rem; margin-bottom: 1.5rem; }}
  .chart-card {{ background: white; border-radius: 10px; padding: 1.25rem;
                 box-shadow: 0 1px 3px rgba(0,0,0,.1); }}
  .chart-card h3 {{ font-size: 0.95rem; margin-bottom: 1rem;
                    color: var(--primary); }}
  .chart-wrap {{ height: 220px; position: relative; }}
  /* Table */
  .card {{ background: white; border-radius: 10px; padding: 1.25rem;
           box-shadow: 0 1px 3px rgba(0,0,0,.1); margin-bottom: 1.5rem; }}
  .card h3 {{ font-size: 0.95rem; margin-bottom: 1rem; color: var(--primary); }}
  table {{ width: 100%; border-collapse: collapse; font-size: 0.85rem; }}
  th {{ background: var(--primary); color: white; padding: .6rem .8rem;
        text-align: left; }}
  td {{ padding: .55rem .8rem; border-bottom: 1px solid var(--border); }}
  tr:hover td {{ background: #f1f5f9; }}
  .pill {{ padding: .2rem .65rem; border-radius: 999px; font-size: .75rem;
           font-weight: 600; white-space: nowrap; }}
  .pill-green {{ background: #dcfce7; color: #16a34a; }}
  .pill-yellow {{ background: #fef9c3; color: #d97706; }}
  .pill-red {{ background: #fee2e2; color: #dc2626; }}
  .chip {{ display: inline-block; padding: .15rem .5rem; margin: .1rem;
           border-radius: 6px; font-size: .72rem; }}
  .chip-blue {{ background: #dbeafe; color: #1d4ed8; }}
  .chip-gray {{ background: #f3f4f6; color: #6b7280; border: 1px solid #d1d5db; }}
  .sc-badge {{ background: #f3e8ff; color: #7c3aed; padding: .15rem .4rem;
               border-radius: 6px; font-size: .72rem; }}
  footer {{ text-align: center; padding: 1.5rem; font-size: .75rem;
            color: #9ca3af; }}
</style>
</head>
<body>
<header>
  <h1>ATLAS สรุปการกรอกบันทึกหลังสอน</h1>
  <p>วันที่ {TARGET_DATE} &nbsp;·&nbsp; ภาคเรียน {TERM} &nbsp;·&nbsp; โรงเรียนวรนาถวิทยากำแพงเพชร</p>
</header>
<div class="container">

  <!-- KPI -->
  <div class="kpi-grid">
    <div class="kpi" style="border-color:var(--primary)">
      <div class="val">{len(all_logs)}</div>
      <div class="lbl">บันทึกทั้งหมด</div>
    </div>
    <div class="kpi" style="border-color:var(--sc)">
      <div class="val" style="color:var(--sc)">{sc_count}</div>
      <div class="lbl">SC logs</div>
    </div>
    <div class="kpi" style="border-color:var(--success)">
      <div class="val" style="color:var(--success)">{comp_values[0]}</div>
      <div class="lbl">กรอกครบ</div>
    </div>
    <div class="kpi" style="border-color:var(--warning)">
      <div class="val" style="color:var(--warning)">{comp_values[1]}</div>
      <div class="lbl">กรอกบางส่วน</div>
    </div>
    <div class="kpi" style="border-color:var(--danger)">
      <div class="val" style="color:var(--danger)">{comp_values[2]}</div>
      <div class="lbl">ไม่ได้กรอกเลย</div>
    </div>
  </div>

  <!-- Charts -->
  <div class="chart-row">
    <div class="chart-card">
      <h3>การกระจาย Gap (non-SC)</h3>
      <div class="chart-wrap"><canvas id="gapChart"></canvas></div>
    </div>
    <div class="chart-card">
      <h3>สถานะการกรอกบันทึก</h3>
      <div class="chart-wrap"><canvas id="compChart"></canvas></div>
    </div>
  </div>

  <!-- Compliance Table -->
  <div class="card">
    <h3>สถานะการกรอกรายครู</h3>
    <table>
      <thead><tr>
        <th>ชื่อครู</th>
        <th>สถานะ</th>
        <th>ห้องที่กรอก</th>
        <th>ห้องที่ขาด</th>
      </tr></thead>
      <tbody>{compliance_rows_html}</tbody>
    </table>
  </div>

</div>
<footer>สร้างโดย ATLAS Executive Report Skill · {date.today().isoformat()}</footer>

<script>
new Chart(document.getElementById('gapChart'), {{
  type: 'doughnut',
  data: {{
    labels: {gap_labels},
    datasets: [{{ data: {gap_values},
      backgroundColor: {[gap_colors.get(g,'#9ca3af') for g in gap_labels]},
      borderWidth: 2 }}]
  }},
  options: {{ responsive: true, maintainAspectRatio: false,
    plugins: {{ legend: {{ position: 'right', labels: {{ font: {{ size: 11 }} }} }} }} }}
}});
new Chart(document.getElementById('compChart'), {{
  type: 'doughnut',
  data: {{
    labels: {comp_labels},
    datasets: [{{ data: {comp_values},
      backgroundColor: {comp_colors}, borderWidth: 2 }}]
  }},
  options: {{ responsive: true, maintainAspectRatio: false,
    plugins: {{ legend: {{ position: 'right', labels: {{ font: {{ size: 11 }} }} }} }} }}
}});
</script>
</body>
</html>"""

output_html = f"ATLAS_Dashboard_{TARGET_DATE}.html"
with open(output_html, "w", encoding="utf-8") as f:
    f.write(html)
print(f"Saved: {output_html}")
```

---

## ข้อสำคัญ

1. **Compassion Protocol** — SC logs ต้องแยกก่อนทุกการคำนวณ ห้ามระบุชื่อนักเรียน
2. **Late Submission** — ใช้ `created_at` แปลงเป็น Bangkok timezone (+07:00) แล้วเปรียบเทียบ
3. **Compliance** — เปรียบเทียบกับห้องที่ active ในภาคเรียนเดิม ไม่ใช่แค่ unique ห้องในวันนั้น
4. **ภาษากลาง** — ใช้ "ส่งล่าช้า X วัน" ไม่ใช่ "ครูทำผิด" หรือ "ปลอมแปลงข้อมูล"
5. **Output** — สร้างทั้ง Excel และ HTML ในคราวเดียว ไม่แยกครั้ง
