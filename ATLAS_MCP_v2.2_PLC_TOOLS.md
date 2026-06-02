# ATLAS MCP v2.2.0 — PLC Analysis Tools

**วันที่**: 2 มิถุนายน 2026  
**Version**: 2.2.0 (อัปเกรดจาก v2.1.0)  
**Deploy Status**: ✅ Production

---

## 📦 สรุปการเพิ่มเครื่องมือ

เพิ่มเครื่องมือวิเคราะห์ PLC ใหม่ **5 ตัว** เข้าไปใน ATLAS MCP Server

**จำนวนเครื่องมือทั้งหมด**: 9 → **14 tools**

---

## 🔧 เครื่องมือใหม่

### 1. **atlas_plc_effectiveness** ⭐ (สำคัญที่สุด)

**วัตถุประสงค์**: วิเคราะห์ประสิทธิผลของ PLC sessions

**ข้อมูลที่วิเคราะห์**:
- 📊 Resolution rate (% ของ action items ที่แก้ไขได้)
- 📅 เฉลี่ยจำนวนวันจาก item created → resolved
- 📈 Outcome distribution (resolved/need_supervision/continue_plc)
- 🎯 Sessions แยกตาม plc_type (subject/grade_band/cross)

**ตัวอย่างการใช้งาน**:
```json
{
  "name": "atlas_plc_effectiveness",
  "arguments": {
    "date_from": "2026-05-01",
    "date_to": "2026-06-02",
    "plc_type": "all"
  }
}
```

**Output ตัวอย่าง**:
```json
{
  "total_sessions": 2,
  "total_items_covered": 9,
  "items_resolved": 9,
  "resolution_rate_percent": 100,
  "outcome_distribution": {
    "continue_plc": 2
  },
  "avg_days_to_resolve": null,
  "sessions_by_type": {
    "grade_band": 1,
    "cross": 1
  }
}
```

---

### 2. **atlas_plc_coverage_gap** ⭐

**วัตถุประสงค์**: หา action items (open/watching) ที่**ยังไม่มี PLC ครอบคลุม**

**เหตุผล**: ช่วยหา blind spots — ปัญหาไหนที่ยังไม่มีครูดูแล

**ตัวอย่างการใช้งาน**:
```json
{
  "name": "atlas_plc_coverage_gap",
  "arguments": {
    "severity_filter": "critical"
  }
}
```

**Output**:
- `total_open_items`: จำนวน items ทั้งหมด
- `items_without_plc`: จำนวนที่ยังไม่มี PLC
- `coverage_percent`: % ความครอบคลุม
- `uncovered_items[]`: รายการที่ยังไม่ครอบคลุม (เรียงตาม days_open)

---

### 3. **atlas_plc_timeline**

**วัตถุประสงค์**: แสดง timeline ของ PLC sessions ที่เชื่อมต่อกัน (continue_plc chains)

**ตัวอย่างการใช้งาน**:
```json
{
  "name": "atlas_plc_timeline",
  "arguments": {
    "date_from": "2026-05-01",
    "date_to": "2026-06-02"
  }
}
```

**Output**:
```json
{
  "total_chains": 1,
  "plc_chains": [
    {
      "initial_session_date": "2026-05-15",
      "topic": "นักเรียนป.4 อ่านไม่ออก",
      "chain": [
        {
          "session_date": "2026-05-15",
          "outcome": "continue_plc",
          "next_plc_date": "2026-05-22"
        },
        {
          "session_date": "2026-05-22",
          "outcome": "resolved"
        }
      ],
      "total_sessions": 2,
      "days_to_resolve": 7
    }
  ]
}
```

---

### 4. **atlas_cross_plc_opportunities**

**วัตถุประสงค์**: หาโอกาสจัด cross-PLC
- ปัญหาที่ซ้ำกันข้ามวิชา/ช่วงชั้น
- ครูคนเดียวมีปัญหาหลายวิชา

**ตัวอย่างการใช้งาน**:
```json
{
  "name": "atlas_cross_plc_opportunities",
  "arguments": {
    "min_overlap": 2
  }
}
```

**Output**:
- `cross_subject_opportunities[]`: ปัญหาที่พบในหลายวิชา/หลายช่วงชั้น
- `teacher_multi_subject_opportunities[]`: ครูที่มีปัญหาหลายวิชา
- `summary`: สรุป

---

### 5. **atlas_plc_recommendations**

