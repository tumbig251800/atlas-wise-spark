# Build ATLAS Report — Implementation Guide & Pseudo-Workflow

> ไฟล์นี้เป็น implementation guide สำหรับ script หรือ agent ที่ต้องการสร้างรายงาน ATLAS
> เขียนเป็น pseudo-workflow ที่ readable และนำไปเขียนโค้ดจริงได้ในภาษาใดก็ได้
> แนะนำ: Python + openpyxl หรือ xlsxwriter

---

## ภาพรวม Pipeline

```
INPUT (teaching_logs)
    │
    ▼
[STEP 1] Load & Parse Data
    │
    ▼
[STEP 2] Validate Schema
    │
    ▼
[STEP 3] Separate Special Care (Compassion Protocol)
    │
    ▼
[STEP 4] Calculate KPIs
    │
    ▼
[STEP 5] Calculate Subject Summary
    │
    ▼
[STEP 6] Calculate Monthly Trend
    │
    ▼
[STEP 7] Calculate Gap Distribution
    │
    ▼
[STEP 8] Calculate Special Care Summary
    │
    ▼
[STEP 9] Run Integrity Audit
    │
    ▼
[STEP 10] Create Workbook
    │
    ▼
[STEP 11] Build Each Tab
    │
    ▼
[STEP 12] Add Charts
    │
    ▼
[STEP 13] Apply Styling
    │
    ▼
[STEP 14] Export .xlsx
    │
    ▼
[STEP 15] (Optional) Upload to Google Sheets

OUTPUT: ATLAS_[ประเภทไทย]_[ปีการศึกษา]-[ภาคเรียน]_[YYYY-MM-DD].xlsx  (15 tabs, v1.5.0)
# แหล่งข้อมูลหลายตาราง/remedial_tracking: Supabase execute_sql · lookup เร็ว: Woranat_School_Atlas_MCP
```

---

## STEP 1 — Load & Parse Data

```python
# pseudo-code

function load_data(source):
    if source.type == "csv":
        data = read_csv(source.path, encoding="utf-8")
    elif source.type == "json":
        data = read_json(source.path)
    elif source.type == "xlsx":
        data = read_excel(source.path, sheet=auto_detect_sheet())
    elif source.type == "google_sheets":
        # ต้องการ credential จาก environment variable
        data = read_google_sheet(url=source.url, credentials=env.GOOGLE_CREDENTIALS)
    
    # Normalize column names (lowercase, strip spaces)
    data.columns = normalize_column_names(data.columns)
    
    # Map column aliases to standard names
    data = apply_column_mapping(data, schema=data_schema)
    
    return data
```

**การ map column aliases:**
```
"ชื่อครู" → teacher_name
"วันที่" → teaching_date
"วิชา" → subject
"คะแนน" / "mastery" → mastery_score
"gap" / "ช่องว่าง" → major_gap
"สุขภาพ" / "health" → health_care_status
```

---

## STEP 2 — Validate Schema

```python
function validate_schema(data):
    validation_report = []
    
    # ตรวจ Required fields
    required_fields = ["teacher_id", "teacher_name", "teaching_date",
                        "subject", "mastery_score", "major_gap"]
    
    for field in required_fields:
        if field not in data.columns:
            validation_report.append({
                "type": "MISSING_FIELD",
                "field": field,
                "severity": "HIGH"
            })
    
    # ตรวจ mastery_score range
    invalid_mastery = data[~data.mastery_score.between(1, 5)]
    if len(invalid_mastery) > 0:
        validation_report.append({
            "type": "INT-06",
            "count": len(invalid_mastery),
            "severity": "HIGH"
        })
    
    # ตรวจ major_gap values
    valid_gaps = ["K-Gap", "P-Gap", "A-Gap", "A2-Gap", "System-Gap", "Success"]
    invalid_gaps = data[~data.major_gap_normalized.isin(valid_gaps)]
    if len(invalid_gaps) > 0:
        validation_report.append({
            "type": "UNKNOWN_GAP",
            "count": len(invalid_gaps),
            "severity": "MEDIUM"
        })
    
    # ตรวจ duplicate logs
    duplicates = data.duplicated(subset=["teacher_id", "teaching_date", "subject"])
    if duplicates.sum() > 0:
        validation_report.append({
            "type": "INT-08",
            "count": duplicates.sum(),
            "severity": "MEDIUM"
        })
    
    return validation_report
```

---

## STEP 3 — Separate Special Care (Compassion Protocol)

