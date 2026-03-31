# ATLAS Refactor Stage 2 Report (2026-03-31)

## Scope executed

- Context-First Data Flow (Consultant first)
- โฟกัสที่:
  - `src/pages/Consultant.tsx`
  - `src/hooks/useDashboardData.ts`
  - `src/hooks/useDiagnosticData.ts`

## What changed

- แยก hook สำหรับ context-first:
  - `useDashboardFilterOptions()` โหลดเฉพาะตัวเลือก filter (subject/grade/classroom)
  - `useContextFirstTeachingLogs(filter)` ยิง query `teaching_logs` เฉพาะเมื่อเลือก context ครบ
- ปรับ `useDiagnosticData(filter, { contextFirst: true })`:
  - query เฉพาะ context ที่เลือก แทนโหลดทั้งหมดแล้วค่อยกรอง client-side
  - ปิด query อัตโนมัติเมื่อ context ยังไม่ครบ
- ปรับหน้า `Consultant`:
  - เปลี่ยนจาก `useDashboardData(loadPersistedFilters())` เป็นโหมด context-first ใหม่
  - ยกเลิก fallback auto-select จาก log ล่าสุด
  - ใช้ persisted filter ได้เฉพาะกรณีค่าที่เก็บยัง valid กับ option ปัจจุบัน
  - state loading แยกชัด: โหลด options ก่อน, โหลด logs/diagnostic หลังเลือก context ครบ

## Behavior result

- ก่อนเลือก วิชา/ชั้น/ห้อง ครบ:
  - ไม่มี query หนักของ `teaching_logs` ใน Consultant
  - ไม่มี query `diagnostic_events/strike_counter/pivot_events` ในโหมด context-first
- หลังเลือก context ครบ:
  - query เฉพาะ context นั้น
  - chat context และ exam generation ใช้ข้อมูลจาก context เดียวกัน

## Verification

- `npm run lint`: ยังเหลือ error เดิมที่ `supabase/functions/atlas-diagnostic/index.ts` (8 จุด)
- `npm run build`: ผ่าน

## Stage 2 outcome

- บรรลุเป้าหมาย Consultant-first context loading
- ลดโอกาส data leakage จากการโหลดรวมแล้วกรองฝั่ง client
- พร้อมขึ้น Stage 3 (AI Integration Standardization)
