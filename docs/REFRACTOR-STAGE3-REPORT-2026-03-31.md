# ATLAS Refactor Stage 3 Report (2026-03-31)

## Scope executed

- AI Integration Standardization (frontend gateway pattern)
- โฟกัสที่:
  - `src/lib/edgeFunctionFetch.ts`
  - `src/pages/Consultant.tsx`
  - `src/components/chat/ChatSidebar.tsx`
  - `src/pages/LessonPlan.tsx`
  - `src/components/lesson-plan/AddonPrompts.tsx`
  - `src/components/executive/PolicySummary.tsx`
  - `src/components/dashboard/ExecutiveSummary.tsx`

## What changed

- เพิ่ม AI gateway helpers กลางใน `edgeFunctionFetch`:
  - `invokeEdgeJson<T>()` สำหรับ Edge endpoints แบบ JSON
  - `streamEdgeContent()` สำหรับ SSE streaming content
  - `EdgeJsonResult<T>` เพื่อ normalize response shape (`ok/status/data/errorMessage`)
- รวม logic parse error (`error/message/content`) ไว้จุดเดียวใน gateway
- ย้าย call sites หลักให้ใช้ pattern เดียว:
  - Summary endpoints (`PolicySummary`, `ExecutiveSummary`) -> `invokeEdgeJson`
  - Streaming endpoints (`LessonPlan`, `AddonPrompts`, `Consultant exam`) -> `streamEdgeContent`
  - Chat endpoint (`ChatSidebar`, `Consultant`) -> `invokeEdgeJson` + timeout/signal เดิม

## Standardized behavior

- ทุก AI call มีผลลัพธ์แบบเดียวกัน: `ok`, `status`, `data`, `errorMessage`
- error message ถูก normalize จาก payload หลายรูปแบบ ลด logic ซ้ำในแต่ละหน้า
- streaming parser กลายเป็น shared implementation ลดโค้ดซ้ำและ drift

## Verification

- `npm run build`: ผ่าน
- `npm run lint`: ยังเหลือ error เดิม 8 จุดใน `supabase/functions/atlas-diagnostic/index.ts` (ไม่ใช่ regression จาก Stage 3)

## Stage 3 outcome

- บรรลุเป้าหมาย AI client pattern กลางใน frontend
- call sites หลักฝั่ง AI ใช้มาตรฐานเดียวกันแล้ว
- พร้อมขึ้น Stage 4 (Domain Extraction + Structure Cleanup)