```python
function separate_special_care(data):
    # ตรวจ health_care_status
    is_special_care = (
        data.health_care_status.isin([True, "true", "TRUE", "1", "yes", "Y", "มี"])
        | data.health_care_ids.notna() & (data.health_care_ids != "")
    )
    
    special_care_logs = data[is_special_care].copy()
    main_logs = data[~is_special_care].copy()
    
    return main_logs, special_care_logs

# หมายเหตุ: main_logs ใช้ในการคำนวณ KPI และ Gap หลัก
#           special_care_logs ใช้เฉพาะใน Special Care tab
```

---

## STEP 4 — Calculate KPIs

```python
function calculate_kpis(main_logs, special_care_logs, all_logs):
    kpis = {}
    
    # จำนวนพื้นฐาน
    kpis["total_logs"] = len(all_logs)
    kpis["main_logs_count"] = len(main_logs)
    kpis["unique_teachers"] = all_logs.teacher_id.nunique()
    kpis["unique_subjects"] = all_logs.subject.nunique()
    kpis["grade_levels"] = all_logs.grade_level.unique().tolist()
    
    # Mastery
    kpis["avg_mastery"] = round(main_logs.mastery_score.mean(), 2)
    kpis["red_zone_count"] = len(main_logs[main_logs.mastery_score <= 2.5])
    kpis["red_zone_pct"] = round(kpis["red_zone_count"] / kpis["main_logs_count"] * 100, 1)
    kpis["yellow_zone_count"] = len(main_logs[main_logs.mastery_score == 3])
    kpis["green_zone_count"] = len(main_logs[main_logs.mastery_score >= 4])
    
    # Success Rate
    success_logs = main_logs[main_logs.major_gap_normalized == "Success"]
    kpis["success_count"] = len(success_logs)
    kpis["success_rate"] = round(kpis["success_count"] / kpis["main_logs_count"] * 100, 1)
    
    # Special Care
    kpis["special_care_logs"] = len(special_care_logs)
    # จำนวนนักเรียน Special Care ไม่เปิดเผยชื่อ
    
    # Remedial
    has_remedial = main_logs.remedial_ids.notna() & (main_logs.remedial_ids != "")
    kpis["remedial_count"] = has_remedial.sum()
    
    return kpis
```

---

## STEP 5 — Calculate Subject Summary

```python
function calculate_subject_summary(main_logs):
    subject_summary = main_logs.groupby(["subject", "grade_level"]).agg(
        log_count = ("id", "count"),
        avg_mastery = ("mastery_score", "mean"),
        red_zone = ("mastery_score", lambda x: (x <= 2.5).sum()),
        yellow_zone = ("mastery_score", lambda x: (x == 3).sum()),
        green_zone = ("mastery_score", lambda x: (x >= 4).sum()),
        k_gap = ("major_gap_normalized", lambda x: (x == "K-Gap").sum()),
        p_gap = ("major_gap_normalized", lambda x: (x == "P-Gap").sum()),
        a_gap = ("major_gap_normalized", lambda x: (x == "A-Gap").sum()),
        a2_gap = ("major_gap_normalized", lambda x: (x == "A2-Gap").sum()),
        system_gap = ("major_gap_normalized", lambda x: (x == "System-Gap").sum()),
        success = ("major_gap_normalized", lambda x: (x == "Success").sum()),
        unique_teachers = ("teacher_id", "nunique")
    ).reset_index()
    
    # คำนวณ %
    subject_summary["red_zone_pct"] = round(
        subject_summary["red_zone"] / subject_summary["log_count"] * 100, 1
    )
    subject_summary["success_rate"] = round(
        subject_summary["success"] / subject_summary["log_count"] * 100, 1
    )
    
    # หา major_gap หลักของแต่ละวิชา
    subject_summary["dominant_gap"] = calculate_dominant_gap(subject_summary)
    
    # เรียง: Red Zone % จากมากไปน้อย
    subject_summary = subject_summary.sort_values("red_zone_pct", ascending=False)
    
    return subject_summary
```

---

## STEP 6 — Calculate Monthly Trend

