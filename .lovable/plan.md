

# วิเคราะห์ปัญหา: ป.4/2 ภาษาไทย ไม่มีการแจ้งเตือนใดๆ

## ผลการเทียบข้อมูล CSV กับระบบ

จากไฟล์ CSV พบว่าข้อมูล ป.4/2 ภาษาไทย มีเนื้อหาที่ **ควร** สร้างการแจ้งเตือนหลายรายการ:

| วันที่ | หัวข้อ | Mastery | Gap | ควรเกิดอะไร |
|--------|--------|---------|-----|-------------|
| 15/12 | การอ่านจับใจความ | 2 | P-Gap | Strike Count, สีแดง/ส้ม, Remedial 7 คน |
| 17/12 | การอ่านจับใจความ+วิเคราะห์ | 3 | System-Gap | System Gap Report (สีน้ำเงิน) |
| 22/12 | การอ่านเสียงบทร้อยแก้ว | 3 | K-Gap | Strike Count, สีส้ม |
| 6/1 | การอ่านจับใจความ | 2 | P-Gap | Strike Count สะสม |
| 7/1 | การอ่านจับใจความ | 3 | K-Gap | Strike Count สะสม |
| 15/1 | การเขียนสื่อสาร | 2 | K-Gap | Strike Count |
| 16/1 | การเขียนสื่อสาร | 2 | P-Gap | Strike Count ต่อเนื่อง → Plan Fail Signal |

แต่ระบบแสดง **Strike Escalation (0), System Gap Report (0), Referral Queue (0)** ทั้งหมด

## สาเหตุหลัก: Edge Function `atlas-diagnostic` Crash ทุกครั้ง

ตรวจสอบซอร์สโค้ด `supabase/functions/atlas-diagnostic/index.ts` พบ **bug 2 จุดที่ทำให้ function crash ทันที**:

### Bug 1: `LOVABLE_API_KEY` ไม่ได้ถูกประกาศ (บรรทัด 225)

```typescript
// บรรทัด 222-226 — ใช้ตัวแปรที่ไม่มีอยู่
const normalizedTopic = await normalizeTopic(
  currentTopic,
  historicalTopics,
  LOVABLE_API_KEY  // ❌ ไม่เคยถูก declare — ReferenceError ทันที
);
```

ตัวแปร `LOVABLE_API_KEY` ไม่เคยถูก `const` หรือ `Deno.env.get()` — ทำให้ function crash ด้วย `ReferenceError` ก่อนจะทำอะไรได้

### Bug 2: `normResult` ไม่มีอยู่ (บรรทัด 305-307, 447-448)

```typescript
// บรรทัด 305-307 — อ้างอิง object ที่ไม่มี
original_topic: normResult.originalInput,      // ❌
normalization_method: normResult.method,        // ❌
normalization_confidence: normResult.confidence, // ❌
```

ฟังก์ชัน `normalizeTopic()` return เป็น `string` ธรรมดา แต่โค้ดพยายามเข้าถึง `.originalInput`, `.method`, `.confidence` ซึ่งไม่มี ดูเหมือนเป็นซากจาก v1.4 refactor ที่ยังไม่เสร็จ

### ผลกระทบ

```text
CSV Upload → teaching_logs ✅ (insert สำเร็จ)
         → atlas-diagnostic ❌ (crash ทุกครั้ง)
         → diagnostic_events ❌ (ไม่ถูกสร้าง)
         → strike_counter ❌ (ไม่ถูกอัปเดต)
         → System Gap Report = 0
         → Strike Escalation = 0
         → Referral Queue = 0
```

## แผนแก้ไข (1 ไฟล์)

| ไฟล์ | สิ่งที่ทำ |
|------|-----------|
| `supabase/functions/atlas-diagnostic/index.ts` | แก้ 2 bugs: ประกาศ API key + ลบ normResult references |

### การแก้ไขที่ 1: ประกาศ `LOVABLE_API_KEY`

เพิ่มบรรทัดในส่วน Main Handler หลัง `SUPABASE_SERVICE_ROLE_KEY`:

```typescript
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
```

### การแก้ไขที่ 2: ลบ `normResult` references

เปลี่ยน `decisionObject` ให้ใช้ค่าจาก `normalizedTopic` (string) โดยตรง:

```typescript
// เปลี่ยนจาก:
original_topic: normResult.originalInput,
normalization_method: normResult.method,
normalization_confidence: normResult.confidence,

// เป็น:
original_topic: currentTopic,
normalization_method: "ai-fuzzy",
normalization_confidence: 1.0,
```

และในส่วน return response:
```typescript
// เปลี่ยนจาก:
normalizationMethod: normResult.method,
normalizationConfidence: normResult.confidence,

// เป็น:
normalizationMethod: "ai-fuzzy",
normalizationConfidence: 1.0,
```

## ผลลัพธ์ที่คาดหวัง

หลังแก้ไข:
- ข้อมูลที่ **import ใหม่** จะสร้าง `diagnostic_events` ได้สำเร็จ
- System Gap Report จะแสดงแถววันที่ 17/12 (System-Gap)
- Strike Escalation จะแสดง K-Gap/P-Gap ที่สะสมจากหลายคาบ
- ข้อมูลที่ import ไปแล้วก่อนหน้านี้ต้อง **ลบแล้ว import ใหม่** หรือสร้างปุ่ม re-run diagnostic

