

## แก้ System-Gap Report: แสดงวันที่สอนจริงแทนวันที่ประมวลผล

### ปัญหา
`SystemGapReport` ใช้ `e.created_at` (วันที่ระบบสร้าง diagnostic event) ซึ่งเป็นวันนี้ 26/2/2569 ทั้งที่บันทึกการสอนจริงคือ:
- "การอ่านจับใจความสำคัญฯ" → teaching_date = **17/12/2568**
- "นิราศเดือด" → teaching_date = **6/1/2569**

### แผนแก้ไข

**แก้ `src/components/executive/SystemGapReport.tsx`**:
1. รับ prop `logs` (TeachingLog[]) เพิ่มจาก parent เพื่อ lookup วันที่สอนจริง
2. สร้าง Map จาก `log.id → log.teaching_date`
3. แสดง `teaching_date` แทน `created_at` ในคอลัมน์วันที่

**แก้ `src/pages/Executive.tsx`**:
1. ส่ง `filteredLogs` เป็น prop ให้ `SystemGapReport`

### โค้ดที่เปลี่ยน

```typescript
// SystemGapReport.tsx — เพิ่ม logs prop
interface Props {
  events: DiagnosticEvent[];
  logs: TeachingLog[];
}

// สร้าง lookup map
const dateMap = new Map(logs.map(l => [l.id, l.teaching_date]));

// แสดงวันที่สอนจริง
<TableCell>
  {dateMap.get(e.teaching_log_id)
    ? new Date(dateMap.get(e.teaching_log_id)!).toLocaleDateString("th-TH")
    : new Date(e.created_at).toLocaleDateString("th-TH")}
</TableCell>
```

```typescript
// Executive.tsx — ส่ง logs
<SystemGapReport events={filteredDiagnosticEvents} logs={filteredLogs} />
```