```python
function calculate_monthly_trend(main_logs):
    # แปลง teaching_date เป็น month period
    main_logs["month"] = to_month_period(main_logs.teaching_date)  # format: YYYY-MM
    main_logs["month_label"] = format_thai_month(main_logs.month)   # เช่น "ม.ค. 68"
    
    trend = main_logs.groupby("month").agg(
        log_count = ("id", "count"),
        avg_mastery = ("mastery_score", "mean"),
        red_zone = ("mastery_score", lambda x: (x <= 2.5).sum()),
        success = ("major_gap_normalized", lambda x: (x == "Success").sum()),
        unique_teachers = ("teacher_id", "nunique")
    ).reset_index()
    
    trend["red_zone_pct"] = round(trend["red_zone"] / trend["log_count"] * 100, 1)
    trend["success_rate"] = round(trend["success"] / trend["log_count"] * 100, 1)
    
    # เรียงตามเดือน
    trend = trend.sort_values("month")
    
    return trend
```

---

## STEP 7 — Calculate Gap Distribution

```python
function calculate_gap_distribution(main_logs):
    total = len(main_logs)
    
    gap_dist = main_logs.groupby("major_gap_normalized").agg(
        count = ("id", "count")
    ).reset_index()
    
    gap_dist["percentage"] = round(gap_dist["count"] / total * 100, 1)
    
    # เรียงตาม canonical order
    gap_order = ["K-Gap", "P-Gap", "A-Gap", "A2-Gap", "System-Gap", "Success", "Unknown"]
    gap_dist = gap_dist.set_index("major_gap_normalized")
    gap_dist = gap_dist.reindex(gap_order).dropna().reset_index()
    
    return gap_dist
```

---

## STEP 8 — Calculate Special Care Summary

```python
function calculate_special_care_summary(special_care_logs):
    summary = {}
    
    summary["total_logs"] = len(special_care_logs)
    
    # Accommodation types (จาก next_strategy หรือ reflection)
    # วิเคราะห์ keyword: "เวลาพิเศษ", "นั่งหน้า", "ปรับงาน", etc.
    summary["accommodation_types"] = extract_accommodation_types(special_care_logs)
    
    # Mastery trend (aggregate ไม่ระบุชื่อ)
    summary["avg_mastery"] = round(special_care_logs.mastery_score.mean(), 2)
    summary["monthly_trend"] = calculate_monthly_trend(special_care_logs)
    
    # ห้ามระบุชื่อนักเรียนในทุกส่วนของ summary
    
    return summary
```

---

## STEP 8.5 — [v1.5.0] Remedial / FLAG8 / PLC Coverage

```python
# ตรวจ schema จริงก่อน query เสมอ — ห้ามเดาชื่อคอลัมน์
# remedial_tracking มีสถานะตัวพิมพ์เล็ก 'pass'/'stay'; ไม่มี tracking_round/gap_type
function calculate_remedial_summary(term):
    # ส่วนที่ 1: ภาพรวม PASS/STAY (สถานะล่าสุดต่อ student) — ดู references/remedial_tracking_layout.md
    # ส่วนที่ 2: STAY ค้างนาน = นับแถว status='stay' ต่อ student >= 2 (เรียง recorded_at)
    # ส่วนที่ 3: double signal = intersect(STAY>=2 rounds, gap_consistency>=3)
    # ถ้าไม่มีข้อมูล -> return None แล้วข้ามแท็บ 11
    return remedial_summary  # หรือ None

function calculate_flag8(term):
    # FLAG8 = teaching_logs.days_late > 3 รายครู (ดิบ จนกว่าข้อมูลสะสม >= 2-4 สัปดาห์)
    return flag8_by_teacher

function get_plc_coverage(issues):
    # ทุกข้อเสนอแนะ map -> ✅ atlas_plc_sessions / ⏳ atlas_plc_timeline / ❌ atlas_plc_coverage_gap
    # ห้ามเดาสถานะเมื่อ MCP ใช้ไม่ได้ -> ระบุใน Method Notes
    return plc_coverage
```

---

## STEP 9 — Run Integrity Audit

