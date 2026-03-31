# ATLAS Refactor Stage 1 Report (2026-03-31)

## Scope executed

- Code Quality Foundation (quick wins + high-risk points)
- เน้น `src/pages/*`, `src/components/*`, `src/lib/*`, `tailwind.config.ts`

## What was improved

- แก้ `no-empty` ใน flow สำคัญ:
  - `src/lib/edgeFunctionFetch.ts`
  - `src/pages/Login.tsx`
  - `src/components/chat/ChatSidebar.tsx`
  - `src/components/lesson-plan/AddonPrompts.tsx`
  - `src/pages/TeachingLog.tsx`
  - `src/pages/UploadCSV.tsx` (invoke catch)
- ลด `no-explicit-any` จำนวนมากใน frontend/app-layer:
  - `src/pages/Consultant.tsx`, `History.tsx`, `TeachingLog.tsx`, `UploadCSV.tsx`
  - `src/components/dashboard/*`, `src/components/history/ReassignTeacherDialog.tsx`
  - `src/components/teaching-log/Step1General.tsx` ถึง `Step4Action.tsx`
  - `src/components/AllInOneImporter.tsx`, `src/lib/competencyReportQueries.ts`,
    `src/lib/competencyUpload.ts`, `src/lib/smartReportQueries.ts`
- แก้ lint rule `no-require-imports`:
  - `tailwind.config.ts` เปลี่ยน `require("tailwindcss-animate")` เป็น ESM import

## Verification

- `npm run lint`
  - ก่อน Stage 1: `49 errors`, `12 warnings` (61 issues)
  - หลัง Stage 1: `8 errors`, `12 warnings` (20 issues)
  - ลด errors ลง ~84% (49 -> 8)
- `npm run build`: ผ่าน

## Remaining issues (intentional split)

- เหลือ `8 errors` ทั้งหมดอยู่ที่:
  - `supabase/functions/atlas-diagnostic/index.ts` (`no-explicit-any`)
- เหลือ `12 warnings` (mostly `react-refresh/only-export-components` + hook deps)

## Stage 1 outcome

- บรรลุเป้าหมายลด defect debt รอบแรกอย่างมีนัยสำคัญ
- พร้อมไป Stage 2 (Context-First Data Flow: Consultant first)
- แนะนำแยกงาน cleanup ของ `atlas-diagnostic` เป็น sub-task เฉพาะ Edge เพื่อควบคุมความเสี่ยง
