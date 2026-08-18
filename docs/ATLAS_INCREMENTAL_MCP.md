# ATLAS Incremental MCP

Branch นี้เพิ่มโมดูลต้นแบบสำหรับเครื่องมือ:

- `atlas_change_feed`
- `atlas_sync_manifest`
- `atlas_report_snapshot`

## จุดเชื่อมใน `woranat-atlas-mcp/index.ts`

1. import:

```ts
import { INCREMENTAL_TOOL_DEFINITIONS, callIncrementalTool } from "./incremental-tools.ts";
```

2. ต่อท้าย tool definitions:

```ts
const TOOLS = [
  // tools เดิมทั้งหมด
  ...INCREMENTAL_TOOL_DEFINITIONS,
];
```

3. ก่อน `default` ใน `callTool`:

```ts
const incremental = await callIncrementalTool(supabase, name, args);
if (incremental !== null) {
  return { content: [{ type: "text", text: JSON.stringify(incremental, null, 2) }] };
}
```

## เงื่อนไขก่อน deploy

- ยืนยันว่า `teaching_logs.updated_at` มีอยู่และอัปเดตทุกครั้งที่แก้ record
- ทดสอบ cursor `(updated_at, id)` เมื่อหลาย record มี timestamp เท่ากัน
- `atlas_change_feed` เป็น `upsert_only` และประกาศ `deletion_supported: false`
- Gap metrics ต้องคำนวณจาก non-Special Care เท่านั้น
- ห้ามคืน `health_care_ids` หรือข้อมูลเด็ก Special Care รายบุคคล
- เปรียบเทียบ `included_log_count` และ `excluded_special_care_count` กับ tools production เดิม
- ตรวจ checksum ซ้ำสองครั้งโดยไม่มีข้อมูลเปลี่ยน ต้องได้ค่าเดิม

## Gateway

`woranat-chatgpt-mcp` ไม่ต้องเพิ่มรายชื่อ tool แบบตายตัว เพราะ gateway ดึง `tools/list` จาก `woranat-atlas-mcp` และส่งผ่านเครื่องมือชื่อ `atlas_*` อัตโนมัติ

## Deployment

ยังไม่ควร deploy จาก branch นี้จนกว่า source production ล่าสุดของ `woranat-atlas-mcp/index.ts` จะถูก sync กลับเข้า GitHub และ integration/tests ผ่านครบ