```python
function run_integrity_audit(all_logs, main_logs, special_care_logs):
    flags = []
    
    # INT-01: Special Care ถูกนับเป็น A-Gap
    sc_a_gap = special_care_logs[special_care_logs.major_gap_normalized == "A-Gap"]
    if len(sc_a_gap) > 0:
        flags.append(create_flag("INT-01", "HIGH", len(sc_a_gap), sc_a_gap.head(3)))
    
    # INT-02: ป่วย/พักแต่ถูกนับเป็น Remedial
    sc_remedial = special_care_logs[
        special_care_logs.remedial_ids.notna() & (special_care_logs.remedial_ids != "")
    ]
    if len(sc_remedial) > 0:
        flags.append(create_flag("INT-02", "HIGH", len(sc_remedial), sc_remedial.head(3)))
    
    # INT-03: Special Care คะแนนสูงมาก (ตรวจบริบท ไม่ตัดสิน)
    sc_high = special_care_logs[special_care_logs.mastery_score == 5]
    if len(sc_high) > 0:
        flags.append(create_flag("INT-03", "LOW", len(sc_high), sc_high.head(3),
                                  note="ควรตรวจบริบทเพิ่มเติม ไม่ใช่ข้อผิดพลาด"))
    
    # INT-04: ชื่อครูซ้ำหลายรูปแบบ
    name_clusters = cluster_similar_names(all_logs.teacher_name.unique())
    if len(name_clusters) > 0:
        flags.append(create_flag("INT-04", "MEDIUM", len(name_clusters), name_clusters))
    
    # INT-06: mastery_score นอกช่วง 1–5
    out_of_range = all_logs[~all_logs.mastery_score.between(1, 5)]
    if len(out_of_range) > 0:
        flags.append(create_flag("INT-06", "HIGH", len(out_of_range), out_of_range.head(3)))
    
    # INT-08: Log ซ้ำ
    duplicates = all_logs[all_logs.duplicated(subset=["teacher_id", "teaching_date", "subject"])]
    if len(duplicates) > 0:
        flags.append(create_flag("INT-08", "MEDIUM", len(duplicates), duplicates.head(3)))
    
    # INT-09: major_gap ว่างเปล่า
    empty_gap = all_logs[all_logs.major_gap.isna() | (all_logs.major_gap == "")]
    if len(empty_gap) > 0:
        flags.append(create_flag("INT-09", "HIGH", len(empty_gap), empty_gap.head(3)))
    
    return flags
```

---

## STEP 10–13 — Create Workbook, Build Tabs, Charts, Styling

```python
function build_workbook(kpis, subject_summary, trend, gap_dist,
                         special_care_summary, integrity_flags,
                         main_logs, report_date):
    
    wb = create_workbook()
    
    # กำหนดสีและ style
    styles = define_styles({
        "header": { "bg": "#1e3a5f", "fg": "white", "bold": True, "size": 10 },
        "kpi_label": { "bold": True, "size": 10 },
        "kpi_value": { "bold": True, "size": 20 },
        "red": "#dc2626",
        "yellow": "#f59e0b",
        "green": "#22c55e",
        "row_alt": "#dbeafe"
    })
    
    # สร้างแต่ละแท็บตาม report_layout.md
    build_overview_tab(wb, kpis, subject_summary, trend, gap_dist, styles)
    build_subject_detail_tab(wb, subject_summary, styles)
    build_trend_tab(wb, trend, styles)
    build_gap_analysis_tab(wb, gap_dist, subject_summary, styles)
    build_special_care_tab(wb, special_care_summary, styles)
    build_remedial_tab(wb, remedial_summary, styles)   # [v1.5.0] แท็บ 11 — ข้ามถ้าไม่มีข้อมูล
    build_recommendations_tab(wb, subject_summary, gap_dist, plc_coverage, styles)  # [v1.5.0] + PLC Coverage
    build_integrity_audit_tab(wb, integrity_flags, styles)
    build_raw_sample_tab(wb, main_logs.head(50), styles)
    build_method_notes_tab(wb, kpis, report_date, styles)
    
    return wb

function build_overview_tab(wb, kpis, subject_summary, trend, gap_dist, styles):
    ws = wb.create_sheet("Overview")
    ws.tab_color = "1e3a5f"
    
    # Title block (rows 1–3)
    write_title_block(ws, kpis, row=1)
    
    # KPI cards (rows 5–9) — 8 cards ใน 2 แถว × 4 คอลัมน์
    kpi_cards = [
        { "label": "บันทึกทั้งหมด", "value": kpis.total_logs, "color": "blue" },
        { "label": "ครูทั้งหมด", "value": kpis.unique_teachers, "color": "blue" },
        { "label": "วิชาทั้งหมด", "value": kpis.unique_subjects, "color": "blue" },
        { "label": "ช่วงชั้น", "value": len(kpis.grade_levels), "color": "blue" },
        { "label": "Mastery เฉลี่ย", "value": kpis.avg_mastery, "color": mastery_color(kpis.avg_mastery) },
        { "label": "Red Zone", "value": f"{kpis.red_zone_pct}%", "color": "red" if kpis.red_zone_pct > 30 else "yellow" },
        { "label": "Success Rate", "value": f"{kpis.success_rate}%", "color": "green" if kpis.success_rate >= 70 else "yellow" },
        { "label": "Special Care", "value": kpis.special_care_logs, "color": "purple" }
    ]
    write_kpi_cards(ws, kpi_cards, start_row=5, cols=[2,5,8,11])
    
    # ตาราง Mastery รายวิชา (rows 11–22)
    write_subject_mastery_table(ws, subject_summary, start_row=11)
    
    # ตาราง Gap Distribution (rows 24–34)
    write_gap_table(ws, gap_dist, start_row=24)
    
    # ตาราง Monthly Trend (rows 36–47)
    write_trend_table(ws, trend, start_row=36)
    
    # Action Plan (rows 49–54)
    write_action_plan_highlights(ws, subject_summary, gap_dist, start_row=49)
    
    # Charts (rows 56–100)
    add_mastery_trend_line_chart(ws, trend, anchor="B56")
    add_gap_donut_chart(ws, gap_dist, anchor="H56")
    add_subject_mastery_bar_chart(ws, subject_summary, anchor="B77")
    
    # Freeze pane ที่แถว 4
    ws.freeze_panes = "A5"
```