**วัตถุประสงค์**: แนะนำแผน PLC (lightweight version ของ AI Planner สำหรับ MCP/n8n)

**ตัวอย่างการใช้งาน**:
```json
{
  "name": "atlas_plc_recommendations",
  "arguments": {
    "max_plans": 3,
    "prefer_type": "subject",
    "min_coverage_percent": 30
  }
}
```

**Output**:
```json
{
  "plans": [
    {
      "plan_name": "PLC วิชาคณิตศาสตร์",
      "topic": "แก้ปัญหาการสอนวิชาคณิตศาสตร์",
      "plc_type": "subject",
      "subject": "คณิตศาสตร์",
      "covered_item_ids": [1, 2, 3],
      "coverage_percent": 45,
      "members": [
        {"teacher_id": "uuid", "teacher_name": "ครูสมชาย"}
      ],
      "rationale": "รวมปัญหาวิชาคณิตศาสตร์ จำนวน 3 รายการ",
      "problem_statement": "นักเรียนมีปัญหาในวิชาคณิตศาสตร์",
      "root_cause": "ต้องวิเคราะห์เพิ่มเติมใน PLC",
      "approach": "ครูร่วมกันหาวิธีสอนที่เหมาะสม"
    }
  ],
  "total_plans": 1
}
```

---

## 🚀 การใช้งาน

### จาก Claude Code / AI Agent

```
ใช้เครื่องมือ atlas_plc_effectiveness วิเคราะห์ PLC ตั้งแต่ 1 พ.ค. ถึงวันนี้
```

### จาก MCP Protocol

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "atlas_plc_effectiveness",
    "arguments": {
      "date_from": "2026-05-01",
      "date_to": "2026-06-02"
    }
  }
}
```

### จาก n8n Workflow

ใช้ HTTP Request node เรียก:
- URL: `https://ebyelctqcdhjmqujeskx.supabase.co/functions/v1/atlas-mcp`
- Method: POST
- Body: JSON-RPC format (ตามด้านบน)

---

## ✅ ผลการทดสอบ (2026-06-02)

| เครื่องมือ | สถานะ | หมายเหตุ |
|----------|------|---------|
| atlas_plc_effectiveness | ✅ ผ่าน | ทดสอบกับ 2 PLC sessions |
| atlas_plc_coverage_gap | ✅ ผ่าน | ทดสอบกับ 0 open items (ปกติ) |
| atlas_plc_timeline | ✅ ผ่าน | ทดสอบกับ PLC chains |
| atlas_cross_plc_opportunities | ✅ ผ่าน | ทดสอบกับ 0 open items |
| atlas_plc_recommendations | ✅ ผ่าน | ทดสอบกับ 0 open items |

---

## 📝 Use Cases

### 1. วัดผล PLC ประจำเดือน
```
ใช้ atlas_plc_effectiveness วิเคราะห์ PLC เดือนพฤษภาคม
```

### 2. หาปัญหาที่ยังไม่มีครูดูแล
```
ใช้ atlas_plc_coverage_gap หา critical items ที่ยังไม่มี PLC
```

### 3. ติดตามการทำ PLC ต่อเนื่อง
```
ใช้ atlas_plc_timeline แสดง PLC chains เดือนนี้
```

### 4. หาโอกาสจัด cross-PLC
```
ใช้ atlas_cross_plc_opportunities หาปัญหาที่ซ้ำข้ามวิชา
```

### 5. ให้ n8n แนะนำแผน PLC อัตโนมัติ
```
ใช้ atlas_plc_recommendations ใน n8n workflow
```

---

## 🔮 Next Steps

1. **WF-4**: สร้าง n8n workflow "PLC Effectiveness Report" (รายสัปดาห์)
2. **WF-5**: สร้าง n8n workflow "Coverage Gap Alert" (รายวัน)
3. **Dashboard**: เพิ่ม PLC Analytics dashboard ใน Action Board
4. **Mobile**: เพิ่ม PLC stats ใน mobile app (ผอ.เท่านั้น)

---

## 📚 เอกสารอ้างอิง

- [ATLAS MCP Server Overview](project_atlas_mcp.md)
- [PLC Feature Documentation](project_atlas_plc_feature.md)
- [n8n Workflows](reference_atlas_n8n.md)

---

**สร้างโดย**: Claude Code  
**Deploy โดย**: Supabase Edge Functions  
**Version Control**: Git + Vercel
