# ATLAS Refactor Stage 4 Report (2026-03-31)

## Scope executed

- Domain extraction: move pure business / context builders out of pages and dashboard components into `src/domain/`.

## New modules

| File | Responsibility |
|------|------------------|
| `src/domain/lessonPlanRequest.ts` | Reflection context string, snapshot payload, `buildLessonPlanRequestBody`, equipment labels (`LESSON_PLAN_EQUIPMENT_LABELS`) |
| `src/domain/consultantContext.ts` | `buildQwrMetricsBlock`, `buildContextWithCitation` (+ `ConsultantLogRow` type) |
| `src/domain/executiveLogsSummary.ts` | `getRemedialCountForLog`, `buildExecutiveLogsSummary` for ai-summary payload |

## Call sites updated

- `src/pages/LessonPlan.tsx` — imports request builders from `@/domain/lessonPlanRequest`
- `src/pages/Consultant.tsx` — imports context helpers from `@/domain/consultantContext`
- `src/components/dashboard/ExecutiveSummary.tsx` — uses `buildExecutiveLogsSummary`; removed unused re-export of `buildLogsSummary`

## Verification

- `npm run build`: ผ่าน
- `npm run lint`: ยังเหลือ error เดิม 8 จุดใน `supabase/functions/atlas-diagnostic/index.ts` (ไม่ใช่ regression จาก Stage 4)

## Stage 4 outcome

- หน้าและคอมโพเนนต์บางส่วนบางลง; logic ที่ทดสอบได้แยกเป็นโมดูล domain ชัดเจน
- พร้อมขึ้น Stage 5 (code splitting + bundle analysis + release hardening)