---

## STEP 14 — Export .xlsx

```python
function export_report(wb, output_folder, report_date):
    filename = f"ATLAS_Executive_Report_{report_date}.xlsx"
    output_path = join_path(output_folder, filename)
    
    wb.save(output_path)
    
    return output_path
```

---

## STEP 15 — (Optional) Upload to Google Sheets

```python
# ต้องการ:
#   - Google Service Account credential (จาก environment variable เท่านั้น)
#   - ห้าม hard-code ใดๆ

function upload_to_google_sheets(xlsx_path, sheet_title, credentials_env_var):
    # โหลด credential จาก environment
    credentials = load_credentials_from_env(credentials_env_var)
    
    if credentials is None:
        raise Error("ไม่พบ Google credentials ใน environment variable")
    
    # สร้าง Google Sheet ใหม่ (ไม่ overwrite เก่า ยกเว้นผู้ใช้สั่ง)
    sheet = google_sheets_api.create_new_spreadsheet(
        title=sheet_title,
        credentials=credentials
    )
    
    # อัปโหลดเนื้อหาจาก xlsx
    upload_xlsx_to_sheet(sheet, xlsx_path)
    
    return sheet.url
```

---

## Environment Variables ที่ใช้ (ห้าม Hard-code)

```bash
# Google Sheets (ถ้าต้องการ)
GOOGLE_SERVICE_ACCOUNT_JSON=<path_to_service_account.json>
# หรือ
GOOGLE_APPLICATION_CREDENTIALS=<path>

# Supabase (ถ้าต้องการ query ตรง)
SUPABASE_URL=<your_supabase_url>
SUPABASE_ANON_KEY=<your_anon_key>
# ห้ามใช้ service_role key ใน script ที่แชร์
```

---

## Dependencies ที่แนะนำ (Python)

```
# สำหรับ Excel
openpyxl >= 3.1.0           # สร้าง xlsx + chart + styling
# หรือ
xlsxwriter >= 3.1.0         # alternative ที่มี chart support ดีกว่า

# สำหรับข้อมูล
pandas >= 2.0.0             # data manipulation
python-dateutil >= 2.8      # parse วันที่หลากหลายรูปแบบ

# สำหรับ Google Sheets (optional)
google-api-python-client    # Google Sheets API
google-auth                 # authentication

# สำหรับ fuzzy name matching (INT-04)
thefuzz >= 0.19.0           # หรือ rapidfuzz
```

---

## ข้อควรระวัง

1. **Thai date formatting** — ใช้ python-dateutil สำหรับ parse วันที่รูปแบบไทย เช่น "5/5/2568"
2. **Thai text in charts** — ตรวจสอบว่า Excel font รองรับภาษาไทย (แนะนำ TH Sarabun New หรือ Angsana New)
3. **Large datasets** — ถ้า teaching_logs มากกว่า 10,000 แถว ให้ใช้ chunked processing
4. **Memory** — openpyxl โหลด workbook ทั้งหมดใน RAM ถ้าข้อมูลใหญ่ให้ใช้ write-only mode
5. **Encoding** — บันทึกไฟล์ xlsx เป็น UTF-8 เสมอ
